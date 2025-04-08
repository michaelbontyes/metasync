'use client';

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import Grid from './Grid';
import SheetTabs from './SheetTabs';
import VerificationSummary from './VerificationSummary';

type SheetData = {
  [key: string]: any[][];
};

type SheetVerificationMap = {
  [sheetName: string]: any; // Verification data for each sheet
};

export default function ExcelViewer() {
  const [file, setFile] = useState<File | null>(null);
  const [sheetData, setSheetData] = useState<SheetData>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [colWidths, setColWidths] = useState<number[]>([]);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [sheetVerifications, setSheetVerifications] = useState<SheetVerificationMap>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to load the example file
  const loadExampleFile = async () => {
    try {
      console.log('Loading metadata-example.xlsx file...');
      // Add cache-busting query parameter to ensure we get the latest version
      const timestamp = new Date().getTime();
      const response = await fetch(`/metadata-example.xlsx?t=${timestamp}`, {
        cache: 'no-store' // Tell the browser not to use cached version
      });

      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      parseExcel(arrayBuffer, false); // Don't trigger verification automatically
      console.log('Successfully loaded metadata-example.xlsx file');
    } catch (error) {
      console.error('Error loading example file:', error);
    }
  };

  // Load the example file automatically on component mount
  useEffect(() => {
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
          parseExcel(data as ArrayBuffer, false); // Don't trigger verification automatically
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const parseExcel = (data: ArrayBuffer, triggerVerification: boolean = true) => {
    if (triggerVerification) {
      setIsVerifying(true);
    }
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

  // Function to manually trigger verification for the current sheet only
  const triggerVerification = () => {
    if (!activeSheet) {
      console.log('No active sheet to verify');
      return;
    }

    console.log(`Manual verification triggered for sheet: ${activeSheet}`);
    setIsVerifying(true);
  };

  // Handle verification completion
  const handleVerificationComplete = (sheetName: string, verificationData: any) => {
    console.log(`Verification completed for sheet: ${sheetName}`);
    setSheetVerifications(prev => ({
      ...prev,
      [sheetName]: verificationData
    }));
    setIsVerifying(false);
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

        <button
          onClick={triggerVerification}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ml-4"
          disabled={isVerifying}
        >
          {isVerifying ? 'Verifying...' : 'Verify Metadata'}
        </button>
      </div>

      {sheetNames.length > 0 && (
        <>
          {activeSheet && sheetData[activeSheet] && (
            <VerificationSummary
              verificationData={sheetVerifications[activeSheet]}
              isVerifying={isVerifying}
            />
          )}

          <SheetTabs
            sheetNames={sheetNames}
            activeSheet={activeSheet}
            onSheetChange={handleSheetChange}
          />

          {activeSheet && sheetData[activeSheet] && (
            <>
              {isVerifying && (
                <div className="mb-2 text-blue-600">
                  <span className="inline-block mr-2 animate-spin">⟳</span>
                  Verifying UUIDs and datatypes...
                </div>
              )}
              <Grid
                data={sheetData[activeSheet].slice(1)} // Skip header row
                headers={headers}
                colWidths={colWidths}
                isVerifying={isVerifying}
                verificationData={sheetVerifications[activeSheet]}
                sheetName={activeSheet}
                onVerificationComplete={handleVerificationComplete}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
