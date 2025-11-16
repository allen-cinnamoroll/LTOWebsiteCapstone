import React, { useMemo, useState, useEffect } from 'react';
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
import { getViolations } from '../../../api/violationAnalytics.js';

export function BarChart({ data, title, type, loading, totalCount, allOfficersData }) {
  const [showModal, setShowModal] = useState(false);
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedYear, setSelectedYear] = useState('All');
  const [rawViolations, setRawViolations] = useState([]);
  const [yearDataLoading, setYearDataLoading] = useState(false);

  // Fetch all violations once (only for officers chart) for local year-based filtering
  useEffect(() => {
    if (type !== 'officers') return;

    const fetchViolations = async () => {
      try {
        setYearDataLoading(true);
        const response = await getViolations();
        if (response && response.success && Array.isArray(response.data)) {
          setRawViolations(response.data);
        } else if (Array.isArray(response)) {
          setRawViolations(response);
        }
      } catch (error) {
        console.error('Error fetching violations for Apprehending Officers year filter:', error);
      } finally {
        setYearDataLoading(false);
      }
    };

    fetchViolations();
  }, [type]);

  const yearOptions = useMemo(
    () => ['All', ...Array.from({ length: 26 }, (_, i) => (2000 + i).toString())],
    []
  );

  // Build officer data depending on selected year (only for officers chart)
  const officerData = useMemo(() => {
    if (type !== 'officers') return [];

    // All time: use existing aggregated data from backend
    if (!selectedYear || selectedYear === 'All') {
      if (allOfficersData && allOfficersData.length > 0) {
        return allOfficersData;
      }
      return data || [];
    }

    if (!rawViolations || rawViolations.length === 0) {
      return [];
    }

    const counts = {};

    rawViolations.forEach((violation) => {
      if (!violation.dateOfApprehension) return;

      const violationYear = new Date(violation.dateOfApprehension).getFullYear();
      if (violationYear.toString() !== selectedYear) return;

      const officer = (violation.apprehendingOfficer || '').trim();
      if (!officer) return;

      counts[officer] = (counts[officer] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([officerName, count]) => ({ officerName, violationCount: count }))
      .sort((a, b) => (b.violationCount || b.count || 0) - (a.violationCount || a.count || 0));
  }, [type, selectedYear, rawViolations, allOfficersData, data]);
  // Format data for Recharts
  const formatData = () => {
    const source = type === 'officers' ? officerData : data;
    if (!source || source.length === 0) return [];
    
    return source.slice(0, 5).map((item, index) => ({
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
      const colorClass = type === 'officers' ? 'text-emerald-600 dark:text-emerald-400' : 'text-violet-600 dark:text-violet-400';
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
  const sortedOfficers = useMemo(() => {
    if (type !== 'officers') return [];
    const source = officerData;
    if (!source || source.length === 0) return [];
    const copy = [...source];
    copy.sort((a, b) => {
      const countA = a.count || a.violationCount || 0;
      const countB = b.count || b.violationCount || 0;
      return sortDirection === 'asc' ? countA - countB : countB - countA;
    });
    return copy;
  }, [allOfficersData, type, sortDirection]);

  // Determine colors based on type
  const iconGradient = type === 'officers' 
    ? 'from-emerald-500 to-teal-500' 
    : 'from-purple-600 to-pink-500';
  const barGradientId = type === 'officers' ? 'emeraldGradient' : 'violetPinkGradient';
  const barGradientColors = type === 'officers' 
    ? { start: '#10b981', mid: '#059669', end: '#047857' }
    : { start: '#6366f1', mid: '#8b5cf6', end: '#a855f7' };

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
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg dark:bg-transparent dark:border-gray-700 p-4 h-full flex flex-col">
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

  if ((!data || data.length === 0) && (type !== 'officers' || officerData.length === 0)) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-transparent dark:border-gray-700 p-4 h-full flex flex-col">
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
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-transparent dark:border-gray-700 p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${iconGradient} rounded-lg flex items-center justify-center shadow-sm`}>
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Performance Rankings
                {type === 'officers' && selectedYear && selectedYear !== 'All' && (
                  <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-300 font-semibold">
                    • Year {selectedYear}
                  </span>
                )}
                {type === 'officers' && (!selectedYear || selectedYear === 'All') && (
                  <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-300 font-semibold">
                    • All Time
                  </span>
                )}
              </p>
            </div>
          </div>
          {type === 'officers' && (
            <div className="flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                disabled={yearDataLoading}
                className="pl-2 pr-6 py-1.5 text-[11px] rounded-md border border-emerald-200 bg-white text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year === 'All' ? 'All Time' : year}
                  </option>
                ))}
              </select>
              {officerData && officerData.length > 0 && (
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors dark:text-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M3 12h18M3 19h18" />
                  </svg>
                  View Full List
                </button>
              )}
            </div>
          )}
        </div>

      {/* Recharts Bar Chart */}
      <div className="flex-1 flex flex-col">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
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
        <div className="fixed inset-0 z-50 bg-gray-950/90 backdrop-blur-[3px] flex items-center justify-center px-4 py-8" onClick={() => setShowModal(false)}>
          <div 
            className="w-full max-w-4xl bg-white dark:bg-gray-950 border border-emerald-200 dark:border-emerald-800 rounded-2xl shadow-[0_20px_60px_rgba(72,187,120,0.28)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between px-6 py-5 border-b border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-700 via-emerald-900 to-emerald-700">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Apprehending Officers Details</h3>
                  <p className="text-xs text-emerald-100/80">Official tally of apprehensions per officer</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-emerald-100 hover:text-white px-3 py-1.5 rounded-md border border-white/20 hover:bg-white/10 transition"
              >
                Close
              </button>
            </header>

            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto bg-emerald-50/40 dark:bg-gray-950 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">All Apprehending Officers</h4>
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-200">
                  <span>Sort:</span>
                  <button
                    onClick={() => setSortDirection('desc')}
                    className={`px-3 py-1 rounded-md border ${sortDirection === 'desc' ? 'bg-emerald-600 text-white border-emerald-700' : 'border-emerald-300 text-emerald-600 hover:bg-emerald-100 dark:text-emerald-200/80'}`}
                  >
                    Highest → Lowest
                  </button>
                  <button
                    onClick={() => setSortDirection('asc')}
                    className={`px-3 py-1 rounded-md border ${sortDirection === 'asc' ? 'bg-emerald-600 text-white border-emerald-700' : 'border-emerald-300 text-emerald-600 hover:bg-emerald-100 dark:text-emerald-200/80'}`}
                  >
                    Lowest → Highest
                  </button>
                </div>
              </div>

              {sortedOfficers.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-gray-950">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 uppercase tracking-wide text-xs">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold w-12">#</th>
                        <th className="px-5 py-3 text-left font-semibold">Officer</th>
                        <th className="px-5 py-3 text-right font-semibold">Apprehensions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                      {sortedOfficers.map((officer, index) => (
                        <tr key={officer._id || officer.officerName || index} className="hover:bg-emerald-50/60 dark:hover:bg-emerald-900/30 transition">
                          <td className="px-4 py-3 text-emerald-700 dark:text-emerald-200 font-semibold">{index + 1}</td>
                          <td className="px-5 py-3 text-gray-800 dark:text-gray-100 font-medium">
                            {officer.officerName || 'Unknown Officer'}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-200">
                            {(officer.count || officer.violationCount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center text-sm text-emerald-500 dark:text-emerald-200/80">
                  No officer data available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}