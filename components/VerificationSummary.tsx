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
  // UUID statistics
  uuidTotal: number;
  uuidFoundInAll: number;
  uuidFoundInAny: number;
  uuidNotFoundInAny: number;
  uuidNotFoundIndicators: number;
  uuidDiscrepancies: number;

  // Datatype statistics
  datatypeTotal: number;
  datatypeMatched: number;
  datatypeMismatched: number;

  // Environment statistics
  oclSource: EnvironmentStats;
  oclCollection: EnvironmentStats;
  openmrsDev: EnvironmentStats;
  openmrsUat: EnvironmentStats;

  // Computed totals
  total: number;
  foundInAny: number;
};

type SheetStats = {
  uuidTotal: number;
  uuidFoundInAll: number;
  uuidFoundInAny: number;
  uuidNotFoundInAny: number;
  uuidNotFoundIndicators: number;
  uuidDiscrepancies: number;
  datatypeTotal: number;
  datatypeMatched: number;
  datatypeMismatched: number;
  percentage: number;
};

export default function VerificationSummary({ verificationData, isVerifying, allSheetsData, currentSheet }: VerificationSummaryProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  // Calculate summary statistics
  const calculateStats = (data?: any): SummaryStats => {
    const verificationDataToUse = data || verificationData;
    if (!verificationDataToUse || Object.keys(verificationDataToUse).length === 0) {
      return {
        // UUID statistics
        uuidTotal: 0,
        uuidFoundInAll: 0,
        uuidFoundInAny: 0,
        uuidNotFoundInAny: 0,
        uuidNotFoundIndicators: 0,
        uuidDiscrepancies: 0,

        // Datatype statistics
        datatypeTotal: 0,
        datatypeMatched: 0,
        datatypeMismatched: 0,

        // Computed totals
        total: 0,
        foundInAny: 0,

        // Environment statistics
        oclSource: { total: 0, found: 0, notFound: 0, percentage: 0 },
        oclCollection: { total: 0, found: 0, notFound: 0, percentage: 0 },
        openmrsDev: { total: 0, found: 0, notFound: 0, percentage: 0 },
        openmrsUat: { total: 0, found: 0, notFound: 0, percentage: 0 }
      };
    }

    const stats: SummaryStats = {
      // UUID statistics
      uuidTotal: 0,
      uuidFoundInAll: 0,
      uuidFoundInAny: 0,
      uuidNotFoundInAny: 0,
      uuidNotFoundIndicators: 0,
      uuidDiscrepancies: 0,

      // Datatype statistics
      datatypeTotal: 0,
      datatypeMatched: 0,
      datatypeMismatched: 0,

      // Computed totals
      total: 0,
      foundInAny: 0,

      // Environment statistics
      oclSource: { total: 0, found: 0, notFound: 0, percentage: 0 },
      oclCollection: { total: 0, found: 0, notFound: 0, percentage: 0 },
      openmrsDev: { total: 0, found: 0, notFound: 0, percentage: 0 },
      openmrsUat: { total: 0, found: 0, notFound: 0, percentage: 0 }
    };

    // Separate UUID cells and datatype cells
    const allCells = Object.values(verificationDataToUse);
    const uuidCells = allCells.filter(
      (cell: any) => cell.verificationDetails && cell.verificationDetails.uuid && !cell.verificationDetails.isDatatype
    );
    const datatypeCells = allCells.filter(
      (cell: any) => cell.verificationDetails && cell.verificationDetails.isDatatype
    );

    stats.uuidTotal = uuidCells.length;
    stats.datatypeTotal = datatypeCells.length;

    // Process UUID cells
    uuidCells.forEach((cell: any) => {
      const details = cell.verificationDetails;

      // Check if this is a not-found indicator
      if (cell.isNotFoundIndicator || details.notFoundIndicator) {
        stats.uuidNotFoundIndicators++;
        stats.uuidNotFoundInAny++;

        // Not-found indicators count as not found in all systems
        stats.oclSource.total++;
        stats.oclSource.notFound++;
        stats.oclCollection.total++;
        stats.oclCollection.notFound++;
        stats.openmrsDev.total++;
        stats.openmrsDev.notFound++;
        stats.openmrsUat.total++;
        stats.openmrsUat.notFound++;

        return; // Skip the rest of the processing for this cell
      }

      // OCL Source
      stats.oclSource.total++;
      if (details.sources.oclSource && details.sources.oclSource.exists) {
        stats.oclSource.found++;
      } else {
        stats.oclSource.notFound++;
      }

      // OCL Collection
      stats.oclCollection.total++;
      if (details.sources.oclCollection && details.sources.oclCollection.exists) {
        stats.oclCollection.found++;
      } else {
        stats.oclCollection.notFound++;
      }

      // OpenMRS DEV
      stats.openmrsDev.total++;
      if (details.sources.openmrsDev && details.sources.openmrsDev.exists) {
        stats.openmrsDev.found++;
      } else {
        stats.openmrsDev.notFound++;
      }

      // OpenMRS UAT
      stats.openmrsUat.total++;
      if (details.sources.openmrsUat && details.sources.openmrsUat.exists) {
        stats.openmrsUat.found++;
      } else {
        stats.openmrsUat.notFound++;
      }

      // Track various verification statuses
      if (details.isValid) {
        stats.uuidFoundInAll++; // Found in all systems
        stats.uuidFoundInAny++;
      } else if (cell.hasDiscrepancy) {
        stats.uuidDiscrepancies++; // Found in some systems but not all
        stats.uuidFoundInAny++;
      } else {
        stats.uuidNotFoundInAny++; // Not found in any system
      }
    });

    // Process datatype cells
    datatypeCells.forEach((cell: any) => {
      if (cell.isValid) {
        stats.datatypeMatched++;
      } else {
        stats.datatypeMismatched++;
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

    // Calculate computed totals
    stats.total = stats.uuidTotal + stats.datatypeTotal;
    stats.foundInAny = stats.uuidFoundInAny;
    return stats;
  };

  const stats = calculateStats();

  // Calculate summary stats for all sheets
  const calculateAllSheetsStats = () => {
    if (!allSheetsData) return null;

    const allStats = {
      // UUID statistics
      uuidTotal: 0,
      uuidFoundInAll: 0,
      uuidFoundInAny: 0,
      uuidNotFoundInAny: 0,
      uuidNotFoundIndicators: 0,
      uuidDiscrepancies: 0,

      // Datatype statistics
      datatypeTotal: 0,
      datatypeMatched: 0,
      datatypeMismatched: 0,

      // Computed totals
      total: 0,
      foundInAny: 0,

      // Sheet statistics
      sheetStats: {} as Record<string, SheetStats>
    };

    Object.entries(allSheetsData).forEach(([sheetName, sheetData]) => {
      const sheetStats = calculateStats(sheetData);

      // Accumulate UUID statistics
      allStats.uuidTotal += sheetStats.uuidTotal;
      allStats.uuidFoundInAll += sheetStats.uuidFoundInAll;
      allStats.uuidFoundInAny += sheetStats.uuidFoundInAny;
      allStats.uuidNotFoundInAny += sheetStats.uuidNotFoundInAny;
      allStats.uuidNotFoundIndicators += sheetStats.uuidNotFoundIndicators;
      allStats.uuidDiscrepancies += sheetStats.uuidDiscrepancies;

      // Accumulate datatype statistics
      allStats.datatypeTotal += sheetStats.datatypeTotal;
      allStats.datatypeMatched += sheetStats.datatypeMatched;
      allStats.datatypeMismatched += sheetStats.datatypeMismatched;

      // Store sheet-specific statistics
      allStats.sheetStats[sheetName] = {
        uuidTotal: sheetStats.uuidTotal,
        uuidFoundInAll: sheetStats.uuidFoundInAll,
        uuidFoundInAny: sheetStats.uuidFoundInAny,
        uuidNotFoundInAny: sheetStats.uuidNotFoundInAny,
        uuidNotFoundIndicators: sheetStats.uuidNotFoundIndicators,
        uuidDiscrepancies: sheetStats.uuidDiscrepancies,
        datatypeTotal: sheetStats.datatypeTotal,
        datatypeMatched: sheetStats.datatypeMatched,
        datatypeMismatched: sheetStats.datatypeMismatched,
        percentage: sheetStats.uuidTotal > 0 ? Math.round((sheetStats.uuidFoundInAll / sheetStats.uuidTotal) * 100) : 0
      };
    });

    // Calculate computed totals
    allStats.total = allStats.uuidTotal + allStats.datatypeTotal;
    allStats.foundInAny = allStats.uuidFoundInAny;
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
          {stats.uuidTotal > 0 && (
            <div className="mb-3">
              {/* UUID Summary */}
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold">UUIDs ({stats.uuidTotal})</span>
                  <span>
                    {stats.uuidFoundInAll} verified ({stats.uuidTotal > 0 ? Math.round((stats.uuidFoundInAll / stats.uuidTotal) * 100) : 0}%)
                    {stats.uuidDiscrepancies > 0 && (
                      <span className="ml-2 text-yellow-500">({stats.uuidDiscrepancies} discrepancies)</span>
                    )}
                    {stats.uuidNotFoundInAny > 0 && (
                      <span className="ml-2 text-red-500">({stats.uuidNotFoundInAny} not found)</span>
                    )}
                    {stats.uuidNotFoundIndicators > 0 && (
                      <span className="ml-2 text-orange-500">({stats.uuidNotFoundIndicators} N/A)</span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="relative w-full h-1.5">
                    {/* Green bar for fully verified */}
                    <div
                      className="absolute bg-green-600 h-1.5 rounded-l-full"
                      style={{ width: `${stats.uuidTotal > 0 ? Math.round((stats.uuidFoundInAll / stats.uuidTotal) * 100) : 0}%` }}
                    ></div>
                    {/* Yellow bar for discrepancies (found in some systems) */}
                    <div
                      className="absolute bg-yellow-500 h-1.5"
                      style={{
                        left: `${stats.uuidTotal > 0 ? Math.round((stats.uuidFoundInAll / stats.uuidTotal) * 100) : 0}%`,
                        width: `${stats.uuidTotal > 0 ? Math.round((stats.uuidDiscrepancies / stats.uuidTotal) * 100) : 0}%`
                      }}
                    ></div>
                    {/* Red bar for not found */}
                    <div
                      className="absolute bg-red-500 h-1.5"
                      style={{
                        left: `${stats.uuidTotal > 0 ? Math.round(((stats.uuidFoundInAll + stats.uuidDiscrepancies) / stats.uuidTotal) * 100) : 0}%`,
                        width: `${stats.uuidTotal > 0 ? Math.round((stats.uuidNotFoundInAny / stats.uuidTotal) * 100) : 0}%`
                      }}
                    ></div>
                    {/* Orange bar for not-found indicators */}
                    <div
                      className="absolute bg-orange-500 h-1.5 rounded-r-full"
                      style={{
                        left: `${stats.uuidTotal > 0 ? Math.round(((stats.uuidFoundInAll + stats.uuidDiscrepancies + stats.uuidNotFoundInAny) / stats.uuidTotal) * 100) : 0}%`,
                        width: `${stats.uuidTotal > 0 ? Math.round((stats.uuidNotFoundIndicators / stats.uuidTotal) * 100) : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Datatype Summary */}
              {stats.datatypeTotal > 0 && (
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold">Datatypes ({stats.datatypeTotal})</span>
                    <span>
                      {stats.datatypeMatched} matched ({stats.datatypeTotal > 0 ? Math.round((stats.datatypeMatched / stats.datatypeTotal) * 100) : 0}%)
                      {stats.datatypeMismatched > 0 && (
                        <span className="ml-2 text-red-500">({stats.datatypeMismatched} mismatched)</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="relative w-full h-1.5">
                      {/* Green bar for matched datatypes */}
                      <div
                        className="absolute bg-green-600 h-1.5 rounded-l-full"
                        style={{ width: `${stats.datatypeTotal > 0 ? Math.round((stats.datatypeMatched / stats.datatypeTotal) * 100) : 0}%` }}
                      ></div>
                      {/* Red bar for mismatched datatypes */}
                      <div
                        className="absolute bg-red-500 h-1.5 rounded-r-full"
                        style={{
                          left: `${stats.datatypeTotal > 0 ? Math.round((stats.datatypeMatched / stats.datatypeTotal) * 100) : 0}%`,
                          width: `${stats.datatypeTotal > 0 ? Math.round((stats.datatypeMismatched / stats.datatypeTotal) * 100) : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-2">
                <h5 className="text-xs font-semibold mb-1">By Environment</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-left py-1">Source</th>
                        <th className="text-right py-1">UUIDs Found</th>
                        <th className="text-right py-1">UUIDs %</th>
                        <th className="text-right py-1">Datatypes Match</th>
                        <th className="text-right py-1">Datatypes %</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-1">OCL Source</td>
                        <td className="py-1 text-right">
                          <span className="text-green-600">{stats.oclSource.found}</span>
                          <span className="text-gray-400"> / </span>
                          <span>{stats.oclSource.total}</span>
                        </td>
                        <td className="py-1 text-right">
                          <div className="inline-block w-8 h-1.5 bg-gray-200 rounded-full mr-1">
                            <div
                              className="h-1.5 bg-green-600 rounded-full"
                              style={{ width: `${stats.oclSource.percentage}%` }}
                            ></div>
                          </div>
                          {stats.oclSource.percentage}%
                        </td>
                        <td className="py-1 text-right">
                          {stats.datatypeTotal > 0 ? (
                            <>
                              <span className="text-green-600">{Math.round((stats.datatypeMatched * stats.oclSource.found) / stats.oclSource.total)}</span>
                              <span className="text-gray-400"> / </span>
                              <span>{stats.oclSource.found}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="py-1 text-right">
                          {stats.datatypeTotal > 0 && stats.oclSource.found > 0 ? (
                            <>
                              <div className="inline-block w-8 h-1.5 bg-gray-200 rounded-full mr-1">
                                <div
                                  className="h-1.5 bg-green-600 rounded-full"
                                  style={{ width: `${Math.round((stats.datatypeMatched * 100) / stats.oclSource.found)}%` }}
                                ></div>
                              </div>
                              {Math.round((stats.datatypeMatched * 100) / stats.oclSource.found)}%
                            </>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1">OCL Collection</td>
                        <td className="py-1 text-right">
                          <span className="text-green-600">{stats.oclCollection.found}</span>
                          <span className="text-gray-400"> / </span>
                          <span>{stats.oclCollection.total}</span>
                        </td>
                        <td className="py-1 text-right">
                          <div className="inline-block w-8 h-1.5 bg-gray-200 rounded-full mr-1">
                            <div
                              className="h-1.5 bg-green-600 rounded-full"
                              style={{ width: `${stats.oclCollection.percentage}%` }}
                            ></div>
                          </div>
                          {stats.oclCollection.percentage}%
                        </td>
                        <td className="py-1 text-right">
                          {stats.datatypeTotal > 0 ? (
                            <>
                              <span className="text-green-600">{Math.round((stats.datatypeMatched * stats.oclCollection.found) / stats.oclCollection.total)}</span>
                              <span className="text-gray-400"> / </span>
                              <span>{stats.oclCollection.found}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="py-1 text-right">
                          {stats.datatypeTotal > 0 && stats.oclCollection.found > 0 ? (
                            <>
                              <div className="inline-block w-8 h-1.5 bg-gray-200 rounded-full mr-1">
                                <div
                                  className="h-1.5 bg-green-600 rounded-full"
                                  style={{ width: `${Math.round((stats.datatypeMatched * 100) / stats.oclCollection.found)}%` }}
                                ></div>
                              </div>
                              {Math.round((stats.datatypeMatched * 100) / stats.oclCollection.found)}%
                            </>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1">OpenMRS DEV</td>
                        <td className="py-1 text-right">
                          <span className="text-green-600">{stats.openmrsDev.found}</span>
                          <span className="text-gray-400"> / </span>
                          <span>{stats.openmrsDev.total}</span>
                        </td>
                        <td className="py-1 text-right">
                          <div className="inline-block w-8 h-1.5 bg-gray-200 rounded-full mr-1">
                            <div
                              className="h-1.5 bg-green-600 rounded-full"
                              style={{ width: `${stats.openmrsDev.percentage}%` }}
                            ></div>
                          </div>
                          {stats.openmrsDev.percentage}%
                        </td>
                        <td className="py-1 text-right">
                          {stats.datatypeTotal > 0 ? (
                            <>
                              <span className="text-green-600">{Math.round((stats.datatypeMatched * stats.openmrsDev.found) / stats.openmrsDev.total)}</span>
                              <span className="text-gray-400"> / </span>
                              <span>{stats.openmrsDev.found}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="py-1 text-right">
                          {stats.datatypeTotal > 0 && stats.openmrsDev.found > 0 ? (
                            <>
                              <div className="inline-block w-8 h-1.5 bg-gray-200 rounded-full mr-1">
                                <div
                                  className="h-1.5 bg-green-600 rounded-full"
                                  style={{ width: `${Math.round((stats.datatypeMatched * 100) / stats.openmrsDev.found)}%` }}
                                ></div>
                              </div>
                              {Math.round((stats.datatypeMatched * 100) / stats.openmrsDev.found)}%
                            </>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1">OpenMRS UAT</td>
                        <td className="py-1 text-right">
                          <span className="text-green-600">{stats.openmrsUat.found}</span>
                          <span className="text-gray-400"> / </span>
                          <span>{stats.openmrsUat.total}</span>
                        </td>
                        <td className="py-1 text-right">
                          <div className="inline-block w-8 h-1.5 bg-gray-200 rounded-full mr-1">
                            <div
                              className="h-1.5 bg-green-600 rounded-full"
                              style={{ width: `${stats.openmrsUat.percentage}%` }}
                            ></div>
                          </div>
                          {stats.openmrsUat.percentage}%
                        </td>
                        <td className="py-1 text-right">
                          {stats.datatypeTotal > 0 ? (
                            <>
                              <span className="text-green-600">{Math.round((stats.datatypeMatched * stats.openmrsUat.found) / stats.openmrsUat.total)}</span>
                              <span className="text-gray-400"> / </span>
                              <span>{stats.openmrsUat.found}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="py-1 text-right">
                          {stats.datatypeTotal > 0 && stats.openmrsUat.found > 0 ? (
                            <>
                              <div className="inline-block w-8 h-1.5 bg-gray-200 rounded-full mr-1">
                                <div
                                  className="h-1.5 bg-green-600 rounded-full"
                                  style={{ width: `${Math.round((stats.datatypeMatched * 100) / stats.openmrsUat.found)}%` }}
                                ></div>
                              </div>
                              {Math.round((stats.datatypeMatched * 100) / stats.openmrsUat.found)}%
                            </>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* All sheets summary */}
          {allSheetsStats && allSheetsStats.uuidTotal > 0 && (
            <div>
              <h5 className="text-xs font-semibold mb-1">All Sheets Summary</h5>

              {/* UUID Summary */}
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold">UUIDs ({allSheetsStats.uuidTotal})</span>
                  <span>
                    {allSheetsStats.uuidFoundInAll} verified ({allSheetsStats.uuidTotal > 0 ? Math.round((allSheetsStats.uuidFoundInAll / allSheetsStats.uuidTotal) * 100) : 0}%)
                    {allSheetsStats.uuidDiscrepancies > 0 && (
                      <span className="ml-2 text-yellow-500">({allSheetsStats.uuidDiscrepancies} discrepancies)</span>
                    )}
                    {allSheetsStats.uuidNotFoundInAny > 0 && (
                      <span className="ml-2 text-red-500">({allSheetsStats.uuidNotFoundInAny} not found)</span>
                    )}
                    {allSheetsStats.uuidNotFoundIndicators > 0 && (
                      <span className="ml-2 text-orange-500">({allSheetsStats.uuidNotFoundIndicators} N/A)</span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="relative w-full h-1.5">
                    {/* Green bar for fully verified */}
                    <div
                      className="absolute bg-green-600 h-1.5 rounded-l-full"
                      style={{ width: `${allSheetsStats.uuidTotal > 0 ? Math.round((allSheetsStats.uuidFoundInAll / allSheetsStats.uuidTotal) * 100) : 0}%` }}
                    ></div>
                    {/* Yellow bar for discrepancies (found in some systems) */}
                    <div
                      className="absolute bg-yellow-500 h-1.5"
                      style={{
                        left: `${allSheetsStats.uuidTotal > 0 ? Math.round((allSheetsStats.uuidFoundInAll / allSheetsStats.uuidTotal) * 100) : 0}%`,
                        width: `${allSheetsStats.uuidTotal > 0 ? Math.round((allSheetsStats.uuidDiscrepancies / allSheetsStats.uuidTotal) * 100) : 0}%`
                      }}
                    ></div>
                    {/* Red bar for not found */}
                    <div
                      className="absolute bg-red-500 h-1.5"
                      style={{
                        left: `${allSheetsStats.uuidTotal > 0 ? Math.round(((allSheetsStats.uuidFoundInAll + allSheetsStats.uuidDiscrepancies) / allSheetsStats.uuidTotal) * 100) : 0}%`,
                        width: `${allSheetsStats.uuidTotal > 0 ? Math.round((allSheetsStats.uuidNotFoundInAny / allSheetsStats.uuidTotal) * 100) : 0}%`
                      }}
                    ></div>
                    {/* Orange bar for not-found indicators */}
                    <div
                      className="absolute bg-orange-500 h-1.5 rounded-r-full"
                      style={{
                        left: `${allSheetsStats.uuidTotal > 0 ? Math.round(((allSheetsStats.uuidFoundInAll + allSheetsStats.uuidDiscrepancies + allSheetsStats.uuidNotFoundInAny) / allSheetsStats.uuidTotal) * 100) : 0}%`,
                        width: `${allSheetsStats.uuidTotal > 0 ? Math.round((allSheetsStats.uuidNotFoundIndicators / allSheetsStats.uuidTotal) * 100) : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Datatype Summary */}
              {allSheetsStats.datatypeTotal > 0 && (
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold">Datatypes ({allSheetsStats.datatypeTotal})</span>
                    <span>
                      {allSheetsStats.datatypeMatched} matched ({allSheetsStats.datatypeTotal > 0 ? Math.round((allSheetsStats.datatypeMatched / allSheetsStats.datatypeTotal) * 100) : 0}%)
                      {allSheetsStats.datatypeMismatched > 0 && (
                        <span className="ml-2 text-red-500">({allSheetsStats.datatypeMismatched} mismatched)</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="relative w-full h-1.5">
                      {/* Green bar for matched datatypes */}
                      <div
                        className="absolute bg-green-600 h-1.5 rounded-l-full"
                        style={{ width: `${allSheetsStats.datatypeTotal > 0 ? Math.round((allSheetsStats.datatypeMatched / allSheetsStats.datatypeTotal) * 100) : 0}%` }}
                      ></div>
                      {/* Red bar for mismatched datatypes */}
                      <div
                        className="absolute bg-red-500 h-1.5 rounded-r-full"
                        style={{
                          left: `${allSheetsStats.datatypeTotal > 0 ? Math.round((allSheetsStats.datatypeMatched / allSheetsStats.datatypeTotal) * 100) : 0}%`,
                          width: `${allSheetsStats.datatypeTotal > 0 ? Math.round((allSheetsStats.datatypeMismatched / allSheetsStats.datatypeTotal) * 100) : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs">
                <h6 className="font-semibold mb-1">By Sheet</h6>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left py-1">Sheet</th>
                      <th className="text-right py-1">Verified</th>
                      <th className="text-right py-1">Discrepancies</th>
                      <th className="text-right py-1">Not Found</th>
                      <th className="text-right py-1">Total</th>
                      <th className="text-right py-1">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(allSheetsStats.sheetStats).map(([sheetName, stats]: [string, any]) => (
                      <tr key={sheetName} className={sheetName === currentSheet ? 'font-semibold' : ''}>
                        <td className="py-1">{sheetName}</td>
                        <td className="py-1 text-right text-green-600">{stats.uuidFoundInAll}</td>
                        <td className="py-1 text-right text-yellow-500">{stats.uuidDiscrepancies}</td>
                        <td className="py-1 text-right text-red-600">{stats.uuidNotFoundInAny}</td>
                        <td className="py-1 text-right">{stats.uuidTotal}</td>
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
