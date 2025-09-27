import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { getOwnerMunicipalityData } from '../../../api/registrationAnalytics.js';
import { getMonthNumber } from '../../../api/registrationAnalytics.js';

const OwnerMunicipalityChart = ({ selectedMonth, selectedYear, loading: parentLoading }) => {
  const [ownerData, setOwnerData] = useState([]);
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

  // Fetch owner municipality data
  const fetchOwnerData = async () => {
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
      
      console.log('Fetching owner municipality data with:', { monthNumber, yearValue, selectedMonth, selectedYear });
      
      const response = await getOwnerMunicipalityData(monthNumber, yearValue);
      console.log('Owner municipality data response:', response);
      
      if (response.success) {
        setOwnerData(response.data);
      } else {
        setError('Failed to fetch owner municipality data');
        setOwnerData([]);
      }
    } catch (err) {
      console.error('Error fetching owner municipality data:', err);
      setError('Error loading owner municipality data');
    } finally {
      setLoading(false);
    }
  };

  // Load initial data when component mounts
  useEffect(() => {
    fetchOwnerData();
    setAnimationComplete(false);
  }, []);

  // Fetch data when month or year changes
  useEffect(() => {
    fetchOwnerData();
    setAnimationComplete(false);
  }, [selectedMonth, selectedYear]);

  // Trigger animation after data loads
  useEffect(() => {
    if (ownerData.length > 0) {
      const timer = setTimeout(() => setAnimationComplete(true), 100);
      return () => clearTimeout(timer);
    }
  }, [ownerData]);

  // Format data for Recharts
  const formatChartData = (data) => {
    return data.map((item) => ({
      name: item.municipality,
      withLicense: item.withLicense,
      withoutLicense: item.withoutLicense,
      total: item.totalOwners
    }));
  };

  // Enhanced custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const withLicense = payload.find(p => p.dataKey === 'withLicense')?.value || 0;
      const withoutLicense = payload.find(p => p.dataKey === 'withoutLicense')?.value || 0;
      const total = withLicense + withoutLicense;
      
      return (
        <div className="bg-gray-100/90 dark:bg-gray-700/90 border border-gray-400/40 dark:border-gray-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
          <div className="space-y-2">
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{label}</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-green-600 dark:text-green-400 text-xs">
                  <span className="font-semibold">{withLicense.toLocaleString()}</span> With License
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-orange-600 dark:text-orange-400 text-xs">
                  <span className="font-semibold">{withoutLicense.toLocaleString()}</span> Without License
                </span>
              </div>
              <div className="border-t border-gray-300 dark:border-gray-600 pt-1">
                <span className="text-gray-700 dark:text-gray-300 text-xs font-semibold">
                  Total: {total.toLocaleString()}
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
      <div className="flex justify-center gap-6 mt-4">
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
            <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <h2 className="text-base font-bold text-foreground">
              Registered Owners by Municipality
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
        ) : ownerData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full text-muted-foreground">
            <p>No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={320}>
            <BarChart
              data={formatChartData(ownerData)}
              margin={{ 
                top: 20, 
                right: isMobile ? 20 : 50, 
                left: isMobile ? 5 : 10, 
                bottom: 20 
              }}
              barCategoryGap="10%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#6b7280" opacity={0.4} />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280"
                fontSize={isMobile ? 9 : 11}
                height={isMobile ? 60 : 50}
                interval={isMobile ? 0 : 40}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? 'end' : 'middle'}
                tick={{ fill: '#6b7280', fontWeight: 500 }}
                tickFormatter={(value) => {
                  if (isMobile) {
                    if (value.length > 8) {
                      return value.substring(0, 8) + '...';
                    }
                    return value;
                  } else {
                    if (value.length > 12) {
                      return value.substring(0, 12) + '...';
                    }
                    return value;
                  }
                }}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={isMobile ? 10 : 12}
                tickFormatter={(value) => value.toLocaleString()}
                tick={{ fill: '#6b7280', fontWeight: 500 }}
                width={isMobile ? 60 : 80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              <Bar 
                dataKey="withLicense" 
                stackId="owners"
                name="With Driver's License"
                fill="#10b981"
                radius={[0, 0, 0, 0]}
                maxBarSize={isMobile ? 80 : 120}
              />
              <Bar 
                dataKey="withoutLicense" 
                stackId="owners"
                name="Without Driver's License"
                fill="#f97316"
                radius={[4, 4, 0, 0]}
                maxBarSize={isMobile ? 80 : 120}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default OwnerMunicipalityChart;
