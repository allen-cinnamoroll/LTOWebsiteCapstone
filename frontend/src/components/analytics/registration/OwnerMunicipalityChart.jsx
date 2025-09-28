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
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

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

  // Format data for Recharts - convert to bar chart format
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
      return (
        <div className="bg-gray-100/90 dark:bg-gray-700/90 border border-gray-400/40 dark:border-gray-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-orange-500"></div>
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{label}</p>
          </div>
          {payload.filter(entry => entry.value !== null).map((entry, index) => {
            return (
              <div key={index} className="flex items-center gap-2 mb-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                ></div>
                <p className="text-sm">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {entry.dataKey === 'withLicense' ? 'With License' : 
                     entry.dataKey === 'withoutLicense' ? 'Without License' : 'Total'}:
                  </span>
                  <span className="ml-2 text-blue-600 dark:text-blue-400 font-semibold">
                    {entry.value.toLocaleString()}
                  </span>
                </p>
              </div>
            );
          })}
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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-foreground">
            Registered Owners by Municipality
            <span className="text-muted-foreground font-normal ml-2" style={{ fontSize: '10px' }}>
              {(selectedYear === 'All' && selectedMonth && selectedMonth !== 'All') && 
                `(${selectedMonth} across all years)`
              }
              {(selectedMonth === 'All' && selectedYear && selectedYear !== 'All') && 
                `(All months in ${selectedYear})`
              }
              {(!selectedMonth || selectedMonth === 'All') && (!selectedYear || selectedYear === 'All') && 
                '(All Time)'
              }
            </span>
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilterModal(true)}
            className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
          >
            Filter
          </button>
          <button
            onClick={() => setShowLocationModal(true)}
            className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
          >
            Location
          </button>
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
        
        {/* Chart Legend - Positioned at bottom with minimal spacing */}
        {ownerData.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 text-gray-600 dark:text-gray-400" style={{ 
            fontSize: isMobile ? '10px' : '12px', 
            fontWeight: '200',
            paddingTop: '0px',
            textAlign: 'center'
          }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>With Driver's License</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>Without Driver's License</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-2xl dark:!bg-black dark:!border-[#2A2A3E] dark:!shadow-none dark:!from-transparent dark:!to-transparent">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-foreground">Filter Options</h3>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-2 hover:bg-muted rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Filter options for owner municipality data will be available here.
              </p>
              
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-white via-gray-50 to-white border border-gray-200/50 rounded-2xl p-8 w-full max-w-[600px] shadow-2xl dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:border-gray-700/50 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Select Location</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Filter data by location</p>
                </div>
              </div>
              <button
                onClick={() => setShowLocationModal(false)}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 group"
              >
                <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  💡 Location filtering for owner municipality data will be available here.
                </p>
              </div>
              
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerMunicipalityChart;
