import React from 'react';

export function KPICards({ displayData, loading, totalViolations, totalTrafficViolators, topOfficer, mostCommonViolation }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-card border border-border rounded-xl p-6 animate-pulse">
            <div className="flex items-center">
              <div className="flex-1">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded mb-1"></div>
                <div className="h-3 bg-muted rounded"></div>
              </div>
              <div className="ml-4">
                <div className="w-12 h-12 bg-muted rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Violations KPI */}
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300 transform relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-full -translate-y-4 translate-x-4"></div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total Violations</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{totalViolations.toLocaleString()}</p>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">All time violations</p>
          </div>
          <div className="ml-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500/50 to-blue-600/50 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Total Traffic Violators KPI */}
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-green-500/30 hover:-translate-y-1 transition-all duration-300 transform relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-full -translate-y-4 translate-x-4"></div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Traffic Violators</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{totalTrafficViolators.toLocaleString()}</p>
            <p className="text-xs font-medium text-green-600 dark:text-green-400">Unique violators</p>
          </div>
          <div className="ml-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500/50 to-green-600/50 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Most Common Violation KPI */}
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-1 transition-all duration-300 transform relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-full -translate-y-4 translate-x-4"></div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Most Common Violation</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate" title={mostCommonViolation?._id || 'N/A'}>
              {mostCommonViolation?._id || 'N/A'}
            </p>
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {mostCommonViolation?.count || 0} occurrences
            </p>
          </div>
          <div className="ml-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500/50 to-red-600/50 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Top Officer KPI */}
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-1 transition-all duration-300 transform relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-full -translate-y-4 translate-x-4"></div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Top Officer</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white truncate mb-1">
              {topOfficer?.officerName || 'N/A'}
            </p>
            <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
              {topOfficer?.violationCount || 0} violations
            </p>
          </div>
          <div className="ml-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500/50 to-purple-600/50 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
