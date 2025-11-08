import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/components/theme/theme-provider';

const useAnimationProgress = (duration = 2000, shouldAnimate = true, trigger = 0) => {
  const [progress, setProgress] = useState(0);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!shouldAnimate) {
      setProgress(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let startTime = null;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const rawProgress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - rawProgress, 4);

      setProgress(easeOutQuart);

      if (rawProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    setProgress(0);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [duration, shouldAnimate, trigger]);

  return progress;
};

export function KPICards({ displayData, loading, totalViolations, totalTrafficViolators, mostCommonViolation }) {
  // Use the theme context
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Track when data becomes available to trigger simultaneous animations
  const [animationTrigger, setAnimationTrigger] = useState(0);
  
  useEffect(() => {
    // When loading finishes and we have data, trigger all animations to start together
    // Also trigger when data values change (e.g., when filtering by year)
    if (!loading) {
      // Small delay to ensure all hooks are ready, then trigger animations
      const timer = setTimeout(() => {
        setAnimationTrigger(prev => prev + 1);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // Reset trigger when loading starts
      setAnimationTrigger(0);
    }
  }, [loading, totalViolations, totalTrafficViolators, mostCommonViolation?.count]);
  
  // Determine if we should animate - all animations start together when data is loaded
  const shouldAnimate = !loading && animationTrigger > 0;
  
  const animationProgress = useAnimationProgress(2000, shouldAnimate, animationTrigger);

  const animateNumber = (targetValue = 0) => Math.round(targetValue * (shouldAnimate ? animationProgress : 0));

  const animateWidth = (targetWidth = 0) => (shouldAnimate ? animationProgress * targetWidth : 0);

  const violationsAnimated = animateNumber(totalViolations || 0);
  const violatorsAnimated = animateNumber(totalTrafficViolators || 0);
  const commonViolationCountAnimated = animateNumber(mostCommonViolation?.count || 0);

  const violationsBarWidth = animateWidth(100);
  const violatorsBarWidth = animateWidth(100);
  
  // Calculate percentage for most common violation
  const violationsByTypeData = displayData?.violationsByType || [];
  const totalViolationsByType = violationsByTypeData.reduce((sum, item) => sum + (item.count || 0), 0);
  const mostCommonViolationPercentage = totalViolationsByType > 0 
    ? ((mostCommonViolation?.count || 0) / totalViolationsByType * 100).toFixed(1)
    : '0.0';
  const commonViolationTargetWidth = Math.min(
    ((mostCommonViolation?.count || 0) / ((mostCommonViolation?.count || 0) + ((mostCommonViolation?.count || 0) * 0.7))) * 100,
    100
  ) || 0;
  const commonViolationBarWidth = animateWidth(commonViolationTargetWidth);
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[...Array(3)].map((_, index) => (
           <div key={index} className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} border-2 rounded-2xl p-5 animate-pulse shadow-xl`}>
            <div className="flex items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-9 h-9 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-xl`}></div>
                  <div className={`h-3 w-24 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`}></div>
                </div>
                <div className={`h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-2`}></div>
                <div className={`h-3 w-32 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-3`}></div>
                <div className={`h-1.5 w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full`}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
      {/* Total Violations KPI */}
       <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-orange-50/30 border-gray-200'} border-2 rounded-2xl shadow-xl p-5 hover:shadow-2xl hover:shadow-orange-500/40 hover:-translate-y-1.5 transition-all duration-300 transform relative overflow-hidden group animate-in slide-in-from-bottom-4 fade-in duration-500`}>
        <div className={`absolute top-0 right-0 w-24 h-24 ${isDarkMode ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/10' : 'bg-gradient-to-br from-orange-500/15 to-orange-600/8'} rounded-full -translate-y-6 translate-x-6 group-hover:scale-125 transition-transform duration-500 blur-xl`}></div>
        <div className="absolute top-4 right-4">
          <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 pr-10">
              <div className="mb-2">
                <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Violations</p>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-400 dark:to-orange-500 bg-clip-text text-transparent">
                {loading ? '...' : violationsAnimated.toLocaleString()}
              </div>
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-0.5">All time recorded violations</p>
            </div>
          </div>
          <div className="w-full bg-gray-200/60 dark:bg-gray-700/60 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
            <div 
              className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 h-1.5 rounded-full shadow-lg shadow-orange-500/50"
              style={{ 
                width: `${violationsBarWidth}%`,
                transition: 'none'
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Total Traffic Violators KPI */}
       <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-green-50/30 border-gray-200'} border-2 rounded-2xl shadow-xl p-5 hover:shadow-2xl hover:shadow-green-500/40 hover:-translate-y-1.5 transition-all duration-300 transform relative overflow-hidden group animate-in slide-in-from-bottom-4 fade-in duration-500`}>
        <div className={`absolute top-0 right-0 w-24 h-24 ${isDarkMode ? 'bg-gradient-to-br from-green-500/20 to-green-600/10' : 'bg-gradient-to-br from-green-500/15 to-green-600/8'} rounded-full -translate-y-6 translate-x-6 group-hover:scale-125 transition-transform duration-500 blur-xl`}></div>
        <div className="absolute top-4 right-4">
          <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 pr-10">
              <div className="mb-2">
                <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Traffic Violators</p>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 bg-gradient-to-r from-green-600 to-green-700 dark:from-green-400 dark:to-green-500 bg-clip-text text-transparent">
                {loading ? '...' : violatorsAnimated.toLocaleString()}
              </div>
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-0.5">People</p>
            </div>
          </div>
          <div className="w-full bg-gray-200/60 dark:bg-gray-700/60 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
            <div 
              className="bg-gradient-to-r from-green-500 via-green-600 to-green-700 h-1.5 rounded-full shadow-lg shadow-green-500/50"
              style={{ 
                width: `${violatorsBarWidth}%`,
                transition: 'none'
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Most Common Violation KPI */}
      <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-red-50/30 border-gray-200'} border-2 rounded-2xl shadow-xl p-5 hover:shadow-2xl hover:shadow-red-500/40 hover:-translate-y-1.5 transition-all duration-300 transform relative overflow-hidden group animate-in slide-in-from-bottom-4 fade-in duration-500`}>
        <div className={`absolute top-0 right-0 w-24 h-24 ${isDarkMode ? 'bg-gradient-to-br from-red-500/20 to-red-600/10' : 'bg-gradient-to-br from-red-500/15 to-red-600/8'} rounded-full -translate-y-6 translate-x-6 group-hover:scale-125 transition-transform duration-500 blur-xl`}></div>
        <div className="absolute top-4 right-4">
          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 pr-10 min-w-0">
              <div className="mb-2">
                <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Most Common Violation</p>
              </div>
              <div 
                className="text-sm font-extrabold text-black dark:text-white mb-1.5 leading-snug break-words overflow-wrap-anywhere" 
                title={mostCommonViolation?._id || 'N/A'}
                style={{ 
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  hyphens: 'auto'
                }}
              >
                {mostCommonViolation?._id || 'N/A'}
              </div>
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-0.5">
                {loading ? '...' : commonViolationCountAnimated.toLocaleString()}{" "}occurrences
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200/60 dark:bg-gray-700/60 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
            <div 
              className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 h-1.5 rounded-full shadow-lg shadow-red-500/50"
              style={{ 
                width: `${commonViolationBarWidth}%`,
                transition: 'none'
              }}
            ></div>
          </div>
        </div>
      </div>

    </div>
  );
}
