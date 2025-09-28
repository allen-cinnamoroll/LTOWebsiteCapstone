import React from 'react';

export function PieChart({ data, title, loading }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-black border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-md p-6">
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
      <div className="bg-white dark:bg-black border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-md p-6">
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

  const getColor = (index) => colors[index] || '#6B7280';

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
    <div className="bg-white dark:bg-black border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
        {title}
      </h3>
      
      <div className="flex flex-col lg:flex-row items-center space-y-6 lg:space-y-0 lg:space-x-6">
        {/* Pie Chart SVG */}
        <div className="flex-shrink-0">
          <svg width="200" height="200" viewBox="0 0 200 200" className="mx-auto">
            {segments.map((segment, index) => (
              <path
                key={index}
                d={createArcPath(segment.startAngle, segment.endAngle)}
                fill={getColor(index)}
                stroke="white"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity duration-200"
              />
            ))}
            {/* Center circle for donut effect */}
            <circle
              cx="100"
              cy="100"
              r="40"
              fill="white"
              className="dark:fill-gray-900"
            />
            <text
              x="100"
              y="95"
              textAnchor="middle"
              className="text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Total
            </text>
            <text
              x="100"
              y="110"
              textAnchor="middle"
              className="text-lg font-bold text-gray-900 dark:text-white"
            >
              {total.toLocaleString()}
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: getColor(index) }}
                ></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {segment._id || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {segment.percentage.toFixed(1)}% of total
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {segment.count?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  violations
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {top5Data.length < 5 && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Only {top5Data.length} violation types available
        </div>
      )}
    </div>
  );
}
