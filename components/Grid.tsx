'use client';

import {
  AutoColumnSize,
  Autofill,
  ContextMenu,
  CopyPaste,
  DropdownMenu,
  Filters,
  HiddenRows,
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
registerPlugin(HiddenRows);

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
        colWidths={props.colWidths || Array(props.data[0]?.length || 0).fill(100)}
        colHeaders={props.headers || true}
        dropdownMenu={true}
        contextMenu={true}
        filters={true}
        rowHeaders={true}
        manualRowMove={true}
        navigableHeaders={true}
        autoWrapRow={true}
        autoWrapCol={true}
        height={500}
        width="100%"
        stretchH="all"
        imeFastEdit={true}
        licenseKey="non-commercial-and-evaluation"
      >
        {generateColumns()}
      </HotTable>
    </div>
  );
}
