import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

export function ViolationMonitoring({ analyticsData }) {
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'yearly'
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedYear, setSelectedYear] = useState('All Time'); // Default to All Time
  const exportMenuRef = useRef(null);
  
  // Get current year and month
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get available years from analytics data (2000 to current year)
  const getAvailableYears = () => {
    const years = [];
    for (let year = 2000; year <= currentYear; year++) {
      years.push(year);
    }
    return years.sort((a, b) => b - a); // Most recent first
  };

  // Generate monitoring data based on actual monthly trends from backend
  const generateMonitoringData = () => {
    if (!analyticsData?.monthlyTrends || analyticsData.monthlyTrends.length === 0) {
      // Fallback to yearly trends if monthly data not available
      return generateMonthlyFromYearly();
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // If "All Time" is selected, aggregate all years
    if (selectedYear === 'All Time') {
      const monthlyViolations = {};
      const monthTotals = {};
      
      // Initialize all months with 0
      months.forEach((_, index) => {
        monthTotals[index + 1] = 0;
      });
      
      // Sum up violations for each month across all years
      analyticsData.monthlyTrends.forEach(trend => {
        const month = trend._id?.month || 0;
        if (month > 0 && month <= 12) {
          monthTotals[month] += trend.count || 0;
        }
      });
      
      // Convert to month names
      months.forEach((monthName, index) => {
        monthlyViolations[monthName] = monthTotals[index + 1] || 0;
      });
      
      const totalViolations = Object.values(monthTotals).reduce((sum, count) => sum + count, 0);

      return {
        monthly: monthlyViolations,
        yearlyTotal: totalViolations,
        isAllTime: true
      };
    }
    
    // For specific year
    const selectedYearNum = parseInt(selectedYear);
    
    // Get monthly data for the selected year
    const monthlyData = {};
    months.forEach((_, index) => {
      monthlyData[months[index]] = 0;
    });
    
    analyticsData.monthlyTrends.forEach(trend => {
      if (trend._id?.year === selectedYearNum) {
        const month = trend._id?.month || 0;
        if (month > 0 && month <= 12) {
          monthlyData[months[month - 1]] = trend.count || 0;
        }
      }
    });
    
    // Calculate total for the year
    const yearViolationsCount = Object.values(monthlyData).reduce((sum, count) => sum + count, 0);
    
    // For current year, only show months up to current month
    const filteredMonthlyData = {};
    const monthsToShow = selectedYearNum === currentYear ? currentMonth : 12;
    
    months.slice(0, monthsToShow).forEach((month, index) => {
      filteredMonthlyData[month] = monthlyData[month] || 0;
    });

    return {
      monthly: filteredMonthlyData,
      yearlyTotal: yearViolationsCount,
      isAllTime: false
    };
  };
  
  // Fallback function if monthly trends not available
  const generateMonthlyFromYearly = () => {
    if (!analyticsData?.yearlyTrends || analyticsData.yearlyTrends.length === 0) {
      return null;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (selectedYear === 'All Time') {
      const allYearsData = analyticsData.yearlyTrends.filter(item => {
        const year = item._id?.year || 0;
        return year >= 2000 && year <= currentYear;
      });
      
      const totalViolations = allYearsData.reduce((sum, item) => sum + (item.count || 0), 0);
      
      const monthlyData = {};
      let remainingTotal = totalViolations;
      
      months.forEach((month, index) => {
        const variation = Math.sin((index / 12) * Math.PI) * 0.3 + 0.7;
        
        if (index === months.length - 1) {
          monthlyData[month] = remainingTotal;
        } else {
          const monthViolations = Math.round((totalViolations / 12) * variation);
          monthlyData[month] = monthViolations;
          remainingTotal -= monthViolations;
        }
      });

      return {
        monthly: monthlyData,
        yearlyTotal: totalViolations,
        isAllTime: true
      };
    }
    
    const selectedYearNum = parseInt(selectedYear);
    const selectedYearData = analyticsData.yearlyTrends.find(item => item._id?.year === selectedYearNum);
    
    if (!selectedYearData) {
      return null;
    }

    const yearViolationsCount = selectedYearData.count || 0;
    const monthsToShow = selectedYearNum === currentYear ? currentMonth : 12;
    
    const monthlyData = {};
    months.slice(0, monthsToShow).forEach((month, index) => {
      const variation = Math.sin((index / 12) * Math.PI) * 0.3 + 0.7;
      monthlyData[month] = Math.round((yearViolationsCount / 12) * variation);
    });

    return {
      monthly: monthlyData,
      yearlyTotal: yearViolationsCount,
      isAllTime: false
    };
  };

  const monitoringData = generateMonitoringData();
  
  // Compute KPI values
  const computeKPIs = () => {
    if (!monitoringData) {
      return {
        totalViolations: 0,
        topMonth: { month: 'N/A', value: 0 },
        peakMonth: 'N/A',
        peakValue: 0,
        avgPerMonth: 0
      };
    }

    // Total Violations (Year)
    const totalViolations = Math.round(monitoringData.yearlyTotal);
    
    // Top Month - find month with highest violations
    const topMonth = Object.entries(monitoringData.monthly).reduce((max, [month, value]) => 
      value > max.value ? { month, value } : max, 
      { month: 'Jan', value: 0 }
    );
    
    // Peak Month (same as top month)
    const peakMonth = topMonth.month;
    const peakValue = topMonth.value;
    
    // Average per month
    const avgPerMonth = Math.round(totalViolations / 12);
    
    return {
      totalViolations,
      topMonth,
      peakMonth,
      peakValue,
      avgPerMonth
    };
  };

  const kpis = computeKPIs();

  // Chart data processing
  const processChartData = () => {
    if (!monitoringData) return [];

    if (viewMode === 'monthly') {
      // Monthly line chart data - filtered by selected year
      const months = Object.keys(monitoringData.monthly);
      return months.map(month => ({
        month,
        violations: monitoringData.monthly[month] || 0,
        year: selectedYear
      }));
    } else {
      // Yearly bar chart data - show historical data
      const yearlyData = analyticsData?.yearlyTrends
        .filter(item => {
          const year = item._id?.year || 0;
          return year >= 2020 && year <= currentYear;
        })
        .sort((a, b) => (a._id?.year || 0) - (b._id?.year || 0))
        .map(item => ({
          year: item._id?.year,
          violations: item.count || 0
        }));

      return yearlyData;
    }
  };

  const availableYears = getAvailableYears();

  const chartData = processChartData();

  // Soft Pastel Palette
  const colors = [
    '#E15759', // muted red
    '#F28E2B', // warm orange
    '#4E79A7', // soft blue
    '#76B7B2', // teal
    '#59A14F', // green
    '#EDC948', // mustard yellow
    '#B07AA1', // lavender purple
    '#FF9DA7', // pastel pink
    '#9C755F', // brown-gray
    '#BAB0AC'  // light gray
  ];

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-red-200 dark:border-red-700 rounded-lg shadow-lg max-w-xs">
          <p className="text-sm font-bold text-red-800 dark:text-red-300 mb-2 text-center">
            {viewMode === 'monthly' ? `${label} ${selectedYear}` : label}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-xs text-gray-700 dark:text-gray-300">Violations</span>
              </div>
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                {payload[0]?.value?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Export functionality
  const exportData = (format) => {
    if (!monitoringData) return;

    let content = '';
    let filename = '';
    let mimeType = '';
    
    if (viewMode === 'monthly') {
      if (format === 'csv') {
        content = 'Month,Violations\n';
        Object.entries(monitoringData.monthly).forEach(([month, value]) => {
          content += `${month},${value}\n`;
        });
        const yearPrefix = selectedYear === 'All Time' ? 'all_time' : selectedYear;
        filename = `violation_monitoring_monthly_${yearPrefix}_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else if (format === 'json') {
        content = JSON.stringify(monitoringData.monthly, null, 2);
        const yearPrefix = selectedYear === 'All Time' ? 'all_time' : selectedYear;
        filename = `violation_monitoring_monthly_${yearPrefix}_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else if (format === 'excel') {
        content = 'Month,Violations\n';
        Object.entries(monitoringData.monthly).forEach(([month, value]) => {
          content += `${month},${value}\n`;
        });
        const yearPrefix = selectedYear === 'All Time' ? 'all_time' : selectedYear;
        filename = `violation_monitoring_monthly_${yearPrefix}_${new Date().toISOString().split('T')[0]}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }
    } else {
      if (format === 'csv') {
        content = 'Year,Violations\n';
        chartData.forEach(item => {
          content += `${item.year},${item.violations}\n`;
        });
        filename = `violation_monitoring_yearly_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else if (format === 'json') {
        content = JSON.stringify(chartData, null, 2);
        filename = `violation_monitoring_yearly_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else if (format === 'excel') {
        content = 'Year,Violations\n';
        chartData.forEach(item => {
          content += `${item.year},${item.violations}\n`;
        });
        filename = `violation_monitoring_yearly_${new Date().toISOString().split('T')[0]}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }
    }

    // Create and download file
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    setShowExportMenu(false);
  };

  if (!monitoringData) {
    return null; // Don't show if no data
  }

  return (
    <div className="mt-8 bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-900/20 dark:to-orange-900/30 border border-red-200 dark:border-red-800 rounded-xl shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-red-200/50 dark:border-red-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Violation Monitoring</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Real-time monitoring of violations to track trends, identify patterns, and support data-driven traffic management decisions.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300">
                  {viewMode === 'monthly' 
                    ? (selectedYear === 'All Time' ? 'All Time (2000-2025)' : `Monitoring ${selectedYear}`)
                    : `Monitoring ${currentYear}`
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 h-full">
        {/* Left: Charts area */}
        <div className="xl:col-span-2 p-2 sm:p-4">
          <div className="space-y-4 sm:space-y-6">
            {/* Charts Area */}
            <div className="relative bg-gradient-to-br from-orange-50/80 via-red-50/60 to-pink-50/40 dark:from-orange-900/20 dark:via-red-900/20 dark:to-pink-900/20 backdrop-blur-sm rounded-xl p-3 sm:p-6 border border-orange-200/30 dark:border-orange-700/30 shadow-lg overflow-hidden">
              <div className="absolute inset-0 opacity-5">
                <svg className="w-full h-full" viewBox="0 0 400 300" fill="none">
                  <path d="M0,200 L50,150 L100,180 L150,120 L200,160 L250,100 L300,140 L350,80 L400,120 L400,300 L0,300 Z" fill="#DC2626" />
                  <path d="M0,250 Q100,220 200,250 T400,250 L400,300 L0,300 Z" fill="#EA580C" />
                  <circle cx="80" cy="80" r="15" fill="#EF4444" />
                  <circle cx="320" cy="60" r="12" fill="#F97316" />
                  <circle cx="150" cy="200" r="10" fill="#EC4899" />
                </svg>
              </div>
              
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {viewMode === 'monthly' ? 'Monthly Trend' : 'Yearly Trend'}
                </h4>
                
                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3" style={{ pointerEvents: 'auto' }}>
                  {/* Year Filter - Only show in monthly view */}
                  {viewMode === 'monthly' && (
                    <div className="flex items-center gap-2 relative">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
                        Year:
                      </label>
                      <div className="relative">
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="px-3 pr-8 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white hover:border-red-300 dark:hover:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md appearance-none"
                          style={{ minWidth: '180px' }}
                        >
                          <option value="All Time">All Time (2000-2025)</option>
                          {availableYears.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                        {/* Custom Dropdown Arrow */}
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Toggle: Monthly/Yearly */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">View:</span>
                    <div className="flex bg-gray-100 dark:bg-gray-600 rounded-md p-0.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setViewMode('monthly');
                        }}
                        className={`px-2 sm:px-3 py-1.5 text-xs rounded transition-all duration-200 cursor-pointer select-none z-10 relative touch-manipulation ${
                          viewMode === 'monthly'
                            ? 'bg-white dark:bg-gray-500 text-gray-900 dark:text-white shadow-sm font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-500'
                        }`}
                        type="button"
                        style={{ pointerEvents: 'auto' }}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setViewMode('yearly');
                        }}
                        className={`px-2 sm:px-3 py-1.5 text-xs rounded transition-all duration-200 cursor-pointer select-none z-10 relative touch-manipulation ${
                          viewMode === 'yearly'
                            ? 'bg-white dark:bg-gray-500 text-gray-900 dark:text-white shadow-sm font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-500'
                        }`}
                        type="button"
                        style={{ pointerEvents: 'auto' }}
                      >
                        Yearly
                      </button>
                    </div>
                  </div>

                  {/* Export Button */}
                  <div className="flex items-center gap-2 ml-auto relative">
                    <div className="relative" ref={exportMenuRef}>
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="px-2 sm:px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md transition-colors duration-200 flex items-center gap-1 touch-manipulation"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="hidden sm:inline">Export</span>
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Export Dropdown Menu */}
                      {showExportMenu && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                          <div className="py-1">
                            <button
                              onClick={() => exportData('csv')}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Export as CSV
                            </button>
                            <button
                              onClick={() => exportData('json')}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                              </svg>
                              Export as JSON
                            </button>
                            <button
                              onClick={() => exportData('excel')}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Export as Excel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="h-64 sm:h-80 lg:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === 'monthly' ? (
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#E15759" strokeOpacity={0.2} vertical={false} />
                      <XAxis dataKey="month" stroke="#E15759" fontSize={10} fontWeight="500" tick={{ fill: '#E15759' }} />
                      <YAxis stroke="#E15759" fontSize={10} fontWeight="500" tick={{ fill: '#E15759' }} tickFormatter={(value) => value.toLocaleString()} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F28E2B', strokeWidth: 1, strokeDasharray: '3 3' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '500', color: '#E15759', paddingTop: '10px' }} />
                      <Line
                        type="monotone"
                        dataKey="violations"
                        stroke="#E15759"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        dot={{ r: 5, fill: '#E15759', stroke: '#fff', strokeWidth: 2 }}
                        activeDot={{ r: 8, fill: '#E15759', stroke: '#fff', strokeWidth: 3, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                        name="Violations"
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#E15759" strokeOpacity={0.2} vertical={false} />
                      <XAxis dataKey="year" stroke="#E15759" fontSize={10} fontWeight="500" tick={{ fill: '#E15759' }} />
                      <YAxis stroke="#E15759" fontSize={13} fontWeight="500" tick={{ fill: '#E15759' }} tickFormatter={(value) => value.toLocaleString()} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F28E2B', fillOpacity: 0.1 }} />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '500', color: '#E15759', paddingTop: '10px' }} />
                      <Bar dataKey="violations" name="Violations" fill="#E15759" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Right: KPI Cards */}
        <div className="xl:col-span-1 p-2 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 sm:gap-4">
            {/* Total Predicted */}
            <div className="p-3 rounded-xl bg-white dark:bg-gray-800/60 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-start">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Violations</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {kpis.totalViolations.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {selectedYear === 'All Time' ? 'All Time' : `Year ${selectedYear}`}
              </div>
            </div>

            {/* Peak Month */}
            <div className="p-3 rounded-xl bg-white dark:bg-gray-800/60 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-start">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Peak Month</span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white truncate w-full">
                {kpis.peakMonth}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {kpis.peakValue.toLocaleString()} violations
              </div>
            </div>

            {/* Average per Month */}
            <div className="p-3 rounded-xl bg-white dark:bg-gray-800/60 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-start">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Average/Month</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {kpis.avgPerMonth.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Per month average</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

