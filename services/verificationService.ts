import { verifyUUID, mapExcelDatatypeToOpenMRS, isUUID, VerificationResult } from './apiService';

// Enable detailed logging
const ENABLE_LOGGING = true;

// Logger function
function log(...args: any[]) {
  if (ENABLE_LOGGING) {
    console.log('[Verification Service]', ...args);
  }
}

// Column names that might contain UUIDs
const UUID_COLUMN_NAMES = ['EMR_Concept_UUID', 'uuid', 'conceptUuid'];
const DATATYPE_COLUMN_NAMES = ['Datatype', 'datatype'];

// Special values that indicate a UUID is not found or not applicable
const NOT_FOUND_INDICATORS = ['N/A', 'NA', 'TBD', 'PENDING', 'NOT FOUND', 'NOTFOUND', 'NOT_FOUND'];

// Interface for cell verification data
export interface CellVerificationData {
  rowIndex: number;
  colIndex: number;
  value: string;
  isVerified: boolean;
  isValid: boolean;
  hasDiscrepancy?: boolean; // Flag to indicate a discrepancy (found in some systems but not all)
  verificationDetails?: VerificationResult;
  tooltipContent?: string;
  isNotFoundIndicator?: boolean;
}

// Interface for sheet verification data
export interface SheetVerificationData {
  [key: string]: CellVerificationData; // key is "rowIndex:colIndex"
}

/**
 * Identify UUID and datatype columns in the sheet data
 */
export function identifySpecialColumns(headers: string[]): {
  uuidColumnIndex: number | null,
  datatypeColumnIndex: number | null
} {
  log('Identifying special columns in headers:', headers);
  let uuidColumnIndex: number | null = null;
  let datatypeColumnIndex: number | null = null;

  headers.forEach((header, index) => {
    // Check for UUID column
    if (UUID_COLUMN_NAMES.some(name => header.includes(name))) {
      uuidColumnIndex = index;
      log(`Found UUID column: "${header}" at index ${index}`);
    }

    // Check for datatype column
    if (DATATYPE_COLUMN_NAMES.some(name => header.includes(name))) {
      datatypeColumnIndex = index;
      log(`Found datatype column: "${header}" at index ${index}`);
    }
  });

  log('Column identification result:', { uuidColumnIndex, datatypeColumnIndex });
  return { uuidColumnIndex, datatypeColumnIndex };
}

/**
 * Verify a single sheet's data
 */
export async function verifySheetData(
  data: any[][],
  headers: string[],
  progressCallback?: (rowIndex: number) => void
): Promise<SheetVerificationData> {
  log(`Starting verification of sheet data with ${data.length} rows`);
  const verificationData: SheetVerificationData = {};

  // Identify UUID and datatype columns
  const { uuidColumnIndex, datatypeColumnIndex } = identifySpecialColumns(headers);

  // If no UUID column found, return empty verification data
  if (uuidColumnIndex === null) {
    log('No UUID column found, skipping verification');
    return verificationData;
  }

  log(`Found UUID column at index ${uuidColumnIndex}`);
  if (datatypeColumnIndex !== null) {
    log(`Found datatype column at index ${datatypeColumnIndex}`);
  }

  // Process each row
  const rowsToProcess = data.length;
  log(`Processing ${rowsToProcess} rows for verification`);

  for (let rowIndex = 0; rowIndex < rowsToProcess; rowIndex++) {
    // Report progress if callback is provided
    if (progressCallback) {
      progressCallback(rowIndex);
    }
    const row = data[rowIndex];
    log(`Processing row ${rowIndex}:`, row);

    // Skip rows that don't have enough columns
    if (row.length <= uuidColumnIndex) {
      log(`Row ${rowIndex}: Not enough columns, skipping`);
      continue;
    }

    const uuidValue = String(row[uuidColumnIndex]);
    log(`Row ${rowIndex}: Found UUID candidate: ${uuidValue}`);

    // Get datatype if available
    let datatype: string | undefined;
    if (datatypeColumnIndex !== null && row.length > datatypeColumnIndex) {
      datatype = String(row[datatypeColumnIndex]);
      if (datatype) {
        const originalDatatype = datatype;
        datatype = mapExcelDatatypeToOpenMRS(datatype);
        log(`Row ${rowIndex}: Found datatype ${originalDatatype}, mapped to ${datatype}`);
      } else {
        log(`Row ${rowIndex}: No datatype found`);
      }
    }

    // Check if this is a not-found indicator
    const isNotFoundIndicator = NOT_FOUND_INDICATORS.some(
      indicator => uuidValue.toUpperCase().trim() === indicator
    );

    // Handle not-found indicators
    if (isNotFoundIndicator) {
      log(`Row ${rowIndex}: Found not-found indicator: ${uuidValue}`);

      // Create a special verification result for not-found indicators
      const notFoundResult: VerificationResult = {
        uuid: uuidValue,
        isValid: false,
        datatypeMatch: false,
        expectedDatatype: datatype,
        sources: {
          // Use empty objects instead of null
          oclSource: { exists: false },
          oclCollection: { exists: false },
          openmrsDev: { exists: false },
          openmrsUat: { exists: false }
        },
        notFoundIndicator: true
      };

      // Create tooltip content
      const tooltipContent = `UUID: ${uuidValue}\nStatus: Not Found Indicator\n\nThis cell contains a value that indicates the UUID is not found or not yet assigned.`;

      // Store verification data
      const cellKey = `${rowIndex}:${uuidColumnIndex}`;
      verificationData[cellKey] = {
        rowIndex,
        colIndex: uuidColumnIndex,
        value: uuidValue,
        isVerified: true,
        isValid: false, // Not-found indicators are considered invalid
        verificationDetails: notFoundResult,
        tooltipContent,
        isNotFoundIndicator: true
      };

      log(`Row ${rowIndex}: Added verification data for not-found indicator at ${cellKey}`);
      continue;
    }

    // Skip if not a UUID
    if (!isUUID(uuidValue)) {
      log(`Row ${rowIndex}: Value ${uuidValue} is not a valid UUID format, skipping`);
      continue;
    }

    log(`Row ${rowIndex}: Verifying UUID ${uuidValue}`);

    // Verify the UUID
    log(`Row ${rowIndex}: Starting verification for UUID ${uuidValue}${datatype ? ` with datatype ${datatype}` : ''}`);
    const verificationResult = await verifyUUID(uuidValue, datatype);
    log(`Row ${rowIndex}: Verification complete:`, {
      isValid: verificationResult.isValid,
      datatypeMatch: verificationResult.datatypeMatch,
      sources: Object.keys(verificationResult.sources).filter(key => verificationResult.sources[key as keyof typeof verificationResult.sources])
    });

    // Create tooltip content
    const tooltipContent = createTooltipContent(verificationResult);

    // Store verification data
    const cellKey = `${rowIndex}:${uuidColumnIndex}`;

    // Check if the UUID is found in all required systems
    // We'll consider a UUID valid only if it's found in all systems
    const foundInAllSystems = !!(  // Double negation to ensure boolean type
      verificationResult.sources.oclSource?.exists &&
      verificationResult.sources.oclCollection?.exists &&
      verificationResult.sources.openmrsDev?.exists &&
      verificationResult.sources.openmrsUat?.exists
    );

    // If the UUID is found in any system but not all, it's a discrepancy
    const hasDiscrepancy = verificationResult.isValid && !foundInAllSystems;

    verificationData[cellKey] = {
      rowIndex,
      colIndex: uuidColumnIndex,
      value: uuidValue,
      isVerified: true,
      isValid: foundInAllSystems, // Only valid if found in all systems
      hasDiscrepancy, // Flag to indicate a discrepancy
      verificationDetails: verificationResult,
      tooltipContent
    };
    log(`Row ${rowIndex}: Added verification data for UUID cell at ${cellKey} (found in all systems: ${foundInAllSystems}, has discrepancy: ${hasDiscrepancy})`);


    // If datatype column exists, also verify it
    if (datatypeColumnIndex !== null && datatype) {
      const datatypeCellKey = `${rowIndex}:${datatypeColumnIndex}`;

      // Create a modified verification result specifically for the datatype
      const datatypeVerificationResult = {
        ...verificationResult,
        isDatatype: true // Flag to identify this as a datatype verification
      };

      verificationData[datatypeCellKey] = {
        rowIndex,
        colIndex: datatypeColumnIndex,
        value: datatype,
        isVerified: true,
        isValid: verificationResult.datatypeMatch,
        verificationDetails: datatypeVerificationResult,
        tooltipContent
      };
      log(`Row ${rowIndex}: Added verification data for datatype cell at ${datatypeCellKey}`);
    }
  }

  log(`Verification complete, processed ${Object.keys(verificationData).length} cells`);
  return verificationData;
}

/**
 * Create tooltip content from verification result
 */
function createTooltipContent(result: VerificationResult): string {
  log(`Creating tooltip content for UUID: ${result.uuid}`);

  let content = `UUID: ${result.uuid}\n`;
  content += `Valid: ${result.isValid ? 'Yes' : 'No'}\n`;

  if (result.expectedDatatype) {
    content += `Expected Datatype: ${result.expectedDatatype}\n`;
    content += `Datatype Match: ${result.datatypeMatch ? 'Yes' : 'No'}\n`;
  }

  content += '\nVerification Sources:\n';

  // OCL Source
  if (result.sources.oclSource) {
    content += `- OCL Source: Found\n`;
    if (result.sources.oclSource.datatype) {
      content += `  Datatype: ${result.sources.oclSource.datatype}\n`;
    }
  } else {
    content += `- OCL Source: Not Found\n`;
  }

  // OCL Collection
  if (result.sources.oclCollection) {
    content += `- OCL Collection: Found\n`;
    if (result.sources.oclCollection.datatype) {
      content += `  Datatype: ${result.sources.oclCollection.datatype}\n`;
    }
  } else {
    content += `- OCL Collection: Not Found\n`;
  }

  // OpenMRS DEV
  if (result.sources.openmrsDev) {
    content += `- OpenMRS DEV: Found\n`;
    if (result.sources.openmrsDev.datatype) {
      content += `  Datatype: ${result.sources.openmrsDev.datatype}\n`;
    }
  } else {
    content += `- OpenMRS DEV: Not Found\n`;
  }

  // OpenMRS UAT
  if (result.sources.openmrsUat) {
    content += `- OpenMRS UAT: Found\n`;
    if (result.sources.openmrsUat.datatype) {
      content += `  Datatype: ${result.sources.openmrsUat.datatype}\n`;
    }
  } else {
    content += `- OpenMRS UAT: Not Found\n`;
  }

  // O3forms DEV
  if (result.sources.o3formsDev) {
    content += `- O3forms DEV: ${result.sources.o3formsDev.exists ? 'Found' : 'Not Found'}\n`;
    if (result.sources.o3formsDev.datatype) {
      content += `  Datatype: ${result.sources.o3formsDev.datatype}\n`;
    }
  } else {
    content += `- O3forms DEV: Not Checked\n`;
  }

  // O3forms UAT
  if (result.sources.o3formsUat) {
    content += `- O3forms UAT: ${result.sources.o3formsUat.exists ? 'Found' : 'Not Found'}\n`;
    if (result.sources.o3formsUat.datatype) {
      content += `  Datatype: ${result.sources.o3formsUat.datatype}\n`;
    }
  } else {
    content += `- O3forms UAT: Not Checked\n`;
  }



  log(`Tooltip content created with ${content.split('\n').length} lines`);
  return content;
}

/**
 * Get cell background color based on verification status
 */
export function getCellBackgroundColor(cellData?: CellVerificationData): string {
  if (!cellData || !cellData.isVerified) {
    return 'transparent';
  }

  // Mark as invalid (red) if:
  // 1. The verification explicitly failed (isValid is false)
  // 2. The UUID was not found in any API (verificationDetails.isValid is false)
  // 3. The cell contains a not-found indicator
  // 4. The UUID has a discrepancy (found in some systems but not all)
  const isInvalid = !cellData.isValid ||
    (cellData.verificationDetails && !cellData.verificationDetails.isValid) ||
    cellData.isNotFoundIndicator ||
    cellData.hasDiscrepancy;

  // Use a different shade for different types of issues
  if (cellData.isNotFoundIndicator) {
    return 'rgba(255, 165, 0, 0.2)'; // Orange for not-found indicators
  } else if (cellData.hasDiscrepancy) {
    return 'rgba(255, 0, 0, 0.2)'; // Red for discrepancies
  }

  return isInvalid ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 0, 0.2)';
}
