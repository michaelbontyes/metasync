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
import { VerifiedCell } from './VerifiedCell';

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
};

export default function Grid(props: GridProps) {
  // State for verification data
  const [verificationData, setVerificationData] = useState<SheetVerificationData>({});
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Effect to verify data when it changes
  useEffect(() => {
    if (props.data && props.data.length > 0 && props.headers) {
      verifyData();
    }
  }, [props.data, props.headers]);

  // Function to verify data
  const verifyData = async () => {
    if (isVerifying || !props.data || !props.headers) return;

    setIsVerifying(true);
    try {
      const results = await verifySheetData(props.data, props.headers);
      setVerificationData(results);
    } catch (error) {
      console.error('Error verifying data:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  // Custom cell renderer function
  const cellRenderer = (_instance: any, TD: HTMLTableCellElement, row: number, col: number, prop: number | string, value: any, cellProperties: any) => {
    // Get verification data for this cell
    const cellKey = `${row}:${col}`;
    const cellVerificationData = verificationData[cellKey];

    // Always ensure text is black for readability
    TD.style.color = '#000';

    // Store verification content in the cell's dataset for tooltip access
    if (cellVerificationData?.tooltipContent) {
      TD.dataset.verificationContent = cellVerificationData.tooltipContent;
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
    TD.textContent = value !== null && value !== undefined ? String(value) : '';

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
        // Don't set fixed column widths to allow auto-sizing
        colHeaders={props.headers || true}

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
