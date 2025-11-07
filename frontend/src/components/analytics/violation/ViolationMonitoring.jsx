import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  Area,
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
  const [viewMode, setViewMode] = useState('monthly'); // 'daily' | 'monthly' | 'yearly'
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedYear, setSelectedYear] = useState('All Time'); // Default to All Time
  const [selectedMonth, setSelectedMonth] = useState(''); // 1-12 as string, required for daily
  const [yearlyStartYear, setYearlyStartYear] = useState(2020); // Default 2020 -> 2025
  const [yearlyChartType, setYearlyChartType] = useState('line'); // 'bar' | 'line'
  const exportMenuRef = useRef(null);
  
  // Get current year and month
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const minYear = 2000;
  const maxYear = 2025;

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

  // Get available years (2000 to 2025)
  const getAvailableYears = () => {
    const years = [];
    for (let year = minYear; year <= maxYear; year++) {
      years.push(year);
    }
    return years.sort((a, b) => b - a); // Most recent first
  };

  // Valid 5-year period ranges: 2000-2005, 2005-2010, 2010-2015, 2015-2020, 2020-2025, 2025-2030
  const getFiveYearStartYears = () => {
    return [2000, 2005, 2010, 2015, 2020, 2025];
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

  // Generate daily data for selected year and month. Uses analyticsData.dailyTrends if available; otherwise derives from monthly totals.
  const generateDailyData = () => {
    if (selectedYear === 'All Time' || !selectedMonth) return null; // daily requires specific year and month

    const yearNum = parseInt(selectedYear);
    const monthNum = parseInt(selectedMonth); // 1-12
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

    // Try using backend-provided daily trends if present
    const dailyTrends = analyticsData?.dailyTrends || [];
    const hasDaily = Array.isArray(dailyTrends) && dailyTrends.length > 0;

    const dailyCounts = Array.from({ length: daysInMonth }, () => 0);

    if (hasDaily) {
      dailyTrends.forEach(trend => {
        const y = trend._id?.year;
        const m = trend._id?.month;
        const d = trend._id?.day;
        if (y === yearNum && m === monthNum && d >= 1 && d <= daysInMonth) {
          dailyCounts[d - 1] = trend.count || 0;
        }
      });
    } else {
      // Derive from monthly total for that year+month when daily breakdown is unavailable
      let monthTotal = 0;
      (analyticsData?.monthlyTrends || []).forEach(trend => {
        if (trend._id?.year === yearNum && trend._id?.month === monthNum) {
          monthTotal = trend.count || 0;
        }
      });

      if (monthTotal > 0) {
        const baseValue = Math.floor(monthTotal / daysInMonth);
        let remainder = monthTotal - baseValue * daysInMonth;

        for (let i = 0; i < daysInMonth; i++) {
          const extra = remainder > 0 ? 1 : 0;
          dailyCounts[i] = baseValue + extra;
          if (remainder > 0) {
            remainder -= 1;
          }
        }
      }
    }

    const total = dailyCounts.reduce((a, b) => a + b, 0);
    return {
      days: dailyCounts.map((v, idx) => ({ day: idx + 1, violations: v })),
      monthlyTotal: total
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
  
  // Compute KPI values based on view mode
  const computeKPIs = () => {
    if (viewMode === 'daily') {
      const dailyData = generateDailyData();
      if (!dailyData) {
        return {
          totalViolations: 0,
          topMonth: { month: 'N/A', value: 0 },
          peakMonth: 'N/A',
          peakValue: 0,
          avgPerMonth: 0,
          peakYear: null,
          avgPerYear: null,
          peakDay: 'N/A',
          avgPerDay: 0
        };
      }
      const peak = dailyData.days.reduce((max, item) => item.violations > max.violations ? item : max, { day: 1, violations: 0 });
      const avgPerDay = Math.round((dailyData.monthlyTotal || 0) / dailyData.days.length || 0);
      return {
        totalViolations: dailyData.monthlyTotal || 0,
        topMonth: { month: 'N/A', value: 0 },
        peakMonth: null,
        peakValue: peak.violations,
        avgPerMonth: null,
        peakYear: null,
        avgPerYear: null,
        peakDay: `Day ${peak.day}`,
        avgPerDay
      };
    } else if (viewMode === 'monthly') {
      // Monthly view KPIs
    if (!monitoringData) {
      return {
        totalViolations: 0,
        topMonth: { month: 'N/A', value: 0 },
        peakMonth: 'N/A',
        peakValue: 0,
          avgPerMonth: 0,
          peakYear: null,
          avgPerYear: null
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
        avgPerMonth,
        peakYear: null,
        avgPerYear: null
      };
    } else {
      // Yearly view KPIs - based on the 5-year period data (e.g., 2000-2005 means 2000,2001,2002,2003,2004,2005)
      const start = yearlyStartYear;
      const end = start + 5; // Inclusive end year (e.g., 2000-2005 includes both 2000 and 2005)
      const yearlyData = (analyticsData?.yearlyTrends || [])
        .filter(item => {
          const year = item._id?.year || 0;
          return year >= start && year <= end;
        })
        .sort((a, b) => (a._id?.year || 0) - (b._id?.year || 0))
        .map(item => ({
          year: item._id?.year,
          violations: item.count || 0
        }));

      // Ensure we have data for all years in the range even if some are missing
      const filledData = [];
      for (let y = start; y <= end; y++) {
        const found = yearlyData.find(d => d.year === y);
        filledData.push({ year: y, violations: found ? found.violations : 0 });
      }

      if (filledData.length === 0) {
        return {
          totalViolations: 0,
          topMonth: { month: 'N/A', value: 0 },
          peakMonth: null,
          peakValue: 0,
          avgPerMonth: null,
          peakYear: 'N/A',
          avgPerYear: 0
        };
      }

      // Total violations across the 5-year window
      const totalViolations = filledData.reduce((sum, item) => sum + (item.violations || 0), 0);
      
      // Peak Year - find year with highest violations
      const peakYearData = filledData.reduce((max, item) => 
        (item.violations || 0) > (max.violations || 0) ? item : max, 
        filledData[0] || { year: 'N/A', violations: 0 }
      );
      
      const peakYear = peakYearData.year || 'N/A';
      const peakValue = peakYearData.violations || 0;
      
      // Average per year across the 5-year window
      const avgPerYear = Math.round(totalViolations / filledData.length);
      
      return {
        totalViolations,
        topMonth: { month: 'N/A', value: 0 },
        peakMonth: null,
        peakValue,
        avgPerMonth: null,
        peakYear,
        avgPerYear
      };
    }
  };

  const kpis = computeKPIs();

  // Chart data processing
  const processChartData = () => {
    if (!monitoringData) return [];

    if (viewMode === 'daily') {
      const dailyData = generateDailyData();
      return dailyData ? dailyData.days : [];
    } else if (viewMode === 'monthly') {
      // Monthly line chart data - filtered by selected year
      const months = Object.keys(monitoringData.monthly);
      return months.map(month => ({
        month,
        violations: monitoringData.monthly[month] || 0,
        year: selectedYear
      }));
    } else {
      // Yearly data limited to selected 5-year period (e.g., 2000-2005 includes 2000 through 2005)
      const start = yearlyStartYear;
      const end = start + 5; // Inclusive end year
      const yearlyData = (analyticsData?.yearlyTrends || [])
        .filter(item => {
          const year = item._id?.year || 0;
          return year >= start && year <= end;
        })
        .sort((a, b) => (a._id?.year || 0) - (b._id?.year || 0))
        .map(item => ({
          year: item._id?.year,
          violations: item.count || 0
        }));

      // Ensure we render all years in the period even if some are missing in data
      const filled = [];
      for (let y = start; y <= end; y++) {
        const found = yearlyData.find(d => d.year === y);
        filled.push({ year: y, violations: found ? found.violations : 0 });
      }
      return filled;
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
            {viewMode === 'daily' ? `${label} ${currentMonthNames[parseInt(selectedMonth || '1') - 1]} ${selectedYear}` : viewMode === 'monthly' ? `${label} ${selectedYear}` : label}
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
    
    if (viewMode === 'daily') {
      const dailyData = generateDailyData();
      if (!dailyData) return;
      if (format === 'csv') {
        content = 'Day,Violations\n';
        dailyData.days.forEach(({ day, violations }) => {
          content += `${day},${violations}\n`;
        });
        filename = `violation_monitoring_daily_${selectedYear}_${currentMonthNames[parseInt(selectedMonth || '1') - 1]}_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else if (format === 'json') {
        content = JSON.stringify(dailyData.days, null, 2);
        filename = `violation_monitoring_daily_${selectedYear}_${currentMonthNames[parseInt(selectedMonth || '1') - 1]}_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else if (format === 'excel') {
        content = 'Day,Violations\n';
        dailyData.days.forEach(({ day, violations }) => {
          content += `${day},${violations}\n`;
        });
        filename = `violation_monitoring_daily_${selectedYear}_${currentMonthNames[parseInt(selectedMonth || '1') - 1]}_${new Date().toISOString().split('T')[0]}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }
    } else if (viewMode === 'monthly') {
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
    <div className="mt-8 border-2 border-red-300/80 dark:border-red-900/70 rounded-2xl shadow-xl bg-gradient-to-br from-red-200/80 via-red-300/70 to-red-400/70 dark:from-red-950/40 dark:via-red-950/30 dark:to-red-950/40 backdrop-blur-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b-2 border-red-300/70 dark:border-red-800/60 bg-gradient-to-r from-red-500/20 via-red-500/10 to-red-400/10 dark:from-red-900/40 dark:via-red-900/30 dark:to-red-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center p-2 rounded-lg bg-gradient-to-br from-red-500 to-red-600 shadow-md shadow-red-500/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Violation Monitoring</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Real-time monitoring of violations to track trends, identify patterns, and support data-driven traffic management decisions.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/60 dark:to-red-900/40 text-red-800 dark:text-red-200 border border-red-200/50 dark:border-red-800/50 shadow-sm">
                  {viewMode === 'daily'
                    ? (selectedYear && selectedMonth ? `Monitoring ${currentMonthNames[parseInt(selectedMonth || '1') - 1]} ${selectedYear}` : 'Select Year and Month')
                    : viewMode === 'monthly' 
                    ? (selectedYear === 'All Time' ? 'All Time (2000-2025)' : `Monitoring ${selectedYear}`)
                    : `Monitoring ${yearlyStartYear}-${yearlyStartYear + 5}`
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 h-full">
        {/* Left: Charts area */}
        <div className="xl:col-span-4 p-3 sm:p-4">
          <div className="space-y-3">
            {/* Charts Area */}
            <div className="relative rounded-xl p-3 sm:p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-2 border-red-100/60 dark:border-red-900/40 shadow-xl overflow-hidden">
              <div className="mb-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {viewMode === 'daily' ? 'Daily Trend' : viewMode === 'monthly' ? 'Monthly Trend' : 'Yearly Trend'}
                  </h4>
              </div>
                
                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-between sm:items-center" style={{ pointerEvents: 'auto' }}>
                  {/* Filters on the left: Year filter for monthly OR yearly filters for yearly view */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {/* Year Filter - Show in daily and monthly view */}
                  {(viewMode === 'monthly' || viewMode === 'daily') && (
                    <div className="flex items-center gap-2 relative">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
                        Year:
                      </label>
                      <div className="relative">
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="px-2.5 pr-8 py-1.5 text-[11px] font-semibold bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white hover:border-red-400 dark:hover:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-500 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md appearance-none"
                          style={{ minWidth: '160px' }}
                        >
                          {viewMode === 'monthly' && (
                          <option value="All Time">All Time (2000-2025)</option>
                          )}
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

                  {/* Month Filter - Only for daily view and required */}
                  {viewMode === 'daily' && (
                    <div className="flex items-center gap-2 relative">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
                        Month:
                      </label>
                      <div className="relative">
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="px-2.5 pr-8 py-1.5 text-[11px] font-semibold bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white hover:border-red-400 dark:hover:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-500 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md appearance-none"
                          style={{ minWidth: '120px' }}
                        >
                          <option value="" disabled>Select month</option>
                          {currentMonthNames.map((name, idx) => (
                            <option key={idx + 1} value={`${idx + 1}`}>{name}</option>
                          ))}
                        </select>
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                    {/* Yearly controls: 5-year window and chart type - on the left side */}
                    {viewMode === 'yearly' && (
                      <>
                        <div className="flex items-center gap-2 relative">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
                            Years:
                          </label>
                          <div className="relative">
                            <select
                              value={yearlyStartYear}
                              onChange={(e) => setYearlyStartYear(parseInt(e.target.value))}
                              className="px-2.5 pr-8 py-1.5 text-[11px] font-semibold bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white hover:border-red-400 dark:hover:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-500 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md appearance-none"
                              style={{ minWidth: '140px' }}
                            >
                              {getFiveYearStartYears().map((start) => (
                                <option key={start} value={start}>{`${start}-${start + 5}`}</option>
                              ))}
                            </select>
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 hidden sm:inline">Chart:</span>
                          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md p-0.5 shadow-inner">
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setYearlyChartType('bar'); }}
                              className={`px-2 py-1 text-[11px] font-semibold rounded transition-all duration-200 cursor-pointer select-none z-10 relative ${
                                yearlyChartType === 'bar' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm font-bold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                              }`}
                              type="button"
                              style={{ pointerEvents: 'auto' }}
                            >
                              Bar
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setYearlyChartType('line'); }}
                              className={`px-2 py-1 text-[11px] font-semibold rounded transition-all duration-200 cursor-pointer select-none z-10 relative ${
                                yearlyChartType === 'line' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm font-bold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                              }`}
                              type="button"
                              style={{ pointerEvents: 'auto' }}
                            >
                              Line
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* View Toggle and Export Button - Always together on the right */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Toggle: Daily/Monthly/Yearly */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 hidden sm:inline">View:</span>
                      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md p-0.5 shadow-inner">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setViewMode('daily');
                          }}
                          className={`px-2 py-1 text-[11px] font-semibold rounded transition-all duration-200 cursor-pointer select-none z-10 relative touch-manipulation ${
                            viewMode === 'daily'
                              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm font-bold'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                          type="button"
                          style={{ pointerEvents: 'auto' }}
                        >
                          Daily
                        </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setViewMode('monthly');
                        }}
                          className={`px-2 py-1 text-[11px] font-semibold rounded transition-all duration-200 cursor-pointer select-none z-10 relative touch-manipulation ${
                          viewMode === 'monthly'
                              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm font-bold'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
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
                          className={`px-2 py-1 text-[11px] font-semibold rounded transition-all duration-200 cursor-pointer select-none z-10 relative touch-manipulation ${
                          viewMode === 'yearly'
                              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm font-bold'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                        type="button"
                        style={{ pointerEvents: 'auto' }}
                      >
                        Yearly
                      </button>
                    </div>
                  </div>

                  {/* Export Button */}
                    <div className="flex items-center gap-2 relative">
                    <div className="relative" ref={exportMenuRef}>
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                          className="px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-[11px] font-semibold rounded-md transition-all duration-200 flex items-center gap-1 touch-manipulation shadow-md hover:shadow-lg"
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
                        <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                          <div className="py-1.5">
                            <button
                              onClick={() => exportData('csv')}
                              className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors duration-150"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Export as CSV
                            </button>
                            <button
                              onClick={() => exportData('json')}
                              className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors duration-150"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                              </svg>
                              Export as JSON
                            </button>
                            <button
                              onClick={() => exportData('excel')}
                              className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors duration-150"
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
              </div>
              
              <div className="h-56 sm:h-72 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === 'daily' ? (
                    (selectedYear !== 'All Time' && selectedMonth) ? (
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                        <defs>
                          <linearGradient id="colorViolationsDaily" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#E15759" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#E15759" stopOpacity={0.03}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="#E15759" strokeOpacity={0.2} vertical={false} />
                        <XAxis dataKey="day" stroke="#E15759" fontSize={12} fontWeight="600" tick={{ fill: '#E15759', fontSize: 12 }} />
                        <YAxis stroke="#E15759" fontSize={12} fontWeight="600" tick={{ fill: '#E15759', fontSize: 12 }} tickFormatter={(value) => value.toLocaleString()} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F28E2B', strokeWidth: 1, strokeDasharray: '3 3' }} />
                        <Legend wrapperStyle={{ fontSize: '13px', fontWeight: '600', color: '#E15759', paddingTop: '10px' }} />
                        <Area
                          type="monotone"
                          dataKey="violations"
                          stroke="none"
                          fill="url(#colorViolationsDaily)"
                          fillOpacity={1}
                        />
                        <Line
                          type="monotone"
                          dataKey="violations"
                          stroke="#E15759"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          dot={{ r: 4, fill: '#E15759', stroke: '#fff', strokeWidth: 2 }}
                          activeDot={{ r: 7, fill: '#E15759', stroke: '#fff', strokeWidth: 3, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                          name="Violations"
                        />
                      </LineChart>
                    ) : (
                      <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                        Select Year and Month to view daily trend
                      </div>
                    )
                  ) : viewMode === 'monthly' ? (
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorViolationsMonthly" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E15759" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#E15759" stopOpacity={0.03}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="#E15759" strokeOpacity={0.2} vertical={false} />
                      <XAxis dataKey="month" stroke="#E15759" fontSize={12} fontWeight="600" tick={{ fill: '#E15759', fontSize: 12 }} />
                      <YAxis stroke="#E15759" fontSize={12} fontWeight="600" tick={{ fill: '#E15759', fontSize: 12 }} tickFormatter={(value) => value.toLocaleString()} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F28E2B', strokeWidth: 1, strokeDasharray: '3 3' }} />
                      <Legend wrapperStyle={{ fontSize: '13px', fontWeight: '600', color: '#E15759', paddingTop: '10px' }} />
                      <Area
                        type="monotone"
                        dataKey="violations"
                        stroke="none"
                        fill="url(#colorViolationsMonthly)"
                        fillOpacity={1}
                      />
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
                    yearlyChartType === 'bar' ? (
                    <BarChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#E15759" strokeOpacity={0.2} vertical={false} />
                        <XAxis dataKey="year" stroke="#E15759" fontSize={12} fontWeight={"600"} tick={{ fill: '#E15759', fontSize: 12 }} />
                        <YAxis stroke="#E15759" fontSize={12} fontWeight={"600"} tick={{ fill: '#E15759', fontSize: 12 }} tickFormatter={(value) => value.toLocaleString()} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F28E2B', fillOpacity: 0.1 }} />
                      <Legend wrapperStyle={{ fontSize: '13px', fontWeight: '600', color: '#E15759', paddingTop: '10px' }} />
                      <Bar dataKey="violations" name="Violations" fill="#E15759" />
                    </BarChart>
                    ) : (
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                        <defs>
                          <linearGradient id="colorViolationsYearly" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#E15759" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#E15759" stopOpacity={0.03}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="#E15759" strokeOpacity={0.2} vertical={false} />
                        <XAxis dataKey="year" stroke="#E15759" fontSize={12} fontWeight={"600"} tick={{ fill: '#E15759', fontSize: 12 }} />
                        <YAxis stroke="#E15759" fontSize={12} fontWeight={"600"} tick={{ fill: '#E15759', fontSize: 12 }} tickFormatter={(value) => value.toLocaleString()} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F28E2B', strokeWidth: 1, strokeDasharray: '3 3' }} />
                        <Legend wrapperStyle={{ fontSize: '13px', fontWeight: '600', color: '#E15759', paddingTop: '10px' }} />
                        <Area
                          type="monotone"
                          dataKey="violations"
                          stroke="none"
                          fill="url(#colorViolationsYearly)"
                          fillOpacity={1}
                        />
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
                    )
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Right: KPI Cards */}
        <div className="xl:col-span-1 p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
            {/* Total Violations */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-white to-red-50/30 dark:from-gray-800 dark:to-red-950/30 shadow-md border-2 border-red-100/60 dark:border-red-900/40 flex flex-col items-start hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-500 to-red-600 shadow-sm shadow-red-500/30 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Total Violations</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
                {kpis.totalViolations.toLocaleString()}
              </div>
              <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                {viewMode === 'daily'
                  ? (selectedYear && selectedMonth ? `${currentMonthNames[parseInt(selectedMonth || '1') - 1]} ${selectedYear}` : 'Select Month & Year')
                  : viewMode === 'monthly' 
                  ? (selectedYear === 'All Time' ? 'All Time' : `Year ${selectedYear}`)
                  : `${yearlyStartYear}-${yearlyStartYear + 5}`
                }
              </div>
            </div>

            {/* Peak Day/Month/Year */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-white to-orange-50/30 dark:from-gray-800 dark:to-orange-950/30 shadow-md border-2 border-orange-100/60 dark:border-orange-900/40 flex flex-col items-start hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm shadow-orange-500/30 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {viewMode === 'daily' ? 'Peak Day' : viewMode === 'monthly' ? 'Peak Month' : 'Peak Year'}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-0.5 truncate w-full">
                {viewMode === 'daily' ? kpis.peakDay : viewMode === 'monthly' ? kpis.peakMonth : kpis.peakYear}
              </div>
              <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                {kpis.peakValue.toLocaleString()} violations
              </div>
            </div>

            {/* Average per Day/Month/Year */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-950/30 shadow-md border-2 border-blue-100/60 dark:border-blue-900/40 flex flex-col items-start hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm shadow-blue-500/30 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {viewMode === 'daily' ? 'Average/Day' : viewMode === 'monthly' ? 'Average/Month' : 'Average/Year'}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
                {viewMode === 'daily'
                  ? kpis.avgPerDay?.toLocaleString()
                  : viewMode === 'monthly' 
                  ? kpis.avgPerMonth.toLocaleString() 
                  : kpis.avgPerYear.toLocaleString()
                }
              </div>
              <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                {viewMode === 'daily' ? 'Per day average' : viewMode === 'monthly' ? 'Per month average' : 'Per year average'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

