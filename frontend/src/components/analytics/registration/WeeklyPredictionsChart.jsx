import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ComposedChart
} from 'recharts';
import { getWeeklyPredictions } from '../../../api/predictionApi.js';
import { TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';

const WeeklyPredictionsChart = () => {
  const [rawWeeklyData, setRawWeeklyData] = useState([]); // Store raw weekly predictions
  const [weeklyData, setWeeklyData] = useState([]); // Processed weekly view
  const [monthlyData, setMonthlyData] = useState([]); // Processed monthly view
  const [yearlyData, setYearlyData] = useState([]); // Processed yearly view
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weeksToPredict, setWeeksToPredict] = useState(12); // Default to 12 weeks (about 3 months)
  const [viewType, setViewType] = useState('monthly'); // 'weekly', 'monthly', 'yearly'

  // Color palette for different months
  const monthColors = {
    0: '#3b82f6', // January - Blue
    1: '#10b981', // February - Green
    2: '#f59e0b', // March - Amber
    3: '#ef4444', // April - Red
    4: '#8b5cf6', // May - Purple
    5: '#06b6d4', // June - Cyan
    6: '#ec4899', // July - Pink
    7: '#f97316', // August - Orange
    8: '#84cc16', // September - Lime
    9: '#6366f1', // October - Indigo
    10: '#14b8a6', // November - Teal
    11: '#a855f7', // December - Violet
  };

  // Helper function to get ISO week number
  const getISOWeek = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // Helper function to get ISO week year (year that the week belongs to)
  const getISOWeekYear = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    return d.getUTCFullYear();
  };

  // Fetch prediction data
  const fetchPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getWeeklyPredictions(weeksToPredict);
      
      if (response.success && response.data?.weekly_predictions) {
        // Store raw weekly data
        setRawWeeklyData(response.data.weekly_predictions);
        
        // Process data for all three views
        processAllViews(response.data.weekly_predictions);
      } else {
        const errorMsg = response.error || 'Failed to fetch prediction data';
        setError(`Failed to fetch predictions: ${errorMsg}`);
        setRawWeeklyData([]);
        setWeeklyData([]);
        setMonthlyData([]);
        setYearlyData([]);
      }
    } catch (err) {
      console.error('Error fetching weekly predictions:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Error loading predictions';
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        const apiBase = import.meta.env.VITE_MV_PREDICTION_API_URL || 'http://72.60.198.244:5002';
        errorMessage = `Cannot connect to prediction API at ${apiBase}. Please ensure the Flask API server is running.`;
      } else if (err.message.includes('HTTP error')) {
        errorMessage = `Server error: ${err.message}`;
      } else {
        errorMessage = `Error: ${err.message}`;
      }
      
      setError(errorMessage);
      setRawWeeklyData([]);
      setWeeklyData([]);
      setMonthlyData([]);
      setYearlyData([]);
    } finally {
      setLoading(false);
    }
  };

  // Process data for all three views (Weekly, Monthly, Yearly)
  const processAllViews = (weeklyPredictions) => {
    if (!weeklyPredictions || weeklyPredictions.length === 0) {
      setWeeklyData([]);
      setMonthlyData([]);
      setYearlyData([]);
      return;
    }

    // Process Weekly View
    const weeklyProcessed = weeklyPredictions.map((prediction, index) => {
      // Handle both 'date' and 'week_start' fields for compatibility
      const dateStr = prediction.date || prediction.week_start;
      const date = new Date(dateStr);
      
      // Get ISO week number and year for accurate week labeling
      const weekNumber = prediction.week || getISOWeek(date);
      const weekYear = getISOWeekYear(date);
      
      return {
        week: index + 1, // Sequential week number for display
        weekLabel: `Week ${index + 1}`,
        date: dateStr,
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        // Check for predicted_count, predicted, or total_predicted (in that order)
        predicted: prediction.predicted_count || prediction.predicted || prediction.total_predicted || 0,
        lowerBound: prediction.lower_bound || 0,
        upperBound: prediction.upper_bound || 0,
        weekNumber: weekNumber, // ISO week number
        year: weekYear, // Year for the week (ISO week year)
        calendarYear: date.getFullYear(), // Calendar year of the date
        month: date.getMonth() + 1,
      };
    });
    setWeeklyData(weeklyProcessed);

    // Process Monthly View
    const monthlyGrouped = {};
    weeklyPredictions.forEach((prediction) => {
      const date = new Date(prediction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!monthlyGrouped[monthKey]) {
        monthlyGrouped[monthKey] = {
          month: monthName,
          monthKey: monthKey,
          monthIndex: date.getMonth(),
          year: date.getFullYear(),
          weeks: [],
          totalPredicted: 0,
          avgPredicted: 0,
        };
      }
      
      const dateStr = prediction.date || prediction.week_start;
      const predictedValue = prediction.predicted_count || prediction.predicted || prediction.total_predicted || 0;
      monthlyGrouped[monthKey].weeks.push({
        date: dateStr,
        week: prediction.week,
        predicted: predictedValue,
        lowerBound: prediction.lower_bound || 0,
        upperBound: prediction.upper_bound || 0,
      });
      
      monthlyGrouped[monthKey].totalPredicted += predictedValue;
    });

    const monthlyProcessed = Object.values(monthlyGrouped).map((monthData) => {
      monthData.avgPredicted = monthData.totalPredicted / monthData.weeks.length;
      return {
        month: monthData.month,
        monthKey: monthData.monthKey,
        monthShort: monthData.month.split(' ')[0].substring(0, 3), // First 3 letters of month
        monthIndex: monthData.monthIndex,
        year: monthData.year,
        avgPredicted: Math.round(monthData.avgPredicted),
        totalPredicted: Math.round(monthData.totalPredicted),
        weekCount: monthData.weeks.length,
      };
    });

    monthlyProcessed.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthIndex - b.monthIndex;
    });
    setMonthlyData(monthlyProcessed);

    // Process Yearly View
    const yearlyGrouped = {};
    weeklyPredictions.forEach((prediction) => {
      const date = new Date(prediction.date);
      const year = date.getFullYear();
      
      if (!yearlyGrouped[year]) {
        yearlyGrouped[year] = {
          year: year,
          weeks: [],
          totalPredicted: 0,
          avgPredicted: 0,
        };
      }
      
      const dateStr = prediction.date || prediction.week_start;
      const predictedValue = prediction.predicted_count || prediction.predicted || prediction.total_predicted || 0;
      yearlyGrouped[year].weeks.push({
        date: dateStr,
        predicted: predictedValue,
      });
      
      yearlyGrouped[year].totalPredicted += predictedValue;
    });

    const yearlyProcessed = Object.values(yearlyGrouped).map((yearData) => {
      yearData.avgPredicted = yearData.totalPredicted / yearData.weeks.length;
      return {
        year: yearData.year,
        yearLabel: yearData.year.toString(),
        totalPredicted: Math.round(yearData.totalPredicted),
        avgPredicted: Math.round(yearData.avgPredicted),
        weekCount: yearData.weeks.length,
      };
    });

    yearlyProcessed.sort((a, b) => a.year - b.year);
    setYearlyData(yearlyProcessed);
  };

  // Load data on mount and when weeksToPredict changes
  useEffect(() => {
    fetchPredictions();
  }, [weeksToPredict]);

  // Custom tooltip component for different views
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      if (viewType === 'weekly') {
        return (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-lg">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {data.dateLabel}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: payload[0].color }}
                ></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Predicted: <span className="ml-1 font-medium">{data.predicted.toLocaleString()}</span> vehicles
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Week {data.weekNumber} of {data.year} ({data.dateLabel})
              </div>
            </div>
          </div>
        );
      } else if (viewType === 'monthly') {
        return (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-lg">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {label}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: payload[0].color }}
                ></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Total: <span className="ml-1 font-medium">{data.totalPredicted.toLocaleString()}</span> vehicles
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Average Weekly: {data.avgPredicted.toLocaleString()} ({data.weekCount} weeks)
              </div>
            </div>
          </div>
        );
      } else if (viewType === 'yearly') {
        return (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-lg">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {label}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: payload[0].color }}
                ></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Total: <span className="ml-1 font-medium">{data.totalPredicted.toLocaleString()}</span> vehicles
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Average Weekly: {data.avgPredicted.toLocaleString()} ({data.weekCount} weeks)
              </div>
            </div>
          </div>
        );
      }
    }
    return null;
  };

  // Get current chart data based on view type
  const getCurrentData = () => {
    switch (viewType) {
      case 'weekly':
        return weeklyData;
      case 'monthly':
        return monthlyData;
      case 'yearly':
        return yearlyData;
      default:
        return monthlyData;
    }
  };

  // Get chart title based on view type
  const getChartTitle = () => {
    switch (viewType) {
      case 'weekly':
        return 'Weekly Registration Predictions';
      case 'monthly':
        return 'Monthly Registration Predictions';
      case 'yearly':
        return 'Yearly Registration Predictions';
      default:
        return 'Registration Predictions';
    }
  };

  // Get chart description based on view type
  const getChartDescription = () => {
    switch (viewType) {
      case 'weekly':
        return 'Detailed weekly forecast for short-term planning';
      case 'monthly':
        return 'Monthly totals for mid-term planning and resource allocation';
      case 'yearly':
        return 'Yearly totals for long-term strategy and budget forecasting';
      default:
        return 'Forecasted vehicle registrations using SARIMA model';
    }
  };

  // Calculate KPI metrics for weekly view
  const calculateKPIMetrics = () => {
    if (viewType !== 'weekly' || weeklyData.length === 0) {
      return null;
    }

    const predictions = weeklyData.map(week => week.predicted);
    const total = predictions.reduce((sum, val) => sum + val, 0);
    
    // Calculate trend
    const firstWeek = predictions[0];
    const lastWeek = predictions[predictions.length - 1];
    const percentageChange = firstWeek !== 0 
      ? ((lastWeek - firstWeek) / firstWeek) * 100 
      : 0;
    
    let trendDirection = 'stable';
    let trendIcon = Minus;
    let trendColor = 'text-gray-600 dark:text-gray-400';
    
    if (percentageChange > 2) {
      trendDirection = 'increasing';
      trendIcon = TrendingUp;
      trendColor = 'text-green-600 dark:text-green-400';
    } else if (percentageChange < -2) {
      trendDirection = 'decreasing';
      trendIcon = TrendingDown;
      trendColor = 'text-red-600 dark:text-red-400';
    }
    
    // Find peak week
    const maxValue = Math.max(...predictions);
    const peakWeekIndex = predictions.indexOf(maxValue);
    const peakWeek = weeklyData[peakWeekIndex];
    
    return {
      total,
      trendDirection,
      trendIcon,
      trendColor,
      percentageChange,
      peakWeek: peakWeek ? `Week ${peakWeek.week}` : 'N/A',
      peakValue: maxValue
    };
  };

  const currentData = getCurrentData();
  const kpiMetrics = calculateKPIMetrics();

  return (
    <div className="bg-white/80 dark:bg-gray-800/50 border border-blue-200/50 dark:border-blue-700/50 rounded-xl p-6 w-full shadow-sm min-h-[400px] flex flex-col backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {getChartTitle()}
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {getChartDescription()}
            </p>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* View Type Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewType('weekly')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewType === 'weekly'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewType('monthly')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewType === 'monthly'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewType('yearly')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewType === 'yearly'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Yearly
            </button>
          </div>
          
          {/* Weeks selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Weeks:</label>
            <select
              value={weeksToPredict}
              onChange={(e) => setWeeksToPredict(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm border border-blue-200 dark:border-blue-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
            >
              <option value={4}>4 weeks</option>
              <option value={8}>8 weeks</option>
              <option value={12}>12 weeks</option>
              <option value={16}>16 weeks</option>
              <option value={24}>24 weeks</option>
              <option value={52}>52 weeks</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards - Only show for weekly view */}
      {kpiMetrics && viewType === 'weekly' && !loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Predicted Registrations */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Predicted Registrations
              </h3>
              <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-200">
              {kpiMetrics.total.toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              For {weeklyData.length} week{weeklyData.length !== 1 ? 's' : ''} period
            </p>
          </div>

          {/* Trend Direction */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-700/30 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Trend Direction
              </h3>
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${
                kpiMetrics.trendDirection === 'increasing' 
                  ? 'bg-green-500/10 dark:bg-green-400/10' 
                  : kpiMetrics.trendDirection === 'decreasing'
                  ? 'bg-red-500/10 dark:bg-red-400/10'
                  : 'bg-gray-500/10 dark:bg-gray-400/10'
              }`}>
                {React.createElement(kpiMetrics.trendIcon, {
                  className: `w-5 h-5 ${kpiMetrics.trendColor}`,
                  strokeWidth: 2
                })}
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-bold ${kpiMetrics.trendColor}`}>
                {kpiMetrics.trendDirection.charAt(0).toUpperCase() + kpiMetrics.trendDirection.slice(1)}
              </p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {kpiMetrics.percentageChange > 0 ? '+' : ''}{kpiMetrics.percentageChange.toFixed(1)}% change from first to last week
            </p>
          </div>

          {/* Peak Week */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Peak Week
              </h3>
              <div className="w-8 h-8 flex items-center justify-center bg-amber-500/10 dark:bg-amber-400/10 rounded-lg">
                <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" strokeWidth={2} />
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-900 dark:text-amber-200">
              {kpiMetrics.peakWeek}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {kpiMetrics.peakValue.toLocaleString()} vehicles (highest)
            </p>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="h-80 w-full min-h-[320px] flex-1">
        {loading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center w-full h-full text-red-500">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-center px-4">{error}</p>
          </div>
        ) : currentData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full text-gray-500 dark:text-gray-400">
            <p>No prediction data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={320}>
            {viewType === 'yearly' ? (
              // Yearly View - Bar Chart
              <BarChart
                data={currentData}
                margin={{ 
                  top: 10, 
                  right: 20, 
                  left: 0, 
                  bottom: 20
                }}
              >
                <defs>
                  <linearGradient id="yearlyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.5}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#6b7280" opacity={0.4} />
                <XAxis 
                  dataKey="yearLabel" 
                  stroke="#6b7280"
                  fontSize={12}
                  tick={{ fill: '#6b7280', fontWeight: 500 }}
                  width={60}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => value.toLocaleString()}
                  tick={{ fill: '#6b7280', fontWeight: 500 }}
                  width={80}
                  label={{ 
                    value: 'Number of Vehicles', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#6b7280' }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="totalPredicted"
                  fill="url(#yearlyGradient)"
                  radius={[8, 8, 0, 0]}
                  name="Total Predicted"
                />
              </BarChart>
            ) : viewType === 'monthly' ? (
              // Monthly View - Bar Chart
              <BarChart
                data={currentData}
                margin={{ 
                  top: 10, 
                  right: 20, 
                  left: 0, 
                  bottom: 20
                }}
              >
                <defs>
                  <linearGradient id="monthlyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.5}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#6b7280" opacity={0.4} />
                <XAxis 
                  dataKey="monthShort" 
                  stroke="#6b7280"
                  fontSize={12}
                  tick={{ fill: '#6b7280', fontWeight: 500 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => value.toLocaleString()}
                  tick={{ fill: '#6b7280', fontWeight: 500 }}
                  width={80}
                  label={{ 
                    value: 'Number of Vehicles', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#6b7280' }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="totalPredicted"
                  fill="url(#monthlyGradient)"
                  radius={[8, 8, 0, 0]}
                  name="Total Predicted"
                />
              </BarChart>
            ) : (
              // Weekly View - Line Chart
              <LineChart
                data={currentData}
                margin={{ 
                  top: 10, 
                  right: 20, 
                  left: 0, 
                  bottom: 20
                }}
              >
                <defs>
                  <linearGradient id="weeklyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#6b7280" opacity={0.4} />
                <XAxis 
                  dataKey="weekLabel" 
                  stroke="#6b7280"
                  fontSize={11}
                  tick={{ fill: '#6b7280', fontWeight: 500 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => value.toLocaleString()}
                  tick={{ fill: '#6b7280', fontWeight: 500 }}
                  width={80}
                  label={{ 
                    value: 'Number of Vehicles', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#6b7280' }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#weeklyGradient)"
                  dot={{ 
                    fill: 'white', 
                    stroke: '#3b82f6', 
                    strokeWidth: 2, 
                    r: 4,
                    filter: 'drop-shadow(0 1px 2px rgba(59, 130, 246, 0.3))'
                  }}
                  activeDot={{ 
                    r: 6, 
                    fill: 'white',
                    stroke: '#3b82f6', 
                    strokeWidth: 2,
                    filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.4))'
                  }}
                  name="Predicted Registrations"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      {currentData.length > 0 && !loading && (
        <div className="flex flex-wrap justify-center gap-4 mt-4" style={{ 
          fontSize: '12px', 
          fontWeight: '500',
          textAlign: 'center'
        }}>
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            {viewType === 'yearly' ? (
              <>
                <div className="w-3 h-3 rounded bg-blue-500 shadow-sm"></div>
                <span>Yearly Total Predictions</span>
              </>
            ) : viewType === 'monthly' ? (
              <>
                <div className="w-3 h-3 rounded bg-blue-500 shadow-sm"></div>
                <span>Monthly Total Predictions</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div>
                <span>Weekly Predictions</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyPredictionsChart;

