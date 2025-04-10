'use client';

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import Grid from './Grid';
import SheetTabs from './SheetTabs';
import VerificationSummary from './VerificationSummary';
import { SheetVerificationData } from '@/services/verificationService';
import { O3FormVerificationData } from '@/services/o3FormVerificationService';

// Sheet types for different verification methods
enum SheetType {
  STANDARD = 'standard',
  O3_FORM = 'o3form',
  TRANSLATION = 'translation'
}

type SheetData = {
  [key: string]: any[][];
};

type SheetVerificationMap = {
  [sheetName: string]: SheetVerificationData | O3FormVerificationData;
};

export default function ExcelViewer() {
  const [file, setFile] = useState<File | null>(null);
  const [sheetData, setSheetData] = useState<SheetData>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [colWidths, setColWidths] = useState<number[]>([]);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationProgress, setVerificationProgress] = useState<number>(0);
  const [sheetVerifications, setSheetVerifications] = useState<SheetVerificationMap>({});
  const [sheetTypes, setSheetTypes] = useState<{[sheetName: string]: SheetType}>({});
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
    const types: {[sheetName: string]: SheetType} = {};

    names.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      sheets[sheetName] = jsonData as any[][];

      // Determine sheet type based on name
      if (sheetName.toLowerCase().includes('form')) {
        types[sheetName] = SheetType.O3_FORM;
        console.log(`Sheet ${sheetName} identified as O3_FORM type`);
      } else if (sheetName.toLowerCase().includes('translation')) {
        types[sheetName] = SheetType.TRANSLATION;
        console.log(`Sheet ${sheetName} identified as TRANSLATION type`);
      } else {
        // Default to standard verification for all other sheets
        types[sheetName] = SheetType.STANDARD;
        console.log(`Sheet ${sheetName} identified as STANDARD type`);
      }
    });

    setSheetData(sheets);
    setSheetNames(names);
    setSheetTypes(types);

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
    setVerificationProgress(0);
  };

  // Function to manually trigger verification for all sheets
  const triggerVerificationAllSheets = async () => {
    if (sheetNames.length === 0) {
      console.log('No sheets to verify');
      return;
    }

    console.log('Manual verification triggered for all sheets');
    setIsVerifying(true);

    // We'll verify sheets without changing the UI

    // Import the verification services directly to avoid UI flickering
    const { verifySheetData } = await import('@/services/verificationService');
    const { verifySheetAgainstO3Form } = await import('@/services/o3FormVerificationService');

    // Create a function to verify a sheet without changing the UI
    const verifySheet = async (sheetName: string) => {
      console.log(`Starting verification for sheet: ${sheetName}`);

      // Get the sheet data
      const currentSheetData = sheetData[sheetName];
      if (!currentSheetData || currentSheetData.length <= 1) {
        console.log(`Sheet ${sheetName} has no data, skipping`);
        return;
      }

      // Create a temporary Grid component just for verification
      const headers = currentSheetData[0].map(String);
      const data = currentSheetData.slice(1);

      // Perform verification based on sheet type
      try {
        let results;
        const sheetType = sheetTypes[sheetName] || SheetType.STANDARD;

        if (sheetType === SheetType.O3_FORM || sheetType === SheetType.TRANSLATION) {
          console.log(`Using O3 form verification for sheet: ${sheetName}`);
          results = await verifySheetAgainstO3Form(data, headers);
        } else {
          console.log(`Using standard verification for sheet: ${sheetName}`);
          results = await verifySheetData(data, headers);
        }

        console.log(`Verification completed for sheet: ${sheetName}`);

        // Store verification results
        setSheetVerifications(prev => ({
          ...prev,
          [sheetName]: results
        }));
      } catch (error) {
        console.error(`Error verifying sheet ${sheetName}:`, error);
      }
    };

    // Process each sheet sequentially
    for (const sheetName of sheetNames) {
      await verifySheet(sheetName);
      // Small delay between sheets to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Reset verification state when all sheets are processed
    setIsVerifying(false);
  };

  // Handle verification completion
  const handleVerificationComplete = (sheetName: string, verificationData: any) => {
    console.log(`Verification completed for sheet: ${sheetName}`);
    setSheetVerifications(prev => ({
      ...prev,
      [sheetName]: verificationData
    }));
    setIsVerifying(false);
    setVerificationProgress(100);
  };

  // Handle verification progress updates
  const handleVerificationProgress = (progress: number) => {
    setVerificationProgress(progress);
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
          {isVerifying ? 'Verifying...' : 'Verify Current Tab'}
        </button>

        <button
          onClick={triggerVerificationAllSheets}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded ml-2"
          disabled={isVerifying}
        >
          {isVerifying ? 'Verifying...' : 'Verify All Tabs'}
        </button>
      </div>

      {sheetNames.length > 0 && (
        <>
          {activeSheet && sheetData[activeSheet] && (
            <VerificationSummary
              verificationData={sheetVerifications[activeSheet]}
              allSheetsData={sheetVerifications}
              currentSheet={activeSheet}
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
                <div className="mb-2">
                  <div className="flex items-center mb-1">
                    <span className="inline-block mr-2 text-blue-600 animate-spin">⟳</span>
                    <span className="text-blue-600">Verifying UUIDs and datatypes...</span>
                    <span className="ml-2 text-sm text-gray-500">{verificationProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                      style={{ width: `${verificationProgress}%` }}
                    ></div>
                  </div>
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
                onVerificationProgress={handleVerificationProgress}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
