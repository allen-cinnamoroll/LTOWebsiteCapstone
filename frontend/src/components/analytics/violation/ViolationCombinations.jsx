import React from 'react';

export function ViolationCombinations({ displayData, loading, getCombinationRecommendation }) {
  if (loading) {
    return (
        <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const violationCombinations = displayData?.violationCombinations || [];
  const violationPatterns = displayData?.violationPatterns || [];

  return (
        <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Violation Combinations & Recommendations
      </h3>
      
      {violationCombinations.length > 0 || violationPatterns.length > 0 ? (
        <div className="space-y-4">
          {/* Violation Combinations */}
          {violationCombinations.slice(0, 5).map((combination, index) => {
            const violations = combination.violations || [];
            const count = combination.count || 0;
            const recommendation = getCombinationRecommendation(violations);

            return (
              <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {violations.map((violation, vIndex) => (
                        <span
                          key={vIndex}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                        >
                          {violation}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {count} occurrence{count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400 rounded-r">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                    Recommended Action:
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    {recommendation}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Violation Patterns */}
          {violationPatterns.slice(0, 3).map((pattern, index) => {
            const patternName = pattern.pattern || 'Unknown Pattern';
            const frequency = pattern.frequency || 0;
            const description = pattern.description || 'No description available';

            return (
              <div key={`pattern-${index}`} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {patternName}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {description}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Frequency: {frequency} cases
                    </p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-400 rounded-r">
                  <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                    Pattern Analysis:
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    This pattern indicates recurring violation behaviors that may require targeted enforcement strategies.
                  </p>
                </div>
              </div>
            );
          })}

          {/* Show more button if there are more combinations */}
          {(violationCombinations.length > 5 || violationPatterns.length > 3) && (
            <div className="text-center pt-4">
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
                View All Combinations →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p>No violation combination data available</p>
        </div>
      )}
    </div>
  );
}
