import React from 'react';
import WeeklyPredictionsChart from './WeeklyPredictionsChart.jsx';

export function PredictiveAnalytics() {
  // Get current year and predict next year
  const currentYear = new Date().getFullYear();
  const predictionYear = currentYear + 1;

  return (
    <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-blue-200/50 dark:border-blue-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Predictive Analytics</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Uses the SARIMA algorithm to forecast future trends based on historical and current data, providing insights on risks, traffic patterns, and vehicle registrations.
              </p>
              <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                Predicting {predictionYear} (Based on the last data available)
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Weekly Predictions Chart */}
      <div className="p-6">
        <WeeklyPredictionsChart />
      </div>
    </div>
  );
}
