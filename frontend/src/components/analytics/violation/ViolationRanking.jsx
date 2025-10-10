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
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="w-16 h-6 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black border-2 border-gray-300 dark:border-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-900 to-violet-600 rounded-lg flex items-center justify-center shadow-md">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Top Violations Ranking
        </h3>
      </div>
      
      {currentViolations.length > 0 ? (
        <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          {currentViolations.map((violation, index) => {
            const rank = startIndex + index + 1;
            const getRankColor = (rank) => {
              return 'bg-gradient-to-br from-blue-900 to-violet-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300';
            };

            const getRankNumber = (rank) => {
              return rank;
            };

            return (
              <div key={violation._id || index} className="flex items-center space-x-4 p-3 border-2 border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-900 group">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankColor(rank)}`}>
                  {getRankNumber(rank)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">
                    {violation._id || 'Unknown Violation'}
                  </p>
                  <p className="text-xs bg-gradient-to-r from-blue-900 to-violet-600 bg-clip-text text-transparent font-medium group-hover:from-blue-700 group-hover:to-violet-500 transition-all duration-300">
                    {violation.count || 0} occurrences
                  </p>
                  {/* Progress Bar */}
                  <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-sm transition-all duration-500 group-hover:shadow-md"
                      style={{ 
                        width: `${Math.min((violation.count || 0) / Math.max(...currentViolations.map(v => v.count || 0)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">
                    {violation.count || 0}
                  </div>
                  <div className="text-xs bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent font-medium group-hover:from-violet-500 group-hover:to-purple-500 transition-all duration-300">
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
                  className="px-3 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-900 to-violet-600 hover:from-blue-800 hover:to-violet-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg shadow-md transition-all duration-200 flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-900 to-violet-600 hover:from-blue-800 hover:to-violet-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg shadow-md transition-all duration-200 flex items-center space-x-1"
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
