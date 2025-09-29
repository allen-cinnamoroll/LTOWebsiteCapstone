import React from 'react';

export function ViolationRanking({
  displayData,
  loading,
  currentViolations,
  startIndex,
  endIndex,
  totalViolationItems,
  currentPage,
  totalPages,
  handlePrevPage,
  handleNextPage
}) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-black border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black border-2 border-gray-300 dark:border-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Top Violations Ranking
      </h3>
      
      {currentViolations.length > 0 ? (
        <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          {currentViolations.map((violation, index) => {
            const rank = startIndex + index + 1;
            const getRankColor = (rank) => {
              if (rank === 1) return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400';
              if (rank === 2) return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
              if (rank === 3) return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400';
              return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400';
            };

            const getRankNumber = (rank) => {
              return rank;
            };

            return (
              <div key={violation._id || index} className="flex items-center space-x-4 p-3 border-2 border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors bg-white dark:bg-gray-900">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankColor(rank)}`}>
                  {getRankNumber(rank)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {violation._id || 'Unknown Violation'}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {violation.count || 0} occurrences
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {violation.count || 0}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                    violations
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p>No violation data available</p>
        </div>
      )}

      {/* Pagination - Positioned at bottom of table */}
      {currentViolations.length > 0 && totalPages > 1 && (
        <div className="mt-6 pt-4 border-t-2 border-gray-300 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Showing {startIndex + 1} to {Math.min(endIndex, totalViolationItems)} of {totalViolationItems} violations
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg shadow-md transition-all duration-200 flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg shadow-md transition-all duration-200 flex items-center space-x-1"
                >
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
