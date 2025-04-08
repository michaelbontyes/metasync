// API Service for OCL and OpenMRS verification

// API Base URLs
const OCL_BASE_URL = 'https://api.openconceptlab.org';
const OPENMRS_DEV_BASE_URL = 'http://msf-ocg-openmrs3-dev.westeurope.cloudapp.azure.com';
const OPENMRS_UAT_BASE_URL = 'http://lime-mosul-uat.madiro.org';

// OCL Organization and Collection settings
const OCL_ORG = 'MSF';
const OCL_SOURCE = 'MSF';
const OCL_COLLECTION_ORG = 'MSFOCG';
const OCL_COLLECTION = 'iraq-mosul';

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
 * Verify a UUID against OCL Source
 */
export async function verifyUUIDInOCLSource(uuid: string): Promise<any> {
  try {
    // For demo purposes, we'll simulate a successful API response
    // In a real implementation, you would make actual API calls
    console.log(`Verifying UUID ${uuid} in OCL Source`);

    // Simulate API response based on UUID pattern
    // This is just for demonstration - in a real app, you'd make actual API calls
    const exists = isUUID(uuid) && Math.random() > 0.3; // 70% chance of success for valid UUIDs

    if (!exists) {
      return { exists: false };
    }

    // Simulate response data
    const data = {
      uuid: uuid,
      datatype: ['Text', 'Numeric', 'Coded', 'Boolean'][Math.floor(Math.random() * 4)],
      concept_class: 'Question',
      display: `Concept ${uuid.substring(0, 8)}`
    };

    return {
      exists: true,
      datatype: data.datatype || data.concept_class || null,
      details: data
    };
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
    // For demo purposes, we'll simulate a successful API response
    console.log(`Verifying UUID ${uuid} in OCL Collection`);

    // Simulate API response
    const exists = isUUID(uuid) && Math.random() > 0.4; // 60% chance of success for valid UUIDs

    if (!exists) {
      return { exists: false };
    }

    // Simulate response data
    const data = [{
      uuid: uuid,
      datatype: ['Text', 'Numeric', 'Coded', 'Boolean'][Math.floor(Math.random() * 4)],
      concept_class: 'Question',
      display: `Concept ${uuid.substring(0, 8)}`
    }];

    // Check if the collection has any concepts matching the UUID
    if (Array.isArray(data) && data.length > 0) {
      return {
        exists: true,
        datatype: data[0].datatype || data[0].concept_class || null,
        details: data[0]
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Error verifying UUID in OCL Collection:', error);
    return { exists: false, error: error };
  }
}

/**
 * Verify a UUID against OpenMRS DEV
 * Note: In a real implementation, you would need to handle authentication
 */
export async function verifyUUIDInOpenMRSDev(uuid: string): Promise<any> {
  try {
    // For demo purposes, we'll simulate a successful API response
    console.log(`Verifying UUID ${uuid} in OpenMRS DEV`);

    // Simulate API response
    const exists = isUUID(uuid) && Math.random() > 0.35; // 65% chance of success for valid UUIDs

    if (!exists) {
      return { exists: false };
    }

    // Simulate response data
    const data = {
      uuid: uuid,
      datatype: {
        display: ['Text', 'Numeric', 'Coded', 'Boolean'][Math.floor(Math.random() * 4)]
      },
      display: `Concept ${uuid.substring(0, 8)}`
    };

    return {
      exists: true,
      datatype: data.datatype?.display || null,
      details: data
    };
  } catch (error) {
    console.error('Error verifying UUID in OpenMRS DEV:', error);
    return { exists: false, error: error };
  }
}

/**
 * Verify a UUID against OpenMRS UAT
 * Note: In a real implementation, you would need to handle authentication
 */
export async function verifyUUIDInOpenMRSUat(uuid: string): Promise<any> {
  try {
    // For demo purposes, we'll simulate a successful API response
    console.log(`Verifying UUID ${uuid} in OpenMRS UAT`);

    // Simulate API response
    const exists = isUUID(uuid) && Math.random() > 0.25; // 75% chance of success for valid UUIDs

    if (!exists) {
      return { exists: false };
    }

    // Simulate response data
    const data = {
      uuid: uuid,
      datatype: {
        display: ['Text', 'Numeric', 'Coded', 'Boolean'][Math.floor(Math.random() * 4)]
      },
      display: `Concept ${uuid.substring(0, 8)}`
    };

    return {
      exists: true,
      datatype: data.datatype?.display || null,
      details: data
    };
  } catch (error) {
    console.error('Error verifying UUID in OpenMRS UAT:', error);
    return { exists: false, error: error };
  }
}

/**
 * Comprehensive verification of a UUID across all systems
 */
export async function verifyUUID(uuid: string, expectedDatatype?: string): Promise<VerificationResult> {
  if (!isUUID(uuid)) {
    return {
      uuid,
      isValid: false,
      sources: {},
      expectedDatatype,
      datatypeMatch: false
    };
  }

  // Run all verifications in parallel
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

  // Check if expected datatype matches any of the found datatypes
  const datatypeMatch = expectedDatatype
    ? datatypes.some(dt => dt && dt.toLowerCase() === expectedDatatype.toLowerCase())
    : true;

  return {
    uuid,
    isValid: oclSource.exists || oclCollection.exists || openmrsDev.exists || openmrsUat.exists,
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
