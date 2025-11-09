import React, { useState, useMemo } from 'react';
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
  const [sortDirection, setSortDirection] = useState('desc');

  // Get top 5 violations for the chart
  const allViolations = displayData?.mostCommonViolations || [];
  const top5Violations = allViolations.slice(0, 5).map((violation, index) => ({
    name: violation._id || 'Unknown Violation',
    occurrences: violation.count || 0,
    rank: index + 1
  }));

  // Sort all violations by count (highest to lowest) for the modal table
  const sortedViolations = useMemo(() => {
    const data = [...allViolations];
    data.sort((a, b) => {
      const countA = a.count || 0;
      const countB = b.count || 0;
      return sortDirection === 'asc' ? countA - countB : countB - countA;
    });
    return data;
  }, [allViolations, sortDirection]);

  // Custom tooltip for the bar chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 shadow-xl min-w-[200px] backdrop-blur-sm">
          <div className="text-center">
            <div className="inline-flex items-center justify-center px-3 py-1 mb-2 bg-rose-100 dark:bg-rose-900/30 rounded-full">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                Rank #{data.rank}
              </span>
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white mb-2 truncate border-b border-gray-200 dark:border-gray-700 pb-2" title={label}>
              {label}
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-300">
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

  const barColor = '#ef4444';

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
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-700 rounded-lg flex items-center justify-center shadow-sm">
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 transition-colors dark:text-rose-300 dark:bg-rose-900/30 dark:border-rose-700"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M3 12h18M3 19h18" />
              </svg>
              View Full List
            </button>
          </div>

          {/* Chart Section */}
          {top5Violations.length > 0 ? (
            <div className="bg-rose-50/60 dark:bg-rose-900/20 rounded-lg p-3 border border-rose-100 dark:border-rose-800 flex-1 flex flex-col min-h-0">
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
                      stroke="#fca5a5"
                      strokeOpacity={0.6}
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis 
                      type="number"
                      stroke="#b91c1c"
                      fontSize={12}
                      fontWeight={600}
                      tick={{ fill: '#7f1d1d' }}
                      axisLine={{ stroke: '#fca5a5', strokeWidth: 2 }}
                      tickLine={{ stroke: '#fca5a5' }}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name"
                      stroke="#b91c1c"
                      fontSize={11}
                      fontWeight={600}
                      width={140}
                      tick={{ fill: '#7f1d1d' }}
                      axisLine={{ stroke: '#fca5a5', strokeWidth: 2 }}
                      tickLine={{ stroke: '#fca5a5' }}
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
            <div className="bg-rose-50/60 dark:bg-rose-900/20 rounded-lg p-12 border border-rose-100 dark:border-rose-800 flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-900/60 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-10 h-10 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-rose-700 dark:text-rose-300 mb-2">No Violation Data Available</h4>
                <p className="text-sm text-rose-600 dark:text-rose-200/80">There are no violations to display at this time.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced Modal for All Violations */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-gray-950/90 backdrop-blur-[3px] flex items-center justify-center px-4 py-8" onClick={() => setShowModal(false)}>
          <div 
            className="w-full max-w-4xl bg-white dark:bg-gray-950 border border-rose-200 dark:border-rose-800 rounded-2xl shadow-[0_20px_60px_rgba(225,29,72,0.25)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between px-6 py-5 border-b border-rose-200 dark:border-rose-800 bg-gradient-to-r from-rose-700 via-rose-900 to-rose-700">
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
                className="text-rose-100 hover:text-white px-3 py-1.5 rounded-md border border-white/20 hover:bg-white/10 transition"
              >
                Close
              </button>
            </header>

            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto bg-rose-50/40 dark:bg-gray-950 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-200">All Violations</h4>
                <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-200">
                  <span>Sort:</span>
                  <button
                    onClick={() => setSortDirection('desc')}
                    className={`px-3 py-1 rounded-md border ${sortDirection === 'desc' ? 'bg-rose-500 text-white border-rose-600' : 'border-rose-300 text-rose-600 hover:bg-rose-100 dark:text-rose-200/80'}`}
                  >
                    Highest → Lowest
                  </button>
                  <button
                    onClick={() => setSortDirection('asc')}
                    className={`px-3 py-1 rounded-md border ${sortDirection === 'asc' ? 'bg-rose-500 text-white border-rose-600' : 'border-rose-300 text-rose-600 hover:bg-rose-100 dark:text-rose-200/80'}`}
                  >
                    Lowest → Highest
                  </button>
                </div>
              </div>

              {sortedViolations.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-gray-950">
                  <table className="min-w-full text-sm">
                    <thead className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200 uppercase tracking-wide text-xs">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold w-12">#</th>
                        <th className="px-5 py-3 text-left font-semibold">Violation</th>
                        <th className="px-5 py-3 text-right font-semibold">Occurrences</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 dark:divide-rose-900/40">
                      {sortedViolations.map((violation, index) => (
                        <tr key={violation._id || index} className="hover:bg-rose-50/60 dark:hover:bg-rose-900/20 transition">
                          <td className="px-4 py-3 text-rose-700 dark:text-rose-200 font-semibold">{index + 1}</td>
                          <td className="px-5 py-3 text-gray-800 dark:text-gray-100 font-medium">
                            {violation._id || 'Unknown Violation'}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-rose-700 dark:text-rose-200">
                            {(violation.count || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center text-sm text-rose-500 dark:text-rose-200/80">
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
