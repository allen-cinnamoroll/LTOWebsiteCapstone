import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ComposedChart
} from 'recharts';
import { getWeeklyPredictions } from '../../../api/predictionApi.js';

const WeeklyPredictionsChart = () => {
  const [predictionData, setPredictionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weeksToPredict, setWeeksToPredict] = useState(12); // Default to 12 weeks (about 3 months)

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

  // Fetch prediction data
  const fetchPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getWeeklyPredictions(weeksToPredict);
      
      if (response.success && response.data?.weekly_predictions) {
        // Process weekly predictions to group by month
        const processedData = processPredictionsByMonth(response.data.weekly_predictions);
        setPredictionData(processedData);
      } else {
        setError('Failed to fetch prediction data');
        setPredictionData([]);
      }
    } catch (err) {
      console.error('Error fetching weekly predictions:', err);
      setError(`Error loading predictions: ${err.message}`);
      setPredictionData([]);
    } finally {
      setLoading(false);
    }
  };

  // Process weekly predictions to group by month
  const processPredictionsByMonth = (weeklyPredictions) => {
    if (!weeklyPredictions || weeklyPredictions.length === 0) {
      return [];
    }

    // Group predictions by month
    const monthlyData = {};
    
    weeklyPredictions.forEach((prediction) => {
      const date = new Date(prediction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          monthKey: monthKey,
          monthIndex: date.getMonth(),
          year: date.getFullYear(),
          weeks: [],
          totalPredicted: 0,
          avgPredicted: 0,
        };
      }
      
      monthlyData[monthKey].weeks.push({
        date: prediction.date,
        week: prediction.week,
        predicted: prediction.predicted_count || prediction.predicted || 0,
        lowerBound: prediction.lower_bound || 0,
        upperBound: prediction.upper_bound || 0,
      });
      
      monthlyData[monthKey].totalPredicted += prediction.predicted_count || prediction.predicted || 0;
    });

    // Calculate averages and prepare chart data
    const chartData = Object.values(monthlyData).map((monthData) => {
      monthData.avgPredicted = monthData.totalPredicted / monthData.weeks.length;
      return {
        month: monthData.month,
        monthKey: monthData.monthKey,
        monthIndex: monthData.monthIndex,
        year: monthData.year,
        predicted: Math.round(monthData.avgPredicted),
        totalPredicted: Math.round(monthData.totalPredicted),
        weekCount: monthData.weeks.length,
      };
    });

    // Sort by date
    chartData.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthIndex - b.monthIndex;
    });

    return chartData;
  };

  // Load data on mount and when weeksToPredict changes
  useEffect(() => {
    fetchPredictions();
  }, [weeksToPredict]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
                Average Weekly: <span className="ml-1 font-medium">{data.predicted.toLocaleString()}</span>
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Total ({data.weekCount} weeks): {data.totalPredicted.toLocaleString()} vehicles
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Format month label for display
  const formatMonthLabel = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

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
              Weekly Registration Predictions
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Forecasted vehicle registrations using SARIMA model
            </p>
          </div>
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
        ) : predictionData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full text-gray-500 dark:text-gray-400">
            <p>No prediction data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={320}>
            <ComposedChart
              data={predictionData}
              margin={{ 
                top: 10, 
                right: 20, 
                left: 0, 
                bottom: 20
              }}
            >
              <defs>
                <linearGradient id="predictionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#6b7280" opacity={0.4} />
              <XAxis 
                dataKey="monthKey" 
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280', fontWeight: 500 }}
                tickFormatter={formatMonthLabel}
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
                fill="url(#predictionGradient)"
                dot={{ 
                  fill: 'white', 
                  stroke: '#3b82f6', 
                  strokeWidth: 2, 
                  r: 5,
                  filter: 'drop-shadow(0 1px 2px rgba(59, 130, 246, 0.3))'
                }}
                activeDot={{ 
                  r: 7, 
                  fill: 'white',
                  stroke: '#3b82f6', 
                  strokeWidth: 2,
                  filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.4))'
                }}
                name="Predicted Registrations"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      {predictionData.length > 0 && !loading && (
        <div className="flex flex-wrap justify-center gap-4 mt-4" style={{ 
          fontSize: '12px', 
          fontWeight: '500',
          textAlign: 'center'
        }}>
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div>
            <span>Average Weekly Predictions</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyPredictionsChart;

