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
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 shadow-xl min-w-[200px] backdrop-blur-sm">
          <div className="text-center">
            <div className="inline-flex items-center justify-center px-3 py-1 mb-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                Rank #{data.rank}
              </span>
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white mb-2 truncate border-b border-gray-200 dark:border-gray-700 pb-2" title={label}>
              {label}
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
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

  // Use the same soft blue palette employed in registration analytics
  const barColor = '#3B82F6';

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg dark:bg-transparent dark:border-gray-700 p-4 h-full flex flex-col">
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
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-transparent dark:border-gray-700 p-4 h-full flex flex-col">
        <div className="flex flex-col h-full">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M12 22a10 10 0 110-20 10 10 0 010 20z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Violations</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Top 5 violations by occurrences</p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-700"
            >
              View More
            </button>
          </div>

          {/* Chart Section */}
          {top5Violations.length > 0 ? (
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3 border border-gray-200 dark:border-gray-700 flex-1 flex flex-col min-h-0">
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
                      stroke="#d1d5db"
                      strokeOpacity={0.6}
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis 
                      type="number"
                      stroke="#6b7280"
                      fontSize={12}
                      fontWeight={600}
                      tick={{ fill: '#374151' }}
                      axisLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
                      tickLine={{ stroke: '#d1d5db' }}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name"
                      stroke="#6b7280"
                      fontSize={11}
                      fontWeight={600}
                      width={140}
                      tick={{ fill: '#111827' }}
                      axisLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
                      tickLine={{ stroke: '#d1d5db' }}
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
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-12 border border-gray-200 dark:border-gray-700 flex-1 flex items-center justify-center">
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
        <div className="fixed inset-0 z-50 bg-gray-950/90 backdrop-blur-[3px] flex items-center justify-center px-4 py-8" onClick={() => setShowModal(false)}>
          <div 
            className="w-full max-w-4xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-[0_20px_60px_rgba(15,23,42,0.35)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-900 via-slate-900 to-blue-900">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Top Violations</h3>
                  <p className="text-xs text-blue-100/80">Official summary of recorded violation frequencies</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-blue-100 hover:text-white px-3 py-1.5 rounded-md border border-white/20 hover:bg-white/10 transition"
              >
                Close
              </button>
            </header>

            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto bg-gray-50/60 dark:bg-gray-950">
              {sortedViolations.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 uppercase tracking-wide text-xs">
                      <tr>
                        <th className="px-5 py-3 text-left font-semibold">Rank</th>
                        <th className="px-5 py-3 text-left font-semibold">Violation</th>
                        <th className="px-5 py-3 text-right font-semibold">Occurrences</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                      {sortedViolations.map((violation, index) => {
                        const rank = index + 1;
                        const getBadge = (rank) => {
                          if (rank === 1) return 'bg-blue-900 text-white';
                          if (rank === 2) return 'bg-slate-800 text-white';
                          if (rank === 3) return 'bg-slate-700 text-white';
                          return 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
                        };

                        return (
                          <tr key={violation._id || index} className="hover:bg-blue-50/60 dark:hover:bg-blue-950/40 transition">
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center justify-center w-9 h-9 rounded-md text-xs font-semibold ${getBadge(rank)}`}>
                                {rank}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-gray-800 dark:text-gray-100 font-medium">
                              {violation._id || 'Unknown Violation'}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-100 text-blue-800 font-semibold dark:bg-blue-900/40 dark:text-blue-200">
                                {(violation.count || 0).toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                  No violation data available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
