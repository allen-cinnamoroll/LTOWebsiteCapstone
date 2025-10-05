import React, { useState, useRef } from 'react';

export function LineChartModal({
  isLineChartModalOpen,
  setIsLineChartModalOpen,
  selectedYearRange,
  setSelectedYearRange,
  filteredYearlyData,
  loading
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const chartRef = useRef(null);

  if (!isLineChartModalOpen) return null;

  const yearRanges = [
    '2020-2025',
    '2015-2019',
    '2010-2014',
    '2005-2009',
    '2000-2004'
  ];

  const handleYearRangeChange = (range) => {
    setSelectedYearRange(range);
  };

  const getMaxValue = () => {
    return Math.max(...filteredYearlyData.map(item => item.count || 0), 1);
  };

  const maxValue = getMaxValue();

  // Define gradient palette matching the image: purple/violet to blue to cyan
  const colorPalette = [
    '#8b5cf6', // Purple/violet (2020)
    '#8b5cf6', // Purple/violet (2021)
    '#3b82f6', // Medium blue (2022)
    '#2563eb', // Bright blue (2023)
    '#06b6d4', // Light cyan blue (2024)
    '#06b6d4', // Light cyan blue (2025)
    '#8b5cf6', // Purple/violet
    '#3b82f6', // Medium blue
    '#2563eb', // Bright blue
    '#06b6d4', // Light cyan blue
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[80vh] overflow-hidden transform transition-all duration-300 scale-100">
        {/* Enhanced Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
            </div>
          </div>
          <button
            onClick={() => setIsLineChartModalOpen(false)}
            className="w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Enhanced Modal Body */}
        <div className="p-4 overflow-hidden max-h-[calc(80vh-100px)]">
          {/* Enhanced Year Range Selector */}
          <div className="mb-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <label className="text-sm font-semibold text-gray-900 dark:text-white">
                Select Analysis Period:
            </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {yearRanges.map((range) => (
                <button
                  key={range}
                  onClick={() => handleYearRangeChange(range)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 ${
                    selectedYearRange === range
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-bold">{range}</div>
                    <div className="text-xs opacity-75">Years</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Enhanced Chart Area */}
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-xl">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            ) : filteredYearlyData.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                  </div>
                </div>
                
                {/* Advanced Line Chart with Different Colored Points */}
                <div className="flex gap-6">
                  <div className="flex-1 relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <svg 
                      ref={chartRef}
                      width="100%" 
                      height="250" 
                      className="relative"
                      onMouseLeave={() => {
                        setShowTooltip(false);
                        setHoveredPoint(null);
                      }}
                    >
                    {(() => {
                      const sortedData = filteredYearlyData
                        .sort((a, b) => (a._id?.year || 0) - (b._id?.year || 0));
                      
                      if (sortedData.length === 0) return null;
                      
                      const width = 700;
                      const height = 300;
                        const padding = 100;
                      const chartWidth = width - (padding * 2);
                      const chartHeight = height - (padding * 2);
                      
                      const years = sortedData.map(item => item._id?.year || 0);
                      const counts = sortedData.map(item => item.count || 0);
                      
                      const minYear = Math.min(...years);
                      const maxYear = Math.max(...years);
                      const yearRange = maxYear - minYear || 1;
                      
                      const minCount = Math.min(...counts);
                      const maxCount = Math.max(...counts);
                      const countRange = maxCount - minCount || 1;
                      
                      // Add padding to Y-axis for better visual scaling
                      const yPadding = countRange * 0.1;
                      const adjustedMinCount = Math.max(0, minCount - yPadding);
                      const adjustedMaxCount = maxCount + yPadding;
                      const adjustedCountRange = adjustedMaxCount - adjustedMinCount;
                      
                      // Create smooth curve path
                      const points = sortedData.map((item, index) => {
                        const year = item._id?.year || 0;
                        const count = item.count || 0;
                        const x = padding + ((year - minYear) / yearRange) * chartWidth;
                        const y = padding + chartHeight - ((count - adjustedMinCount) / adjustedCountRange) * chartHeight;
                        return { x, y, year, count, color: colorPalette[index % colorPalette.length] };
                      });
                      
                      // Create area path for gradient fill
                      const areaPath = points.reduce((path, point, index) => {
                        if (index === 0) {
                          return `M ${point.x} ${padding + chartHeight} L ${point.x} ${point.y}`;
                        }
                        return `${path} L ${point.x} ${point.y}`;
                      }, '') + ` L ${points[points.length - 1].x} ${padding + chartHeight} Z`;
                      
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
                      
                      return (
                        <g>
                          {/* Background gradient definitions */}
                          <defs>
                            <linearGradient id="modalAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2"/>
                              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.1"/>
                              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05"/>
                            </linearGradient>
                            <linearGradient id="modalLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#8b5cf6"/>
                              <stop offset="20%" stopColor="#8b5cf6"/>
                              <stop offset="40%" stopColor="#3b82f6"/>
                              <stop offset="60%" stopColor="#2563eb"/>
                              <stop offset="80%" stopColor="#06b6d4"/>
                              <stop offset="100%" stopColor="#06b6d4"/>
                            </linearGradient>
                            <filter id="modalGlow">
                              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                              <feMerge> 
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>
                          
                          {/* Animated grid lines */}
                          {[0, 0.5, 1].map((ratio, index) => {
                            const y = padding + chartHeight - (ratio * chartHeight);
                            return (
                              <line
                                key={index}
                                x1={padding}
                                y1={y}
                                x2={padding + chartWidth}
                                y2={y}
                                stroke="#e5e7eb"
                                strokeWidth={1}
                                strokeDasharray="3,3"
                                opacity="0.5"
                              >
                                <animate attributeName="opacity" values="0;0.5;0" dur="3s" begin={`${index * 0.3}s`} repeatCount="1"/>
                              </line>
                            );
                          })}
                          
                          {/* Area fill with gradient */}
                          <path
                            d={areaPath}
                            fill="url(#modalAreaGradient)"
                          />
                          
                          {/* Main line with rainbow gradient and glow */}
                          <path
                            d={linePath}
                            fill="none"
                            stroke="url(#modalLineGradient)"
                            strokeWidth={5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#modalGlow)"
                          >
                            <animate attributeName="stroke-dasharray" values="0,2000;2000,0" dur="3s" repeatCount="1"/>
                          </path>
                          
                          {/* Interactive data points with clean design */}
                          {points.map((point, index) => {
                            const isHovered = hoveredPoint === index;
                            return (
                              <g key={point.year}>
                                {/* Hover area (invisible but larger for easier interaction) */}
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r={20}
                                  fill="transparent"
                              onMouseEnter={(e) => {
                                setHoveredPoint(index);
                                setShowTooltip(true);
                                const rect = chartRef.current.getBoundingClientRect();
                                const tooltipWidth = 220; // Approximate tooltip width
                                const tooltipHeight = 120; // Approximate tooltip height
                                
                                // Calculate position with bounds checking
                                let x = e.clientX - rect.left;
                                let y = e.clientY - rect.top;
                                
                                // Ensure tooltip stays within chart bounds horizontally
                                const halfTooltipWidth = tooltipWidth / 2;
                                if (x < halfTooltipWidth + 20) {
                                  x = halfTooltipWidth + 20;
                                } else if (x > rect.width - halfTooltipWidth - 20) {
                                  x = rect.width - halfTooltipWidth - 20;
                                }
                                
                                // Always position tooltip below the point to avoid cutoff
                                y = y + 30;
                                
                                // If tooltip would go below chart, position it above
                                if (y + tooltipHeight > rect.height - 20) {
                                  y = e.clientY - rect.top - tooltipHeight - 10;
                                }
                                
                                setTooltipPosition({ x, y });
                              }}
                              onMouseMove={(e) => {
                                const rect = chartRef.current.getBoundingClientRect();
                                const tooltipWidth = 220;
                                const tooltipHeight = 120;
                                
                                let x = e.clientX - rect.left;
                                let y = e.clientY - rect.top;
                                
                                // Ensure tooltip stays within chart bounds horizontally
                                const halfTooltipWidth = tooltipWidth / 2;
                                if (x < halfTooltipWidth + 20) {
                                  x = halfTooltipWidth + 20;
                                } else if (x > rect.width - halfTooltipWidth - 20) {
                                  x = rect.width - halfTooltipWidth - 20;
                                }
                                
                                // Always position tooltip below the point to avoid cutoff
                                y = y + 30;
                                
                                // If tooltip would go below chart, position it above
                                if (y + tooltipHeight > rect.height - 20) {
                                  y = e.clientY - rect.top - tooltipHeight - 10;
                                }
                                
                                setTooltipPosition({ x, y });
                              }}
                                  style={{ cursor: 'pointer' }}
                                />
                                
                                {/* Main point with clean design - solid circle with matching border */}
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r={isHovered ? 7 : 6}
                                  fill={point.color}
                                  stroke={point.color}
                                  strokeWidth={2}
                                />
                                
                                {/* Inner white dot for clean look */}
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r={isHovered ? 3 : 2.5}
                                  fill="white"
                                />
                              </g>
                            );
                          })}
                          
                          {/* Enhanced X-axis labels */}
                          {points.map((point, index) => (
                            <g key={point.year}>
                              <text
                                x={point.x}
                                y={padding + chartHeight + 30}
                                textAnchor="middle"
                                className="text-sm font-bold fill-gray-700 dark:fill-gray-200"
                              >
                                {point.year}
                              </text>
                              <line
                                x1={point.x}
                                y1={padding + chartHeight}
                                x2={point.x}
                                y2={padding + chartHeight + 8}
                                stroke={point.color}
                                strokeWidth={2}
                              />
                            </g>
                          ))}
                          
                          {/* Enhanced Y-axis labels */}
                          {[0, 0.5, 1].map((ratio, index) => {
                            const y = padding + chartHeight - (ratio * chartHeight);
                            const value = Math.round(adjustedMinCount + (adjustedCountRange * ratio));
                            return (
                              <g key={index}>
                              <text
                                  x={padding - 20}
                                y={y + 4}
                                textAnchor="end"
                                  className="text-sm font-semibold fill-gray-700 dark:fill-gray-200"
                              >
                                {value.toLocaleString()}
                              </text>
                                <line
                                  x1={padding - 8}
                                  y1={y}
                                  x2={padding}
                                  y2={y}
                                  stroke="#6b7280"
                                  strokeWidth={2}
                                  opacity="0.6"
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
                            className="text-sm font-medium fill-gray-600 dark:fill-gray-400"
                          >
                            Number of Violations
                          </text>
                        </g>
                      );
                    })()}
                  </svg>
                  
                  {/* Enhanced Tooltip */}
                  {showTooltip && hoveredPoint !== null && (
                    <div
                      className="absolute bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl p-4 z-50 pointer-events-none backdrop-blur-sm min-w-[200px]"
                      style={{
                        left: `${tooltipPosition.x - 110}px`,
                        top: `${tooltipPosition.y}px`,
                        maxWidth: '250px',
                        position: 'absolute'
                      }}
                    >
                      {/* Arrow pointing to data point */}
                      <div 
                        className="absolute w-3 h-3 bg-white dark:bg-gray-800 border-l-2 border-t-2 border-gray-200 dark:border-gray-600 transform rotate-45"
                        style={{
                          left: '50%',
                          top: '-6px',
                          transform: 'translateX(-50%) rotate(45deg)'
                        }}
                      ></div>
                      <div className="flex items-center space-x-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full shadow-lg"
                          style={{ backgroundColor: colorPalette[hoveredPoint % colorPalette.length] }}
                        ></div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {filteredYearlyData[hoveredPoint]?._id?.year || 'N/A'}
                        </span>
                      </div>
                      <div className="text-lg font-bold mb-2" style={{ color: colorPalette[hoveredPoint % colorPalette.length] }}>
                        {(filteredYearlyData[hoveredPoint]?.count || 0).toLocaleString()} violations
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {hoveredPoint > 0 && (
                          <span className={
                            (filteredYearlyData[hoveredPoint]?.count || 0) > (filteredYearlyData[hoveredPoint - 1]?.count || 0)
                              ? "text-red-500" : "text-green-500"
                          }>
                            {(filteredYearlyData[hoveredPoint]?.count || 0) > (filteredYearlyData[hoveredPoint - 1]?.count || 0) ? "↗" : "↘"} 
                            {Math.abs((filteredYearlyData[hoveredPoint]?.count || 0) - (filteredYearlyData[hoveredPoint - 1]?.count || 0)).toLocaleString()} from previous year
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                  {/* Summary Statistics - Right Side */}
                  <div className="w-56 space-y-2">
                    {/* Timeline Card */}
                    <div className="relative overflow-hidden bg-white border-2 border-blue-200 rounded-lg p-2 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/10 dark:bg-blue-400/10 rounded-full -translate-y-1 translate-x-1"></div>
                      <div className="relative z-10">
                        <div className="flex items-center mb-0.5">
                          <div className="w-1 h-1 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
                          <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Timeline</div>
                        </div>
                        <div className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-0.5">
                      {filteredYearlyData.length}
                    </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                      Years Covered
                    </div>
                  </div>
                    </div>
                    
                    {/* Critical Card */}
                    <div className="relative overflow-hidden bg-white border-2 border-red-200 rounded-lg p-2 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="absolute top-0 right-0 w-8 h-8 bg-red-500/10 dark:bg-red-400/10 rounded-full -translate-y-1 translate-x-1"></div>
                      <div className="absolute top-1 right-1 w-1 h-1 bg-red-500 rounded-full animate-ping"></div>
                      <div className="relative z-10">
                        <div className="flex items-center mb-0.5">
                          <div className="w-1 h-1 bg-red-500 rounded-full mr-1"></div>
                          <div className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">Critical</div>
                        </div>
                        <div className="text-lg font-bold text-red-900 dark:text-red-100 mb-0.5">
                      {filteredYearlyData.reduce((sum, item) => sum + (item.count || 0), 0).toLocaleString()}
                    </div>
                        <div className="text-xs text-red-600 dark:text-red-400">
                      Total Violations
                    </div>
                  </div>
                    </div>
                    
                    {/* Analytics Card */}
                    <div className="relative overflow-hidden bg-white border-2 border-green-200 rounded-lg p-2 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="absolute top-0 right-0 w-8 h-8 bg-green-500/10 dark:bg-green-400/10 rounded-full -translate-y-1 translate-x-1"></div>
                      <div className="absolute top-1 right-1 w-1 h-1 bg-green-400 rounded-full animate-bounce"></div>
                      <div className="relative z-10">
                        <div className="flex items-center mb-0.5">
                          <div className="w-1 h-1 bg-green-500 rounded-full mr-1"></div>
                          <div className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">Analytics</div>
                        </div>
                        <div className="text-lg font-bold text-green-900 dark:text-green-100 mb-0.5">
                      {filteredYearlyData.length > 0 
                        ? Math.round(filteredYearlyData.reduce((sum, item) => sum + (item.count || 0), 0) / filteredYearlyData.length).toLocaleString()
                        : 0
                      }
                    </div>
                        <div className="text-xs text-green-600 dark:text-green-400">
                      Average per Year
                    </div>
                  </div>
                </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-sm">No data available for the selected year range</p>
                <p className="text-xs opacity-75 mt-1">Try selecting a different time period</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
