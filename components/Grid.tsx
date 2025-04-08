'use client';

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
