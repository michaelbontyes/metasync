import React from 'react';

type VerificationSummaryProps = {
  verificationData: any;
  isVerifying: boolean;
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

export default function VerificationSummary({ verificationData, isVerifying }: VerificationSummaryProps) {
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

  if (isVerifying) {
    return (
      <div className="bg-gray-100 p-4 rounded-md mb-4">
        <h3 className="text-lg font-semibold mb-2">Verification in progress...</h3>
      </div>
    );
  }

  if (stats.total === 0) {
    return (
      <div className="bg-gray-100 p-4 rounded-md mb-4">
        <h3 className="text-lg font-semibold mb-2">No verification data available</h3>
        <p>Click "Verify Metadata" to start verification.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 p-4 rounded-md mb-4">
      <h3 className="text-lg font-semibold mb-2">Verification Summary</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <div className="bg-white p-3 rounded shadow">
          <div className="text-sm text-gray-500">Total UUIDs</div>
          <div className="text-xl font-bold">{stats.total}</div>
        </div>
        
        <div className="bg-white p-3 rounded shadow">
          <div className="text-sm text-gray-500">Found in Any</div>
          <div className="text-xl font-bold text-green-600">{stats.foundInAny}</div>
          <div className="text-xs text-gray-500">
            {stats.total > 0 ? Math.round((stats.foundInAny / stats.total) * 100) : 0}%
          </div>
        </div>
        
        <div className="bg-white p-3 rounded shadow">
          <div className="text-sm text-gray-500">Not Found</div>
          <div className="text-xl font-bold text-red-600">{stats.notFoundInAny}</div>
          <div className="text-xs text-gray-500">
            {stats.total > 0 ? Math.round((stats.notFoundInAny / stats.total) * 100) : 0}%
          </div>
        </div>
      </div>
      
      <h4 className="font-semibold mt-4 mb-2">Results by Environment</h4>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-2 px-4 text-left">Environment</th>
              <th className="py-2 px-4 text-center">Found</th>
              <th className="py-2 px-4 text-center">Not Found</th>
              <th className="py-2 px-4 text-center">Success Rate</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm">
            <tr className="border-b border-gray-200 hover:bg-gray-100">
              <td className="py-2 px-4 text-left">OCL Source</td>
              <td className="py-2 px-4 text-center text-green-600 font-semibold">{stats.oclSource.found}</td>
              <td className="py-2 px-4 text-center text-red-600 font-semibold">{stats.oclSource.notFound}</td>
              <td className="py-2 px-4 text-center">
                <div className="flex items-center justify-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ width: `${stats.oclSource.percentage}%` }}
                    ></div>
                  </div>
                  <span className="ml-2">{stats.oclSource.percentage}%</span>
                </div>
              </td>
            </tr>
            <tr className="border-b border-gray-200 hover:bg-gray-100">
              <td className="py-2 px-4 text-left">OCL Collection</td>
              <td className="py-2 px-4 text-center text-green-600 font-semibold">{stats.oclCollection.found}</td>
              <td className="py-2 px-4 text-center text-red-600 font-semibold">{stats.oclCollection.notFound}</td>
              <td className="py-2 px-4 text-center">
                <div className="flex items-center justify-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ width: `${stats.oclCollection.percentage}%` }}
                    ></div>
                  </div>
                  <span className="ml-2">{stats.oclCollection.percentage}%</span>
                </div>
              </td>
            </tr>
            <tr className="border-b border-gray-200 hover:bg-gray-100">
              <td className="py-2 px-4 text-left">OpenMRS DEV</td>
              <td className="py-2 px-4 text-center text-green-600 font-semibold">{stats.openmrsDev.found}</td>
              <td className="py-2 px-4 text-center text-red-600 font-semibold">{stats.openmrsDev.notFound}</td>
              <td className="py-2 px-4 text-center">
                <div className="flex items-center justify-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ width: `${stats.openmrsDev.percentage}%` }}
                    ></div>
                  </div>
                  <span className="ml-2">{stats.openmrsDev.percentage}%</span>
                </div>
              </td>
            </tr>
            <tr className="border-b border-gray-200 hover:bg-gray-100">
              <td className="py-2 px-4 text-left">OpenMRS UAT</td>
              <td className="py-2 px-4 text-center text-green-600 font-semibold">{stats.openmrsUat.found}</td>
              <td className="py-2 px-4 text-center text-red-600 font-semibold">{stats.openmrsUat.notFound}</td>
              <td className="py-2 px-4 text-center">
                <div className="flex items-center justify-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ width: `${stats.openmrsUat.percentage}%` }}
                    ></div>
                  </div>
                  <span className="ml-2">{stats.openmrsUat.percentage}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
