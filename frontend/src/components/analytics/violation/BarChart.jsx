import React from 'react';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export function BarChart({ data, title, type, loading, totalCount }) {
  // Format data for Recharts
  const formatData = () => {
    if (!data || data.length === 0) return [];
    
    return data.slice(0, 5).map((item, index) => ({
      name: type === 'officers' 
        ? (item.officerName || 'Unknown Officer')
        : (item._id || 'Unknown Item'),
      value: item.count || item.violationCount || 0,
      rank: index + 1
    }));
  };

  const chartData = formatData();

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 shadow-lg min-w-[180px]">
          <div className="text-center">
            <div className="text-xs font-bold text-gray-900 dark:text-white mb-1">
              {label}
            </div>
            <div className="flex items-center justify-center space-x-1 mb-1">
              <div className="text-sm font-bold text-violet-600 dark:text-violet-400">
                {data.value.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {type === 'officers' ? 'apprehensions' : 'violations'}
              </div>
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">
              Rank #{data.rank}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-black dark:to-black border-2 border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl"></div>
            <div className="space-y-2">
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                <div className="flex items-center space-x-4 mb-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-black dark:to-black border-2 border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Performance Analytics</p>
          </div>
        </div>
        <div className="text-center py-16 text-gray-500 dark:text-gray-400 flex-1 flex flex-col justify-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Data Available</h4>
          <p className="text-sm">No {type === 'officers' ? 'officer' : 'violation'} data to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-4 hover:shadow-xl transition-all duration-300 h-full flex flex-col" style={{ minHeight: '400px' }}>
      <div className="flex items-center mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Performance Rankings</p>
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      <div className="flex-1 flex flex-col" style={{ minHeight: '320px' }}>
        <ResponsiveContainer width="100%" height={350}>
          <RechartsBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              stroke="#6b7280"
              fontSize={11}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis stroke="#6b7280" />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="value" 
              radius={[4, 4, 0, 0]}
              className="hover:opacity-80 transition-opacity duration-200"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill="url(#violetPinkGradient)"
                />
              ))}
            </Bar>
            <defs>
              <linearGradient id="violetPinkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>

      {chartData.length < 5 && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Only {chartData.length} {type === 'officers' ? 'officers' : 'items'} available
            </span>
          </div>
        </div>
      )}
    </div>
  );
}