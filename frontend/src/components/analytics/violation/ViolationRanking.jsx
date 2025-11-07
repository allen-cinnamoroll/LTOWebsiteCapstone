import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export function ViolationRanking({
  displayData,
  loading
}) {
  const [showModal, setShowModal] = useState(false);

  // Get top 5 violations for the chart
  const allViolations = displayData?.mostCommonViolations || [];
  const top5Violations = allViolations.slice(0, 5).map((violation, index) => ({
    name: violation._id || 'Unknown Violation',
    occurrences: violation.count || 0,
    rank: index + 1
  }));

  // Sort all violations by count (highest to lowest) for the modal table
  const sortedViolations = [...allViolations].sort((a, b) => (b.count || 0) - (a.count || 0));

  // Custom tooltip for the bar chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
    return (
        <div className="bg-white dark:bg-gray-800 border-2 border-red-200 dark:border-red-800 rounded-xl px-5 py-4 shadow-2xl min-w-[200px] backdrop-blur-sm">
          <div className="text-center">
            <div className="inline-flex items-center justify-center px-3 py-1 mb-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                Rank #{data.rank}
              </span>
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white mb-2 truncate border-b border-gray-200 dark:border-gray-700 pb-2" title={label}>
              {label}
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="text-2xl font-extrabold text-red-600 dark:text-red-400">
                {data.occurrences.toLocaleString()}
                </div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                occurrences
              </div>
          </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // All bars should be red to match the image style
  const barColor = '#EF4444'; // Solid red color

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 h-full flex flex-col">
        <div className="animate-pulse flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3"></div>
            <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-32"></div>
          </div>
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 relative overflow-hidden h-full flex flex-col">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 dark:bg-red-500/10 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-500/5 dark:bg-red-500/10 rounded-full translate-y-24 -translate-x-24 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col h-full">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0 px-3 py-2 rounded-xl bg-red-100/60 dark:bg-gray-800/70 border border-red-200/60 dark:border-red-800/60 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30 transform hover:scale-105 transition-transform duration-200">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white">5</span>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-0.5">
          Top Violations Ranking
        </h3>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                  <span>Top 5 violations by occurrences</span>
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="group px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-xs font-bold rounded-lg shadow-md shadow-red-500/30 hover:shadow-lg hover:shadow-red-500/40 hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-1.5"
            >
              <span>View More</span>
              <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Chart Section */}
          {top5Violations.length > 0 ? (
            <div className="bg-white dark:bg-gray-800/50 rounded-xl p-2 border border-gray-100 dark:border-gray-700 shadow-inner flex-1 flex flex-col min-h-0">
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={top5Violations}
                    margin={{ top: 5, right: 10, left: 2, bottom: 8 }}
                    layout="vertical"
                    barCategoryGap="10%"
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="#EF4444" 
                      strokeOpacity={0.25}
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis 
                      type="number"
                      stroke="#EF4444"
                      fontSize={12}
                      fontWeight={600}
                      tick={{ fill: '#EF4444' }}
                      axisLine={{ stroke: '#EF4444', strokeWidth: 2 }}
                      tickLine={{ stroke: '#EF4444' }}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name"
                      stroke="#EF4444"
                      fontSize={11}
                      fontWeight={600}
                      width={140}
                      tick={{ fill: '#EF4444' }}
                      axisLine={{ stroke: '#EF4444', strokeWidth: 2 }}
                      tickLine={{ stroke: '#EF4444' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="occurrences" 
                      radius={[0, 0, 0, 0]}
                      fill={barColor}
                      className="hover:opacity-90 transition-opacity duration-200"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800/50 rounded-xl p-12 border border-gray-100 dark:border-gray-700 shadow-inner flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">No Violation Data Available</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">There are no violations to display at this time.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced Modal for All Violations */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900/75 backdrop-blur-sm" aria-hidden="true"></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div 
              className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full border-2 border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Enhanced Modal Header */}
              <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 px-8 py-6 flex items-center justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-transparent"></div>
                <div className="relative z-10 flex items-center space-x-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-white mb-1">Violation Ranking Details</h3>
                    <p className="text-sm font-medium text-red-100">Complete list of all violations ranked by occurrences</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="relative z-10 w-10 h-10 flex items-center justify-center text-white hover:text-red-200 hover:bg-white/10 rounded-xl transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Enhanced Modal Body */}
              <div className="bg-white dark:bg-gray-900 px-8 py-6 max-h-[70vh] overflow-y-auto">
                {sortedViolations.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Violation
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Number of Occurrences
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {sortedViolations.map((violation, index) => {
                          const rank = index + 1;
                          const getRankBadgeColor = (rank) => {
                            if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-lg shadow-yellow-500/50';
                            if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-lg shadow-gray-400/50';
                            if (rank === 3) return 'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-600/50';
                            return 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 text-gray-900 dark:text-white';
            };

            return (
                            <tr 
                              key={violation._id || index}
                              className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all duration-150"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-extrabold ${getRankBadgeColor(rank)}`}>
                                  {rank}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {violation._id || 'Unknown Violation'}
                  </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="inline-flex items-center px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                  <span className="text-sm font-extrabold text-red-700 dark:text-red-400">
                                    {(violation.count || 0).toLocaleString()}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
                    <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">No Violation Data Available</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">There are no violations to display at this time.</p>
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
