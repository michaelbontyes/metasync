'use client';

import { useEffect, useState } from 'react';
import {
  AutoColumnSize,
  Autofill,
  ContextMenu,
  CopyPaste,
  DropdownMenu,
  Filters,
  HiddenColumns,
  HiddenRows,
  ManualColumnMove,
  ManualColumnResize,
  ColumnSorting,
  registerPlugin,
} from 'handsontable/plugins';

import {
  CheckboxCellType,
  NumericCellType,
  registerCellType,
} from 'handsontable/cellTypes';
import { HotTable, HotColumn } from '@handsontable/react';

import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';

// Import verification services
import { verifySheetData, SheetVerificationData } from '@/services/verificationService';
import { verifySheetAgainstO3Form, O3FormVerificationData } from '@/services/o3FormVerificationService';
import { VerifiedCell } from './VerifiedCell';

// Enable detailed logging
const ENABLE_LOGGING = true;

// Logger function
function log(...args: any[]) {
  if (ENABLE_LOGGING) {
    console.log('[Grid Component]', ...args);
  }
}

registerCellType(CheckboxCellType);
registerCellType(NumericCellType);

registerPlugin(AutoColumnSize);
registerPlugin(Autofill);
registerPlugin(ContextMenu);
registerPlugin(CopyPaste);
registerPlugin(DropdownMenu);
registerPlugin(Filters);
registerPlugin(HiddenColumns);
registerPlugin(HiddenRows);
registerPlugin(ManualColumnMove);
registerPlugin(ManualColumnResize);
registerPlugin(ColumnSorting);

type GridProps = {
  data: any[][];
  headers?: string[];
  colWidths?: number[];
  isVerifying?: boolean;
  verificationData?: SheetVerificationData | O3FormVerificationData;
  sheetName?: string;
  onVerificationComplete?: (sheetName: string, verificationData: any) => void;
  onVerificationProgress?: (progress: number) => void;
};

export default function Grid(props: GridProps) {
  // State for verification data
  const [localVerificationData, setLocalVerificationData] = useState<SheetVerificationData | O3FormVerificationData>({});
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Use provided verification data if available, otherwise use local state
  // Ensure verification data is scoped to the current sheet
  const verificationData = props.verificationData || localVerificationData;

  // Reset local verification data when sheet changes
  useEffect(() => {
    if (props.sheetName) {
      log(`Sheet changed to ${props.sheetName}, resetting local verification data`);
      setLocalVerificationData({});
    }
  }, [props.sheetName]);

  // Effect to verify data when isVerifying changes
  useEffect(() => {
    if (props.isVerifying && props.data && props.data.length > 0 && props.headers) {
      log('Verification triggered from parent component');
      verifyData();
    }
  }, [props.isVerifying, props.data, props.headers]);

  // Function to verify data
  const verifyData = async () => {
    if (isVerifying || !props.data || !props.headers) {
      log('Skipping verification: already in progress or missing data/headers');
      return;
    }

    log(`Starting verification for ${props.data.length} rows of data`);
    setIsVerifying(true);
    let verificationResults: SheetVerificationData | O3FormVerificationData = {};

    try {
      log('Calling verifySheetData...');

      // Report initial progress
      if (props.onVerificationProgress) {
        props.onVerificationProgress(10);
      }

      // Start verification
      const totalRows = props.data.length;
      const updateInterval = Math.max(1, Math.floor(totalRows / 10)); // Update progress every 10% of rows

      // Determine if this is an O3 form sheet or a standard sheet
      // We'll use a more specific heuristic to avoid misclassifying sheets
      const isO3FormSheet = props.sheetName?.toLowerCase().includes('form') || props.sheetName?.toLowerCase().includes('translation');
      log(`Sheet ${props.sheetName} is ${isO3FormSheet ? 'an O3 form/translation sheet' : 'a standard sheet'}`);

      if (isO3FormSheet) {
        // Use O3 form verification
        log('Using O3 form verification for sheet:', props.sheetName);
        verificationResults = await verifySheetAgainstO3Form(props.data, props.headers, (rowIndex) => {
          if (props.onVerificationProgress && rowIndex % updateInterval === 0) {
            const progress = Math.min(90, 10 + Math.round((rowIndex / totalRows) * 80));
            props.onVerificationProgress(progress);
          }
        });
      } else {
        // Use standard verification
        log('Using standard verification for sheet:', props.sheetName);
        verificationResults = await verifySheetData(props.data, props.headers, (rowIndex) => {
          if (props.onVerificationProgress && rowIndex % updateInterval === 0) {
            const progress = Math.min(90, 10 + Math.round((rowIndex / totalRows) * 80));
            props.onVerificationProgress(progress);
          }
        });
      }

      log(`Verification complete, received data for ${Object.keys(verificationResults).length} cells`);
      setLocalVerificationData(verificationResults);

      // Report completion progress
      if (props.onVerificationProgress) {
        props.onVerificationProgress(100);
      }
    } catch (error) {
      console.error('Error verifying data:', error);
      log('Verification failed with error:', error);
    } finally {
      setIsVerifying(false);
      log('Verification process completed');

      // Notify parent component that verification is complete
      if (props.onVerificationComplete && props.sheetName) {
        props.onVerificationComplete(props.sheetName, verificationResults);
      }
    }
  };

  // Custom cell renderer function
  const cellRenderer = (_instance: any, TD: HTMLTableCellElement, row: number, col: number, prop: number | string, value: any, cellProperties: any) => {
    // Get verification data for this cell - ensure it's scoped to the current sheet
    const cellKey = `${row}:${col}`;
    const cellVerificationData = verificationData[cellKey];

    // Log cell rendering with verification status
    if (cellVerificationData) {
      log(`Rendering cell at ${row}:${col} with verification status: ${cellVerificationData.isValid ? 'valid' : 'invalid'}`);
    }

    // Always ensure text is black for readability
    TD.style.color = '#000';

    // Store verification content in the cell's dataset for tooltip access
    if (cellVerificationData?.tooltipContent) {
      TD.dataset.verificationContent = cellVerificationData.tooltipContent;
      log(`Added tooltip content to cell ${row}:${col}`);
    } else {
      delete TD.dataset.verificationContent;
    }

    // Render the cell with verification data
    VerifiedCell({
      value: value !== null && value !== undefined ? String(value) : '',
      verificationData: cellVerificationData,
      row,
      col,
      prop,
      TD,
      cellProperties
    });

    // Create a text node with the value and append it to the cell
    const displayValue = value !== null && value !== undefined ? String(value) : '';
    TD.textContent = displayValue;
    log(`Set cell ${row}:${col} text content to: ${displayValue.substring(0, 20)}${displayValue.length > 20 ? '...' : ''}`);

    return TD;
  };

  // Generate dynamic columns based on data
  const generateColumns = () => {
    if (!props.data || props.data.length === 0) return null;

    // Determine the number of columns from the first row of data
    const numColumns = props.data[0].length;

    return Array.from({ length: numColumns }).map((_, index) => {
      // Determine if the column contains numeric or boolean values
      const isNumeric = props.data.some(row =>
        row[index] !== undefined &&
        row[index] !== null &&
        typeof row[index] === 'number'
      );

      const isBoolean = props.data.some(row =>
        row[index] !== undefined &&
        row[index] !== null &&
        typeof row[index] === 'boolean'
      );

      return (
        <HotColumn
          key={index}
          data={index}
          type={isBoolean ? 'checkbox' : (isNumeric ? 'numeric' : undefined)}
          className={isBoolean ? 'htCenter' : undefined}
          renderer={cellRenderer}
        />
      );
    });
  };

  return (
    <div className="ht-theme-main">
      <HotTable
        data={props.data}
        // Auto-size columns based on content
        autoColumnSize={{
          samplingRatio: 5, // Check more cells per column for better accuracy
          allowSampleDuplicates: false,
          useHeaders: true, // Include headers when calculating column width
        }}
        // Set column widths if provided
        colWidths={props.colWidths}
        // Use headers if provided
        colHeaders={props.headers || true}
        // Set a key based on the sheet name to force re-render when sheet changes
        key={props.sheetName || 'default'}

        // Enable column features
        dropdownMenu={[
          'alignment',
          'filter_by_condition',
          'filter_by_value',
          'filter_action_bar',
          '---------',
          'hidden_columns_hide',
          'hidden_columns_show'
        ]}
        contextMenu={true}
        filters={true}
        columnSorting={true} // Enable column sorting
        manualColumnMove={true} // Enable column moving
        manualColumnResize={true} // Enable column resizing
        hiddenColumns={{
          indicators: true, // Show UI indicators for hidden columns
          copyPasteEnabled: true // Include hidden columns in copy/paste operations
        }}

        // Other settings
        rowHeaders={true}
        manualRowMove={true}
        navigableHeaders={true}
        autoWrapRow={true}
        autoWrapCol={true}
        height={500}
        width="100%"
        // Don't stretch columns to fill width to allow auto-sizing
        stretchH="none"
        imeFastEdit={true}
        licenseKey="non-commercial-and-evaluation"
      >
        {generateColumns()}
      </HotTable>
    </div>
  );
}
