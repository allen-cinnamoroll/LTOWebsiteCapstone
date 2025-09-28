import React from 'react';

export function BarChart({ data, title, type, loading }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-black border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-black border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p>No data available</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item.count || item.violationCount || 0));
  const top5Data = data.slice(0, 5);

  const getBarColor = (index) => {
    const colors = [
      'bg-gradient-to-r from-blue-500 to-blue-600',
      'bg-gradient-to-r from-green-500 to-green-600',
      'bg-gradient-to-r from-yellow-500 to-yellow-600',
      'bg-gradient-to-r from-red-500 to-red-600',
      'bg-gradient-to-r from-purple-500 to-purple-600'
    ];
    return colors[index] || 'bg-gradient-to-r from-gray-500 to-gray-600';
  };

  const getTextColor = (index) => {
    const colors = [
      'text-blue-600 dark:text-blue-400',
      'text-green-600 dark:text-green-400',
      'text-yellow-600 dark:text-yellow-400',
      'text-red-600 dark:text-red-400',
      'text-purple-600 dark:text-purple-400'
    ];
    return colors[index] || 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-black border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
        {title}
      </h3>
      
      <div className="space-y-4">
        {top5Data.map((item, index) => {
          const value = item.count || item.violationCount || 0;
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const displayName = type === 'officers' 
            ? (item.officerName || 'Unknown Officer')
            : (item._id || 'Unknown Item');
          
          return (
            <div key={index} className="space-y-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {type === 'officers' ? 'Apprehending Officer' : 'Violation Type'}
                  </p>
                </div>
                <div className="text-right ml-3">
                  <div className={`text-lg font-bold ${getTextColor(index)}`}>
                    {value.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {type === 'officers' ? 'apprehensions' : 'violations'}
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 border border-gray-300 dark:border-gray-600">
                <div
                  className={`h-3 rounded-full ${getBarColor(index)} transition-all duration-1000 ease-out`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Rank #{index + 1}</span>
                <span>{percentage.toFixed(1)}% of max</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {top5Data.length < 5 && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Only {top5Data.length} {type === 'officers' ? 'officers' : 'items'} available
        </div>
      )}
    </div>
  );
}
