import React from 'react';

export function ConfiscatedItemsChart({ data, loading }) {
  console.log('ConfiscatedItemsChart received data:', data);
  console.log('ConfiscatedItemsChart loading:', loading);
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-black rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="flex space-x-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-black rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">License Types Distribution</h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No license type data available
        </div>
      </div>
    );
  }

  // Calculate total count for percentage calculations
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);
  
  // Define colors for different item types
  const getItemColor = (index) => {
    const colors = [
      'bg-purple-500',
      'bg-teal-500', 
      'bg-yellow-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-orange-500',
      'bg-cyan-500',
      'bg-rose-500'
    ];
    return colors[index % colors.length];
  };

  const getTextColor = (index) => {
    const colors = [
      'text-purple-600',
      'text-teal-600',
      'text-yellow-600', 
      'text-pink-600',
      'text-indigo-600',
      'text-orange-600',
      'text-cyan-600',
      'text-rose-600'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-white dark:bg-black rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        License Types Distribution
      </h3>
      
      {/* Horizontal Segmented Bar */}
      <div className="mb-4">
        <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
          {data.map((item, index) => {
            const percentage = (item.count / totalCount) * 100;
            return (
              <div
                key={item.type}
                className={`${getItemColor(index)} h-full flex items-center justify-center text-white text-xs font-medium`}
                style={{ width: `${percentage}%` }}
                title={`${item.type}: ${item.count} violations (${percentage.toFixed(1)}%)`}
              >
                {percentage > 8 && (
                  <span className="truncate px-1">{item.type}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {data.map((item, index) => {
          const percentage = ((item.count / totalCount) * 100).toFixed(1);
          return (
            <div key={item.type} className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded ${getItemColor(index)}`}></div>
              <span className={`text-sm font-medium ${getTextColor(index)}`}>
                {item.type}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({item.count} violations - {percentage}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
