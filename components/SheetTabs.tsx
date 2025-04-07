'use client';

import React from 'react';

type SheetTabsProps = {
  sheetNames: string[];
  activeSheet: string;
  onSheetChange: (sheetName: string) => void;
};

export default function SheetTabs({ sheetNames, activeSheet, onSheetChange }: SheetTabsProps) {
  return (
    <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
      {sheetNames.map((sheetName) => (
        <button
          key={sheetName}
          className={`py-2 px-4 text-sm font-medium ${
            activeSheet === sheetName
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => onSheetChange(sheetName)}
        >
          {sheetName}
        </button>
      ))}
    </div>
  );
}
