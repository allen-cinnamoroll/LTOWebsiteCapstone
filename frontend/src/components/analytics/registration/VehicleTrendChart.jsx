import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Area
} from 'recharts';
import { getYearlyVehicleTrends, getMonthlyVehicleTrends } from '../../../api/registrationAnalytics.js';

const VehicleTrendChart = () => {
  const [trendData, setTrendData] = useState([]);
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

  // Add custom scrollbar styles for municipality list
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-hide {
        -ms-overflow-style: none;  /* Internet Explorer 10+ */
        scrollbar-width: none;  /* Firefox */
      }
      .scrollbar-hide::-webkit-scrollbar { 
        display: none;  /* Safari and Chrome */
      }
      /* Custom scrollbar for municipality list */
      .municipality-scroll::-webkit-scrollbar {
        width: 8px;
      }
      .municipality-scroll::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 4px;
      }
      .municipality-scroll::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }
      .municipality-scroll::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCustomRangeModal, setShowCustomRangeModal] = useState(false);
  const [customStartYear, setCustomStartYear] = useState('');
  const [customEndYear, setCustomEndYear] = useState('');
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [viewType, setViewType] = useState(() => {
    // Load saved view type from localStorage, default to 'year'
    return localStorage.getItem('vehicleTrendViewType') || 'year';
  });
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => {
    // Load saved year from localStorage
    return localStorage.getItem('vehicleTrendSelectedYear') || '';
  });
  const [selectedMunicipality, setSelectedMunicipality] = useState(() => {
    // Load saved municipality from localStorage, default to 'All'
    return localStorage.getItem('vehicleTrendMunicipality') || 'All';
  });
  const [showMunicipalityModal, setShowMunicipalityModal] = useState(false);
  const municipalityListRef = useRef(null);

  const currentYear = new Date().getFullYear();

  // Davao Oriental municipalities
  const municipalities = [
    'All',
    'BAGANGA',
    'BANAYBANAY', 
    'BOSTON',
    'CARAGA',
    'CATEEL',
    'GOVERNOR GENEROSO',
    'LUPON',
    'MANAY',
    'SAN ISIDRO',
    'TARRAGONA',
    'CITY OF MATI'
  ];

  // Fetch yearly trend data
  const fetchYearlyData = async (startYear, endYear, municipality = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const municipalityToUse = municipality || selectedMunicipality;
      const response = await getYearlyVehicleTrends(startYear, endYear, municipalityToUse);
      
      if (response.success) {
         // Process data with year-over-year growth rate calculations
         // Formula: Growth Rate = ((Current Year - Previous Year) / Previous Year) × 100
         // If Previous Year Value is 0, mark as 'N/A'
         const processedData = response.data.map((item, index) => {
           const currentValue = item.active || 0;
           let growthRate = null; // Use null to represent 'N/A'
           
           // Calculate growth rate: ((Current - Previous) / Previous) × 100
           if (index > 0) {
             // Compare to previous year
             const prevValue = response.data[index - 1].active || 0;
             if (prevValue > 0) {
               growthRate = ((currentValue - prevValue) / prevValue) * 100;
             } else {
               // Previous year value is 0, mark as 'N/A'
               growthRate = null;
             }
           } else {
             // First year in the range has no previous year to compare, mark as 'N/A'
             growthRate = null;
           }
           
           return {
             year: item.year,
             active: currentValue,
             growthRate: growthRate !== null ? parseFloat(growthRate.toFixed(1)) : null
           };
         });
        setTrendData(processedData);
      } else {
        setError('Failed to fetch yearly trend data');
        setTrendData([]);
      }
    } catch (err) {
      setError('Error loading yearly trend data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch monthly trend data
  const fetchMonthlyData = async (year, municipality = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const municipalityToUse = municipality || selectedMunicipality;
      const response = await getMonthlyVehicleTrends(year, municipalityToUse);
      
      if (response && response.success && response.data && Array.isArray(response.data)) {
         // Process monthly data and calculate growth rates
         let previousMonthValue = null;
         
         // For January, we need December of previous year
         if (year > 2000) {
           try {
             const prevYearResponse = await getMonthlyVehicleTrends(year - 1, municipalityToUse);
             if (prevYearResponse && prevYearResponse.success && prevYearResponse.data && Array.isArray(prevYearResponse.data) && prevYearResponse.data.length > 0) {
               // Get December (index 11, month name "Dec")
               const decemberData = prevYearResponse.data.find(item => item && item.month === 'Dec');
               if (decemberData) {
                 previousMonthValue = decemberData.active || 0;
               }
             }
           } catch (err) {
             // Previous year data not available, continue without it
           }
         }
         
         // Process monthly data with growth rate calculations
         // Formula: Growth Rate = ((Current Month - Previous Month) / Previous Month) × 100
         // If Previous Month Value is 0, mark as 'N/A'
         const processedData = response.data.map((item, index) => {
           if (!item) {
             return null;
           }
           
           const currentValue = item.active || 0;
           let growthRate = null; // Use null to represent 'N/A'
           
           // Calculate growth rate: ((Current - Previous) / Previous) × 100
           if (index === 0) {
             // January: compare to December of previous year
             if (previousMonthValue !== null && previousMonthValue > 0) {
               growthRate = ((currentValue - previousMonthValue) / previousMonthValue) * 100;
             } else {
               // Previous month value is 0, mark as 'N/A'
               growthRate = null;
             }
           } else {
             // Other months: compare to previous month
             const prevItem = response.data[index - 1];
             const prevValue = prevItem ? (prevItem.active || 0) : 0;
             if (prevValue > 0) {
               growthRate = ((currentValue - prevValue) / prevValue) * 100;
             } else {
               // Previous month value is 0, mark as 'N/A'
               growthRate = null;
             }
           }
           
           return {
             month: item.month || '',
             active: currentValue,
             growthRate: growthRate !== null ? parseFloat(growthRate.toFixed(1)) : null
           };
         }).filter(item => item !== null); // Remove any null items
         
        setTrendData(processedData);
      } else {
        setError('Failed to fetch monthly trend data');
        setTrendData([]);
      }
    } catch (err) {
      setError(`Error loading monthly trend data: ${err.message || 'Unknown error'}`);
      setTrendData([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter modal
  const handleFilterClick = () => {
    setShowFilterModal(true);
  };

  // Handle custom range submission
  const handleApplyFilter = () => {
    const startYear = parseInt(customStartYear);
    const endYear = parseInt(customEndYear);
    
    // Clear previous error
    setError(null);
    
    // Validate inputs
    if (!startYear || !endYear) {
      setError('Please enter both start and end years');
      return;
    }
    
    if (startYear < 2000) {
      setError(`Start year ${startYear} is too early. Please enter a year from 2000 onwards`);
      return;
    }
    
    if (endYear > currentYear) {
      setError(`End year ${endYear} is in the future. Please enter a year up to ${currentYear}`);
      return;
    }
    
    if (startYear > endYear) {
      setError(`Start year ${startYear} cannot be later than end year ${endYear}`);
      return;
    }
    
    // If all validations pass
    setIsCustomRange(true);
    // Save custom range to localStorage
    localStorage.setItem('vehicleTrendCustomStartYear', startYear.toString());
    localStorage.setItem('vehicleTrendCustomEndYear', endYear.toString());
    localStorage.setItem('vehicleTrendIsCustomRange', 'true');
    
    if (viewType === 'year') {
      fetchYearlyData(startYear, endYear, selectedMunicipality);
    }
    setShowCustomRangeModal(false);
  };

  // Handle reset filter
  const handleResetFilter = () => {
    setIsCustomRange(false);
    setCustomStartYear('');
    setCustomEndYear('');
    setError(null);
    
    // Clear custom range from localStorage
    localStorage.removeItem('vehicleTrendCustomStartYear');
    localStorage.removeItem('vehicleTrendCustomEndYear');
    localStorage.removeItem('vehicleTrendIsCustomRange');
    
    if (viewType === 'year') {
      fetchYearlyData(currentYear - 4, currentYear, selectedMunicipality); // Default 5 years
    }
    setShowCustomRangeModal(false);
  };

  // Handle view type change
  const handleViewTypeChange = (type) => {
    if (type === 'year') {
      // Reset to default yearly view
      setViewType('year');
      localStorage.setItem('vehicleTrendViewType', 'year');
      setIsCustomRange(false);
      setCustomStartYear('');
      setCustomEndYear('');
      fetchYearlyData(currentYear - 4, currentYear, selectedMunicipality);
      setShowFilterModal(false);
    } else if (type === 'month') {
      // Don't change viewType yet - wait until year is selected
      // Open month selection modal
      setShowMonthModal(true);
      setShowFilterModal(false);
    } else if (type === 'customRange') {
      // Just close the dropdown, don't open modal yet
      setShowFilterModal(false);
    }
  };

  // Handle month year selection
  const handleMonthYearSelect = (year) => {
    try {
      // Ensure year is a number
      const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
      
      // Validate year
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > new Date().getFullYear()) {
        setError(`Invalid year: ${year}. Please enter a year between 2000 and ${new Date().getFullYear()}`);
        return;
      }
      
      const yearValue = yearNum.toString();
      setSelectedYear(yearValue);
      // Save selected year and view type to localStorage
      localStorage.setItem('vehicleTrendSelectedYear', yearValue);
      localStorage.setItem('vehicleTrendViewType', 'month');
      setViewType('month'); // Ensure viewType is set to month
      setError(null); // Clear any previous errors
      setShowMonthModal(false);
      fetchMonthlyData(yearNum, selectedMunicipality);
    } catch (err) {
      setError('An error occurred while selecting the year. Please try again.');
    }
  };

  // Handle municipality selection
  const handleMunicipalitySelect = (municipality) => {
    setSelectedMunicipality(municipality);
    // Save municipality to localStorage
    localStorage.setItem('vehicleTrendMunicipality', municipality);
    setShowMunicipalityModal(false);
    
    // Refresh data with new municipality filter - pass municipality directly
    if (viewType === 'year') {
      if (isCustomRange && customStartYear && customEndYear) {
        fetchYearlyData(parseInt(customStartYear), parseInt(customEndYear), municipality);
      } else {
        fetchYearlyData(currentYear - 4, currentYear, municipality);
      }
    } else if (viewType === 'month' && selectedYear) {
      fetchMonthlyData(selectedYear, municipality);
    }
  };

  // Load initial data - respect saved preferences
  useEffect(() => {
    const savedMunicipality = localStorage.getItem('vehicleTrendMunicipality') || 'All';
    const savedViewType = localStorage.getItem('vehicleTrendViewType') || 'year';
    const savedYear = localStorage.getItem('vehicleTrendSelectedYear');
    const savedIsCustomRange = localStorage.getItem('vehicleTrendIsCustomRange') === 'true';
    const savedStartYear = localStorage.getItem('vehicleTrendCustomStartYear');
    const savedEndYear = localStorage.getItem('vehicleTrendCustomEndYear');
    
    // Load data based on saved preferences
    if (savedViewType === 'month' && savedYear) {
      // Load monthly data if month view was selected
      setViewType('month');
      setSelectedYear(savedYear);
      fetchMonthlyData(parseInt(savedYear), savedMunicipality);
    } else if (savedViewType === 'year') {
      // Load yearly data
      if (savedIsCustomRange && savedStartYear && savedEndYear) {
        setIsCustomRange(true);
        setCustomStartYear(savedStartYear);
        setCustomEndYear(savedEndYear);
        fetchYearlyData(parseInt(savedStartYear), parseInt(savedEndYear), savedMunicipality);
      } else {
        fetchYearlyData(currentYear - 4, currentYear, savedMunicipality);
      }
    } else {
      // Default to yearly view
      fetchYearlyData(currentYear - 4, currentYear, savedMunicipality);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterModal && !event.target.closest('.filter-dropdown')) {
        setShowFilterModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterModal]);

  // Ensure state consistency - if viewType is month but no selectedYear, reset to year
  useEffect(() => {
    if (viewType === 'month' && !selectedYear) {
      // Only reset if we're not in the process of selecting a year (modal is closed)
      if (!showMonthModal) {
        setViewType('year');
        localStorage.setItem('vehicleTrendViewType', 'year');
        setIsCustomRange(false);
        setCustomStartYear('');
        setCustomEndYear('');
        fetchYearlyData(currentYear - 4, currentYear, selectedMunicipality);
      }
    }
  }, [viewType, selectedYear, showMonthModal]);

  // Scroll to selected municipality when modal opens
  useEffect(() => {
    if (showMunicipalityModal && municipalityListRef.current) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        const selectedIndex = municipalities.findIndex(m => m === selectedMunicipality);
        if (selectedIndex !== -1 && municipalityListRef.current) {
          const container = municipalityListRef.current;
          const buttons = container.querySelectorAll('button');
          if (buttons[selectedIndex]) {
            buttons[selectedIndex].scrollIntoView({ 
              behavior: 'auto', 
              block: 'start',
              inline: 'nearest'
            });
          }
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [showMunicipalityModal, selectedMunicipality, municipalities]);

  // Calculate KPIs based on view type
  const calculateKPIs = () => {
    try {
      if (!trendData || !Array.isArray(trendData) || trendData.length === 0) {
        return viewType === 'month' 
          ? {
              monthlyGrowthRate: null,
              peakMonth: 'N/A',
              peakMonthValue: 0,
              monthlyAverage: 0
            }
          : {
              yearlyGrowth: 0,
              peakYear: 'N/A',
              peakYearValue: 0,
              trendDirection: '→'
            };
      }

      if (viewType === 'month') {
        // Monthly KPIs
        const values = trendData.map(item => (item && typeof item === 'object' ? (item.active || 0) : 0));
      const validValues = values.filter(v => v > 0);
      
      if (validValues.length === 0) {
        return {
          monthlyGrowthRate: null,
          peakMonth: 'N/A',
          peakMonthValue: 0,
          monthlyAverage: 0
        };
      }

      // Calculate CMGR (Compound Monthly Growth Rate) for the KPI
      // Formula: CMGR = [(Ending Value / Beginning Value) ^ (1 / Number of Months)] - 1
      // Where: Ending Value = latest month's value, Beginning Value = first month's value, Number of Months = months between them
      const beginningValue = values[0] || 0; // First month's value
      const endingValue = values[values.length - 1] || 0; // Last month's value
      const numberOfMonths = values.length - 1; // Number of months between first and last
      
      let monthlyGrowthRate = null;
      if (numberOfMonths === 0) {
        // Only one month of data, cannot calculate CMGR
        monthlyGrowthRate = null;
      } else if (beginningValue > 0 && endingValue > 0) {
        // CMGR = [(Ending Value / Beginning Value) ^ (1 / Number of Months)] - 1
        const ratio = endingValue / beginningValue; // Ending Value / Beginning Value
        const cmgr = ((Math.pow(ratio, 1 / numberOfMonths) - 1) * 100); // [(EV/BV)^(1/n) - 1] × 100
        monthlyGrowthRate = cmgr;
      } else if (beginningValue === 0 && endingValue > 0) {
        // If starting from 0, growth is infinite/undefined
        monthlyGrowthRate = null; // Show as N/A
      } else if (beginningValue > 0 && endingValue === 0) {
        // If ending at 0, growth is -100%
        monthlyGrowthRate = -100;
      }

      // Find peak month
      let peakIndex = 0;
      let peakValue = values[0];
      values.forEach((val, idx) => {
        if (val > peakValue) {
          peakValue = val;
          peakIndex = idx;
        }
      });
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const peakMonth = trendData[peakIndex]?.month || monthNames[peakIndex] || 'N/A';

      // Calculate average
      const monthlyAverage = Math.round(validValues.reduce((sum, val) => sum + val, 0) / validValues.length);

      return {
        monthlyGrowthRate: monthlyGrowthRate !== null ? parseFloat(monthlyGrowthRate.toFixed(1)) : null,
        peakMonth,
        peakMonthValue: peakValue,
        monthlyAverage
      };
    } else {
      // Yearly KPIs
      const values = trendData.map(item => (item && typeof item === 'object' ? (item.active || 0) : 0));
      const validValues = values.filter(v => v > 0);
      
      if (validValues.length === 0) {
        return {
          yearlyGrowth: 0,
          peakYear: 'N/A',
          peakYearValue: 0,
          trendDirection: '→'
        };
      }

      // Calculate yearly growth using CAGR (Compound Annual Growth Rate)
      // Formula: CAGR = ((EV / BV)^(1/n) - 1) × 100
      // Where: EV = End Value (latest year), BV = Beginning Value (oldest year), n = number of periods (years)
      const beginningValue = values[0] || 0; // BV
      const endValue = values[values.length - 1] || 0; // EV
      const n = values.length - 1; // Number of periods (years between start and end)
      
      let yearlyGrowth = 0;
      if (n === 0) {
        // Only one year of data, cannot calculate CAGR
        yearlyGrowth = 0;
      } else if (beginningValue > 0 && endValue > 0) {
        // CAGR = ((EV / BV)^(1/n) - 1) × 100
        const ratio = endValue / beginningValue; // EV / BV
        const cagr = ((Math.pow(ratio, 1 / n) - 1) * 100); // ((EV/BV)^(1/n) - 1) × 100
        yearlyGrowth = cagr;
      } else if (beginningValue === 0 && endValue > 0) {
        // If starting from 0, growth is infinite/undefined
        // Could show as N/A, but for now set to 0
        yearlyGrowth = 0;
      } else if (beginningValue > 0 && endValue === 0) {
        // If ending at 0, growth is -100%
        yearlyGrowth = -100;
      }

      // Find peak year
      let peakIndex = 0;
      let peakValue = values[0];
      values.forEach((val, idx) => {
        if (val > peakValue) {
          peakValue = val;
          peakIndex = idx;
        }
      });
      const peakYear = trendData[peakIndex]?.year || 'N/A';

      // Determine trend direction
      let trendDirection = '→';
      if (yearlyGrowth > 2) trendDirection = '↑';
      else if (yearlyGrowth < -2) trendDirection = '↓';

      return {
        yearlyGrowth: parseFloat(yearlyGrowth.toFixed(1)),
        peakYear: peakYear.toString(),
        peakYearValue: peakValue,
        trendDirection
      };
    }
    } catch (err) {
      return viewType === 'month' 
        ? {
            monthlyGrowthRate: null,
            peakMonth: 'N/A',
            peakMonthValue: 0,
            monthlyAverage: 0
          }
        : {
            yearlyGrowth: 0,
            peakYear: 'N/A',
            peakYearValue: 0,
            trendDirection: '→'
          };
    }
  };

  const kpis = calculateKPIs();


  // Custom tooltip component with growth rate
  const CustomTooltip = ({ active, payload, label }) => {
    try {
      if (active && payload && payload.length && payload[0]) {
        const value = payload[0]?.value || 0;
        // Use payload's data directly for more reliable matching
        const dataPoint = payload[0]?.payload;
        const growthRate = dataPoint?.growthRate;
        
        // Fallback: if payload doesn't have the data, try to find it in trendData
        let finalGrowthRate = growthRate;
        if (finalGrowthRate === undefined && Array.isArray(trendData) && trendData.length > 0) {
          const foundPoint = trendData.find(item => {
            if (viewType === 'month') {
              return item && String(item.month) === String(label);
            } else {
              return item && String(item.year) === String(label);
            }
          });
          finalGrowthRate = foundPoint?.growthRate;
        }
        
        return (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-lg">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {label || 'N/A'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Active: <span className="ml-1 font-medium">
                    {typeof value === 'number' ? value.toLocaleString() : String(value)}
                  </span>
                </span>
              </div>
              {(viewType === 'month' || viewType === 'year') && finalGrowthRate !== undefined && (
                <div className="flex items-center gap-2 pt-1 border-t border-gray-200 dark:border-gray-600">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Growth Rate: 
                    {finalGrowthRate !== null && typeof finalGrowthRate === 'number' ? (
                      <span className={`ml-1 font-medium ${
                        finalGrowthRate >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {finalGrowthRate >= 0 ? '+' : ''}{finalGrowthRate.toFixed(1)}% 
                        <span className="ml-1 text-xs">
                          ({finalGrowthRate >= 0 ? 'Increase' : 'Decrease'})
                        </span>
                      </span>
                    ) : (
                      <span className="ml-1 font-medium text-gray-500 dark:text-gray-400">
                        N/A
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      }
    } catch (err) {
      return null;
    }
    return null;
  };

  return (
    <div className="mt-8 border-2 border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl bg-white dark:bg-black backdrop-blur-sm">
      {/* Header - Matching Violation Monitoring exactly */}
      <div className="px-4 py-3 border-b-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-md shadow-green-500/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Vehicle Registration Trends</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Historical registration patterns showing active vehicle registrations over time.
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Main Content - Matching Violation Monitoring layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 h-full">
        {/* Left: Charts area */}
        <div className="xl:col-span-4 p-3 sm:p-4">
          <div className="space-y-3">
            {/* Charts Area - Matching Violation Monitoring styling */}
            <div className="relative rounded-xl p-3 sm:p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-2 border-green-100/60 dark:border-green-900/40 shadow-xl overflow-hidden">
              <div className="mb-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                      {viewType === 'year' ? 'Yearly Trend' : 'Monthly Trend'}
                    </h4>
                    <div className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm">
                      {viewType === 'year' 
                        ? (isCustomRange ? `By Year (${customStartYear}-${customEndYear})` : 'By Year (Last 5 Years)')
                        : `By Month (${selectedYear || 'Select Year'})`
                      }
                      {selectedMunicipality !== 'All' && (
                        <span className="ml-1">• {selectedMunicipality}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        onClick={handleFilterClick}
                        className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-md transition-colors"
                        title="Filter options"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                      </button>
                      
                      {/* Filter Dropdown */}
                      {showFilterModal && (
                        <div className="filter-dropdown absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                          <div className="p-2">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">View Type</div>
                            
                            <button
                              onClick={() => handleViewTypeChange('year')}
                              className={`w-full text-left px-2 py-2 text-sm rounded-md transition-colors ${
                                viewType === 'year' 
                                  ? 'bg-green-500 text-white' 
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              By Year
                            </button>
                            
                            <button
                              onClick={() => handleViewTypeChange('month')}
                              className={`w-full text-left px-2 py-2 text-sm rounded-md transition-colors ${
                                viewType === 'month' || showMonthModal
                                  ? 'bg-green-500 text-white' 
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              By Month
                            </button>
                            
                            <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                            
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">Date Range</div>
                            
                            <button
                              onClick={() => {
                                setShowFilterModal(false);
                                setShowCustomRangeModal(true);
                              }}
                              className="w-full text-left px-2 py-2 text-sm rounded-md transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Custom Range
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => setShowMunicipalityModal(true)}
                      className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-md transition-colors"
                      title="Location options"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="h-56 sm:h-72 lg:h-80">
                {loading ? (
                  <div className="flex items-center justify-center w-full h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center w-full h-full text-red-500">
                    <p>{error}</p>
                  </div>
                ) : (viewType === 'month' && !selectedYear) ? (
                  <div className="flex items-center justify-center w-full h-full text-gray-500 dark:text-gray-400">
                    <p>Please select a year to view monthly trends</p>
                  </div>
                ) : trendData.length === 0 ? (
                  <div className="flex items-center justify-center w-full h-full text-gray-500 dark:text-gray-400">
                    <p>No data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorActiveVehicles" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="25%" stopColor="#34d399" stopOpacity={0.25} />
                          <stop offset="60%" stopColor="#6ee7b7" stopOpacity={0.12} />
                          <stop offset="100%" stopColor="#a7f3d0" stopOpacity={0.04} />
                        </linearGradient>
                        <filter id="shadowActiveVehicles" x="-20%" y="-20%" width="140%" height="180%">
                          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                          <feOffset in="blur" dx="0" dy="6" result="offsetBlur" />
                          <feFlood floodColor="#10b981" floodOpacity="0.15" result="color" />
                          <feComposite in="color" in2="offsetBlur" operator="in" result="shadow" />
                          <feMerge>
                            <feMergeNode in="shadow" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="#9CA3AF" strokeOpacity={0.25} vertical={false} />
                      <XAxis 
                        dataKey={viewType === 'year' ? 'year' : 'month'} 
                        stroke="#1F2937" 
                        fontSize={12} 
                        fontWeight="600" 
                        tick={{ fill: '#1F2937', fontSize: 12 }} 
                      />
                      <YAxis 
                        stroke="#1F2937" 
                        fontSize={12} 
                        fontWeight="600" 
                        tick={{ fill: '#1F2937', fontSize: 12 }} 
                        tickFormatter={(value) => value.toLocaleString()} 
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F28E2B', strokeWidth: 1, strokeDasharray: '3 3' }} />
                      <Legend wrapperStyle={{ fontSize: '13px', fontWeight: '600', color: '#10b981', paddingTop: '10px' }} />
                      <Area
                        type="monotone"
                        dataKey="active"
                        stroke="none"
                        fill="url(#colorActiveVehicles)"
                        fillOpacity={1}
                        connectNulls
                        isAnimationActive
                        animationDuration={900}
                        filter="url(#shadowActiveVehicles)"
                      />
                      <Line
                        type="monotone"
                        dataKey="active"
                        stroke="#10b981"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        dot={{ r: 5, fill: '#ffffff', stroke: '#10b981', strokeWidth: 2, filter: 'drop-shadow(0 1px 2px rgba(16, 185, 129, 0.35))' }}
                        activeDot={{ r: 8, fill: '#ffffff', stroke: '#10b981', strokeWidth: 3, filter: 'drop-shadow(0 3px 6px rgba(16, 185, 129, 0.35))' }}
                        isAnimationActive
                        animationDuration={900}
                        name="Active Vehicles"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: KPI Cards */}
        <div className="xl:col-span-1 p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
            {viewType === 'month' ? (
              <>
                {/* Monthly Growth Rate */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-white to-green-50/30 dark:from-gray-800 dark:to-green-950/30 shadow-md border-2 border-green-100/60 dark:border-green-900/40 flex flex-col items-start hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-sm shadow-green-500/30 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Average Monthly Growth Rate</span>
                  </div>
                  <div className={`text-xl sm:text-2xl font-bold mb-0.5 ${
                    kpis.monthlyGrowthRate === null || kpis.monthlyGrowthRate === undefined
                      ? 'text-gray-500 dark:text-gray-400'
                      : kpis.monthlyGrowthRate >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                  }`}>
                    {kpis.monthlyGrowthRate === null || kpis.monthlyGrowthRate === undefined
                      ? 'N/A'
                      : `${kpis.monthlyGrowthRate >= 0 ? '+' : ''}${kpis.monthlyGrowthRate.toFixed(1)}%`
                    }
                  </div>
                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    {selectedYear || 'Current year'}
                  </div>
                </div>

                {/* Peak Month */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-white to-orange-50/30 dark:from-gray-800 dark:to-orange-950/30 shadow-md border-2 border-orange-100/60 dark:border-orange-900/40 flex flex-col items-start hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm shadow-orange-500/30 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Peak Month</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-0.5 truncate w-full">
                    {kpis.peakMonth}
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 mb-0.5">
                    {kpis.peakMonthValue.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    Highest registration month
                  </div>
                </div>

                {/* Monthly Average */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-950/30 shadow-md border-2 border-blue-100/60 dark:border-blue-900/40 flex flex-col items-start hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm shadow-blue-500/30 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Monthly Average</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
                    {kpis.monthlyAverage.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    Per month average
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Yearly Growth */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-white to-green-50/30 dark:from-gray-800 dark:to-green-950/30 shadow-md border-2 border-green-100/60 dark:border-green-900/40 flex flex-col items-start hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-sm shadow-green-500/30 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Average Yearly Growth Rate</span>
                  </div>
                  <div className={`text-xl sm:text-2xl font-bold mb-0.5 ${kpis.yearlyGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {kpis.yearlyGrowth >= 0 ? '+' : ''}{kpis.yearlyGrowth.toFixed(1)}%
                  </div>
                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    {isCustomRange ? `${customStartYear}-${customEndYear}` : 'Last 5 years'}
                  </div>
                </div>

                {/* All-Time Peak Year */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-white to-orange-50/30 dark:from-gray-800 dark:to-orange-950/30 shadow-md border-2 border-orange-100/60 dark:border-orange-900/40 flex flex-col items-start hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm shadow-orange-500/30 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">All-Time Peak Year</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-0.5 truncate w-full">
                    {kpis.peakYear}
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 mb-0.5">
                    {kpis.peakYearValue.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    Highest registration year
                  </div>
                </div>

                {/* Trend Direction */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-950/30 shadow-md border-2 border-blue-100/60 dark:border-blue-900/40 flex flex-col items-start hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm shadow-blue-500/30 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Trend Direction</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
                    <span className={`${kpis.trendDirection === '↑' ? 'text-green-600 dark:text-green-400' : kpis.trendDirection === '↓' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {kpis.trendDirection}
                    </span>
                    {kpis.trendDirection === '↑' ? ' Consistent Growth' : kpis.trendDirection === '↓' ? ' Declining' : ' Stable'}
                  </div>
                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    Overall trend pattern
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

       {/* Custom Range Modal - Show when custom range modal is open */}
       {showCustomRangeModal && createPortal(
         <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
           <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
             <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 flex items-center justify-center">
                   <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                     <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                   </svg>
                 </div>
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                   Filter Date Range
                 </h3>
               </div>
               <button
                 onClick={() => setShowCustomRangeModal(false)}
                 className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>

             <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Year</label>
                   <input
                     type="number"
                     value={customStartYear}
                     onChange={(e) => setCustomStartYear(e.target.value)}
                     placeholder="e.g., 2020"
                     min="2000"
                     max={currentYear}
                     className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Year</label>
                   <input
                     type="number"
                     value={customEndYear}
                     onChange={(e) => setCustomEndYear(e.target.value)}
                     placeholder="e.g., 2025"
                     min="2000"
                     max={currentYear}
                     className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                   />
                 </div>
               </div>

               {error && (
                 <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
                   <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
                 </div>
               )}

               <div className="flex items-center gap-3 pt-4">
                 <button
                   onClick={handleApplyFilter}
                   className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
                 >
                   Apply Filter
                 </button>
                 <button
                   onClick={handleResetFilter}
                   className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                 >
                   Reset
                 </button>
               </div>

               <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                 Default range: Last 5 years (2021 - 2025)
               </div>
             </div>
           </div>
         </div>,
         document.body
       )}

       {/* Month Selection Modal */}
       {showMonthModal && createPortal(
         <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
           <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
             <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 flex items-center justify-center">
                   <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                     <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                 </div>
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white">Select Year for Monthly View</h3>
               </div>
               <button
                 onClick={() => setShowMonthModal(false)}
                 className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>

             <div className="space-y-4">
               <p className="text-sm text-gray-600 dark:text-gray-400">
                 Enter a year to view monthly vehicle registration trends:
               </p>
               
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Year</label>
                 <input
                   type="number"
                   value={selectedYear}
                   onChange={(e) => setSelectedYear(e.target.value)}
                   placeholder="e.g., 2025"
                   min="2000"
                   max={currentYear}
                   className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                   onKeyPress={(e) => {
                     if (e.key === 'Enter') {
                       const year = parseInt(selectedYear);
                       if (year >= 2000 && year <= currentYear) {
                         handleMonthYearSelect(year);
                       }
                     }
                   }}
                 />
               </div>

               {error && (
                 <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
                   <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
                 </div>
               )}

               <div className="flex items-center gap-3 pt-4">
                 <button
                   onClick={() => {
                     const year = parseInt(selectedYear);
                     if (year >= 2000 && year <= currentYear) {
                       handleMonthYearSelect(year);
                     } else {
                       setError(`Please enter a valid year between 2000 and ${currentYear}`);
                     }
                   }}
                   className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
                 >
                   Apply
                 </button>
                 <button
                   onClick={() => setShowMonthModal(false)}
                   className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                 >
                   Cancel
                 </button>
               </div>

               <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                 Available years: 2000 - {currentYear}
               </div>
             </div>
           </div>
         </div>,
         document.body
       )}

       {/* Municipality Selection Modal */}
       {showMunicipalityModal && createPortal(
         <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
           <div className="bg-gradient-to-br from-white via-gray-50 to-white border border-gray-200/50 rounded-2xl p-8 w-full max-w-[600px] shadow-2xl dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:border-gray-700/50 animate-in zoom-in-95 duration-300">
             {/* Header */}
             <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                   <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                     <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                     <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                   </svg>
                 </div>
                 <div>
                   <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Select Municipality</h3>
                   <p className="text-sm text-gray-500 dark:text-gray-400">Filter data by location</p>
                 </div>
               </div>
               <button
                 onClick={() => setShowMunicipalityModal(false)}
                 className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 group"
               >
                 <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>

             {/* Content */}
             <div className="space-y-6">
               <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50">
                 <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                   💡 Choose a municipality to view its specific vehicle registration trends
                 </p>
               </div>
               
               {/* Municipality Grid - Scrollable with visible scrollbar */}
               <div 
                 ref={municipalityListRef}
                 className="municipality-scroll grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2"
                 style={{
                   scrollbarWidth: 'thin',
                   scrollbarColor: '#cbd5e1 #f1f5f9'
                 }}
               >
                 {municipalities.map((municipality, index) => (
                   <button
                     key={municipality}
                     onClick={() => handleMunicipalitySelect(municipality)}
                     className={`group relative p-4 text-left rounded-xl transition-all duration-300 border-2 ${
                       selectedMunicipality === municipality
                         ? 'bg-gradient-to-r from-primary to-primary/80 text-white border-primary shadow-lg shadow-primary/25 transform scale-[1.02]'
                         : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 hover:shadow-md hover:transform hover:scale-[1.01]'
                     }`}
                     style={{ animationDelay: `${index * 50}ms` }}
                   >
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className={`w-2 h-2 rounded-full transition-colors ${
                           selectedMunicipality === municipality 
                             ? 'bg-white' 
                             : 'bg-primary/60 group-hover:bg-primary'
                         }`} />
                         <span className="font-medium">{municipality}</span>
                       </div>
                       {selectedMunicipality === municipality && (
                         <div className="flex items-center gap-2">
                           <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                           </svg>
                         </div>
                       )}
                     </div>
                     {municipality === 'All' && (
                       <p className="text-xs opacity-75 mt-1">View all municipalities combined</p>
                     )}
                   </button>
                 ))}
               </div>

               {/* Current Selection */}
               <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                 <div className="flex items-center gap-3">
                   <div className="w-2 h-2 bg-primary rounded-full" />
                   <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Currently selected:</span>
                   <span className="text-sm font-semibold text-primary">{selectedMunicipality}</span>
                 </div>
               </div>
             </div>
           </div>
         </div>,
         document.body
       )}
     </div>
   );
 };
 
 export default VehicleTrendChart;
