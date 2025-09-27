import React, { useState, useRef, useEffect } from 'react';
import './RegistrationAnalytics.css';
import { getRegistrationAnalytics, getMonthName, getMonthNumber } from '../../../api/registrationAnalytics.js';
import MunicipalityChart from './MunicipalityChart.jsx';
import VehicleTrendChart from './VehicleTrendChart.jsx';
import OwnerMunicipalityChart from './OwnerMunicipalityChart.jsx';

// Counter animation hook
const useCounterAnimation = (end, duration = 2000) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime;
    const startValue = 0;
    
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(startValue + (end - startValue) * easeOutQuart);
      
      setCount(currentCount);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [end, duration]);
  
  return count;
};

export function RegistrationAnalytics() {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const monthDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);

  // Counter animations - must be called at top level
  const vehiclesTotal = useCounterAnimation(analyticsData?.vehicles?.total || 0);
  const vehiclesActive = useCounterAnimation(analyticsData?.vehicles?.active || 0);
  const vehiclesExpired = useCounterAnimation(analyticsData?.vehicles?.expired || 0);
  const driversTotal = useCounterAnimation(analyticsData?.drivers?.total || 0);
  const driversWithLicense = useCounterAnimation(analyticsData?.drivers?.withLicense || 0);
  const driversWithoutLicense = useCounterAnimation(analyticsData?.drivers?.withoutLicense || 0);
  const platesTotal = useCounterAnimation(analyticsData?.plateClassification?.total || 0);
  const platesPermanent = useCounterAnimation(analyticsData?.plateClassification?.permanent || 0);
  const platesTemporary = useCounterAnimation(analyticsData?.plateClassification?.temporary || 0);

  const months = [
    'All', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = ['All', ...Array.from({ length: 7 }, (_, i) => (currentYear + i).toString())];


  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target)) {
        setIsMonthDropdownOpen(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setIsYearDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    setIsMonthDropdownOpen(false);
  };

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setIsYearDropdownOpen(false);
  };

  // Helper function to get display period text
  const getDisplayPeriod = (month, year) => {
    if (!month && !year) {
      return 'All Time';
    }
    
    if (month === 'All' && year === 'All') {
      return 'All Time';
    }
    
    if (month === 'All' && year && year !== 'All') {
      return `All Months in ${year}`;
    }
    
    if (month && month !== 'All' && year === 'All') {
      return `All ${month}s (All Years)`;
    }
    
    if (month && month !== 'All' && year && year !== 'All') {
      return `${month} ${year}`;
    }
    
    if (month && month !== 'All' && !year) {
      return `All ${month}s (All Years)`;
    }
    
    if (!month && year && year !== 'All') {
      return `All Months in ${year}`;
    }
    
    return 'All Time';
  };

  // Fetch analytics data
  const fetchAnalyticsData = async (month, year) => {
    try {
      setLoading(true);
      setError(null);
      
      // Handle "All" selections
      let monthNumber = null;
      let yearValue = null;
      
      if (month && month !== 'All') {
        monthNumber = getMonthNumber(month);
      }
      
      if (year && year !== 'All') {
        yearValue = year;
      }
      
      const response = await getRegistrationAnalytics(monthNumber, yearValue);
      
      if (response.success) {
        setAnalyticsData(response.data);
      } else {
        setError('Failed to fetch analytics data');
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Error loading analytics data');
    } finally {
      setLoading(false);
    }
  };





  // Load initial data when component mounts
  useEffect(() => {
    // Load all data initially
    fetchAnalyticsData('All', 'All');
  }, []);

  // Fetch data when month or year changes
  useEffect(() => {
    // Only fetch data if at least one filter is selected
    if (selectedMonth || selectedYear) {
      fetchAnalyticsData(selectedMonth, selectedYear);
    } else {
      // If no filters are selected, show all data
      fetchAnalyticsData('All', 'All');
    }
  }, [selectedMonth, selectedYear]);


  return (
    <div className="container mx-auto p-6">
      <div className="registration-analytics-header">
        <div>
          <h1 className="registration-analytics-title">Registration Analytics</h1>
          <p className="registration-analytics-subtitle">
            Vehicle and Owners Registration Analytics for: {getDisplayPeriod(selectedMonth, selectedYear)}
          </p>
        </div>
        
        <div className="registration-analytics-controls">
          {/* Month Dropdown */}
          <div className="registration-analytics-dropdown" ref={monthDropdownRef}>
            <button
              className={`registration-analytics-dropdown-button ${!selectedMonth ? 'placeholder' : ''}`}
              onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
            >
              <span>{selectedMonth || 'Month'}</span>
              <svg
                className={`registration-analytics-chevron ${isMonthDropdownOpen ? 'open' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isMonthDropdownOpen && (
              <div 
                className="registration-analytics-dropdown-content"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '8px',
                  width: '180px',
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  zIndex: 50,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              >
                {months.map((month) => (
                  <div
                    key={month}
                    className="registration-analytics-dropdown-item"
                    onClick={() => handleMonthSelect(month)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      color: 'hsl(var(--foreground))',
                      cursor: 'pointer',
                      transition: 'background-color 150ms'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'hsl(var(--accent))'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {month}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Year Dropdown */}
          <div className="registration-analytics-dropdown" ref={yearDropdownRef}>
            <button
              className={`registration-analytics-dropdown-button ${!selectedYear ? 'placeholder' : ''}`}
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
            >
              <span>{selectedYear || 'Year'}</span>
              <svg
                className={`registration-analytics-chevron ${isYearDropdownOpen ? 'open' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isYearDropdownOpen && (
              <div 
                className="registration-analytics-dropdown-content"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '8px',
                  width: '192px',
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  zIndex: 50,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              >
                {years.map((year) => (
                  <div
                    key={year}
                    className="registration-analytics-dropdown-item"
                    onClick={() => handleYearSelect(year)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      color: 'hsl(var(--foreground))',
                      cursor: 'pointer',
                      transition: 'background-color 150ms'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'hsl(var(--accent))'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {year}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Metrics Section - Individual Cards */}
      <div className="registration-analytics-fade-in">
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Registered Vehicles Card */}
            <div className="group relative bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 dark:!bg-black dark:!border-[#2A2A3E] dark:!shadow-none dark:!from-transparent dark:!to-transparent hover:border-blue-300 dark:hover:border-blue-600">
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Registered Vehicles</h3>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white drop-shadow-sm">
                    {loading ? '...' : vehiclesTotal}
                  </div>
                </div>
                <div className="w-12 h-12 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-blue-500 group-hover:text-blue-600 transition-colors duration-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
                    <circle cx="7" cy="17" r="2"></circle>
                    <path d="M9 17h6"></path>
                    <circle cx="17" cy="17" r="2"></circle>
                  </svg>
                </div>
              </div>
              <div className="relative z-10 flex items-center text-xs text-gray-600 dark:text-gray-400 mb-3">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {loading ? '...' : vehiclesActive} Active
                </span>
                <span className="mx-2">•</span>
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {loading ? '...' : vehiclesExpired} Expired
                </span>
              </div>
              <div className="relative z-10 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-0.5 flex overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-0.5 transition-all duration-1000 ease-out shadow-sm"
                  style={{ width: `${Math.min(((analyticsData?.vehicles?.active || 0) / (analyticsData?.vehicles?.total || 1)) * 100, 100)}%` }}
                ></div>
                <div 
                  className="bg-gradient-to-r from-red-400 to-red-600 h-0.5 transition-all duration-1000 ease-out shadow-sm"
                  style={{ width: `${Math.min(((analyticsData?.vehicles?.expired || 0) / (analyticsData?.vehicles?.total || 1)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Registered Owners Card */}
            <div className="group relative bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 dark:!bg-black dark:!border-[#2A2A3E] dark:!shadow-none dark:!from-transparent dark:!to-transparent hover:border-green-300 dark:hover:border-green-600">
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Registered Owners</h3>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white drop-shadow-sm">
                    {loading ? '...' : driversTotal}
                  </div>
                </div>
                <div className="w-12 h-12 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-green-500 group-hover:text-green-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="relative z-10 flex items-center text-xs text-gray-600 dark:text-gray-400 mb-3">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {loading ? '...' : driversWithLicense} With License
                </span>
                <span className="mx-2">•</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {loading ? '...' : driversWithoutLicense} Without License
                </span>
              </div>
              <div className="relative z-10 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-0.5 flex overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-0.5 transition-all duration-1000 ease-out shadow-sm"
                  style={{ width: `${Math.min(((analyticsData?.drivers?.withLicense || 0) / (analyticsData?.drivers?.total || 1)) * 100, 100)}%` }}
                ></div>
                <div 
                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-0.5 transition-all duration-1000 ease-out shadow-sm"
                  style={{ width: `${Math.min(((analyticsData?.drivers?.withoutLicense || 0) / (analyticsData?.drivers?.total || 1)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Plate Classification Card */}
            <div className="group relative bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 dark:!bg-black dark:!border-[#2A2A3E] dark:!shadow-none dark:!from-transparent dark:!to-transparent hover:border-purple-300 dark:hover:border-purple-600">
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Plate Classification</h3>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white drop-shadow-sm">
                    {loading ? '...' : platesTotal}
                  </div>
                </div>
                <div className="w-12 h-12 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-purple-500 group-hover:text-purple-600 transition-colors duration-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <rect x="2" y="6" width="20" height="12" rx="2" ry="2"/>
                    <rect x="4" y="8" width="16" height="8" rx="1" ry="1"/>
                    <path d="M8 10h2"/>
                    <path d="M12 10h2"/>
                    <path d="M16 10h2"/>
                    <path d="M8 12h2"/>
                    <path d="M12 12h2"/>
                    <path d="M16 12h2"/>
                  </svg>
                </div>
              </div>
              <div className="relative z-10 flex items-center text-xs text-gray-600 dark:text-gray-400 mb-3">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {loading ? '...' : platesPermanent} Permanent
                </span>
                <span className="mx-2">•</span>
                <span className="text-purple-400 dark:text-purple-400 font-medium">
                  {loading ? '...' : platesTemporary} Temporary
                </span>
              </div>
              <div className="relative z-10 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-0.5 flex overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-0.5 transition-all duration-1000 ease-out shadow-sm"
                  style={{ width: `${Math.min(((analyticsData?.plateClassification?.permanent || 0) / (analyticsData?.plateClassification?.total || 1)) * 100, 100)}%` }}
                ></div>
                <div 
                  className="bg-gradient-to-r from-purple-400 to-purple-600 h-0.5 transition-all duration-1000 ease-out shadow-sm"
                  style={{ width: `${Math.min(((analyticsData?.plateClassification?.temporary || 0) / (analyticsData?.plateClassification?.total || 1)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Charts Row - Municipality Chart and Vehicle Trend Chart */}
          <div className="flex flex-col lg:flex-row gap-6 mb-6">
            <div className="flex-1 lg:flex-1">
              <MunicipalityChart 
                selectedMonth={selectedMonth} 
                selectedYear={selectedYear} 
                loading={loading}
              />
            </div>
            <div className="flex-1 lg:flex-1">
              <VehicleTrendChart />
            </div>
          </div>
          
          {/* Owner Municipality Chart - Same width as MunicipalityChart with consistent spacing */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 lg:flex-1">
              <OwnerMunicipalityChart 
                selectedMonth={selectedMonth} 
                selectedYear={selectedYear} 
                loading={loading}
              />
            </div>
            <div className="flex-1 lg:flex-1">
              {/* Empty space to maintain layout balance */}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
