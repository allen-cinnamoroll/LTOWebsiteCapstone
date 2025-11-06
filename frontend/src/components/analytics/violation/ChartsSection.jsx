import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/components/theme/theme-provider';
import { BarChart } from './BarChart';
import { PieChart } from './PieChart';
import { ViolationRanking } from './ViolationRanking';

// Counter animation hook
const useCounterAnimation = (end, duration = 2000, shouldAnimate = true) => {
  const [count, setCount] = useState(0);
  const animationRef = useRef(null);
  
  useEffect(() => {
    if (!shouldAnimate) {
      setCount(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    setCount(0);
    const timeoutId = setTimeout(() => {
      let startTime = null;
      const startValue = 0;
      
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentCount = Math.floor(startValue + (end - startValue) * easeOutQuart);
        
        setCount(currentCount);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setCount(end);
          animationRef.current = null;
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }, 50);
    
    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [end, duration, shouldAnimate]);
  
  return count;
};

// Progress bar animation hook
const useProgressBarAnimation = (targetPercentage, duration = 2000, shouldAnimate = true) => {
  const [width, setWidth] = useState(0);
  const animationRef = useRef(null);
  
  useEffect(() => {
    if (!shouldAnimate) {
      setWidth(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    setWidth(0);
    const timeoutId = setTimeout(() => {
      let startTime = null;
      const startValue = 0;
      
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentWidth = startValue + (targetPercentage - startValue) * easeOutQuart;
        
        setWidth(currentWidth);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setWidth(targetPercentage);
          animationRef.current = null;
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }, 50);
    
    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [targetPercentage, duration, shouldAnimate]);
  
  return width;
};

export function ChartsSection({ 
  displayData, 
  loading, 
  mostCommonViolation,
  topOfficer
}) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Animation trigger for KPIs
  const [animationTrigger, setAnimationTrigger] = useState(0);
  
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setAnimationTrigger(prev => prev + 1);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setAnimationTrigger(0);
    }
  }, [loading, mostCommonViolation?.count, topOfficer?.count]);
  
  const shouldAnimate = !loading && animationTrigger > 0;
  const commonViolationCountAnimated = useCounterAnimation(mostCommonViolation?.count || 0, 2000, shouldAnimate);
  const officerCountAnimated = useCounterAnimation(topOfficer?.count || topOfficer?.violationCount || 0, 2000, shouldAnimate);
  
  const commonViolationBarWidth = useProgressBarAnimation(
    Math.min(((mostCommonViolation?.count || 0) / ((mostCommonViolation?.count || 0) + ((mostCommonViolation?.count || 0) * 0.7))) * 100, 100),
    2000,
    shouldAnimate
  );
  const officerBarWidth = useProgressBarAnimation(
    Math.min(((topOfficer?.count || topOfficer?.violationCount || 0) / ((topOfficer?.count || topOfficer?.violationCount || 0) + ((topOfficer?.count || topOfficer?.violationCount || 0) * 0.8))) * 100, 100),
    2000,
    shouldAnimate
  );

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
  
  // Calculate percentages
  const mostCommonViolationPercentage = totalViolationsByType > 0 
    ? ((mostCommonViolation?.count || 0) / totalViolationsByType * 100).toFixed(1)
    : '0.0';
  
  const topOfficersData = displayData?.topOfficers || [];
  const totalOfficerApprehensions = topOfficersData.reduce((sum, item) => sum + (item.count || item.violationCount || 0), 0);
  const topOfficerPercentage = totalOfficerApprehensions > 0
    ? (((topOfficer?.count || topOfficer?.violationCount || 0) / totalOfficerApprehensions) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6 mb-8">
      {/* Pie Chart and KPIs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
         {/* Left Side - Violation Types Pie Chart */}
         <div className="flex">
           <div className="w-full" style={{ height: '380px' }}>
          <PieChart
            data={violationsByTypeData}
            title="Violation Types Distribution"
            loading={loading}
          />
        </div>
      </div>

         {/* Right Side - Two KPIs Stacked */}
         <div className="flex flex-col gap-4" style={{ height: '380px' }}>
           {/* Most Common Violation KPI */}
           <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-red-50/30 border-gray-200'} border-2 rounded-xl shadow-xl p-4 hover:shadow-2xl hover:shadow-red-500/40 hover:-translate-y-1 transition-all duration-300 transform relative overflow-hidden group animate-in slide-in-from-bottom-4 fade-in duration-500 flex-1 flex flex-col justify-between`}>
             <div className={`absolute top-0 right-0 w-24 h-24 ${isDarkMode ? 'bg-gradient-to-br from-red-500/20 to-red-600/10' : 'bg-gradient-to-br from-red-500/15 to-red-600/8'} rounded-full -translate-y-4 translate-x-4 group-hover:scale-125 transition-transform duration-500 blur-xl`}></div>
             <div className="absolute top-4 right-4">
               <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
               </svg>
             </div>
             <div className="relative z-10 flex-1 flex flex-col justify-between">
               <div className="flex-1">
                 <div className="mb-3">
                   <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Most Common Violation</p>
                 </div>
                 <p className="text-xl font-extrabold text-black dark:text-white mb-2 truncate" title={mostCommonViolation?._id || 'N/A'}>
                   {mostCommonViolation?._id || 'N/A'}
                 </p>
                 <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                   {loading ? '...' : commonViolationCountAnimated.toLocaleString()}{" "}occurrences
                 </p>
               </div>
               <div className="mt-4">
                 <div className="flex items-center justify-between mb-1.5">
                   <p className="text-base font-bold text-red-600 dark:text-red-400">
                     {loading ? '...' : `${mostCommonViolationPercentage}%`}
                   </p>
                 </div>
                 <div className="w-full bg-gray-200/60 dark:bg-gray-700/60 rounded-full h-3 overflow-hidden backdrop-blur-sm">
                   <div 
                     className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 h-3 rounded-full shadow-lg shadow-red-500/50 transition-all duration-500"
                     style={{ 
                       width: `${commonViolationBarWidth}%`
                     }}
                   ></div>
                 </div>
               </div>
             </div>
           </div>

           {/* Top Officer KPI */}
           <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-purple-50/30 border-gray-200'} border-2 rounded-xl shadow-xl p-4 hover:shadow-2xl hover:shadow-purple-500/40 hover:-translate-y-1 transition-all duration-300 transform relative overflow-hidden group animate-in slide-in-from-bottom-4 fade-in duration-500 flex-1 flex flex-col justify-between`}>
             <div className={`absolute top-0 right-0 w-24 h-24 ${isDarkMode ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/10' : 'bg-gradient-to-br from-purple-500/15 to-purple-600/8'} rounded-full -translate-y-4 translate-x-4 group-hover:scale-125 transition-transform duration-500 blur-xl`}></div>
             <div className="absolute top-4 right-4">
               <svg className="w-7 h-7 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
               </svg>
             </div>
             <div className="relative z-10 flex-1 flex flex-col justify-between">
               <div className="flex-1">
                 <div className="mb-3">
                   <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Top Officer</p>
                 </div>
                 <p className="text-xl font-extrabold text-black dark:text-white truncate mb-2">
                   {topOfficer?.officerName || 'N/A'}
                 </p>
                 <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                   {loading ? '...' : officerCountAnimated.toLocaleString()}{" "}apprehensions
                 </p>
               </div>
               <div className="mt-4">
                 <div className="flex items-center justify-between mb-1.5">
                   <p className="text-base font-bold text-purple-600 dark:text-purple-400">
                     {loading ? '...' : `${topOfficerPercentage}%`}
                   </p>
                 </div>
                 <div className="w-full bg-gray-200/60 dark:bg-gray-700/60 rounded-full h-3 overflow-hidden backdrop-blur-sm">
                   <div 
                     className="bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 h-3 rounded-full shadow-lg shadow-purple-500/50 transition-all duration-500"
                     style={{ 
                       width: `${officerBarWidth}%`
                     }}
                   ></div>
                 </div>
               </div>
             </div>
           </div>
         </div>
        </div>

      {/* Apprehending Officers Chart - Full Width Below */}
      <div className="w-full" style={{ height: '450px' }}>
          <BarChart
            data={displayData?.topOfficers || []}
            title="Apprehending Officers"
            type="officers"
            loading={loading}
            totalCount={displayData?.totalOfficers || 0}
          />
        </div>

      {/* Violation Ranking Row */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
        {/* Top Violation Ranking */}
        <div className="lg:col-span-1">
          <ViolationRanking
            displayData={displayData}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
