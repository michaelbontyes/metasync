import { log } from '@/utils/logger';

// Types for O3 Form verification
export interface O3FormVerificationResult {
  uuid: string;
  isValid: boolean;
  foundInForm: boolean;
  expectedDatatype?: string;
  actualDatatype?: string;
  datatypeMatch: boolean;
  path?: string; // Path in the form where the UUID was found
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
    o3formsDev: {
      exists: boolean;
      datatype?: string;
      details?: any;
    };
    o3formsUat: {
      exists: boolean;
      datatype?: string;
      details?: any;
    };
  };
}

export interface O3FormVerificationData {
  [cellKey: string]: O3FormCellVerificationData;
}

export interface O3FormCellVerificationData {
  rowIndex: number;
  colIndex: number;
  value: string;
  isVerified: boolean;
  isValid: boolean;
  verificationDetails: O3FormVerificationResult;
  tooltipContent: string;
  isNotFoundIndicator?: boolean;
}

// Hardcoded form UUIDs for testing
const TEST_FORM_UUID = '9287bc3e-5852-3034-a59b-889d06d546ad';
const DEV_BASE_URL = 'http://lime-mosul-dev.madiro.org';
const UAT_BASE_URL = 'http://lime-mosul-uat.madiro.org';

/**
 * Fetch O3 form data from the API
 */
export async function fetchO3Form(formUuid: string = TEST_FORM_UUID, locale: string = 'en', environment: 'dev' | 'uat' = 'uat'): Promise<any> {
  try {
    log(`Fetching O3 form with UUID: ${formUuid}, locale: ${locale}, environment: ${environment}`);

    // Determine base URL based on environment
    const baseUrl = environment === 'dev' ? DEV_BASE_URL : UAT_BASE_URL;

    // Use our proxy to avoid CORS issues
    const url = `/api/proxy?url=${encodeURIComponent(`${baseUrl}/openmrs/ws/rest/v1/o3/forms/${formUuid}?lang=${locale}`)}&auth=true`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch O3 form from ${environment}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    log(`Successfully fetched O3 form from ${environment}: ${data.name}`);
    return data;
  } catch (error) {
    log(`Error fetching O3 form from ${environment}: ${error}`);
    // For testing, we'll return a mock response if the API call fails
    return getMockO3FormResponse();
  }
}

/**
 * Extract all UUIDs from an O3 form
 */
export function extractUUIDsFromO3Form(formData: any): Map<string, { path: string, datatype?: string }> {
  const uuids = new Map<string, { path: string, datatype?: string }>();

  // Extract form UUID
  if (formData.uuid) {
    uuids.set(formData.uuid, { path: 'form.uuid' });
  }

  // Extract encounter type UUID
  if (formData.encounterType?.uuid) {
    uuids.set(formData.encounterType.uuid, { path: 'form.encounterType.uuid' });
  }

  // Process pages, sections, and questions recursively
  if (formData.pages && Array.isArray(formData.pages)) {
    formData.pages.forEach((page: any, pageIndex: number) => {
      const pagePath = `form.pages[${pageIndex}]`;

      if (page.sections && Array.isArray(page.sections)) {
        page.sections.forEach((section: any, sectionIndex: number) => {
          const sectionPath = `${pagePath}.sections[${sectionIndex}]`;

          if (section.questions && Array.isArray(section.questions)) {
            section.questions.forEach((question: any, questionIndex: number) => {
              const questionPath = `${sectionPath}.questions[${questionIndex}]`;

              // Extract concept UUID from question
              if (question.questionOptions?.concept) {
                const conceptUuid = question.questionOptions.concept;
                let datatype: string | undefined;

                // Try to determine datatype from rendering
                if (question.questionOptions?.rendering) {
                  datatype = mapO3RenderingToDatatype(question.questionOptions.rendering);
                }

                uuids.set(conceptUuid, {
                  path: `${questionPath}.questionOptions.concept`,
                  datatype
                });
              }

              // Extract answer concept UUIDs
              if (question.questionOptions?.answers && Array.isArray(question.questionOptions.answers)) {
                question.questionOptions.answers.forEach((answer: any, answerIndex: number) => {
                  if (answer.concept) {
                    uuids.set(answer.concept, {
                      path: `${questionPath}.questionOptions.answers[${answerIndex}].concept`,
                      datatype: 'Coded' // Answer concepts are always coded
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  return uuids;
}

/**
 * Map O3 form rendering type to OpenMRS datatype
 */
function mapO3RenderingToDatatype(rendering: string): string | undefined {
  switch (rendering.toLowerCase()) {
    case 'number':
      return 'Numeric';
    case 'text':
    case 'textarea':
      return 'Text';
    case 'select':
    case 'radio':
    case 'checkbox':
      return 'Coded';
    case 'date':
      return 'Date';
    case 'datetime':
      return 'Datetime';
    case 'toggle':
      return 'Boolean';
    default:
      return undefined;
  }
}

/**
 * Verify UUIDs in a sheet against an O3 form
 */
export async function verifySheetAgainstO3Form(
  data: any[][],
  headers: string[],
  progressCallback?: (rowIndex: number) => void
): Promise<O3FormVerificationData> {
  log(`Starting O3 form verification for sheet with ${data.length} rows`);
  const verificationData: O3FormVerificationData = {};

  // Identify UUID and datatype columns
  const uuidColumnIndex = findColumnIndex(headers, ['EMR_Concept_UUID', 'uuid', 'conceptUuid', 'UUID']);
  const datatypeColumnIndex = findColumnIndex(headers, ['Datatype', 'datatype', 'DataType']);

  if (uuidColumnIndex === null) {
    log('No UUID column found in sheet, skipping verification');
    return verificationData;
  }

  log(`Found UUID column at index ${uuidColumnIndex}`);
  if (datatypeColumnIndex !== null) {
    log(`Found datatype column at index ${datatypeColumnIndex}`);
  }

  // Fetch O3 form data from both environments
  const [formDataDev, formDataUat] = await Promise.all([
    fetchO3Form(TEST_FORM_UUID, 'en', 'dev'),
    fetchO3Form(TEST_FORM_UUID, 'en', 'uat')
  ]);

  // Extract all UUIDs from both forms
  const formUuidsDev = extractUUIDsFromO3Form(formDataDev);
  const formUuidsUat = extractUUIDsFromO3Form(formDataUat);
  log(`Extracted ${formUuidsDev.size} UUIDs from DEV form and ${formUuidsUat.size} UUIDs from UAT form`);

  // Process each row in the sheet
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    // Report progress if callback is provided
    if (progressCallback) {
      progressCallback(rowIndex);
    }

    const row = data[rowIndex];

    // Skip rows that don't have enough columns
    if (row.length <= uuidColumnIndex) {
      continue;
    }

    const uuidValue = String(row[uuidColumnIndex]);

    // Skip empty cells
    if (!uuidValue.trim()) {
      continue;
    }

    // Check if this is a not-found indicator
    const notFoundIndicators = ['N/A', 'NA', 'TBD', 'PENDING', 'NOT FOUND', 'NOTFOUND', 'NOT_FOUND'];
    const isNotFoundIndicator = notFoundIndicators.some(
      indicator => uuidValue.toUpperCase().trim() === indicator
    );

    // Get expected datatype if available
    let expectedDatatype: string | undefined;
    if (datatypeColumnIndex !== null && row.length > datatypeColumnIndex) {
      expectedDatatype = String(row[datatypeColumnIndex]);
      if (expectedDatatype) {
        expectedDatatype = expectedDatatype.trim();
      }
    }

    if (isNotFoundIndicator) {
      // Handle not-found indicators
      const notFoundResult: O3FormVerificationResult = {
        uuid: uuidValue,
        isValid: false,
        foundInForm: false,
        datatypeMatch: false,
        expectedDatatype,
        sources: {
          oclSource: undefined,
          oclCollection: undefined,
          openmrsDev: undefined,
          openmrsUat: undefined,
          o3formsDev: { exists: false },
          o3formsUat: { exists: false }
        }
      };

      const tooltipContent = `UUID: ${uuidValue}\nStatus: Not Found Indicator\n\nThis cell contains a value that indicates the UUID is not found or not yet assigned.`;

      const cellKey = `${rowIndex}:${uuidColumnIndex}`;
      verificationData[cellKey] = {
        rowIndex,
        colIndex: uuidColumnIndex,
        value: uuidValue,
        isVerified: true,
        isValid: false,
        verificationDetails: notFoundResult,
        tooltipContent,
        isNotFoundIndicator: true
      };

      continue;
    }

    // Verify UUID against form data from both environments
    const formUuidInfoDev = formUuidsDev.get(uuidValue);
    const formUuidInfoUat = formUuidsUat.get(uuidValue);

    const foundInDevForm = !!formUuidInfoDev;
    const foundInUatForm = !!formUuidInfoUat;
    const foundInForm = foundInDevForm || foundInUatForm;

    // Check datatype match if applicable
    let datatypeMatch = false;
    let actualDatatype: string | undefined;

    // Get datatype from either environment, preferring UAT if available
    if (foundInUatForm && formUuidInfoUat.datatype && expectedDatatype) {
      actualDatatype = formUuidInfoUat.datatype;
      datatypeMatch = actualDatatype.toLowerCase() === expectedDatatype.toLowerCase();
    } else if (foundInDevForm && formUuidInfoDev.datatype && expectedDatatype) {
      actualDatatype = formUuidInfoDev.datatype;
      datatypeMatch = actualDatatype.toLowerCase() === expectedDatatype.toLowerCase();
    }

    // Create verification result
    const verificationResult: O3FormVerificationResult = {
      uuid: uuidValue,
      isValid: foundInForm,
      foundInForm,
      expectedDatatype,
      actualDatatype,
      datatypeMatch: datatypeMatch || !expectedDatatype || !actualDatatype,
      path: foundInForm ? (formUuidInfoUat?.path || formUuidInfoDev?.path) : undefined,
      sources: {
        // Set placeholder values for standard environments
        oclSource: undefined,
        oclCollection: undefined,
        openmrsDev: undefined,
        openmrsUat: undefined,
        // Set actual values for O3forms environments
        o3formsDev: {
          exists: foundInDevForm,
          datatype: formUuidInfoDev?.datatype,
          details: foundInDevForm ? { path: formUuidInfoDev.path } : undefined
        },
        o3formsUat: {
          exists: foundInUatForm,
          datatype: formUuidInfoUat?.datatype,
          details: foundInUatForm ? { path: formUuidInfoUat.path } : undefined
        }
      }
    };

    // Create tooltip content
    const tooltipContent = createO3FormTooltipContent(verificationResult);

    // Store verification data for UUID cell
    const cellKey = `${rowIndex}:${uuidColumnIndex}`;
    verificationData[cellKey] = {
      rowIndex,
      colIndex: uuidColumnIndex,
      value: uuidValue,
      isVerified: true,
      isValid: verificationResult.isValid,
      verificationDetails: verificationResult,
      tooltipContent
    };

    // Store verification data for datatype cell if applicable
    if (datatypeColumnIndex !== null && expectedDatatype) {
      const datatypeCellKey = `${rowIndex}:${datatypeColumnIndex}`;
      verificationData[datatypeCellKey] = {
        rowIndex,
        colIndex: datatypeColumnIndex,
        value: expectedDatatype,
        isVerified: true,
        isValid: verificationResult.datatypeMatch,
        verificationDetails: {
          ...verificationResult,
          isDatatype: true // Add isDatatype flag
        } as any, // Type assertion to avoid TypeScript error
        tooltipContent
      };
    }
  }

  return verificationData;
}

/**
 * Create tooltip content for O3 form verification
 */
function createO3FormTooltipContent(result: O3FormVerificationResult): string {
  let content = `UUID: ${result.uuid}\n`;
  content += `Found in Form: ${result.foundInForm ? 'Yes' : 'No'}\n\n`;

  // Add environment-specific information for all six environments
  content += `\nVerification Sources:\n`;

  // OCL Source
  if (result.sources.oclSource && result.sources.oclSource.exists) {
    content += `- OCL Source: Found\n`;
    if (result.sources.oclSource.datatype) {
      content += `  Datatype: ${result.sources.oclSource.datatype}\n`;
    }
  } else {
    content += `- OCL Source: Not Found\n`;
  }

  // OCL Collection
  if (result.sources.oclCollection && result.sources.oclCollection.exists) {
    content += `- OCL Collection: Found\n`;
    if (result.sources.oclCollection.datatype) {
      content += `  Datatype: ${result.sources.oclCollection.datatype}\n`;
    }
  } else {
    content += `- OCL Collection: Not Found\n`;
  }

  // OpenMRS DEV
  if (result.sources.openmrsDev && result.sources.openmrsDev.exists) {
    content += `- OpenMRS DEV: Found\n`;
    if (result.sources.openmrsDev.datatype) {
      content += `  Datatype: ${result.sources.openmrsDev.datatype}\n`;
    }
  } else {
    content += `- OpenMRS DEV: Not Found\n`;
  }

  // OpenMRS UAT
  if (result.sources.openmrsUat && result.sources.openmrsUat.exists) {
    content += `- OpenMRS UAT: Found\n`;
    if (result.sources.openmrsUat.datatype) {
      content += `  Datatype: ${result.sources.openmrsUat.datatype}\n`;
    }
  } else {
    content += `- OpenMRS UAT: Not Found\n`;
  }

  // O3forms DEV
  if (result.sources.o3formsDev && result.sources.o3formsDev.exists) {
    content += `- O3forms DEV: Found\n`;
    if (result.sources.o3formsDev.datatype) {
      content += `  Datatype: ${result.sources.o3formsDev.datatype}\n`;
    }
  } else {
    content += `- O3forms DEV: Not Found\n`;
  }

  // O3forms UAT
  if (result.sources.o3formsUat && result.sources.o3formsUat.exists) {
    content += `- O3forms UAT: Found\n`;
    if (result.sources.o3formsUat.datatype) {
      content += `  Datatype: ${result.sources.o3formsUat.datatype}\n`;
    }
  } else {
    content += `- O3forms UAT: Not Found\n`;
  }

  if (result.foundInForm && result.path) {
    content += `\nPath: ${result.path}\n`;
  }

  if (result.expectedDatatype) {
    content += `\nDatatype:\n`;
    content += `Expected: ${result.expectedDatatype}\n`;

    if (result.actualDatatype) {
      content += `Actual: ${result.actualDatatype}\n`;
      content += `Match: ${result.datatypeMatch ? 'Yes' : 'No'}\n`;
    } else {
      content += `Actual: Unknown\n`;
    }
  }

  return content;
}

/**
 * Find column index by possible names
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number | null {
  const index = headers.findIndex(header =>
    possibleNames.some(name =>
      header.toLowerCase().includes(name.toLowerCase())
    )
  );

  return index !== -1 ? index : null;
}

/**
 * Get mock O3 form response for testing
 */
function getMockO3FormResponse(): any {
  return {
    "name": "MSF Mental Health - MHPSS Baseline v2",
    "description": "MSF Form - F29-MHPSS Baseline v2",
    "version": "1",
    "published": true,
    "uuid": "9287bc3e-5852-3034-a59b-889d06d546ad",
    "processor": "EncounterFormProcessor",
    "encounter": "Mental Health",
    "encounterType": {
      "uuid": "95d68645-1b72-4290-be0b-ec1fb64bc067",
      "display": "Mental Health"
    },
    "retired": false,
    "referencedForms": [],
    "pages": [
      {
        "label": "Consultation",
        "sections": [
          {
            "label": "File information",
            "isExpanded": false,
            "questions": [
              {
                "id": "admissionType",
                "label": "Admission type",
                "type": "obs",
                "required": false,
                "questionOptions": {
                  "rendering": "radio",
                  "concept": "4dae5b12-070f-4153-b1ca-fbec906106e1",
                  "answers": [
                    {
                      "label": "New admission",
                      "concept": "9f2fe30f-a8f0-49ba-82e4-71c232259130"
                    },
                    {
                      "label": "Readmission",
                      "concept": "e4e42ecd-196b-4aa8-a265-bfbed09d77cf"
                    }
                  ]
                }
              },
              {
                "id": "typeOfIntervention",
                "label": "Type of intervention",
                "type": "obs",
                "required": false,
                "questionOptions": {
                  "rendering": "radio",
                  "concept": "a5d0a2a3-e31f-4c9b-a2e0-5db9a4c8b057",
                  "answers": [
                    {
                      "label": "Individual",
                      "concept": "9e4b6acc-ab97-4ecd-a48c-b3b8af6a2aee"
                    },
                    {
                      "label": "Group",
                      "concept": "5f46b821-6a80-4e1d-8c8c-3d79f64d5d15"
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  };
}
