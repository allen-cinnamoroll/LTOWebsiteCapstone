import React, { useState, useRef, useEffect } from 'react';
import { BarChart } from './BarChart';
import { PieChart } from './PieChart';
import { ViolationRanking } from './ViolationRanking';
import { ViolationCombinations } from './ViolationCombinations';

export function ChartsSection({ 
  displayData, 
  loading, 
  setIsLineChartModalOpen,
  currentViolations,
  startIndex,
  endIndex,
  totalViolationItems,
  currentPage,
  totalPages,
  handlePrevPage,
  handleNextPage,
  getCombinationRecommendation
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const chartRef = useRef(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Violations by Type Chart */}
        <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded mb-4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
        
        {/* Yearly Trends Chart */}
        <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded mb-4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for violations by type chart
  const violationsByTypeData = displayData?.violationsByType || [];
  const totalViolationsByType = violationsByTypeData.reduce((sum, item) => sum + (item.count || 0), 0);

  // Prepare data for yearly trends chart - filter for 2020-2025
  const allYearlyTrendsData = displayData?.yearlyTrends || [];
  const yearlyTrendsData = allYearlyTrendsData.filter(item => {
    const year = item._id?.year || 0;
    return year >= 2020 && year <= 2025;
  });
  const maxYearlyViolations = Math.max(...yearlyTrendsData.map(item => item.count || 0), 1);

  return (
    <div className="space-y-6 mb-8">
       {/* Advanced Line Chart - Yearly Trends (Full Width) */}
       <div className="bg-gradient-to-br from-white to-gray-50 dark:from-black dark:to-black border-2 border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300">
        <div className="relative">
          {yearlyTrendsData.length > 0 ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                      Violation Trends Analysis
                </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Historical data from 2020-2025
                    </p>
                  </div>
                </div>
                {yearlyTrendsData.length > 5 && (
                  <button
                    onClick={() => setIsLineChartModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <span className="text-sm font-medium">View More</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                )}
              </div>
              
              <div className="flex gap-6">
                <div className="flex-1">
                   <div className="relative bg-white dark:bg-black rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <svg 
                      ref={chartRef}
                      width="100%" 
                      height="350" 
                      className="relative"
                      onMouseLeave={() => {
                        setShowTooltip(false);
                        setHoveredPoint(null);
                      }}
                    >
                {(() => {
                  const sortedData = yearlyTrendsData
                    .sort((a, b) => (a._id?.year || 0) - (b._id?.year || 0));
                  
                  if (sortedData.length === 0) return null;
                  
                  const width = 800;
                  const height = 350;
                  const padding = 80;
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
                    return { x, y, year, count };
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
                      {/* Background gradient */}
                      <defs>
                        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05"/>
                        </linearGradient>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#8b5cf6"/>
                          <stop offset="50%" stopColor="#3b82f6"/>
                          <stop offset="100%" stopColor="#06b6d4"/>
                        </linearGradient>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                          <feMerge> 
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      
                      {/* Grid lines with animation */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
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
                            strokeDasharray="2,2"
                            opacity="0.6"
                          >
                            <animate attributeName="opacity" values="0;0.6;0" dur="2s" begin={`${index * 0.2}s`} repeatCount="1"/>
                          </line>
                        );
                      })}
                      
                      {/* Area fill with gradient */}
                      <path
                        d={areaPath}
                        fill="url(#areaGradient)"
                      />
                      
                      {/* Main line with gradient and glow effect */}
                      <path
                        d={linePath}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth={4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#glow)"
                      >
                        <animate attributeName="stroke-dasharray" values="0,1000;1000,0" dur="2s" repeatCount="1"/>
                      </path>
                      
                      {/* Interactive data points */}
                      {points.map((point, index) => {
                        const isHovered = hoveredPoint === index;
                        return (
                          <g key={point.year}>
                            {/* Hover area (invisible but larger for easier interaction) */}
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r={15}
                              fill="transparent"
                              onMouseEnter={(e) => {
                                setHoveredPoint(index);
                                setShowTooltip(true);
                                const rect = chartRef.current.getBoundingClientRect();
                                const tooltipWidth = 200;
                                const tooltipHeight = 100;
                                
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
                                const tooltipWidth = 200;
                                const tooltipHeight = 100;
                                
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
                            
                            {/* Outer ring for hover effect */}
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r={isHovered ? 12 : 8}
                              fill="none"
                              stroke={isHovered ? "#3b82f6" : "#e5e7eb"}
                              strokeWidth={isHovered ? 3 : 2}
                              opacity={isHovered ? 0.3 : 0.6}
                            >
                              <animate 
                                attributeName="r" 
                                values={isHovered ? "8;12;8" : "8"} 
                                dur={isHovered ? "1s" : "0s"} 
                                repeatCount={isHovered ? "indefinite" : "1"}
                              />
                            </circle>
                            
                            {/* Main point */}
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r={isHovered ? 8 : 6}
                              fill="#3b82f6"
                              stroke="white"
                              strokeWidth={3}
                              className="drop-shadow-lg"
                            >
                              <animate 
                                attributeName="r" 
                                values="6;8;6" 
                                dur="2s" 
                                begin={`${index * 0.1}s`}
                                repeatCount="1"
                              />
                            </circle>
                            
                            {/* Inner glow */}
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r={isHovered ? 4 : 3}
                              fill="#60a5fa"
                              opacity="0.8"
                            />
                          </g>
                        );
                      })}
                      
                      {/* X-axis labels with styling */}
                      {points.map((point, index) => (
                        <g key={point.year}>
                          <text
                            x={point.x}
                            y={padding + chartHeight + 25}
                            textAnchor="middle"
                            className="text-sm font-medium fill-gray-600 dark:fill-gray-300"
                          >
                            {point.year}
                          </text>
                          <line
                            x1={point.x}
                            y1={padding + chartHeight}
                            x2={point.x}
                            y2={padding + chartHeight + 5}
                            stroke="#6b7280"
                            strokeWidth={1}
                          />
                        </g>
                      ))}
                      
                      {/* Y-axis labels with better formatting */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                        const y = padding + chartHeight - (ratio * chartHeight);
                        const value = Math.round(adjustedMinCount + (adjustedCountRange * ratio));
                        return (
                          <g key={index}>
                          <text
                              x={padding - 15}
                            y={y + 4}
                            textAnchor="end"
                              className="text-sm font-medium fill-gray-600 dark:fill-gray-300"
                          >
                            {value.toLocaleString()}
                          </text>
                            <line
                              x1={padding - 5}
                              y1={y}
                              x2={padding}
                              y2={y}
                              stroke="#6b7280"
                              strokeWidth={1}
                              opacity="0.5"
                            />
                          </g>
                        );
                      })}
                      
                      {/* Chart title and axis labels */}
                      <text
                        x={width / 2}
                        y={25}
                        textAnchor="middle"
                        className="text-lg font-bold fill-gray-800 dark:fill-gray-200"
                      >
                        Violation Trends Over Time
                      </text>
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
                    
                    {/* Advanced Tooltip */}
                    {showTooltip && hoveredPoint !== null && (
                      <div
                        className="absolute bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl p-4 z-50 pointer-events-none backdrop-blur-sm min-w-[200px]"
                        style={{
                          left: tooltipPosition.x - 100,
                          top: tooltipPosition.y,
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
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {yearlyTrendsData[hoveredPoint]?._id?.year || 'N/A'}
                          </span>
                        </div>
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {(yearlyTrendsData[hoveredPoint]?.count || 0).toLocaleString()} violations
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {hoveredPoint > 0 && (
                            <span className={
                              (yearlyTrendsData[hoveredPoint]?.count || 0) > (yearlyTrendsData[hoveredPoint - 1]?.count || 0)
                                ? "text-red-500" : "text-green-500"
                            }>
                              {(yearlyTrendsData[hoveredPoint]?.count || 0) > (yearlyTrendsData[hoveredPoint - 1]?.count || 0) ? "↗" : "↘"} 
                              {Math.abs((yearlyTrendsData[hoveredPoint]?.count || 0) - (yearlyTrendsData[hoveredPoint - 1]?.count || 0)).toLocaleString()} from previous year
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Summary Statistics - Right Side */}
                <div className="w-60 space-y-4">
                  {/* Years Covered Card - Timeline Design */}
                  <div className="relative overflow-hidden bg-white border border-blue-200 p-2 rounded-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/10 dark:bg-blue-400/10 rounded-full -translate-y-4 translate-x-4"></div>
                    <div className="relative z-10">
                      <div className="flex items-center mb-0.5">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse"></div>
                        <div className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">Timeline</div>
                      </div>
                      <div className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-0.5">
                        {yearlyTrendsData.length}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Years Covered
                      </div>
                      <div className="mt-1 flex space-x-0.5">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="w-1 h-1 bg-blue-400 dark:bg-blue-500 rounded-full opacity-60"></div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Total Violations Card - Alert Badge Design */}
                  <div className="relative overflow-hidden bg-white border border-red-200 p-2 rounded-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-10 h-10 bg-red-500/10 dark:bg-red-400/10 rounded-full -translate-y-3 translate-x-3"></div>
                    <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></div>
                    <div className="relative z-10">
                      <div className="flex items-center mb-0.5">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></div>
                        <div className="text-xs font-medium text-red-700 dark:text-red-300 uppercase tracking-wide">Critical</div>
                      </div>
                      <div className="text-xl font-bold text-red-900 dark:text-red-100 mb-0.5">
                        {yearlyTrendsData.reduce((sum, item) => sum + (item.count || 0), 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400">
                        Total Violations
                      </div>
                      <div className="mt-1 flex items-center">
                        <div className="w-4 h-0.5 bg-red-300 dark:bg-red-600 rounded-full mr-1.5"></div>
                        <div className="text-xs text-red-500 dark:text-red-400">High Volume</div>
                      </div>
                    </div>
                  </div>

                  {/* Average per Year Card - Analytics Design */}
                  <div className="relative overflow-hidden bg-white border border-green-200 p-2 rounded-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-green-500/10 dark:bg-green-400/10 rounded-full -translate-y-4 translate-x-4"></div>
                    <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce"></div>
                    <div className="relative z-10">
                      <div className="flex items-center mb-0.5">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>
                        <div className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">Analytics</div>
                      </div>
                      <div className="text-xl font-bold text-green-900 dark:text-green-100 mb-0.5">
                        {yearlyTrendsData.length > 0 
                          ? Math.round(yearlyTrendsData.reduce((sum, item) => sum + (item.count || 0), 0) / yearlyTrendsData.length).toLocaleString()
                          : 0
                        }
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        Average per Year
                      </div>
                      <div className="mt-1 flex items-center space-x-0.5">
                        <div className="w-0.5 h-1.5 bg-green-400 dark:bg-green-500 rounded-full"></div>
                        <div className="w-0.5 h-2 bg-green-500 dark:bg-green-400 rounded-full"></div>
                        <div className="w-0.5 h-1 bg-green-400 dark:bg-green-500 rounded-full"></div>
                        <div className="w-0.5 h-2.5 bg-green-500 dark:bg-green-400 rounded-full"></div>
                        <div className="w-0.5 h-1.5 bg-green-400 dark:bg-green-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No data available for 2020-2025
            </div>
          )}
        </div>
      </div>

      {/* KPIs and Violation Distribution Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Left Side - Stacked KPIs */}
        <div className="lg:col-span-2 flex flex-col space-y-4 h-full">
           {/* Total Unique Violations KPI */}
           <div className="bg-white border-2 border-blue-200 rounded-xl shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex-1 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-300/20 to-indigo-400/20 rounded-full translate-y-12 -translate-x-12"></div>
            
            <div className="flex items-center justify-between h-full relative z-10">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg ring-4 ring-blue-200/50 dark:ring-blue-800/50">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">Traffic Violations</h3>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Distinct kinds of violation</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm">
                  {displayData?.mostCommonViolations?.length || 0}
                </div>
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                  Types
                </div>
              </div>
            </div>
          </div>

           {/* Total Unique Officers KPI */}
           <div className="bg-white border-2 border-emerald-200 rounded-xl shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex-1 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-300/20 to-teal-400/20 rounded-full translate-y-12 -translate-x-12"></div>
            
            <div className="flex items-center justify-between h-full relative z-10">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg ring-4 ring-emerald-200/50 dark:ring-emerald-800/50">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">Apprehending Officers</h3>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Active officers</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent drop-shadow-sm">
                  {displayData?.totalOfficers || 0}
                </div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  Officers
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side - Violation Types Pie Chart */}
        <div className="lg:col-span-2">
          <PieChart
            data={violationsByTypeData}
            title="Violation Types Distribution"
            loading={loading}
          />
        </div>
      </div>

      {/* Officer Ranking and Violation Ranking Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top 5 Officers Bar Chart */}
        <div className="lg:col-span-1">
          <BarChart
            data={displayData?.topOfficers || []}
            title="Apprehending Officers"
            type="officers"
            loading={loading}
            totalCount={displayData?.totalOfficers || 0}
          />
        </div>

        {/* Top Violation Ranking */}
        <div className="lg:col-span-1">
          <ViolationRanking
            displayData={displayData}
            loading={loading}
            currentViolations={currentViolations}
            startIndex={startIndex}
            endIndex={endIndex}
            totalViolationItems={totalViolationItems}
            currentPage={currentPage}
            totalPages={totalPages}
            handlePrevPage={handlePrevPage}
            handleNextPage={handleNextPage}
          />
        </div>
      </div>

      {/* Violation Combinations and Recommended Actions - Full Width */}
      <div className="mb-8">
        <ViolationCombinations
          displayData={displayData}
          loading={loading}
          getCombinationRecommendation={getCombinationRecommendation}
        />
      </div>
    </div>
  );
}
