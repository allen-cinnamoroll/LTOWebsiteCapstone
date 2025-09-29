import React, { useState, useEffect } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { getVehicleClassificationData } from '../../../api/registrationAnalytics.js';
import { getMonthNumber } from '../../../api/registrationAnalytics.js';

const VehicleClassificationChart = ({ selectedMonth, selectedYear, loading: parentLoading }) => {
  const [classificationData, setClassificationData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch vehicle classification data
  const fetchClassificationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Handle "All" selections
      let monthNumber = null;
      let yearValue = null;
      
      // If month is selected (not "All"), convert to number
      if (selectedMonth && selectedMonth !== 'All') {
        monthNumber = getMonthNumber(selectedMonth);
      }
      
      // If year is selected (not "All"), use the year value
      if (selectedYear && selectedYear !== 'All') {
        yearValue = selectedYear;
      }
      
      
      const response = await getVehicleClassificationData(monthNumber, yearValue);
      
      if (response.success) {
        setClassificationData(response.data);
      } else {
        setError('Failed to fetch vehicle classification data');
        setClassificationData([]);
      }
    } catch (err) {
      console.error('Error fetching vehicle classification data:', err);
      setError('Error loading vehicle classification data');
    } finally {
      setLoading(false);
    }
  };

  // Load initial data when component mounts
  useEffect(() => {
    fetchClassificationData();
    setAnimationComplete(false);
  }, []);

  // Fetch data when month or year changes
  useEffect(() => {
    fetchClassificationData();
    setAnimationComplete(false);
  }, [selectedMonth, selectedYear]);

  // Trigger animation after data loads
  useEffect(() => {
    if (classificationData.length > 0) {
      const timer = setTimeout(() => setAnimationComplete(true), 100);
      return () => clearTimeout(timer);
    }
  }, [classificationData]);

  // Format data for Recharts
  const formatChartData = (data) => {
    return data.map((item) => ({
      name: item.classification,
      value: item.count,
      percentage: item.percentage
    }));
  };

  // Custom colors for the pie chart
  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b']; // Blue, Red, Orange

  // Enhanced custom tooltip component
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-gray-100/90 dark:bg-gray-700/90 border border-gray-400/40 dark:border-gray-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
          <div className="space-y-2">
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{data.name}</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }}></div>
                <span className="text-gray-700 dark:text-gray-300 text-xs">
                  <span className="font-semibold">{data.value.toLocaleString()}</span> vehicles
                </span>
              </div>
              <div className="border-t border-gray-300 dark:border-gray-600 pt-1">
                <span className="text-gray-700 dark:text-gray-300 text-xs font-semibold">
                  {data.payload.percentage}% of total
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom legend component
  const CustomLegend = ({ payload }) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-100 border border-gray-200 rounded-xl p-3 w-full max-w-4xl mx-auto h-fit shadow-sm dark:!bg-black dark:!border-[#2A2A3E] dark:!shadow-none dark:!from-transparent dark:!to-transparent min-h-[400px] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <h2 className="text-sm font-bold text-foreground">
              Vehicle Classification
            </h2>
            {(selectedYear === 'All' && selectedMonth && selectedMonth !== 'All') && (
              <span className="text-sm font-normal text-muted-foreground">
                ({selectedMonth} across all years)
              </span>
            )}
            {(selectedMonth === 'All' && selectedYear && selectedYear !== 'All') && (
              <span className="text-sm font-normal text-muted-foreground">
                (All months in {selectedYear})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="h-80 w-full min-h-[320px] flex-1">
        {loading || parentLoading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center w-full h-full text-red-500">
            <p>{error}</p>
          </div>
        ) : classificationData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full text-muted-foreground">
            <p>No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={320}>
            <PieChart>
              <Pie
                data={formatChartData(classificationData)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} ${percentage}%`}
                outerRadius={isMobile ? 80 : 100}
                fill="#8884d8"
                dataKey="value"
                animationBegin={0}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {formatChartData(classificationData).map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default VehicleClassificationChart;
