import React, { useState } from 'react';

type VerificationSummaryProps = {
  verificationData: any;
  isVerifying: boolean;
  allSheetsData?: { [sheetName: string]: any };
  currentSheet?: string;
};

type EnvironmentStats = {
  total: number;
  found: number;
  notFound: number;
  percentage: number;
};

type SummaryStats = {
  total: number;
  oclSource: EnvironmentStats;
  oclCollection: EnvironmentStats;
  openmrsDev: EnvironmentStats;
  openmrsUat: EnvironmentStats;
  foundInAny: number;
  notFoundInAny: number;
};

export default function VerificationSummary({ verificationData, isVerifying, allSheetsData, currentSheet }: VerificationSummaryProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  // Calculate summary statistics
  const calculateStats = (): SummaryStats => {
    if (!verificationData || Object.keys(verificationData).length === 0) {
      return {
        total: 0,
        oclSource: { total: 0, found: 0, notFound: 0, percentage: 0 },
        oclCollection: { total: 0, found: 0, notFound: 0, percentage: 0 },
        openmrsDev: { total: 0, found: 0, notFound: 0, percentage: 0 },
        openmrsUat: { total: 0, found: 0, notFound: 0, percentage: 0 },
        foundInAny: 0,
        notFoundInAny: 0
      };
    }

    const stats: SummaryStats = {
      total: 0,
      oclSource: { total: 0, found: 0, notFound: 0, percentage: 0 },
      oclCollection: { total: 0, found: 0, notFound: 0, percentage: 0 },
      openmrsDev: { total: 0, found: 0, notFound: 0, percentage: 0 },
      openmrsUat: { total: 0, found: 0, notFound: 0, percentage: 0 },
      foundInAny: 0,
      notFoundInAny: 0
    };

    // Only process UUID cells (not datatype cells)
    const uuidCells = Object.values(verificationData).filter(
      (cell: any) => cell.verificationDetails && cell.verificationDetails.uuid
    );

    stats.total = uuidCells.length;

    uuidCells.forEach((cell: any) => {
      const details = cell.verificationDetails;

      // OCL Source
      stats.oclSource.total++;
      if (details.sources.oclSource) {
        stats.oclSource.found++;
      } else {
        stats.oclSource.notFound++;
      }

      // OCL Collection
      stats.oclCollection.total++;
      if (details.sources.oclCollection) {
        stats.oclCollection.found++;
      } else {
        stats.oclCollection.notFound++;
      }

      // OpenMRS DEV
      stats.openmrsDev.total++;
      if (details.sources.openmrsDev) {
        stats.openmrsDev.found++;
      } else {
        stats.openmrsDev.notFound++;
      }

      // OpenMRS UAT
      stats.openmrsUat.total++;
      if (details.sources.openmrsUat) {
        stats.openmrsUat.found++;
      } else {
        stats.openmrsUat.notFound++;
      }

      // Found in any / not found in any
      if (details.isValid) {
        stats.foundInAny++;
      } else {
        stats.notFoundInAny++;
      }
    });

    // Calculate percentages
    if (stats.oclSource.total > 0) {
      stats.oclSource.percentage = Math.round((stats.oclSource.found / stats.oclSource.total) * 100);
    }
    if (stats.oclCollection.total > 0) {
      stats.oclCollection.percentage = Math.round((stats.oclCollection.found / stats.oclCollection.total) * 100);
    }
    if (stats.openmrsDev.total > 0) {
      stats.openmrsDev.percentage = Math.round((stats.openmrsDev.found / stats.openmrsDev.total) * 100);
    }
    if (stats.openmrsUat.total > 0) {
      stats.openmrsUat.percentage = Math.round((stats.openmrsUat.found / stats.openmrsUat.total) * 100);
    }

    return stats;
  };

  const stats = calculateStats();

  // Calculate summary stats for all sheets
  const calculateAllSheetsStats = () => {
    if (!allSheetsData) return null;

    const allStats = {
      total: 0,
      foundInAny: 0,
      notFoundInAny: 0,
      sheetStats: {}
    };

    Object.entries(allSheetsData).forEach(([sheetName, sheetData]) => {
      const sheetStats = calculateStats(sheetData);
      allStats.total += sheetStats.total;
      allStats.foundInAny += sheetStats.foundInAny;
      allStats.notFoundInAny += sheetStats.notFoundInAny;
      allStats.sheetStats[sheetName] = {
        total: sheetStats.total,
        found: sheetStats.foundInAny,
        notFound: sheetStats.notFoundInAny,
        percentage: sheetStats.total > 0 ? Math.round((sheetStats.foundInAny / sheetStats.total) * 100) : 0
      };
    });

    return allStats;
  };

  const allSheetsStats = allSheetsData ? calculateAllSheetsStats() : null;

  if (isVerifying) {
    return (
      <div className="bg-gray-100 p-2 rounded-md mb-2 text-sm">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Verification in progress...</h3>
        </div>
      </div>
    );
  }

  if (stats.total === 0 && (!allSheetsStats || allSheetsStats.total === 0)) {
    return (
      <div className="bg-gray-100 p-2 rounded-md mb-2 text-sm">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">No verification data available</h3>
          <button
            className="text-blue-500 hover:text-blue-700 text-xs"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide' : 'Show'}
          </button>
        </div>
        {isExpanded && (
          <p className="mt-1">Click "Verify Current Tab" or "Verify All Tabs" to start verification.</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-100 p-2 rounded-md mb-2 text-sm">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">
          {currentSheet ? `Verification Summary: ${currentSheet}` : 'Verification Summary'}
          {stats.total > 0 && (
            <span className="ml-2 text-xs">
              ({stats.foundInAny} of {stats.total} UUIDs found -
              {stats.total > 0 ? Math.round((stats.foundInAny / stats.total) * 100) : 0}%)
            </span>
          )}
        </h3>
        <button
          className="text-blue-500 hover:text-blue-700 text-xs"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-2">
          {/* Current sheet summary */}
          {stats.total > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span>Current Sheet ({stats.total} UUIDs)</span>
                <span>{stats.foundInAny} found ({stats.total > 0 ? Math.round((stats.foundInAny / stats.total) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-green-600 h-1.5 rounded-full"
                  style={{ width: `${stats.total > 0 ? Math.round((stats.foundInAny / stats.total) * 100) : 0}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <h5 className="text-xs font-semibold mb-1">By Environment</h5>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr>
                        <td className="py-1">OCL Source</td>
                        <td className="py-1 text-right">
                          <span className="text-green-600">{stats.oclSource.found}</span>
                          <span className="text-gray-400"> / </span>
                          <span className="text-red-600">{stats.oclSource.notFound}</span>
                          <span className="text-gray-400 ml-1">({stats.oclSource.percentage}%)</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1">OCL Collection</td>
                        <td className="py-1 text-right">
                          <span className="text-green-600">{stats.oclCollection.found}</span>
                          <span className="text-gray-400"> / </span>
                          <span className="text-red-600">{stats.oclCollection.notFound}</span>
                          <span className="text-gray-400 ml-1">({stats.oclCollection.percentage}%)</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1">OpenMRS DEV</td>
                        <td className="py-1 text-right">
                          <span className="text-green-600">{stats.openmrsDev.found}</span>
                          <span className="text-gray-400"> / </span>
                          <span className="text-red-600">{stats.openmrsDev.notFound}</span>
                          <span className="text-gray-400 ml-1">({stats.openmrsDev.percentage}%)</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1">OpenMRS UAT</td>
                        <td className="py-1 text-right">
                          <span className="text-green-600">{stats.openmrsUat.found}</span>
                          <span className="text-gray-400"> / </span>
                          <span className="text-red-600">{stats.openmrsUat.notFound}</span>
                          <span className="text-gray-400 ml-1">({stats.openmrsUat.percentage}%)</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* All sheets summary */}
          {allSheetsStats && allSheetsStats.total > 0 && (
            <div>
              <h5 className="text-xs font-semibold mb-1">All Sheets Summary</h5>
              <div className="flex justify-between text-xs mb-1">
                <span>Total ({allSheetsStats.total} UUIDs)</span>
                <span>{allSheetsStats.foundInAny} found ({allSheetsStats.total > 0 ? Math.round((allSheetsStats.foundInAny / allSheetsStats.total) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                <div
                  className="bg-blue-600 h-1.5 rounded-full"
                  style={{ width: `${allSheetsStats.total > 0 ? Math.round((allSheetsStats.foundInAny / allSheetsStats.total) * 100) : 0}%` }}
                ></div>
              </div>

              <div className="text-xs">
                <h6 className="font-semibold mb-1">By Sheet</h6>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left py-1">Sheet</th>
                      <th className="text-right py-1">Found</th>
                      <th className="text-right py-1">Total</th>
                      <th className="text-right py-1">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(allSheetsStats.sheetStats).map(([sheetName, stats]: [string, any]) => (
                      <tr key={sheetName} className={sheetName === currentSheet ? 'font-semibold' : ''}>
                        <td className="py-1">{sheetName}</td>
                        <td className="py-1 text-right text-green-600">{stats.found}</td>
                        <td className="py-1 text-right">{stats.total}</td>
                        <td className="py-1 text-right">{stats.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
