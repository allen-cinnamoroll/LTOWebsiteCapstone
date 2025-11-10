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
        
        {/* Violation Ranking Skeleton */}
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
      {/* Violation Types Distribution & Ranking Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="w-full shadow-[0_18px_36px_-18px_rgba(15,23,42,0.45)] border border-gray-200 dark:border-gray-800 rounded-2xl" style={{ height: '460px' }}>
          <PieChart
            data={violationsByTypeData}
            title="Violation Types Distribution"
            loading={loading}
          />
        </div>

        <div style={{ height: '460px' }} className="shadow-[0_18px_36px_-18px_rgba(15,23,42,0.45)] border border-gray-200 dark:border-gray-800 rounded-2xl">
          <ViolationRanking
            displayData={displayData}
            loading={loading}
          />
        </div>
      </div>

      {/* Apprehending Officers Chart */}
      <div style={{ height: '450px' }} className="shadow-[0_12px_30px_-15px_rgba(15,23,42,0.35)] border border-gray-200 dark:border-gray-800 rounded-2xl">
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
  );
}
