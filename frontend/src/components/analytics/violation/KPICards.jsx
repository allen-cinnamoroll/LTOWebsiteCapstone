import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/components/theme/theme-provider';

// Animated Number Component
const AnimatedNumber = ({ value, duration = 2000, className = "" }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      let startTime;
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(value * easeOutQuart);
        
        setDisplayValue(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [value, duration, isVisible]);

  return (
    <div ref={ref} className={`${className} transition-all duration-500 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'}`}>
      {displayValue.toLocaleString()}
    </div>
  );
};

// Animated Progress Bar Component
const AnimatedProgressBar = ({ percentage, color = "bg-blue-500", delay = 0 }) => {
  const [width, setWidth] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        setWidth(percentage);
      }, delay);
    }
  }, [isVisible, percentage, delay]);

  return (
    <div ref={ref} className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
      <div 
        className={`h-full ${color} rounded-full shadow-sm transition-all duration-1000 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

export function KPICards({ displayData, loading, totalViolations, totalTrafficViolators, topOfficer, mostCommonViolation }) {
  // Use the theme context
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-in slide-in-from-bottom-5 fade-in duration-700">
      {/* Total Violations KPI */}
       <div className={`${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300 transform relative overflow-hidden group`}>
        <div className={`absolute top-0 right-0 w-20 h-20 ${isDarkMode ? 'bg-gradient-to-br from-blue-500/30 to-blue-600/15' : 'bg-gradient-to-br from-blue-500/10 to-blue-600/5'} rounded-full -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-300`}></div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total Violations</p>
            </div>
            <AnimatedNumber 
              value={totalViolations} 
              className="text-2xl font-bold text-gray-900 dark:text-white mb-1"
              duration={1500}
            />
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">All time recorded violations</p>
            <AnimatedProgressBar 
              percentage={100}
              color="bg-gradient-to-r from-blue-500 to-blue-600"
              delay={200}
            />
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
       <div className={`${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-green-500/30 hover:-translate-y-1 transition-all duration-300 transform relative overflow-hidden group`}>
        <div className={`absolute top-0 right-0 w-20 h-20 ${isDarkMode ? 'bg-gradient-to-br from-green-500/30 to-green-600/15' : 'bg-gradient-to-br from-green-500/10 to-green-600/5'} rounded-full -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-300`}></div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Traffic Violators</p>
            </div>
            <AnimatedNumber 
              value={totalTrafficViolators} 
              className="text-2xl font-bold text-gray-900 dark:text-white mb-1"
              duration={1800}
            />
            <p className="text-xs font-medium text-green-600 dark:text-green-400">People</p>
            <AnimatedProgressBar 
              percentage={100}
              color="bg-gradient-to-r from-green-500 to-green-600"
              delay={400}
            />
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
       <div className={`${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-1 transition-all duration-300 transform relative overflow-hidden group`}>
        <div className={`absolute top-0 right-0 w-20 h-20 ${isDarkMode ? 'bg-gradient-to-br from-red-500/30 to-red-600/15' : 'bg-gradient-to-br from-red-500/10 to-red-600/5'} rounded-full -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-300`}></div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Most Common Violation</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate" title={mostCommonViolation?._id || 'N/A'}>
              {mostCommonViolation?._id || 'N/A'}
            </p>
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              <AnimatedNumber 
                value={mostCommonViolation?.count || 0} 
                className="inline"
                duration={1600}
              />{" "}occurrences
            </p>
            <AnimatedProgressBar 
              percentage={Math.min(((mostCommonViolation?.count || 0) / ((mostCommonViolation?.count || 0) + ((mostCommonViolation?.count || 0) * 0.7))) * 100, 100)}
              color="bg-gradient-to-r from-red-500 to-red-600"
              delay={600}
            />
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
       <div className={`${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-1 transition-all duration-300 transform relative overflow-hidden group`}>
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
              <AnimatedNumber 
                value={topOfficer?.count || topOfficer?.violationCount || 0} 
                className="inline"
                duration={2000}
              />{" "}apprehensions
            </p>
            <AnimatedProgressBar 
              percentage={Math.min(((topOfficer?.count || topOfficer?.violationCount || 0) / ((topOfficer?.count || topOfficer?.violationCount || 0) + ((topOfficer?.count || topOfficer?.violationCount || 0) * 0.8))) * 100, 100)}
              color="bg-gradient-to-r from-purple-500 to-purple-600"
              delay={800}
            />
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
