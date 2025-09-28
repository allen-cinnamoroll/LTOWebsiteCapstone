import React from 'react';

export function LineChartModal({
  isLineChartModalOpen,
  setIsLineChartModalOpen,
  selectedYearRange,
  setSelectedYearRange,
  filteredYearlyData,
  loading
}) {
  if (!isLineChartModalOpen) return null;

  const yearRanges = [
    '2020-2023',
    '2015-2020',
    '2010-2015',
    '2005-2010',
    'All'
  ];

  const handleYearRangeChange = (range) => {
    setSelectedYearRange(range);
  };

  const getMaxValue = () => {
    return Math.max(...filteredYearlyData.map(item => item.count || 0), 1);
  };

  const maxValue = getMaxValue();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Violation Trends Over Time
          </h3>
          <button
            onClick={() => setIsLineChartModalOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Year Range Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Year Range:
            </label>
            <div className="flex flex-wrap gap-2">
              {yearRanges.map((range) => (
                <button
                  key={range}
                  onClick={() => handleYearRangeChange(range)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedYearRange === range
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Area */}
          <div className="bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredYearlyData.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Violation Count by Year ({selectedYearRange})
                </h4>
                
                {/* Simple Bar Chart */}
                <div className="space-y-3">
                  {filteredYearlyData
                    .sort((a, b) => (a._id?.year || 0) - (b._id?.year || 0))
                    .map((item, index) => {
                      const year = item._id?.year || 'Unknown';
                      const count = item.count || 0;
                      const percentage = maxValue > 0 ? (count / maxValue) * 100 : 0;
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
                      const color = colors[index % colors.length];

                      return (
                        <div key={year} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {year}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {count.toLocaleString()} violations
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative">
                            <div
                              className={`h-6 rounded-full ${color} flex items-center justify-end pr-2`}
                              style={{ width: `${percentage}%` }}
                            >
                              <span className="text-xs font-medium text-white">
                                {count > 0 ? count.toLocaleString() : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Summary Statistics */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {filteredYearlyData.length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Years Covered
                    </div>
                  </div>
                  <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {filteredYearlyData.reduce((sum, item) => sum + (item.count || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Total Violations
                    </div>
                  </div>
                  <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {filteredYearlyData.length > 0 
                        ? Math.round(filteredYearlyData.reduce((sum, item) => sum + (item.count || 0), 0) / filteredYearlyData.length).toLocaleString()
                        : 0
                      }
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Average per Year
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p>No data available for the selected year range</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setIsLineChartModalOpen(false)}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
