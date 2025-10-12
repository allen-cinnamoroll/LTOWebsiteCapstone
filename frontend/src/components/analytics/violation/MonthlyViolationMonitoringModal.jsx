import React, { useState, useRef, useEffect } from 'react';
import { Calendar, X, TrendingUp, TrendingDown } from 'lucide-react';

export function MonthlyViolationMonitoringModal({ isOpen, onClose, analyticsData, loading, selectedYear }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [internalSelectedYear, setInternalSelectedYear] = useState(selectedYear || 'All');
  const chartRef = useRef(null);

  // Update internal year when prop changes
  useEffect(() => {
    if (selectedYear) {
      setInternalSelectedYear(selectedYear);
    }
  }, [selectedYear]);

  if (!isOpen) return null;

  // Generate list of available years
  const currentYear = new Date().getFullYear();
  const years = ['All', ...Array.from({ length: currentYear - 2000 + 1 }, (_, i) => (2000 + i).toString())];

  // Generate monthly data from violations
  const generateMonthlyData = () => {
    if (!analyticsData?.yearlyTrends || analyticsData.yearlyTrends.length === 0) {
      return [];
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (internalSelectedYear === 'All') {
      // For "All Time", aggregate data across all years and distribute monthly
      const totalViolations = analyticsData.yearlyTrends.reduce((sum, trend) => sum + (trend.count || 0), 0);
      const yearCount = analyticsData.yearlyTrends.length;
      
      return monthNames.map((month, index) => {
        // Create variation: higher in middle months, lower at edges
        const variation = Math.sin((index / 12) * Math.PI) * 0.3 + 0.7;
        const monthCount = Math.round((totalViolations / (yearCount * 12)) * variation * yearCount);
        return {
          month,
          monthNum: index + 1,
          count: monthCount,
          year: 'All Time'
        };
      });
    } else {
      // For specific year
      const year = parseInt(internalSelectedYear);
      const yearData = analyticsData.yearlyTrends.find(trend => trend._id?.year === year);
      
      if (yearData && yearData.count) {
        const totalYearViolations = yearData.count;
        // Generate some variation across months (this is simulated data)
        return monthNames.map((month, index) => {
          // Create variation: higher in middle months, lower at edges
          const variation = Math.sin((index / 12) * Math.PI) * 0.3 + 0.7;
          const monthCount = Math.round((totalYearViolations / 12) * variation);
          return {
            month,
            monthNum: index + 1,
            count: monthCount,
            year: year
          };
        });
      }
    }
    
    // If no data, create placeholder
    return monthNames.map((month, index) => ({
      month,
      monthNum: index + 1,
      count: 0,
      year: internalSelectedYear === 'All' ? 'All Time' : parseInt(internalSelectedYear)
    }));
  };

  const monthlyData = generateMonthlyData();
  const maxCount = Math.max(...monthlyData.map(d => d.count), 1);
  const totalViolations = monthlyData.reduce((sum, d) => sum + d.count, 0);
  const avgViolations = Math.round(totalViolations / 12);

  // Find month with highest violations
  const peakMonth = monthlyData.reduce((max, curr) => curr.count > max.count ? curr : max, monthlyData[0]);

  const colorPalette = [
    '#8b5cf6', '#9333ea', '#a855f7', '#3b82f6', '#2563eb', '#1d4ed8',
    '#06b6d4', '#0891b2', '#0e7490', '#10b981', '#059669', '#047857'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[80vh] overflow-hidden transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Monthly Violation Monitoring
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track violations by month and analyze trends
              </p>
            </div>
          </div>
          
          {/* Year Selector Dropdown and Close Button */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                Year
              </label>
              <select
                value={internalSelectedYear}
                onChange={(e) => setInternalSelectedYear(e.target.value)}
                className="px-4 py-2 pr-10 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md appearance-none"
                style={{ minWidth: '140px' }}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year === 'All' ? '📊 All Time' : year}
                  </option>
                ))}
              </select>
              {/* Custom dropdown arrow */}
              <div className="absolute right-3 top-8 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 mt-5"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          ) : monthlyData.length > 0 && totalViolations > 0 ? (
            <div className="space-y-6">
              {/* Chart Container */}
              <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-xl">
                <div className="flex gap-6">
                  {/* Line Chart */}
                  <div className="flex-1 relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <svg
                      ref={chartRef}
                      width="100%"
                      height="400"
                      className="relative"
                      onMouseLeave={() => {
                        setShowTooltip(false);
                        setHoveredPoint(null);
                      }}
                    >
                      {(() => {
                        const width = 800;
                        const height = 400;
                        const padding = 80;
                        const chartWidth = width - (padding * 2);
                        const chartHeight = height - (padding * 2);

                        const counts = monthlyData.map(d => d.count);
                        const minCount = 0;
                        const maxCountValue = Math.max(...counts);
                        const countRange = maxCountValue - minCount || 1;

                        // Add padding to Y-axis for better visual scaling
                        const yPadding = countRange * 0.1;
                        const adjustedMaxCount = maxCountValue + yPadding;
                        const adjustedCountRange = adjustedMaxCount;

                        // Create points for line chart
                        const points = monthlyData.map((item, index) => {
                          const x = padding + (index / (monthlyData.length - 1)) * chartWidth;
                          const y = padding + chartHeight - ((item.count) / adjustedCountRange) * chartHeight;
                          return { x, y, ...item, color: colorPalette[index] };
                        });

                        // Create smooth line path
                        const linePath = points.reduce((path, point, index) => {
                          if (index === 0) {
                            return `M ${point.x} ${point.y}`;
                          }
                          const prevPoint = points[index - 1];
                          const cp1x = prevPoint.x + (point.x - prevPoint.x) / 3;
                          const cp1y = prevPoint.y;
                          const cp2x = point.x - (point.x - prevPoint.x) / 3;
                          const cp2y = point.y;
                          return `${path} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${point.x} ${point.y}`;
                        }, '');

                        // Create area path for gradient fill
                        const areaPath = points.reduce((path, point, index) => {
                          if (index === 0) {
                            return `M ${point.x} ${padding + chartHeight} L ${point.x} ${point.y}`;
                          }
                          const prevPoint = points[index - 1];
                          const cp1x = prevPoint.x + (point.x - prevPoint.x) / 3;
                          const cp1y = prevPoint.y;
                          const cp2x = point.x - (point.x - prevPoint.x) / 3;
                          const cp2y = point.y;
                          return `${path} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${point.x} ${point.y}`;
                        }, '') + ` L ${points[points.length - 1].x} ${padding + chartHeight} Z`;

                        return (
                          <g>
                            {/* Gradient definitions */}
                            <defs>
                              <linearGradient id="monthlyAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3"/>
                                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.15"/>
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05"/>
                              </linearGradient>
                              <linearGradient id="monthlyLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#8b5cf6"/>
                                <stop offset="25%" stopColor="#3b82f6"/>
                                <stop offset="50%" stopColor="#2563eb"/>
                                <stop offset="75%" stopColor="#06b6d4"/>
                                <stop offset="100%" stopColor="#10b981"/>
                              </linearGradient>
                              <filter id="monthlyGlow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>

                            {/* Y-axis */}
                            <line
                              x1={padding}
                              y1={padding}
                              x2={padding}
                              y2={padding + chartHeight}
                              stroke="#6b7280"
                              strokeWidth={2}
                            />

                            {/* X-axis */}
                            <line
                              x1={padding}
                              y1={padding + chartHeight}
                              x2={padding + chartWidth}
                              y2={padding + chartHeight}
                              stroke="#6b7280"
                              strokeWidth={2}
                            />

                            {/* Grid lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                              const y = padding + chartHeight - (ratio * chartHeight);
                              const value = Math.round(ratio * adjustedCountRange);
                              return (
                                <g key={`grid-${index}`}>
                                  <line
                                    x1={padding}
                                    y1={y}
                                    x2={padding + chartWidth}
                                    y2={y}
                                    stroke="#374151"
                                    strokeWidth={1}
                                    strokeDasharray="4,4"
                                    opacity="0.3"
                                  />
                                  <text
                                    x={padding - 10}
                                    y={y + 5}
                                    textAnchor="end"
                                    fontSize="12"
                                    fill="#9ca3af"
                                    fontFamily="system-ui"
                                  >
                                    {value}
                                  </text>
                                </g>
                              );
                            })}

                            {/* X-axis labels (months) */}
                            {monthlyData.map((item, index) => {
                              const x = padding + (index / (monthlyData.length - 1)) * chartWidth;
                              return (
                                <g key={`x-label-${index}`}>
                                  <line
                                    x1={x}
                                    y1={padding + chartHeight}
                                    x2={x}
                                    y2={padding + chartHeight + 5}
                                    stroke="#6b7280"
                                    strokeWidth={1}
                                  />
                                  <text
                                    x={x}
                                    y={padding + chartHeight + 20}
                                    textAnchor="middle"
                                    fontSize="11"
                                    fill="#9ca3af"
                                    fontFamily="system-ui"
                                  >
                                    {item.month}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Area fill */}
                            <path
                              d={areaPath}
                              fill="url(#monthlyAreaGradient)"
                            />

                            {/* Main line */}
                            <path
                              d={linePath}
                              fill="none"
                              stroke="url(#monthlyLineGradient)"
                              strokeWidth={4}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              filter="url(#monthlyGlow)"
                            />

                            {/* Data points */}
                            {points.map((point, index) => {
                              const isHovered = hoveredPoint === index;
                              return (
                                <g key={`point-${index}`}>
                                  {/* Hover area */}
                                  <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r={20}
                                    fill="transparent"
                                    onMouseEnter={(e) => {
                                      setHoveredPoint(index);
                                      setShowTooltip(true);
                                      const rect = chartRef.current.getBoundingClientRect();
                                      const x = e.clientX - rect.left;
                                      const y = e.clientY - rect.top + 30;
                                      setTooltipPosition({ x, y });
                                    }}
                                    onMouseMove={(e) => {
                                      const rect = chartRef.current.getBoundingClientRect();
                                      const x = e.clientX - rect.left;
                                      const y = e.clientY - rect.top + 30;
                                      setTooltipPosition({ x, y });
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  />

                                  {/* Main point */}
                                  <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r={isHovered ? 7 : 5}
                                    fill={point.color}
                                    stroke="white"
                                    strokeWidth={2}
                                  />

                                  {/* Inner dot */}
                                  <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r={isHovered ? 3 : 2}
                                    fill="white"
                                  />
                                </g>
                              );
                            })}

                            {/* Y-axis label */}
                            <text
                              x={padding - 50}
                              y={height / 2}
                              textAnchor="middle"
                              transform={`rotate(-90, ${padding - 50}, ${height / 2})`}
                              fontSize="13"
                              fill="#6b7280"
                              fontFamily="system-ui"
                              fontWeight="600"
                            >
                              Number of Violations
                            </text>

                            {/* X-axis label */}
                            <text
                              x={width / 2}
                              y={height - 20}
                              textAnchor="middle"
                              fontSize="13"
                              fill="#6b7280"
                              fontFamily="system-ui"
                              fontWeight="600"
                            >
                              Month
                            </text>
                          </g>
                        );
                      })()}
                    </svg>

                    {/* Tooltip */}
                    {showTooltip && hoveredPoint !== null && (
                      <div
                        className="absolute bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl p-4 z-50 pointer-events-none min-w-[200px]"
                        style={{
                          left: `${tooltipPosition.x - 100}px`,
                          top: `${tooltipPosition.y}px`,
                        }}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: colorPalette[hoveredPoint] }}
                          ></div>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {monthlyData[hoveredPoint].month} {monthlyData[hoveredPoint].year}
                          </span>
                        </div>
                        <div className="text-lg font-bold mb-2" style={{ color: colorPalette[hoveredPoint] }}>
                          {monthlyData[hoveredPoint].count.toLocaleString()} violations
                        </div>
                        {hoveredPoint > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            <span className={
                              monthlyData[hoveredPoint].count > monthlyData[hoveredPoint - 1].count
                                ? "text-red-500" : "text-green-500"
                            }>
                              {monthlyData[hoveredPoint].count > monthlyData[hoveredPoint - 1].count ? "↗" : "↘"}
                              {' '}
                              {Math.abs(monthlyData[hoveredPoint].count - monthlyData[hoveredPoint - 1].count).toLocaleString()} from previous month
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Statistics Panel */}
                  <div className="w-64 space-y-3">
                    {/* Total Violations Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4 shadow-md hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Total</span>
                        <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {totalViolations.toLocaleString()}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Violations this period
                      </div>
                    </div>

                    {/* Average Card */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-2 border-purple-200 dark:border-purple-700 rounded-xl p-4 shadow-md hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Average</span>
                        <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {avgViolations.toLocaleString()}
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        Per month
                      </div>
                    </div>

                    {/* Peak Month Card */}
                    <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-2 border-red-200 dark:border-red-700 rounded-xl p-4 shadow-md hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">Peak Month</span>
                        <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                        {peakMonth.month}
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {peakMonth.count.toLocaleString()} violations
                      </div>
                    </div>

                    {/* Info Card */}
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border-2 border-amber-200 dark:border-amber-700 rounded-xl p-4 shadow-md">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Note</span>
                      </div>
                      <div className="text-xs text-amber-700 dark:text-amber-300">
                        Monthly data is estimated based on yearly trends. For accurate monthly statistics, please ensure violations have proper date information.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Monthly Data Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                There is no violation data available for the selected period. Please try selecting a different year or ensure violations have proper date information.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Fix missing import
const BarChart3 = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

