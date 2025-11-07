import React from 'react';
import { useTheme } from '@/components/theme/theme-provider';
import { BarChart } from './BarChart';
import { PieChart } from './PieChart';
import { ViolationRanking } from './ViolationRanking';

export function ChartsSection({ 
  displayData, 
  loading, 
  topOfficer
}) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
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
  
  return (
    <div className="space-y-6 mb-8">
      {/* Violation Types Distribution */}
      <div className="w-full" style={{ height: '460px' }}>
        <PieChart
          data={violationsByTypeData}
          title="Violation Types Distribution"
          loading={loading}
        />
      </div>

      {/* Violation Ranking and Apprehending Officers Row - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Violation Ranking Chart - Left Side */}
        <div style={{ height: '450px' }}>
          <ViolationRanking
            displayData={displayData}
            loading={loading}
          />
        </div>

        {/* Apprehending Officers Chart - Right Side */}
        <div style={{ height: '450px' }}>
          <BarChart
            data={displayData?.topOfficers || []}
            title="Apprehending Officers"
            type="officers"
            loading={loading}
            totalCount={displayData?.totalOfficers || 0}
            allOfficersData={displayData?.topOfficers || []}
          />
        </div>
      </div>
    </div>
  );
}
