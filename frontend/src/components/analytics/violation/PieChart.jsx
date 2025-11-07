import React, { useEffect, useMemo, useState } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const COLORS = [
  '#4F46E5', // indigo
  '#0EA5E9', // sky
  '#10B981', // emerald
  '#F97316', // orange
  '#EF4444', // red
  '#6366F1'  // indigo accent (used for "Others")
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
      <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 border-2 border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-6 h-full flex flex-col justify-center">
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
      <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 border-2 border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
          </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">No violation type distribution data available</p>
      </div>
    );
  }

  const activeSlice = activeIndex >= 0 ? chartData[activeIndex] : null;

  return (
    <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 border-2 border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-6 space-y-5 h-full flex flex-col">
      <div className="px-4 py-3 rounded-xl bg-blue-100/70 dark:bg-blue-900/30 border border-blue-200/70 dark:border-blue-800/60 shadow-sm flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
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
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs font-medium text-blue-700/80 dark:text-blue-300/90">Distribution of violations by type</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-[320px]">
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Total Violations
              </p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">
                {total.toLocaleString()}
              </p>
              {activeSlice ? (
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-300 mt-1">
                  {activeSlice.name} · {activeSlice.percentage.toFixed(1)}%
                </p>
              ) : (
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-300 mt-1">
                  Across {chartData.length} types
                </p>
              )}
            </div>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
            <defs>
                {chartData.map((slice, idx) => (
                  <radialGradient
                    key={slice.key}
                    id={`slice-gradient-${idx}`}
                    cx="50%"
                    cy="50%"
                    r="65%"
                  >
                    <stop offset="0%" stopColor={slice.color} stopOpacity={0.85} />
                    <stop offset="95%" stopColor={slice.color} stopOpacity={1} />
              </radialGradient>
                ))}
            </defs>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="94%"
                paddingAngle={chartData.length > 1 ? 3 : 0}
                cornerRadius={8}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex((prev) => prev)}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.key}
                    fill={`url(#slice-gradient-${index})`}
                    stroke={index === activeIndex ? '#ffffff' : 'transparent'}
                    strokeWidth={index === activeIndex ? 3 : 1}
                    opacity={index === activeIndex ? 1 : 0.88}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 min-w-[220px] space-y-3 overflow-y-auto pr-1">
          {chartData.map((item, index) => (
            <div
              key={item.key}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-all duration-200 cursor-pointer ${
                index === activeIndex
                  ? 'border-blue-400/70 dark:border-blue-600 bg-blue-50/70 dark:bg-blue-900/30 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/60 hover:border-blue-300/80 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {item.percentage.toFixed(1)}% of total
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {item.value.toLocaleString()}
                </p>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  violations
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}
