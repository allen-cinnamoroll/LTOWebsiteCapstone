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
import { TrendingUp, TrendingDown, Minus, Award, BarChart2, AlertCircle, CheckCircle2, Info, Users, Calendar, Target, Lightbulb, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const WeeklyPredictionsChart = () => {
  const [rawWeeklyData, setRawWeeklyData] = useState([]); // Store raw weekly predictions
  const [weeklyData, setWeeklyData] = useState([]); // Processed weekly view
  const [monthlyData, setMonthlyData] = useState([]); // Processed monthly view
  const [yearlyData, setYearlyData] = useState([]); // Processed yearly view
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weeksToPredict, setWeeksToPredict] = useState(12); // Default to 12 weeks (about 3 months)
  const [viewType, setViewType] = useState('monthly'); // 'weekly', 'monthly', 'yearly'
  const [selectedMunicipality, setSelectedMunicipality] = useState(() => {
    // Load saved municipality from localStorage, default to null (all municipalities)
    return localStorage.getItem('predictionMunicipality') || null;
  });
  const [modelUsed, setModelUsed] = useState(null); // Track which model was used
  const [isMunicipalitySpecific, setIsMunicipalitySpecific] = useState(false); // Track if municipality-specific model was used
  const [availableMunicipalityModels, setAvailableMunicipalityModels] = useState([]); // Track available municipality models

  // Davao Oriental municipalities
  const municipalities = [
    { value: null, label: 'All Municipalities' },
    { value: 'BAGANGA', label: 'Baganga' },
    { value: 'BANAYBANAY', label: 'Banaybanay' },
    { value: 'BOSTON', label: 'Boston' },
    { value: 'CARAGA', label: 'Caraga' },
    { value: 'CATEEL', label: 'Cateel' },
    { value: 'GOVERNOR GENEROSO', label: 'Governor Generoso' },
    { value: 'LUPON', label: 'Lupon' },
    { value: 'MANAY', label: 'Manay' },
    { value: 'SAN ISIDRO', label: 'San Isidro' },
    { value: 'TARRAGONA', label: 'Tarragona' },
    { value: 'CITY OF MATI', label: 'City of Mati' }
  ];

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
      
      const response = await getWeeklyPredictions(weeksToPredict, selectedMunicipality);
      
      if (response.success && response.data?.weekly_predictions) {
        // Store raw weekly data
        setRawWeeklyData(response.data.weekly_predictions);
        
        // Store model information
        if (response.data.model_used) {
          setModelUsed(response.data.model_used);
        }
        if (response.data.is_municipality_specific !== undefined) {
          setIsMunicipalitySpecific(response.data.is_municipality_specific);
        }
        if (response.data.available_municipality_models) {
          setAvailableMunicipalityModels(response.data.available_municipality_models);
        }
        
        // Process data for all three views
        processAllViews(response.data.weekly_predictions);
      } else {
        const errorMsg = response.error || 'Failed to fetch prediction data';
        setError(`Failed to fetch predictions: ${errorMsg}`);
        setRawWeeklyData([]);
        setWeeklyData([]);
        setMonthlyData([]);
        setYearlyData([]);
        setModelUsed(null);
        setIsMunicipalitySpecific(false);
        setAvailableMunicipalityModels([]);
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
      setModelUsed(null);
      setIsMunicipalitySpecific(false);
      setAvailableMunicipalityModels([]);
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
    
    // Filter out baseline training month (e.g., July) with zero predictions
    // so that the chart starts at the first actual forecast month (August).
    const filteredMonthly = monthlyProcessed.filter((month, index) => {
      const isZeroMonth = month.totalPredicted === 0 || !Number.isFinite(month.totalPredicted);
      const isJuly = month.monthShort === 'Jul';
      return !(isZeroMonth && isJuly && index === 0);
    });

    setMonthlyData(filteredMonthly);

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

  // Handle municipality change
  const handleMunicipalityChange = (municipality) => {
    setSelectedMunicipality(municipality);
    // Save to localStorage
    if (municipality) {
      localStorage.setItem('predictionMunicipality', municipality);
    } else {
      localStorage.removeItem('predictionMunicipality');
    }
  };

  // Load data on mount and when weeksToPredict or municipality changes
  useEffect(() => {
    fetchPredictions();
  }, [weeksToPredict, selectedMunicipality]);

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

  // Unified KPI metrics calculation for all views
  const calculateKPIMetrics = () => {
    let data = [];
    let periodLabel = '';
    
    if (viewType === 'weekly' && weeklyData.length > 0) {
      data = weeklyData;
      periodLabel = 'week';
    } else if (viewType === 'monthly' && monthlyData.length > 0) {
      data = monthlyData;
      periodLabel = 'month';
    } else if (viewType === 'yearly' && yearlyData.length > 0) {
      data = yearlyData;
      periodLabel = 'year';
    } else {
      return null;
    }

    // Extract values based on view type
    const values = viewType === 'weekly' 
      ? data.map(item => item.predicted)
      : viewType === 'monthly'
      ? data.map(item => item.totalPredicted)
      : data.map(item => item.totalPredicted);
    
    const total = values.reduce((sum, val) => sum + val, 0);
    const avg = total / values.length;
    
    // Calculate trend (first vs last period)
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const percentageChange = firstValue !== 0 
      ? ((lastValue - firstValue) / firstValue) * 100 
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
    
    // Find peak period
    const maxValue = Math.max(...values);
    const maxIndex = values.indexOf(maxValue);
    const peakPeriod = data[maxIndex];
    
    // Find lowest period
    const minValue = Math.min(...values);
    const minIndex = values.indexOf(minValue);
    const lowPeriod = data[minIndex];
    
    // Calculate variance (coefficient of variation)
    const mean = avg;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean !== 0 ? (stdDev / mean) * 100 : 0;
    
    // Determine peak period label
    let peakLabel = 'N/A';
    if (viewType === 'weekly' && peakPeriod) {
      peakLabel = `Week ${peakPeriod.week}`;
    } else if (viewType === 'monthly' && peakPeriod) {
      peakLabel = peakPeriod.monthShort || peakPeriod.month;
    } else if (viewType === 'yearly' && peakPeriod) {
      peakLabel = peakPeriod.yearLabel || peakPeriod.year.toString();
    }
    
    // Determine low period label
    let lowLabel = 'N/A';
    if (viewType === 'weekly' && lowPeriod) {
      lowLabel = `Week ${lowPeriod.week}`;
    } else if (viewType === 'monthly' && lowPeriod) {
      lowLabel = lowPeriod.monthShort || lowPeriod.month;
    } else if (viewType === 'yearly' && lowPeriod) {
      lowLabel = lowPeriod.yearLabel || lowPeriod.year.toString();
    }
    
    return {
      total,
      avg,
      trendDirection,
      trendIcon,
      trendColor,
      percentageChange,
      peakPeriod: peakLabel,
      peakValue: maxValue,
      lowPeriod: lowLabel,
      lowValue: minValue,
      coefficientOfVariation,
      periodCount: values.length,
      periodLabel
    };
  };

  // Generate actionable recommendations
  const generateRecommendations = (kpiMetrics) => {
    if (!kpiMetrics) return [];
    
    const recommendations = [];
    const { total, avg, trendDirection, percentageChange, peakPeriod, peakValue, lowPeriod, lowValue, coefficientOfVariation, periodLabel } = kpiMetrics;
    
    // Operational Planning Recommendations
    if (viewType === 'weekly') {
      // Staffing recommendations
      const peakRatio = peakValue / avg;
      if (peakRatio > 1.3) {
        recommendations.push({
          type: 'operational',
          category: 'Staffing',
          priority: 'high',
          title: 'Increase Staffing for Peak Week',
          description: `${peakPeriod} is projected at ${peakValue.toLocaleString()} vehicles (${((peakRatio - 1) * 100).toFixed(0)}% above average). Consider scheduling additional staff or extending hours.`,
          icon: Users,
          color: 'blue'
        });
      }
      
      if (lowValue < avg * 0.7) {
        recommendations.push({
          type: 'operational',
          category: 'Resource Optimization',
          priority: 'medium',
          title: 'Optimize Resources During Low Period',
          description: `${lowPeriod} shows ${lowValue.toLocaleString()} vehicles (${((1 - lowValue/avg) * 100).toFixed(0)}% below average). Consider cross-training staff or scheduling maintenance.`,
          icon: Target,
          color: 'amber'
        });
      }
    } else if (viewType === 'monthly') {
      // Budget allocation
      if (coefficientOfVariation > 20) {
        recommendations.push({
          type: 'strategic',
          category: 'Budget Planning',
          priority: 'high',
          title: 'Variable Budget Allocation Recommended',
          description: `High variability (${coefficientOfVariation.toFixed(0)}% CV) detected. Allocate ${((peakValue/total) * 100).toFixed(0)}% of budget to ${peakPeriod} peak period.`,
          icon: Target,
          color: 'blue'
        });
      }
      
      // Marketing opportunities
      if (peakValue > avg * 1.2) {
        recommendations.push({
          type: 'strategic',
          category: 'Marketing',
          priority: 'medium',
          title: 'Leverage Peak Month for Campaigns',
          description: `${peakPeriod} shows strong demand (${peakValue.toLocaleString()} vehicles). Consider launching marketing campaigns to maximize impact.`,
          icon: Lightbulb,
          color: 'green'
        });
      }
    } else if (viewType === 'yearly') {
      // Strategic planning
      if (percentageChange > 10) {
        recommendations.push({
          type: 'strategic',
          category: 'Growth Planning',
          priority: 'high',
          title: 'Plan for Growth Expansion',
          description: `Projected ${percentageChange.toFixed(1)}% year-over-year growth. Consider infrastructure expansion and capacity planning.`,
          icon: ArrowUpRight,
          color: 'green'
        });
      } else if (percentageChange < -10) {
        recommendations.push({
          type: 'risk',
          category: 'Risk Mitigation',
          priority: 'high',
          title: 'Investigate Declining Trends',
          description: `Projected ${Math.abs(percentageChange).toFixed(1)}% decline. Review market conditions, competition, and operational factors.`,
          icon: AlertTriangle,
          color: 'red'
        });
      }
    }
    
    // Risk Mitigation
    if (trendDirection === 'decreasing' && Math.abs(percentageChange) > 15) {
      recommendations.push({
        type: 'risk',
        category: 'Risk Mitigation',
        priority: 'high',
        title: 'Monitor Declining Trend',
        description: `Strong ${trendDirection} trend (${percentageChange.toFixed(1)}%) detected. Investigate root causes and prepare contingency plans.`,
        icon: AlertTriangle,
        color: 'red'
      });
    }
    
    // High variability warning
    if (coefficientOfVariation > 25) {
      recommendations.push({
        type: 'risk',
        category: 'Volatility Warning',
        priority: 'medium',
        title: 'High Volatility Detected',
        description: `Significant variation (${coefficientOfVariation.toFixed(0)}% CV) across periods. Ensure flexible resource allocation and contingency planning.`,
        icon: AlertCircle,
        color: 'amber'
      });
    }
    
    // Strategic opportunities
    if (trendDirection === 'increasing' && percentageChange > 10) {
      recommendations.push({
        type: 'strategic',
        category: 'Growth Opportunity',
        priority: 'medium',
        title: 'Capitalize on Growth Momentum',
        description: `Strong ${trendDirection} trend (${percentageChange.toFixed(1)}%) presents opportunity for strategic initiatives and market expansion.`,
        icon: ArrowUpRight,
        color: 'green'
      });
    }
    
    return recommendations;
  };

  // Enhanced comparative analysis for all views
  const calculateComparativeAnalysis = () => {
    if (!kpiMetrics || (viewType === 'weekly' && weeksToPredict !== 4)) {
      // For weekly, only show when 4 weeks selected
      // For monthly/yearly, show if we have data
      if (viewType === 'monthly' && monthlyData.length === 0) return null;
      if (viewType === 'yearly' && yearlyData.length === 0) return null;
      if (viewType === 'weekly') return null;
    }

    // Get current data based on view type
    let currentValues = [];
    let currentTotal = 0;
    let currentAvg = 0;
    
    if (viewType === 'weekly') {
      currentValues = weeklyData.map(week => week.predicted);
      currentTotal = currentValues.reduce((sum, val) => sum + val, 0);
      currentAvg = currentTotal / currentValues.length;
    } else if (viewType === 'monthly') {
      currentValues = monthlyData.map(month => month.totalPredicted);
      currentTotal = currentValues.reduce((sum, val) => sum + val, 0);
      currentAvg = currentTotal / currentValues.length;
    } else if (viewType === 'yearly') {
      currentValues = yearlyData.map(year => year.totalPredicted);
      currentTotal = currentValues.reduce((sum, val) => sum + val, 0);
      currentAvg = currentTotal / currentValues.length;
    } else {
      return null;
    }
    
    // Note: Historical data would come from API
    // For now, we'll structure the analysis to show format
    // When historical data is available, it can be passed as props or fetched
    
    // Placeholder structure - to be populated with actual historical data
    // This demonstrates the format and calculations
    const previousPeriodTotal = null; // Would be from API: previous 4-week period
    const previousYearTotal = null; // Would be from API: same period last year
    
    // Calculate comparisons if data is available
    let previousPeriodChange = null;
    let previousYearChange = null;
    let previousPeriodAvg = null;
    let previousYearAvg = null;
    
    if (previousPeriodTotal !== null) {
      previousPeriodChange = ((currentTotal - previousPeriodTotal) / previousPeriodTotal) * 100;
      previousPeriodAvg = previousPeriodTotal / 4;
    }
    
    if (previousYearTotal !== null) {
      previousYearChange = ((currentTotal - previousYearTotal) / previousYearTotal) * 100;
      previousYearAvg = previousYearTotal / 4;
    }
    
    // Generate insights
    const insights = [];
    
    if (previousPeriodChange !== null) {
      const changeAbs = Math.abs(previousPeriodChange);
      if (previousPeriodChange > 10) {
        insights.push({
          type: 'positive',
          text: `Significant growth: ${previousPeriodChange.toFixed(1)}% increase vs previous 4-week period (${previousPeriodTotal?.toLocaleString()} vehicles). This represents strong momentum.`,
          context: 'exceptional'
        });
      } else if (previousPeriodChange > 0) {
        insights.push({
          type: 'positive',
          text: `Moderate growth: ${previousPeriodChange.toFixed(1)}% increase vs previous 4-week period. Steady upward trend observed.`,
          context: 'normal'
        });
      } else if (previousPeriodChange < -10) {
        insights.push({
          type: 'negative',
          text: `Significant decline: ${previousPeriodChange.toFixed(1)}% decrease vs previous 4-week period. This may indicate seasonal patterns or external factors.`,
          context: 'concerning'
        });
      } else if (previousPeriodChange < 0) {
        insights.push({
          type: 'negative',
          text: `Slight decline: ${previousPeriodChange.toFixed(1)}% decrease vs previous 4-week period. Monitor for trend continuation.`,
          context: 'normal'
        });
      } else {
        insights.push({
          type: 'neutral',
          text: `Stable performance: ${previousPeriodChange.toFixed(1)}% change vs previous 4-week period. Consistent registration levels maintained.`,
          context: 'normal'
        });
      }
      
      const avgChange = ((currentAvg - previousPeriodAvg) / previousPeriodAvg) * 100;
      insights.push({
        type: 'info',
        text: `Average weekly registrations: ${currentAvg.toFixed(0)} vehicles (${avgChange > 0 ? '+' : ''}${avgChange.toFixed(1)}% vs previous period average of ${previousPeriodAvg?.toFixed(0)}).`,
        context: 'normal'
      });
    }
    
    if (previousYearChange !== null) {
      const changeAbs = Math.abs(previousYearChange);
      if (previousYearChange > 15) {
        insights.push({
          type: 'positive',
          text: `Year-over-year growth: ${previousYearChange.toFixed(1)}% increase vs same period last year (${previousYearTotal?.toLocaleString()} vehicles). Strong annual growth trajectory.`,
          context: 'exceptional'
        });
      } else if (previousYearChange > 0) {
        insights.push({
          type: 'positive',
          text: `Year-over-year improvement: ${previousYearChange.toFixed(1)}% increase vs same period last year. Positive annual trend.`,
          context: 'normal'
        });
      } else if (previousYearChange < -15) {
        insights.push({
          type: 'negative',
          text: `Year-over-year decline: ${previousYearChange.toFixed(1)}% decrease vs same period last year. Investigate seasonal or market factors.`,
          context: 'concerning'
        });
      } else if (previousYearChange < 0) {
        insights.push({
          type: 'negative',
          text: `Year-over-year decrease: ${previousYearChange.toFixed(1)}% lower vs same period last year. May reflect seasonal variations.`,
          context: 'normal'
        });
      } else {
        insights.push({
          type: 'neutral',
          text: `Year-over-year stability: ${previousYearChange.toFixed(1)}% change vs same period last year. Consistent annual performance.`,
          context: 'normal'
        });
      }
    }
    
    // Calculate trend from current data
    const firstValue = currentValues[0];
    const lastValue = currentValues[currentValues.length - 1];
    const periodTrendChange = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
    const trendStrength = Math.abs(periodTrendChange);
    const trendDirection = periodTrendChange > 2 ? 'increasing' : periodTrendChange < -2 ? 'decreasing' : 'stable';
    
    // Always add current period trend insight
    if (trendStrength > 20) {
      insights.push({
        type: 'info',
        text: `Strong ${trendDirection} trend within period: ${periodTrendChange.toFixed(1)}% change from first to last week.`,
        context: trendDirection === 'decreasing' ? 'concerning' : 'exceptional'
      });
    } else if (trendStrength > 5) {
      insights.push({
        type: 'info',
        text: `${trendDirection.charAt(0).toUpperCase() + trendDirection.slice(1)} trend observed: ${periodTrendChange.toFixed(1)}% change from first to last week.`,
        context: 'normal'
      });
    } else {
      insights.push({
        type: 'info',
        text: `Stable trend within period: ${periodTrendChange.toFixed(1)}% change from first to last ${viewType === 'weekly' ? 'week' : viewType === 'monthly' ? 'month' : 'year'}. Consistent performance.`,
        context: 'normal'
      });
    }
    
    // Add period-specific insights
    if (viewType === 'monthly' && monthlyData.length > 0) {
      const peakMonth = monthlyData.reduce((max, month) => 
        month.totalPredicted > max.totalPredicted ? month : max
      );
      const lowMonth = monthlyData.reduce((min, month) => 
        month.totalPredicted < min.totalPredicted ? month : min
      );
      
      if (peakMonth.totalPredicted > currentAvg * 1.3) {
        insights.push({
          type: 'info',
          text: `Peak month identified: ${peakMonth.monthShort || peakMonth.month} with ${peakMonth.totalPredicted.toLocaleString()} vehicles (${((peakMonth.totalPredicted/currentAvg - 1) * 100).toFixed(0)}% above average).`,
          context: 'normal'
        });
      }
    }
    
    return {
      currentTotal,
      currentAvg,
      previousPeriodTotal,
      previousPeriodChange,
      previousPeriodAvg,
      previousYearTotal,
      previousYearChange,
      previousYearAvg,
      insights
    };
  };

  const currentData = getCurrentData();
  const kpiMetrics = calculateKPIMetrics();
  const comparativeAnalysis = calculateComparativeAnalysis();
  const recommendations = generateRecommendations(kpiMetrics);

  return (
    <div className="bg-white/80 dark:bg-gray-800/50 border border-blue-200/50 dark:border-blue-700/50 rounded-xl p-6 w-full shadow-sm min-h-[400px] flex flex-col backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
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
              {selectedMunicipality && (
                <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                  • {municipalities.find(m => m.value === selectedMunicipality)?.label || selectedMunicipality}
                </span>
              )}
              {selectedMunicipality && isMunicipalitySpecific && (
                <span className="ml-2 text-green-600 dark:text-green-400 text-[10px]" title="Using municipality-specific model">
                  ✓ Municipality Model
                </span>
              )}
              {selectedMunicipality && !isMunicipalitySpecific && (
                <span className="ml-2 text-amber-600 dark:text-amber-400 text-[10px]" title={`Municipality-specific model not available for ${municipalities.find(m => m.value === selectedMunicipality)?.label || selectedMunicipality}. Using aggregated model (same predictions for all municipalities). Train a model for this municipality to get specific predictions.`}>
                  ⚠ Using Aggregated Model
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap md:flex-nowrap">
          {/* Municipality Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Municipality:</label>
            <select
              value={selectedMunicipality || ''}
              onChange={(e) => handleMunicipalityChange(e.target.value || null)}
              className="px-3 py-1.5 text-sm border border-blue-200 dark:border-blue-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm min-w-[180px]"
              title="Select municipality for predictions"
            >
              {municipalities.map((mun) => (
                <option key={mun.value || 'all'} value={mun.value || ''}>
                  {mun.label}
                </option>
              ))}
            </select>
          </div>
          
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

      {/* KPI Cards - Show for all views */}
      {kpiMetrics && !loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Predicted Registrations */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Predicted
              </h3>
              <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
                <BarChart2 className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-200">
              {kpiMetrics.total.toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {kpiMetrics.periodCount} {kpiMetrics.periodLabel}{kpiMetrics.periodCount !== 1 ? 's' : ''} • Avg: {kpiMetrics.avg.toFixed(0)}/{kpiMetrics.periodLabel}
            </p>
          </div>

          {/* Trend Direction */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-700/30 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
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
              {kpiMetrics.percentageChange > 0 ? '+' : ''}{kpiMetrics.percentageChange.toFixed(1)}% vs first {kpiMetrics.periodLabel}
            </p>
          </div>

          {/* Peak Period */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Peak {viewType === 'weekly' ? 'Week' : viewType === 'monthly' ? 'Month' : 'Year'}
              </h3>
              <div className="w-8 h-8 flex items-center justify-center bg-amber-500/10 dark:bg-amber-400/10 rounded-lg">
                <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" strokeWidth={2} />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">
              {kpiMetrics.peakPeriod}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {kpiMetrics.peakValue.toLocaleString()} vehicles (highest)
            </p>
          </div>

          {/* Risk Flags / Volatility */}
          <div className={`bg-gradient-to-br ${
            kpiMetrics.coefficientOfVariation > 25 
              ? 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-700'
              : kpiMetrics.coefficientOfVariation > 15
              ? 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border-amber-200 dark:border-amber-700'
              : 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-700'
          } border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Volatility
              </h3>
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${
                kpiMetrics.coefficientOfVariation > 25 
                  ? 'bg-red-500/10 dark:bg-red-400/10'
                  : kpiMetrics.coefficientOfVariation > 15
                  ? 'bg-amber-500/10 dark:bg-amber-400/10'
                  : 'bg-green-500/10 dark:bg-green-400/10'
              }`}>
                {kpiMetrics.coefficientOfVariation > 25 ? (
                  <AlertTriangle className={`w-5 h-5 ${
                    kpiMetrics.coefficientOfVariation > 25 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                  }`} strokeWidth={2} />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" strokeWidth={2} />
                )}
              </div>
            </div>
            <p className={`text-2xl font-bold ${
              kpiMetrics.coefficientOfVariation > 25 
                ? 'text-red-900 dark:text-red-200'
                : kpiMetrics.coefficientOfVariation > 15
                ? 'text-amber-900 dark:text-amber-200'
                : 'text-green-900 dark:text-green-200'
            }`}>
              {kpiMetrics.coefficientOfVariation.toFixed(0)}%
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {kpiMetrics.coefficientOfVariation > 25 ? 'High variability' : kpiMetrics.coefficientOfVariation > 15 ? 'Moderate variability' : 'Low variability'}
            </p>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="h-80 w-full min-h-[320px] flex-1 mb-0">
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
                  bottom: 5
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
                  bottom: 5
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
                  bottom: 5
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
        <div className="flex flex-wrap justify-center gap-4 mb-6 -mt-2" style={{ 
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

      {/* Actionable Recommendations */}
      {recommendations && recommendations.length > 0 && !loading && !error && (
        <div className="mb-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Actionable Recommendations
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec, index) => {
              const colorClasses = {
                blue: {
                  bg: 'bg-blue-50 dark:bg-blue-900/20',
                  border: 'border-blue-200 dark:border-blue-800',
                  icon: 'text-blue-600 dark:text-blue-400',
                  badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                },
                green: {
                  bg: 'bg-green-50 dark:bg-green-900/20',
                  border: 'border-green-200 dark:border-green-800',
                  icon: 'text-green-600 dark:text-green-400',
                  badge: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                },
                red: {
                  bg: 'bg-red-50 dark:bg-red-900/20',
                  border: 'border-red-200 dark:border-red-800',
                  icon: 'text-red-600 dark:text-red-400',
                  badge: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                },
                amber: {
                  bg: 'bg-amber-50 dark:bg-amber-900/20',
                  border: 'border-amber-200 dark:border-amber-800',
                  icon: 'text-amber-600 dark:text-amber-400',
                  badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                }
              };
              
              const colors = colorClasses[rec.color] || colorClasses.blue;
              const IconComponent = rec.icon;
              
              return (
                <div 
                  key={index}
                  className={`${colors.bg} ${colors.border} border rounded-lg p-4 hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${colors.bg} flex-shrink-0`}>
                      <IconComponent className={`w-5 h-5 ${colors.icon}`} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {rec.title}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {rec.category}
                      </p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                        {rec.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyPredictionsChart;

