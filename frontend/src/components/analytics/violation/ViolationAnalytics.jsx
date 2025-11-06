import React, { useState, useRef, useEffect } from 'react';
import { getViolationAnalytics, getMonthName, getMonthNumber, getViolationCount } from '../../../api/violationAnalytics.js';
import { 
  KPICards, 
  ChartsSection, 
  ViolationRanking, 
  ViolationCombinations,
  ViolationPrescriptionTable
} from './index';
import { ViolationMonitoring } from './ViolationMonitoring.jsx';

export function ViolationAnalytics() {
  const [selectedYear, setSelectedYear] = useState('');
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalTrafficViolatorsOverride, setTotalTrafficViolatorsOverride] = useState(null);
  
  // Pagination state for violation ranking
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const yearDropdownRef = useRef(null);

  const currentYear = new Date().getFullYear();
  // Based on the data files, violation data spans from 2005 to 2023
  const years = ['All', ...Array.from({ length: 2023 - 2005 + 1 }, (_, i) => (2005 + i).toString())];

  // Use real data from API, with fallback to empty structure if no data
  const displayData = analyticsData || {
    totalViolations: 0,
    totalTrafficViolators: 0,
    recentViolations: 0,
    mostCommonViolations: [],
    topOfficers: [],
    violationsByType: [],
    yearlyTrends: [],
    violationCombinations: [],
    violationPatterns: [],
    confiscatedItemTypesCount: 0,
    confiscatedItemTypesArray: []
  };

  // Pass raw data values directly to KPICards - let it handle all animations simultaneously
  const totalViolations = analyticsData?.totalViolations || 0;
  const totalTrafficViolators = (totalTrafficViolatorsOverride ?? analyticsData?.totalTrafficViolators) || 0;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setIsYearDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setIsYearDropdownOpen(false);
  };

  // Helper function to get display period text
  const getDisplayPeriod = (year) => {
    if (!year) {
      return 'All Time';
    }
    
    if (year === 'All') {
      return 'All Time';
    }
    
    return `Year ${year}`;
  };

  // Fetch analytics data
  const fetchAnalyticsData = async (year) => {
    try {
      setLoading(true);
      setError(null);
      
      // Handle "All" selection
      let yearValue = null;
      
      if (year && year !== 'All') {
        yearValue = year;
      }
      
      console.log('🔍 Fetching violation analytics with filters:', { year, yearValue });
      console.log('🔍 Token in localStorage:', localStorage.getItem('token') ? 'Present' : 'Missing');
      
      const response = await getViolationAnalytics({}, yearValue);

      // Also fetch total records count to reflect "Traffic Violators" as total records
      try {
        const countResp = await getViolationCount();
        const totalRecords = countResp?.data?.totalRecords;
        if (typeof totalRecords === 'number') {
          setTotalTrafficViolatorsOverride(totalRecords);
        } else {
          setTotalTrafficViolatorsOverride(null);
        }
      } catch (e) {
        // Non-critical if this fails; fall back to analytics-provided value
        setTotalTrafficViolatorsOverride(null);
      }
      
      console.log('🔍 API Response:', response);
      console.log('🔍 Response success:', response?.success);
      console.log('🔍 Response data:', response?.data);
      
      if (response && response.success) {
        setAnalyticsData(response.data);
        console.log('Analytics data set:', response.data);
        
        // Check if we have any data for the selected year
        if (year && year !== 'All' && response.data.totalViolations === 0) {
          setError(`No violation data available for year ${year}. Please try a different year.`);
        } else {
          setError(null); // Clear any previous errors
        }
      } else {
        const errorMessage = response?.message || 'Failed to fetch analytics data';
        setError(errorMessage);
        console.error('API returned error:', errorMessage);
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Error loading analytics data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data when component mounts
  useEffect(() => {
    // Load all data initially
    fetchAnalyticsData('All');
  }, []);

  // Fetch data when year changes
  useEffect(() => {
    // Only fetch data if year filter is selected
    if (selectedYear) {
      fetchAnalyticsData(selectedYear);
    } else {
      // If no filter is selected, show all data
      fetchAnalyticsData('All');
    }
  }, [selectedYear]);

  // Pagination logic for violation ranking
  const totalViolationItems = analyticsData?.mostCommonViolations?.length || 0;
  const totalPages = Math.ceil(totalViolationItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentViolations = analyticsData?.mostCommonViolations?.slice(startIndex, endIndex) || [];

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Function to get recommended action based on violation combinations
  const getCombinationRecommendation = (violations) => {
    const violationsLower = violations.map(v => v.toLowerCase());
    
    // Check for specific dangerous combinations
    if (violationsLower.some(v => v.includes('no helmet')) && 
        violationsLower.some(v => v.includes('no license'))) {
      return 'Immediate impoundment - High risk rider without proper documentation';
    }
    
    if (violationsLower.some(v => v.includes('speeding')) && 
        violationsLower.some(v => v.includes('no license'))) {
      return 'Vehicle impoundment and court hearing - Reckless driving without license';
    }
    
    if (violationsLower.some(v => v.includes('no registration')) && 
        violationsLower.some(v => v.includes('no license'))) {
      return 'Complete documentation check and vehicle impoundment until compliance';
    }
    
    if (violationsLower.some(v => v.includes('drunk')) || 
        violationsLower.some(v => v.includes('alcohol'))) {
      return 'Immediate arrest and breathalyzer test - Zero tolerance policy';
    }
    
    if (violationsLower.some(v => v.includes('reckless')) && 
        violationsLower.some(v => v.includes('speeding'))) {
      return 'License suspension and mandatory driver education program';
    }
    
    // Check for high-severity violations
    if (violationsLower.some(v => v.includes('confiscated')) || 
        violationsLower.some(v => v.includes('impound'))) {
      return 'Severe violation - Court hearing and possible vehicle forfeiture';
    }
    
    // Check for documentation issues
    if (violationsLower.some(v => v.includes('no license')) || 
        violationsLower.some(v => v.includes('no registration'))) {
      return 'Documentation violation - Vehicle impoundment until proper documents provided';
    }
    
    // Check for safety violations
    if (violationsLower.some(v => v.includes('helmet')) || 
        violationsLower.some(v => v.includes('safety'))) {
      return 'Safety violation - Fine and safety education requirement';
    }
    
    // Check for traffic violations
    if (violationsLower.some(v => v.includes('speeding')) || 
        violationsLower.some(v => v.includes('traffic'))) {
      return 'Traffic violation - Fine and license demerit points';
    }
    
    // Default recommendation
    return 'Standard fine and documentation review';
  };

  return (
    <div className="container mx-auto p-6 bg-white dark:bg-black min-h-screen rounded-lg">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
             <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 animate-in slide-in-from-top-5 fade-in duration-700">
               Violation Analytics
             </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Traffic Violation Analytics Dashboard
              {analyticsData && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  ✓ Live Data
                </span>
              )}
              {!analyticsData && !loading && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                  No Data
                </span>
              )}
            </p>
          </div>
        </div>
        
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
            <button
              onClick={() => fetchAnalyticsData(selectedYear || 'All')}
              className="ml-4 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <KPICards
        displayData={analyticsData}
        loading={loading}
        totalViolations={totalViolations}
        totalTrafficViolators={totalTrafficViolators}
        topOfficer={analyticsData?.topOfficers?.[0]}
        mostCommonViolation={analyticsData?.mostCommonViolations?.[0]}
      />

      {/* Violation Monitoring */}
      <div className="mb-8">
        <ViolationMonitoring analyticsData={analyticsData} />
      </div>

      {/* Charts Section with Violation Ranking and Combinations */}
      <ChartsSection
        displayData={analyticsData}
        loading={loading}
        currentViolations={currentViolations}
        startIndex={startIndex}
        endIndex={endIndex}
        totalViolationItems={totalViolationItems}
        currentPage={currentPage}
        totalPages={totalPages}
        handlePrevPage={handlePrevPage}
        handleNextPage={handleNextPage}
        getCombinationRecommendation={getCombinationRecommendation}
      />

      {/* Violation Prescription Table */}
      <ViolationPrescriptionTable
        displayData={analyticsData}
        loading={loading}
        totalViolations={totalViolations}
      />

    </div>
  );
}
