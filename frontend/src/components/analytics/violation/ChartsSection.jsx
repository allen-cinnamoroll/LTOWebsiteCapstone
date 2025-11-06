import React from 'react';
import { BarChart } from './BarChart';
import { PieChart } from './PieChart';
import { ViolationRanking } from './ViolationRanking';

export function ChartsSection({ 
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Violations by Type Chart */}
        <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded mb-4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
        
        {/* Yearly Trends Chart */}
        <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded mb-4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for violations by type chart
  const violationsByTypeData = displayData?.violationsByType || [];
  const totalViolationsByType = violationsByTypeData.reduce((sum, item) => sum + (item.count || 0), 0);

  return (
    <div className="space-y-6 mb-8">
      {/* Pie Chart and Apprehending Officers Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">
         {/* Left Side - Violation Types Pie Chart */}
         <div className="lg:col-span-2 flex">
           <div className="w-full" style={{ minHeight: '400px' }}>
          <PieChart
            data={violationsByTypeData}
            title="Violation Types Distribution"
            loading={loading}
          />
        </div>
      </div>

         {/* Right Side - Apprehending Officers Bar Chart */}
         <div className="lg:col-span-3 flex">
           <div className="w-full" style={{ minHeight: '400px' }}>
          <BarChart
            data={displayData?.topOfficers || []}
            title="Apprehending Officers"
            type="officers"
            loading={loading}
            totalCount={displayData?.totalOfficers || 0}
          />
           </div>
         </div>
        </div>

      {/* Violation Ranking Row */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
        {/* Top Violation Ranking */}
        <div className="lg:col-span-1">
          <ViolationRanking
            displayData={displayData}
            loading={loading}
            currentViolations={currentViolations}
            startIndex={startIndex}
            endIndex={endIndex}
            totalViolationItems={totalViolationItems}
            currentPage={currentPage}
            totalPages={totalPages}
            handlePrevPage={handlePrevPage}
            handleNextPage={handleNextPage}
          />
        </div>
      </div>
    </div>
  );
}
