import React, { useState } from 'react';
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

export function BarChart({ data, title, type, loading, totalCount, allOfficersData }) {
  const [showModal, setShowModal] = useState(false);
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
      const colorClass = type === 'officers' ? 'text-green-600 dark:text-green-400' : 'text-violet-600 dark:text-violet-400';
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 shadow-lg min-w-[180px]">
          <div className="text-center">
            <div className="text-xs font-bold text-gray-900 dark:text-white mb-1">
              {label}
            </div>
            <div className="flex items-center justify-center space-x-1 mb-1">
              <div className={`text-sm font-bold ${colorClass}`}>
                {data.value.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {type === 'officers' ? 'apprehensions' : 'violations'}
              </div>
            </div>
            <div className={colorClass}>
              <span className="text-xs">Rank #{data.rank}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Sort all officers by count (highest to lowest) for the modal
  const sortedOfficers = allOfficersData && type === 'officers' 
    ? [...allOfficersData].sort((a, b) => (b.count || b.violationCount || 0) - (a.count || a.violationCount || 0))
    : [];

  // Determine colors based on type
  const iconGradient = type === 'officers' 
    ? 'from-green-600 to-green-700' 
    : 'from-purple-600 to-pink-500';
  const barGradientId = type === 'officers' ? 'greenGradient' : 'violetPinkGradient';
  const barGradientColors = type === 'officers' 
    ? { start: '#10B981', mid: '#059669', end: '#047857' }
    : { start: '#8B5CF6', mid: '#A855F7', end: '#EC4899' };

  // Icon component based on type
  const IconComponent = ({ className }) => {
    if (type === 'officers') {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    }
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-4 hover:shadow-xl transition-all duration-300 h-full flex flex-col">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-6">
            <div className={`w-12 h-12 bg-gradient-to-br ${iconGradient} rounded-xl flex items-center justify-center`}>
              <IconComponent className="w-6 h-6 text-white" />
            </div>
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
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-4 hover:shadow-xl transition-all duration-300 h-full flex flex-col">
        <div className="flex items-center space-x-3 mb-6">
          <div className={`w-12 h-12 bg-gradient-to-br ${iconGradient} rounded-xl flex items-center justify-center shadow-lg`}>
            <IconComponent className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Performance Analytics</p>
          </div>
        </div>
        <div className="text-center py-16 text-gray-500 dark:text-gray-400 flex-1 flex flex-col justify-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center shadow-lg">
            <IconComponent className="w-10 h-10 text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Data Available</h4>
          <p className="text-sm">No {type === 'officers' ? 'officer' : 'violation'} data to display</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-4 hover:shadow-xl transition-all duration-300 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-lg bg-gray-100/80 dark:bg-gray-800/70 border border-gray-200/70 dark:border-gray-700/70 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${iconGradient} rounded-lg flex items-center justify-center shadow-md`}>
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Performance Rankings</p>
            </div>
          </div>
          {type === 'officers' && allOfficersData && allOfficersData.length > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="group px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xs font-bold rounded-lg shadow-md shadow-green-500/30 hover:shadow-lg hover:shadow-green-500/40 hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-1.5"
            >
              <span>View More</span>
              <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

      {/* Recharts Bar Chart */}
      <div className="flex-1 flex flex-col">
        <ResponsiveContainer width="100%" height="100%">
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
                  fill={`url(#${barGradientId})`}
                />
              ))}
            </Bar>
            <defs>
              <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={barGradientColors.start} />
                <stop offset="50%" stopColor={barGradientColors.mid} />
                <stop offset="100%" stopColor={barGradientColors.end} />
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

      {/* Modal for All Officers - Only show for officers type */}
      {type === 'officers' && showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900/75 backdrop-blur-sm" aria-hidden="true"></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div 
              className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full border-2 border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Enhanced Modal Header */}
              <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 px-8 py-6 flex items-center justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-transparent"></div>
                <div className="relative z-10 flex items-center space-x-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-white mb-1">Apprehending Officers Details</h3>
                    <p className="text-sm font-medium text-green-100">Complete list of all officers and their total apprehensions</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="relative z-10 w-10 h-10 flex items-center justify-center text-white hover:text-green-200 hover:bg-white/10 rounded-xl transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Enhanced Modal Body */}
              <div className="bg-white dark:bg-gray-900 px-8 py-6 max-h-[70vh] overflow-y-auto">
                {sortedOfficers.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Officer Name
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Total Apprehensions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {sortedOfficers.map((officer, index) => {
                          const rank = index + 1;
                          const totalApprehensions = officer.count || officer.violationCount || 0;
                          const getRankBadgeColor = (rank) => {
                            if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-lg shadow-yellow-500/50';
                            if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-lg shadow-gray-400/50';
                            if (rank === 3) return 'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-600/50';
                            return 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 text-gray-900 dark:text-white';
                          };

                          return (
                            <tr 
                              key={officer._id || officer.officerName || index}
                              className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all duration-150"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-extrabold ${getRankBadgeColor(rank)}`}>
                                  {rank}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {officer.officerName || 'Unknown Officer'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="inline-flex items-center px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                  <span className="text-sm font-extrabold text-green-700 dark:text-green-400">
                                    {totalApprehensions.toLocaleString()}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">No Officer Data Available</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">There are no officers to display at this time.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}