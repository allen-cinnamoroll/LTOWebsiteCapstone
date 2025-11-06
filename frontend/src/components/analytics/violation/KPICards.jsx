import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/components/theme/theme-provider';

// Counter animation hook - starts animation when data is available
const useCounterAnimation = (end, duration = 2000, shouldAnimate = true) => {
  const [count, setCount] = useState(0);
  const animationRef = useRef(null);
  
  useEffect(() => {
    // Reset count when animation should not run
    if (!shouldAnimate) {
      setCount(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    // Reset to 0 and start animation
    setCount(0);
    
    // Small delay to ensure all animations start together
    const timeoutId = setTimeout(() => {
      let startTime = null;
      const startValue = 0;
      
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        // Easing function for smooth animation
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
    }, 50); // Small delay to synchronize all animations
    
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

// Progress bar animation hook - synchronized with counter animation (same pattern)
const useProgressBarAnimation = (targetPercentage, duration = 2000, shouldAnimate = true) => {
  const [width, setWidth] = useState(0);
  const animationRef = useRef(null);
  
  useEffect(() => {
    // Reset width when animation should not run
    if (!shouldAnimate) {
      setWidth(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    // Reset to 0 and start animation
    setWidth(0);
    
    // Small delay to ensure all animations start together
    const timeoutId = setTimeout(() => {
      let startTime = null;
      const startValue = 0;
      
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        // Same easing function as counter animation - easeOutQuart
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
    }, 50); // Small delay to synchronize all animations
    
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

export function KPICards({ displayData, loading, totalViolations, totalTrafficViolators, topOfficer, mostCommonViolation }) {
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
  }, [loading, totalViolations, totalTrafficViolators]);
  
  // Determine if we should animate - all animations start together when data is loaded
  const shouldAnimate = !loading && animationTrigger > 0;
  
  // Counter animations - all start simultaneously when data is available
  const violationsAnimated = useCounterAnimation(totalViolations || 0, 2000, shouldAnimate);
  const violatorsAnimated = useCounterAnimation(totalTrafficViolators || 0, 2000, shouldAnimate);
  const commonViolationCountAnimated = useCounterAnimation(mostCommonViolation?.count || 0, 2000, shouldAnimate);
  const officerCountAnimated = useCounterAnimation(topOfficer?.count || topOfficer?.violationCount || 0, 2000, shouldAnimate);
  
  // Progress bar animations - synchronized with counter animations, all start together
  const violationsBarWidth = useProgressBarAnimation(100, 2000, shouldAnimate);
  const violatorsBarWidth = useProgressBarAnimation(100, 2000, shouldAnimate);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, index) => (
           <div key={index} className={`${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-xl p-6 animate-pulse`}>
            <div className="flex items-center">
              <div className="flex-1">
                <div className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-2`}></div>
                <div className={`h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-1`}></div>
                <div className={`h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`}></div>
              </div>
              <div className="ml-4">
                <div className={`w-12 h-12 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full`}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Violations KPI */}
       <div className={`${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300 transform relative overflow-hidden group animate-in slide-in-from-bottom-4 fade-in duration-500`}>
        <div className={`absolute top-0 right-0 w-20 h-20 ${isDarkMode ? 'bg-gradient-to-br from-blue-500/30 to-blue-600/15' : 'bg-gradient-to-br from-blue-500/10 to-blue-600/5'} rounded-full -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-300`}></div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total Violations</p>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {loading ? '...' : violationsAnimated.toLocaleString()}
            </div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">All time recorded violations</p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-0.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-0.5 shadow-sm"
                style={{ 
                  width: `${violationsBarWidth}%`
                }}
              ></div>
            </div>
          </div>
          <div className="ml-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Total Traffic Violators KPI */}
       <div className={`${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-green-500/30 hover:-translate-y-1 transition-all duration-300 transform relative overflow-hidden group animate-in slide-in-from-bottom-4 fade-in duration-500`}>
        <div className={`absolute top-0 right-0 w-20 h-20 ${isDarkMode ? 'bg-gradient-to-br from-green-500/30 to-green-600/15' : 'bg-gradient-to-br from-green-500/10 to-green-600/5'} rounded-full -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-300`}></div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Traffic Violators</p>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {loading ? '...' : violatorsAnimated.toLocaleString()}
            </div>
            <p className="text-xs font-medium text-green-600 dark:text-green-400">People</p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-0.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-0.5 shadow-sm"
                style={{ 
                  width: `${violatorsBarWidth}%`
                }}
              ></div>
            </div>
          </div>
          <div className="ml-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Most Common Violation KPI */}
       <div className={`${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-1 transition-all duration-300 transform relative overflow-hidden group animate-in slide-in-from-bottom-4 fade-in duration-500`}>
        <div className={`absolute top-0 right-0 w-20 h-20 ${isDarkMode ? 'bg-gradient-to-br from-red-500/30 to-red-600/15' : 'bg-gradient-to-br from-red-500/10 to-red-600/5'} rounded-full -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-300`}></div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Most Common Violation</p>
            </div>
            <p className="font-bold text-gray-900 dark:text-white mb-1 truncate" style={{ fontSize: '15px' }} title={mostCommonViolation?._id || 'N/A'}>
              {mostCommonViolation?._id || 'N/A'}
            </p>
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {loading ? '...' : commonViolationCountAnimated.toLocaleString()}{" "}occurrences
            </p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-0.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-red-500 to-red-600 h-0.5 shadow-sm"
                style={{ 
                  width: `${commonViolationBarWidth}%`
                }}
              ></div>
            </div>
          </div>
          <div className="ml-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Top Officer KPI */}
       <div className={`${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-1 transition-all duration-300 transform relative overflow-hidden group animate-in slide-in-from-bottom-4 fade-in duration-500`}>
        <div className={`absolute top-0 right-0 w-20 h-20 ${isDarkMode ? 'bg-gradient-to-br from-purple-500/30 to-purple-600/15' : 'bg-gradient-to-br from-purple-500/10 to-purple-600/5'} rounded-full -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-300`}></div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Top Officer</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white truncate mb-1">
              {topOfficer?.officerName || 'N/A'}
            </p>
            <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
              {loading ? '...' : officerCountAnimated.toLocaleString()}{" "}apprehensions
            </p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-0.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-0.5 shadow-sm"
                style={{ 
                  width: `${officerBarWidth}%`
                }}
              ></div>
            </div>
          </div>
          <div className="ml-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
