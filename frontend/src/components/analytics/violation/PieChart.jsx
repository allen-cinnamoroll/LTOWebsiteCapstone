import React, { useState, useEffect } from 'react';

export function PieChart({ data, title, loading }) {
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [animatedSegments, setAnimatedSegments] = useState([]);
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black border-2 border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-6 h-full flex flex-col">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="flex items-center justify-center">
            <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
          <div className="mt-6 space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black border-2 border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
          </div>
          <p>No data available</p>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + (item.count || 0), 0);
  const top5Data = data.slice(0, 5);
  
  // Calculate angles for pie chart
  let currentAngle = 0;
  const segments = top5Data.map((item, index) => {
    const value = item.count || 0;
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + (percentage / 100) * 360;
    currentAngle = endAngle;
    
    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
      index
    };
  });

  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6'  // Purple
  ];

  const gradients = [
    'url(#gradient1)',
    'url(#gradient2)', 
    'url(#gradient3)',
    'url(#gradient4)',
    'url(#gradient5)'
  ];

  const getColor = (index) => colors[index] || '#6B7280';
  const getGradient = (index) => gradients[index] || colors[index] || '#6B7280';

  // Animation effect for segments
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedSegments(segments);
    }, 100);
    return () => clearTimeout(timer);
  }, [segments]);

  // Create SVG path for pie segment
  const createArcPath = (startAngle, endAngle, radius = 80) => {
    const centerX = 100;
    const centerY = 100;
    
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", centerX, centerY,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black border-2 border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 relative overflow-hidden h-full flex flex-col">
      
      <div className="relative z-10">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md mr-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
          </div>
          {title}
        </h3>
      
      <div className="flex flex-col lg:flex-row items-start space-y-5 lg:space-y-0 lg:space-x-1">
        {/* Pie Chart SVG */}
        <div className="flex-shrink-0">
          <svg width="220" height="220" viewBox="0 0 200 200" className="mx-auto drop-shadow-lg">
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
              <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#DC2626" />
              </linearGradient>
              <linearGradient id="gradient5" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>
            </defs>
            
            {animatedSegments.map((segment, index) => (
              <path
                key={index}
                d={createArcPath(segment.startAngle, segment.endAngle)}
                fill={getGradient(index)}
                stroke="white"
                strokeWidth="3"
                className={`transition-all duration-300 cursor-pointer ${
                  hoveredSegment === index 
                    ? 'opacity-90 transform scale-1.05' 
                    : 'opacity-100 hover:opacity-90'
                }`}
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
                style={{
                  filter: hoveredSegment === index ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none'
                }}
              />
            ))}
            
            {/* Center circle for donut effect */}
            <circle
              cx="100"
              cy="100"
              r="45"
              fill="white"
              className="dark:fill-black drop-shadow-md"
            />
            <circle
              cx="100"
              cy="100"
              r="40"
              fill="url(#centerGradient)"
              className="drop-shadow-sm"
            />
            
            {/* Center gradient */}
            <defs>
              <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F8FAFC" />
                <stop offset="100%" stopColor="#E2E8F0" />
              </radialGradient>
            </defs>
            
            <text
              x="100"
              y="93"
              textAnchor="middle"
              className="text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Total
            </text>
            <text
              x="100"
              y="118"
              textAnchor="middle"
              className="text-xl font-black text-gray-900 dark:text-white"
            >
              {total.toLocaleString()}
            </text>
          </svg>
        </div>

        {/* Enhanced Legend */}
        <div className="flex-1 space-y-3 min-w-0">
          {segments.map((segment, index) => (
            <div 
              key={index} 
              className={`flex items-center justify-between py-1 px-2 border-2 rounded-lg transition-all duration-300 cursor-pointer ${
                hoveredSegment === index
                  ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg transform scale-105'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onMouseEnter={() => setHoveredSegment(index)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className="flex items-center space-x-1 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <div
                    className="w-4 h-4 rounded-full shadow-md"
                    style={{ backgroundColor: getColor(index) }}
                  ></div>
                  {hoveredSegment === index && (
                    <div className="absolute inset-0 w-4 h-4 rounded-full animate-ping opacity-75"
                         style={{ backgroundColor: getColor(index) }}></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 dark:text-white break-words">
                    {segment._id || 'Unknown'}
                  </p>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 break-words" style={{ fontSize: '0.65rem' }}>
                    {segment.percentage.toFixed(1)}% of total
                  </p>
                </div>
              </div>
                <div className="text-right flex-shrink-0 ml-1">
                <div className="text-xs font-black text-gray-900 dark:text-white">
                  {segment.count?.toLocaleString() || 0}
                </div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ fontSize: '0.65rem' }}>
                  violation{segment.count !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {top5Data.length < 5 && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Only {top5Data.length} violation types available
            </span>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
