// API Service for OCL and OpenMRS verification

// API Base URLs
const OCL_BASE_URL = 'https://api.openconceptlab.org';
const OPENMRS_DEV_BASE_URL = 'https://lime-mosul-dev.madiro.org';
const OPENMRS_UAT_BASE_URL = 'https://lime-mosul-uat.madiro.org';

// OCL Organization and Collection settings
const OCL_ORG = 'MSF';
const OCL_SOURCE = 'MSF';
const OCL_COLLECTION_ORG = 'MSFOCG';
const OCL_COLLECTION = 'iraq-mosul';

// Enable detailed logging
const ENABLE_LOGGING = true;

// Logger function
function log(...args: any[]) {
  if (ENABLE_LOGGING) {
    console.log('[API Service]', ...args);
  }
}

// UUID Regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Verification result interface
export interface VerificationResult {
  uuid: string;
  isValid: boolean;
  sources: {
    oclSource?: {
      exists: boolean;
      datatype?: string;
      details?: any;
    };
    oclCollection?: {
      exists: boolean;
      datatype?: string;
      details?: any;
    };
    openmrsDev?: {
      exists: boolean;
      datatype?: string;
      details?: any;
    };
    openmrsUat?: {
      exists: boolean;
      datatype?: string;
      details?: any;
    };
  };
  expectedDatatype?: string;
  datatypeMatch: boolean;
}

/**
 * Check if a string is a valid UUID
 */
export function isUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

/**
 * Make a proxied API call to avoid CORS issues
 */
async function makeProxiedApiCall(url: string): Promise<any> {
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
  log(`Making proxied API call via: ${proxyUrl}`);

  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Verify a UUID against OCL Source
 */
export async function verifyUUIDInOCLSource(uuid: string): Promise<any> {
  try {
    log(`Verifying UUID ${uuid} in OCL Source`);

    // Make actual API call to OCL Source via proxy
    const targetUrl = `${OCL_BASE_URL}/orgs/${OCL_ORG}/sources/${OCL_SOURCE}/concepts/${uuid}/`;
    log(`Target API URL: ${targetUrl}`);

    try {
      const data = await makeProxiedApiCall(targetUrl);
      log(`UUID ${uuid} found in OCL Source with data:`, data);

      return {
        exists: true,
        datatype: data.datatype || data.concept_class || null,
        details: data
      };
    } catch (apiError: any) {
      log(`UUID ${uuid} not found in OCL Source: ${apiError.message || 'Unknown error'}`);
      return { exists: false };
    }
  } catch (error) {
    console.error('Error verifying UUID in OCL Source:', error);
    return { exists: false, error: error };
  }
}

/**
 * Verify a UUID against OCL Collection
 */
export async function verifyUUIDInOCLCollection(uuid: string): Promise<any> {
  try {
    log(`Verifying UUID ${uuid} in OCL Collection`);

    // Make actual API call to OCL Collection via proxy
    const targetUrl = `${OCL_BASE_URL}/orgs/${OCL_COLLECTION_ORG}/collections/${OCL_COLLECTION}/concepts/?q=${uuid}`;
    log(`Target API URL: ${targetUrl}`);

    try {
      const data = await makeProxiedApiCall(targetUrl);

      // Check if the collection has any concepts matching the UUID
      if (Array.isArray(data) && data.length > 0) {
        log(`UUID ${uuid} found in OCL Collection with data:`, data[0]);
        return {
          exists: true,
          datatype: data[0].datatype || data[0].concept_class || null,
          details: data[0]
        };
      }

      log(`UUID ${uuid} not found in OCL Collection`);
      return { exists: false };
    } catch (apiError: any) {
      log(`Error querying OCL Collection: ${apiError.message || 'Unknown error'}`);
      return { exists: false };
    }
  } catch (error) {
    console.error('Error verifying UUID in OCL Collection:', error);
    return { exists: false, error: error };
  }
}

/**
 * Verify a UUID against OpenMRS DEV
 */
export async function verifyUUIDInOpenMRSDev(uuid: string): Promise<any> {
  try {
    log(`Verifying UUID ${uuid} in OpenMRS DEV`);

    // Make actual API call to OpenMRS DEV via proxy
    const targetUrl = `${OPENMRS_DEV_BASE_URL}/openmrs/ws/rest/v1/concept/${uuid}`;
    log(`Target API URL: ${targetUrl}`);

    try {
      const data = await makeProxiedApiCall(targetUrl);
      log(`UUID ${uuid} found in OpenMRS DEV with data:`, data);

      return {
        exists: true,
        datatype: data.datatype?.display || null,
        details: data
      };
    } catch (apiError: any) {
      log(`UUID ${uuid} not found in OpenMRS DEV: ${apiError.message || 'Unknown error'}`);
      return { exists: false };
    }
  } catch (error) {
    console.error('Error verifying UUID in OpenMRS DEV:', error);
    return { exists: false, error: error };
  }
}

/**
 * Verify a UUID against OpenMRS UAT
 */
export async function verifyUUIDInOpenMRSUat(uuid: string): Promise<any> {
  try {
    log(`Verifying UUID ${uuid} in OpenMRS UAT`);

    // Make actual API call to OpenMRS UAT via proxy
    const targetUrl = `${OPENMRS_UAT_BASE_URL}/openmrs/ws/rest/v1/concept/${uuid}`;
    log(`Target API URL: ${targetUrl}`);

    try {
      const data = await makeProxiedApiCall(targetUrl);
      log(`UUID ${uuid} found in OpenMRS UAT with data:`, data);

      return {
        exists: true,
        datatype: data.datatype?.display || null,
        details: data
      };
    } catch (apiError: any) {
      log(`UUID ${uuid} not found in OpenMRS UAT: ${apiError.message || 'Unknown error'}`);
      return { exists: false };
    }
  } catch (error) {
    console.error('Error verifying UUID in OpenMRS UAT:', error);
    return { exists: false, error: error };
  }
}

/**
 * Comprehensive verification of a UUID across all systems
 */
export async function verifyUUID(uuid: string, expectedDatatype?: string): Promise<VerificationResult> {
  log(`Starting verification for UUID: ${uuid}${expectedDatatype ? `, expected datatype: ${expectedDatatype}` : ''}`);

  if (!isUUID(uuid)) {
    log(`Invalid UUID format: ${uuid}`);
    return {
      uuid,
      isValid: false,
      sources: {},
      expectedDatatype,
      datatypeMatch: false
    };
  }

  // Run all verifications in parallel
  log(`Verifying UUID ${uuid} against all systems...`);
  const [oclSource, oclCollection, openmrsDev, openmrsUat] = await Promise.all([
    verifyUUIDInOCLSource(uuid),
    verifyUUIDInOCLCollection(uuid),
    verifyUUIDInOpenMRSDev(uuid),
    verifyUUIDInOpenMRSUat(uuid)
  ]);

  // Determine if datatypes match across all sources
  const datatypes = [
    oclSource.exists ? oclSource.datatype : null,
    oclCollection.exists ? oclCollection.datatype : null,
    openmrsDev.exists ? openmrsDev.datatype : null,
    openmrsUat.exists ? openmrsUat.datatype : null
  ].filter(Boolean);

  log(`Found datatypes for UUID ${uuid}:`, datatypes);

  // Check if expected datatype matches any of the found datatypes
  const datatypeMatch = expectedDatatype
    ? datatypes.some(dt => dt && dt.toLowerCase() === expectedDatatype.toLowerCase())
    : true;

  const isValid = oclSource.exists || oclCollection.exists || openmrsDev.exists || openmrsUat.exists;
  log(`Verification result for UUID ${uuid}: ${isValid ? 'Valid' : 'Invalid'}, datatype match: ${datatypeMatch}`);

  return {
    uuid,
    isValid,
    sources: {
      oclSource: oclSource.exists ? oclSource : undefined,
      oclCollection: oclCollection.exists ? oclCollection : undefined,
      openmrsDev: openmrsDev.exists ? openmrsDev : undefined,
      openmrsUat: openmrsUat.exists ? openmrsUat : undefined
    },
    expectedDatatype,
    datatypeMatch
  };
}

/**
 * Map Excel datatype to OpenMRS datatype
 */
export function mapExcelDatatypeToOpenMRS(excelDatatype: string): string {
  const mapping: Record<string, string> = {
    'Text': 'Text',
    'Numeric': 'Numeric',
    'Coded': 'Coded',
    'Boolean': 'Boolean',
    'Date': 'Date',
    'Datetime': 'Datetime'
  };

  return mapping[excelDatatype] || excelDatatype;
}
