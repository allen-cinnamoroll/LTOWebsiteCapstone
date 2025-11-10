import React, { useEffect, useMemo, useState } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#3b82f6',
  '#a855f7',
  '#14b8a6'
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value, percentage, color } = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl px-4 py-3 min-w-[180px]">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {name}
          </p>
        </div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {value.toLocaleString()} violations
        </p>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {percentage.toFixed(1)}% of total
        </p>
      </div>
    );
  }
  return null;
};

export function PieChart({ data, title, loading }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const { chartData, total } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], total: 0 };
    }

    const sorted = [...data].sort((a, b) => (b.count || 0) - (a.count || 0));
    const primary = sorted.slice(0, 5);
    const othersTotal = sorted.slice(5).reduce((sum, item) => sum + (item.count || 0), 0);

    if (othersTotal > 0) {
      primary.push({
        _id: 'Others',
        count: othersTotal,
        isOthers: true
      });
    }

    const totalCount = primary.reduce((sum, item) => sum + (item.count || 0), 0);
    const chartData = primary.map((item, index) => {
      const value = item.count || 0;
      const percentage = totalCount > 0 ? (value / totalCount) * 100 : 0;
      return {
        key: item._id || item.type || `Violation ${index + 1}`,
        name: item._id || item.type || 'Unknown',
        value,
        percentage,
        color: COLORS[index % COLORS.length],
        isOthers: item.isOthers
      };
    });

    return { chartData, total: totalCount };
  }, [data]);

  useEffect(() => {
    setActiveIndex(chartData.length > 0 ? 0 : -1);
  }, [chartData.length]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-transparent dark:border-gray-700 p-6 h-full flex flex-col justify-center">
        <div className="animate-pulse space-y-5">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          <div className="h-56 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-transparent dark:border-gray-700 p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
          </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">No violation type distribution data available</p>
      </div>
    );
  }

  const activeSlice = activeIndex >= 0 ? chartData[activeIndex] : null;
  const topLegendItems = chartData.slice(0, 3);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-transparent dark:border-gray-700 p-5 space-y-5 h-full flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center shadow-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3a9 9 0 019 9h-7.5a1.5 1.5 0 01-1.5-1.5V3Z"
              fill="currentColor"
              opacity="0.85"
            />
              <path
              d="M11.25 3.75a8.25 8.25 0 106.999 13.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 12l6.5 6.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              fill="currentColor"
              opacity="0.35"
            />
          </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Distribution of violations by type</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>Total types: {chartData.length}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 min-h-[320px]">
        <div className="flex w-full flex-col md:flex-row items-center justify-center gap-6">
          <div className="relative w-full max-w-[260px] aspect-square">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Violations</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{total.toLocaleString()}</p>
                {activeSlice ? (
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                    {activeSlice.name} · {activeSlice.percentage.toFixed(1)}%
                  </p>
                ) : null}
              </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <defs>
                  {chartData.map((slice, idx) => (
                    <radialGradient key={slice.key} id={`slice-gradient-${idx}`} cx="50%" cy="50%" r="70%">
                      <stop offset="0%" stopColor={slice.color} stopOpacity={0.65} />
                      <stop offset="95%" stopColor={slice.color} stopOpacity={1} />
                    </radialGradient>
                  ))}
                </defs>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="100%"
                  paddingAngle={chartData.length > 1 ? 4 : 0}
                  cornerRadius={10}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex((prev) => prev)}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.key}
                      fill={`url(#slice-gradient-${index})`}
                      stroke={index === activeIndex ? '#ffffff' : 'transparent'}
                      strokeWidth={index === activeIndex ? 3 : 1}
                      opacity={index === activeIndex ? 1 : 0.9}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full max-w-sm space-y-3">
            <div className="space-y-2">
              {topLegendItems.map((item, index) => (
                <button
                  key={item.key}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => setActiveIndex(index)}
                  className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition shadow-sm ${
                    index === activeIndex
                      ? 'border-blue-400 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-500'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {item.value.toLocaleString()} · {item.percentage.toFixed(1)}%
                  </span>
                </button>
              ))}
            </div>
            {chartData.length > 3 && (
              <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                + {chartData.length - 3} more violation type{chartData.length - 3 === 1 ? '' : 's'} included in totals
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
