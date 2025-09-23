import React, { useState, useRef, useEffect } from 'react';
import './RegistrationAnalytics.css';
import { getRegistrationAnalytics, getMonthName, getMonthNumber } from '../../../api/registrationAnalytics.js';
import MunicipalityChart from './MunicipalityChart.jsx';

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





  // Load initial data and fetch data when month or year changes
  useEffect(() => {
    fetchAnalyticsData(selectedMonth, selectedYear);
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

      {/* Metrics Section */}
      <div className="registration-analytics-fade-in">
        <div className="mb-6">
          <div className="flex justify-start">
            {/* Metrics Section */}
            <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-4 w-[400px] h-fit shadow-sm dark:!bg-[#171725] dark:!border-[#2A2A3E] dark:!shadow-none dark:!from-transparent dark:!to-transparent">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </div>
                <h2 className="text-1xl font-bold text-foreground">Metrics</h2>
              </div>
              {/* Registered Vehicles Row */}
              <div className="flex items-center justify-between py-2 border-b border-border group cursor-pointer relative rounded-md">
                {/* Hover background highlight */}
                <div className="absolute inset-0 bg-gray-200/70 dark:bg-gray-600/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></div>
                <div className="relative z-10 w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
                      <circle cx="7" cy="17" r="2"></circle>
                      <path d="M9 17h6"></path>
                      <circle cx="17" cy="17" r="2"></circle>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Registered Vehicles</h3>
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-600 dark:text-green-400">
                        {loading ? '...' : (analyticsData?.vehicles?.active || 0)} Active
                      </span> • <span className="text-red-600 dark:text-red-400">
                        {loading ? '...' : (analyticsData?.vehicles?.expired || 0)} Expired
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-foreground">
                    {loading ? '...' : (analyticsData?.vehicles?.total || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                </div>
              </div>

              {/* Registered Owners Row */}
              <div className="flex items-center justify-between py-2 border-b border-border group cursor-pointer relative rounded-md">
                {/* Hover background highlight */}
                <div className="absolute inset-0 bg-gray-200/70 dark:bg-gray-600/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></div>
                <div className="relative z-10 w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Registered Owners</h3>
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-600 dark:text-green-400">
                        {loading ? '...' : (analyticsData?.drivers?.withLicense || 0)} With License
                      </span> • <span className="text-orange-600 dark:text-orange-400">
                        {loading ? '...' : (analyticsData?.drivers?.withoutLicense || 0)} Without License
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-foreground">
                    {loading ? '...' : (analyticsData?.drivers?.total || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                </div>
              </div>

              {/* Plate Number Classification Row */}
              <div className="flex items-center justify-between py-2 group cursor-pointer relative rounded-md">
                {/* Hover background highlight */}
                <div className="absolute inset-0 bg-gray-200/70 dark:bg-gray-600/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></div>
                <div className="relative z-10 w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
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
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Plate Number Classification</h3>
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-600 dark:text-green-400">
                        {loading ? '...' : (analyticsData?.plateClassification?.permanent || 0)} Permanent
                      </span> • <span className="text-orange-400 dark:text-orange-400">
                        {loading ? '...' : (analyticsData?.plateClassification?.temporary || 0)} Temporary
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-foreground">
                    {loading ? '...' : (analyticsData?.plateClassification?.total || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                </div>
              </div>
            </div>
            
            {/* Municipality Chart */}
            <MunicipalityChart 
              selectedMonth={selectedMonth} 
              selectedYear={selectedYear} 
              loading={loading}
            />
          </div>
        </div>
      </div>


    </div>
  );
}
