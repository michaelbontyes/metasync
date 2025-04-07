'use client';

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import Grid from './Grid';
import SheetTabs from './SheetTabs';

type SheetData = {
  [key: string]: any[][];
};

export default function ExcelViewer() {
  const [file, setFile] = useState<File | null>(null);
  const [sheetData, setSheetData] = useState<SheetData>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [colWidths, setColWidths] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load the example file automatically on component mount
  useEffect(() => {
    const loadExampleFile = async () => {
      try {
        const response = await fetch('/metadata-example.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        parseExcel(arrayBuffer);
      } catch (error) {
        console.error('Error loading example file:', error);
      }
    };

    loadExampleFile();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        if (data) {
          parseExcel(data as ArrayBuffer);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const parseExcel = (data: ArrayBuffer) => {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheets: SheetData = {};
    const names: string[] = workbook.SheetNames;

    names.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      sheets[sheetName] = jsonData as any[][];
    });

    setSheetData(sheets);
    setSheetNames(names);
    
    if (names.length > 0) {
      setActiveSheet(names[0]);
      
      // Set headers from the first row of the first sheet
      const firstSheetData = sheets[names[0]];
      if (firstSheetData && firstSheetData.length > 0) {
        const headerRow = firstSheetData[0];
        setHeaders(headerRow.map(String));
        
        // Generate column widths based on header length
        setColWidths(headerRow.map(header => 
          Math.max(100, String(header).length * 10)
        ));
      }
    }
  };

  const handleSheetChange = (sheetName: string) => {
    setActiveSheet(sheetName);
    
    // Update headers when changing sheets
    const currentSheetData = sheetData[sheetName];
    if (currentSheetData && currentSheetData.length > 0) {
      const headerRow = currentSheetData[0];
      setHeaders(headerRow.map(String));
      
      // Generate column widths based on header length
      setColWidths(headerRow.map(header => 
        Math.max(100, String(header).length * 10)
      ));
    }
  };

  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="mb-4 flex items-center">
        <button 
          onClick={handleFileUploadClick}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
        >
          Upload Excel File
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx, .xls"
          className="hidden"
        />
        {file && <span className="text-gray-700">{file.name}</span>}
        {!file && sheetNames.length > 0 && <span className="text-gray-700">metadata-example.xlsx (loaded automatically)</span>}
      </div>

      {sheetNames.length > 0 && (
        <>
          <SheetTabs 
            sheetNames={sheetNames} 
            activeSheet={activeSheet} 
            onSheetChange={handleSheetChange} 
          />
          
          {activeSheet && sheetData[activeSheet] && (
            <Grid 
              data={sheetData[activeSheet].slice(1)} // Skip header row
              headers={headers}
              colWidths={colWidths}
            />
          )}
        </>
      )}
    </div>
  );
}
