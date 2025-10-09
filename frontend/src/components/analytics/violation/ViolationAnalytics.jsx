import React, { useState, useRef, useEffect } from 'react';
import { getViolationAnalytics, getMonthName, getMonthNumber } from '../../../api/violationAnalytics.js';
import { 
  KPICards, 
  ChartsSection, 
  ViolationRanking, 
  ViolationCombinations, 
  LineChartModal,
  MonthlyViolationMonitoring
} from './index';
import { Shield, Calendar, BarChart3, AlertTriangle, Scale, FileText, Car, Badge, FileCheck } from 'lucide-react';

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

export function ViolationAnalytics() {
  const [selectedYear, setSelectedYear] = useState('');
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state for violation ranking
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal and filtering state for line chart
  const [isLineChartModalOpen, setIsLineChartModalOpen] = useState(false);
  const [selectedYearRange, setSelectedYearRange] = useState('2020-2023');
  
  // Modal state for monthly violation monitoring
  const [isMonthlyMonitoringOpen, setIsMonthlyMonitoringOpen] = useState(false);

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

  // Filter yearly trends data based on selected year range
  const getFilteredYearlyData = () => {
    if (!analyticsData?.yearlyTrends) return [];
    
    // Handle single year case (e.g., "2025")
    if (!selectedYearRange.includes('-')) {
      const year = parseInt(selectedYearRange);
      return analyticsData.yearlyTrends.filter(item => item._id?.year === year);
    }
    
    // Handle year range case (e.g., "2020-2025")
    const [startYear, endYear] = selectedYearRange.split('-').map(Number);
    return analyticsData.yearlyTrends.filter(item => 
      item._id?.year >= startYear && item._id?.year <= endYear
    );
  };

  const filteredYearlyData = getFilteredYearlyData();

  // Counter animations - use the data directly from analyticsData
  const totalViolations = useCounterAnimation(analyticsData?.totalViolations || 0);
  const totalTrafficViolators = useCounterAnimation(analyticsData?.totalTrafficViolators || 0);

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
          
          {/* Monthly Violation Monitoring Button */}
          <div className="mt-2">
            <MonthlyViolationMonitoring 
              onOpen={() => setIsMonthlyMonitoringOpen(true)} 
            />
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

      {/* Charts Section with Violation Ranking and Combinations */}
      <ChartsSection
        displayData={analyticsData}
        loading={loading}
        setIsLineChartModalOpen={setIsLineChartModalOpen}
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

      {/* Line Chart Modal */}
      <LineChartModal
        isLineChartModalOpen={isLineChartModalOpen}
        setIsLineChartModalOpen={setIsLineChartModalOpen}
        selectedYearRange={selectedYearRange}
        setSelectedYearRange={setSelectedYearRange}
        filteredYearlyData={filteredYearlyData}
        loading={loading}
      />

      {/* Monthly Violation Monitoring Modal */}
      {isMonthlyMonitoringOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Monthly Violation Monitoring
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track violations by month and analyze trends
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMonthlyMonitoringOpen(false)}
                className="w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Monthly Monitoring Dashboard
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  This feature will display monthly violation trends, patterns, and analytics.
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setIsMonthlyMonitoringOpen(false)}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setIsMonthlyMonitoringOpen(false)}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
