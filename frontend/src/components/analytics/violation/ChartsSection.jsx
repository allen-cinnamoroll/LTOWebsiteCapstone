import React from 'react';
import { BarChart } from './BarChart';
import { PieChart } from './PieChart';

export function ChartsSection({ displayData, loading, setIsLineChartModalOpen }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Violations by Type Chart */}
      <div className="bg-white dark:bg-black border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-md p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
        
        {/* Yearly Trends Chart */}
        <div className="bg-white dark:bg-black border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-md p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for violations by type chart
  const violationsByTypeData = displayData?.violationsByType || [];
  const totalViolationsByType = violationsByTypeData.reduce((sum, item) => sum + (item.count || 0), 0);

  // Prepare data for yearly trends chart
  const yearlyTrendsData = displayData?.yearlyTrends || [];
  const maxYearlyViolations = Math.max(...yearlyTrendsData.map(item => item.count || 0), 1);

  return (
    <div className="space-y-6 mb-8">
      {/* Line Chart - Yearly Trends (Full Width) */}
      <div className="bg-white dark:bg-black border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Yearly Trends
          </h3>
          <button
            onClick={() => setIsLineChartModalOpen(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            View Details →
          </button>
        </div>
        <div className="space-y-4">
          {yearlyTrendsData.length > 0 ? (
            yearlyTrendsData.slice(0, 5).map((item, index) => {
              const percentage = maxYearlyViolations > 0 ? ((item.count || 0) / maxYearlyViolations) * 100 : 0;
              const year = item._id?.year || 'Unknown';
              
              return (
                <div key={year} className="space-y-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {year}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {item.count || 0} violations
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 border border-gray-300 dark:border-gray-600">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No yearly trend data available
            </div>
          )}
        </div>
        {yearlyTrendsData.length > 5 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLineChartModalOpen(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              View all {yearlyTrendsData.length} years →
            </button>
          </div>
        )}
      </div>

      {/* Charts Row - Top 5 Officers Bar Chart (Bigger) and Violation Types Pie Chart (Smaller) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Officers Bar Chart - Takes 2/3 of the width */}
        <div className="lg:col-span-2">
          <BarChart
            data={displayData?.topOfficers || []}
            title="Top 5 Apprehending Officers"
            type="officers"
            loading={loading}
          />
        </div>

        {/* Violation Types Pie Chart - Takes 1/3 of the width */}
        <div className="lg:col-span-1">
          <PieChart
            data={violationsByTypeData}
            title="Violation Types Distribution"
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
