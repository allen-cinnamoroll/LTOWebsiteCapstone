import React, { useState, useRef, useEffect } from 'react';
import './RegistrationAnalytics.css';
import { getRegistrationAnalytics, getMonthName, getMonthNumber } from '../../../api/registrationAnalytics.js';

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
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => (currentYear + i).toString());

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

  // Fetch analytics data
  const fetchAnalyticsData = async (month, year) => {
    try {
      setLoading(true);
      setError(null);
      
      const monthNumber = month ? getMonthNumber(month) : null;
      const response = await getRegistrationAnalytics(monthNumber, year);
      
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

  // Load initial data
  useEffect(() => {
    fetchAnalyticsData(selectedMonth, selectedYear);
  }, []);

  // Fetch data when month or year changes
  useEffect(() => {
    if (selectedMonth && selectedYear) {
      fetchAnalyticsData(selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear]);


  return (
    <div className="container mx-auto p-6">
      <div className="registration-analytics-header">
        <div>
          <h1 className="registration-analytics-title">Registration Analytics</h1>
          <p className="registration-analytics-subtitle">
            Vehicle and Owners Registration Analytics for: {selectedMonth || 'Select Month'} {selectedYear || 'Select Year'}
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
          <h2 className="text-2xl font-bold text-foreground mb-4">Metrics</h2>
          
          <div className="flex gap-6">
            <div className="bg-card border border-border rounded-lg p-4 w-80">
              {/* Registered Vehicles Row */}
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-3zM7 11a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H7zM6 14a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H6zM8 16a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
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

              {/* Registered Owners Row */}
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

              {/* Plate Number Classification Row */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Plate Number Classification</h3>
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-600 dark:text-green-400">
                        {loading ? '...' : (analyticsData?.plateClassification?.permanent || 0)} Permanent
                      </span> • <span className="text-blue-600 dark:text-blue-400">
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
            
            {/* Space for future card */}
            <div className="flex-1">
              {/* Future card will go here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
