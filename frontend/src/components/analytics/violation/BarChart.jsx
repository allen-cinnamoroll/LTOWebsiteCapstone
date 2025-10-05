import React, { useState, useRef, useEffect } from 'react';

export function BarChart({ data, title, type, loading, totalCount }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [animatedBars, setAnimatedBars] = useState({});
  const chartRef = useRef(null);

  useEffect(() => {
    // Set bars to be visible immediately without animation
    const bars = {};
    data?.slice(0, 5).forEach((_, index) => {
      bars[index] = true;
    });
    setAnimatedBars(bars);
  }, [data]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-black dark:to-black border-2 border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl"></div>
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

  if (!data || data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-black dark:to-black border-2 border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Performance Analytics</p>
          </div>
        </div>
        <div className="text-center py-16 text-gray-500 dark:text-gray-400 flex-1 flex flex-col justify-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Data Available</h4>
          <p className="text-sm">No {type === 'officers' ? 'officer' : 'violation'} data to display</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item.count || item.violationCount || 0));
  const top5Data = data.slice(0, 5);

  const getBarColor = (index) => {
    const colors = [
      'from-blue-500 via-blue-600 to-indigo-600',
      'from-emerald-500 via-green-600 to-teal-600', 
      'from-amber-500 via-yellow-500 to-orange-500',
      'from-red-500 via-rose-600 to-pink-600',
      'from-purple-500 via-violet-600 to-indigo-600'
    ];
    return colors[index] || 'from-gray-500 to-gray-600';
  };

  const getTextColor = (index) => {
    const colors = [
      'text-blue-600 dark:text-blue-400',
      'text-emerald-600 dark:text-emerald-400',
      'text-amber-600 dark:text-amber-400',
      'text-red-600 dark:text-red-400',
      'text-purple-600 dark:text-purple-400'
    ];
    return colors[index] || 'text-gray-600 dark:text-gray-400';
  };

  const getRankNumber = (index) => {
    return index + 1;
  };

  const getRankBgColor = (index) => {
    return 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700';
  };

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-4 hover:shadow-xl transition-all duration-300 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Performance Rankings</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400">Total Officers</div>
          <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">{totalCount || top5Data.length}</div>
        </div>
      </div>
      
       {/* Chart with Axes */}
       <div ref={chartRef} className="flex-1 relative" style={{ minHeight: '350px' }}>
         {/* Y-Axis (Number of Apprehensions) */}
         <div className="absolute left-0 top-0 bottom-12 w-16 flex flex-col justify-between py-4">
           <div className="flex flex-col space-y-2 justify-between h-full">
             {[100, 75, 50, 25, 0].map((tick) => {
               const value = Math.round((tick / 100) * maxValue);
               return (
                 <div key={tick} className="text-xs font-medium text-gray-700 dark:text-gray-300 text-right pr-2">
                   {value}
                 </div>
               );
             })}
           </div>
         </div>

         {/* X-Axis (Officer Names) */}
         <div className="absolute bottom-0 left-16 right-0 h-12 flex items-end justify-between px-4">
           <div className="flex justify-between w-full">
             {top5Data.map((item, index) => {
               const displayName = type === 'officers' 
                 ? (item.officerName || 'Unknown Officer')
                 : (item._id || 'Unknown Item');
               const words = displayName.split(' ');
               return (
                 <div key={index} className="text-xs text-gray-500 dark:text-gray-400 text-center">
                   <div className="flex flex-col items-center">
                     {words.map((word, wordIndex) => (
                       <div key={wordIndex}>{word}</div>
                     ))}
                   </div>
                 </div>
               );
             })}
           </div>
         </div>

         {/* Grid Lines */}
         <div className="absolute left-16 right-0 top-0 bottom-12">
           {[0, 25, 50, 75, 100].map((tick, index) => (
             <div
               key={tick}
               className="absolute w-full border-t border-gray-200 dark:border-gray-700"
               style={{ bottom: `${tick}%` }}
             />
           ))}
         </div>

         {/* Chart Area */}
         <div className="absolute left-16 right-0 top-0 bottom-12 flex items-end justify-between px-4 py-4">
           {top5Data.map((item, index) => {
             const value = item.count || item.violationCount || 0;
             const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
             const displayName = type === 'officers' 
               ? (item.officerName || 'Unknown Officer')
               : (item._id || 'Unknown Item');
             const isHovered = hoveredIndex === index;
             const isAnimated = animatedBars[index];
             
             // Calculate bar height based on percentage
             const barHeight = isAnimated ? Math.max((percentage / 100) * 200, 20) : 20;
             
             return (
               <div 
                 key={index} 
                 className="flex flex-col items-center"
                 onMouseEnter={() => setHoveredIndex(index)}
                 onMouseLeave={() => setHoveredIndex(null)}
                 style={{ flex: 1 }}
               >
                 {/* Bar */}
                 <div className="relative flex flex-col items-center">
                   <div
                     className="w-12 bg-gradient-to-t from-violet-600 via-purple-500 to-pink-500 rounded-t-lg shadow-lg flex items-end justify-center relative"
                     style={{ 
                       height: `${barHeight}px`,
                       minHeight: '20px'
                     }}
                   >
                     {/* Rank number at bottom of the bar */}
                     <div className="mb-1">
                       <span className="text-xs font-bold text-white">{index + 1}</span>
                     </div>
                   </div>
                   
                   {/* Detailed popup on hover */}
                   {isHovered && (
                     <div className="absolute -top-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 shadow-lg z-10 min-w-[180px]">
                       <div className="text-center">
                         <div className="text-xs font-bold text-gray-900 dark:text-white mb-1">
                           {displayName}
                         </div>
                         <div className="flex items-center justify-center space-x-1 mb-1">
                           <div className="text-sm font-bold text-violet-600 dark:text-violet-400">
                             {value.toLocaleString()}
                           </div>
                           <div className="text-xs text-gray-600 dark:text-gray-400">
                             {type === 'officers' ? 'apprehensions' : 'violations'}
                           </div>
                         </div>
                         <div className="text-xs text-purple-600 dark:text-purple-400">
                           {percentage.toFixed(1)}% of max
                         </div>
                         <div className="text-xs text-pink-600 dark:text-pink-400">
                           {((value / top5Data.reduce((sum, item) => sum + (item.count || item.violationCount || 0), 0)) * 100).toFixed(1)}% of total
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             );
           })}
         </div>
       </div>
      
      {top5Data.length < 5 && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Only {top5Data.length} {type === 'officers' ? 'officers' : 'items'} available
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
