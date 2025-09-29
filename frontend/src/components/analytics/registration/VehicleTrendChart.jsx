import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
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

  // Add custom scrollbar hide styles
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
  const [viewType, setViewType] = useState('year');
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState(() => {
    // Load saved municipality from localStorage, default to 'All'
    return localStorage.getItem('vehicleTrendMunicipality') || 'All';
  });
  const [showMunicipalityModal, setShowMunicipalityModal] = useState(false);

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
        // Process data to show continuous lines
        const processedData = response.data.map(item => {
          if (item.total === 0) {
            // No registration data - show gray "No Registration" line and keep other lines at 0 for continuity
            return {
              ...item,
              total: 0,
              active: 0,
              expired: 0,
              noRegistration: 0
            };
          } else {
            // Has registration data - show normal lines, hide gray line
            return {
              ...item,
              noRegistration: null
            };
          }
        });
        setTrendData(processedData);
      } else {
        setError('Failed to fetch yearly trend data');
        setTrendData([]);
      }
    } catch (err) {
      console.error('Error fetching yearly trend data:', err);
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
      
      if (response.success) {
        // Process monthly data to show continuous lines
        const processedData = response.data.map(item => {
          if (item.total === 0) {
            // No registration data - show gray "No Registration" line and keep other lines at 0 for continuity
            return {
              ...item,
              total: 0,
              active: 0,
              expired: 0,
              noRegistration: 0
            };
          } else {
            // Has registration data - show normal lines, hide gray line
            return {
              ...item,
              noRegistration: null
            };
          }
        });
        setTrendData(processedData);
      } else {
        setError('Failed to fetch monthly trend data');
        setTrendData([]);
      }
    } catch (err) {
      console.error('Error fetching monthly trend data:', err);
      setError('Error loading monthly trend data');
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
    setViewType(type);
    // Save view type to localStorage
    localStorage.setItem('vehicleTrendViewType', type);
    
    if (type === 'year') {
      // Reset to default yearly view
      setIsCustomRange(false);
      setCustomStartYear('');
      setCustomEndYear('');
      fetchYearlyData(currentYear - 4, currentYear, selectedMunicipality);
      setShowFilterModal(false);
    } else if (type === 'month') {
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
    setSelectedYear(year);
    // Save selected year to localStorage
    localStorage.setItem('vehicleTrendSelectedYear', year);
    setError(null); // Clear any previous errors
    setShowMonthModal(false);
    fetchMonthlyData(year, selectedMunicipality);
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

  // Load initial data - always start with default yearly view
  useEffect(() => {
    const savedMunicipality = localStorage.getItem('vehicleTrendMunicipality') || 'All';
    
    // Always load yearly data with default 5-year range on initial load
    fetchYearlyData(currentYear - 4, currentYear, savedMunicipality);
    
    // Reset any saved preferences to default yearly view
    localStorage.setItem('vehicleTrendViewType', 'year');
    localStorage.removeItem('vehicleTrendSelectedYear');
    localStorage.removeItem('vehicleTrendIsCustomRange');
    localStorage.removeItem('vehicleTrendCustomStartYear');
    localStorage.removeItem('vehicleTrendCustomEndYear');
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
      setViewType('year');
      setIsCustomRange(false);
      setCustomStartYear('');
      setCustomEndYear('');
      fetchYearlyData(currentYear - 4, currentYear, selectedMunicipality);
    }
  }, [viewType, selectedYear]);


  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-100/90 dark:bg-gray-700/90 border border-gray-400/40 dark:border-gray-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm"> {label}</p>
          </div>
          {payload.filter(entry => entry.value !== null).map((entry, index) => {
            // Check if this is a year with no registration data
            const hasNoRegistration = payload.some(p => p.dataKey === 'noRegistration' && p.value === 0);
            
            return (
              <div key={index} className="flex items-center gap-2 mb-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                ></div>
                <p className="text-sm">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {entry.dataKey === 'total' ? 'Total' : 
                     entry.dataKey === 'active' ? 'Active' : 
                     entry.dataKey === 'expired' ? 'Expired' : 'No Registration'}:
                  </span>
                  <span className="ml-2 text-blue-600 dark:text-blue-400 font-semibold">
                    {entry.dataKey === 'noRegistration' ? 'No Data' : 
                     hasNoRegistration && entry.value === 0 ? 'No Registration' : 
                     entry.value.toLocaleString()}
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

  return (
    <div className="bg-gray-100 border border-gray-200 rounded-xl p-3 w-full max-w-4xl mx-auto h-fit shadow-sm dark:!bg-black dark:!border-[#2A2A3E] dark:!shadow-none dark:!from-transparent dark:!to-transparent min-h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M3 3v18h18"/>
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
              <circle cx="18" cy="8" r="2"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-foreground">
              Vehicle Registration Trends
              <span className="text-muted-foreground font-normal ml-2" style={{ fontSize: '10px' }}>
                {viewType === 'year' 
                  ? (isCustomRange ? `By Year (${customStartYear}-${customEndYear})` : 'By Year (Last 5 Years)')
                  : `By Month (${selectedYear || 'Select Year'})`
                }
                {selectedMunicipality !== 'All' && (
                  <span className="text-primary font-medium">
                    • {selectedMunicipality}
                  </span>
                )}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Historical registration patterns showing total, active, and expired vehicles
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={handleFilterClick}
              className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"
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
                        ? 'bg-blue-500 text-white' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    By Year
                  </button>
                  
                  <button
                    onClick={() => handleViewTypeChange('month')}
                    className={`w-full text-left px-2 py-2 text-sm rounded-md transition-colors ${
                      viewType === 'month' 
                        ? 'bg-blue-500 text-white' 
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
            className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"
            title="Location options"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>


      {/* Chart Container */}
      <div className="h-80 w-full min-h-[320px] flex-1">
        {loading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center w-full h-full text-red-500">
            <p>{error}</p>
          </div>
        ) : trendData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full text-muted-foreground">
            <p>No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={320}>
            <LineChart
              data={trendData}
              margin={{ 
                top: 10, 
                right: 20, 
                left: 0, 
                bottom: 20
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#6b7280" opacity={0.4} />
              <XAxis 
                dataKey={viewType === 'year' ? 'year' : 'month'} 
                stroke="#6b7280"
                fontSize={isMobile ? 10 : 12}
                tick={{ fill: '#6b7280', fontWeight: 500 }}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? 'end' : 'middle'}
                height={isMobile ? 60 : 30}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={isMobile ? 10 : 12}
                tickFormatter={(value) => value.toLocaleString()}
                tick={{ fill: '#6b7280', fontWeight: 500 }}
                width={isMobile ? 60 : 80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                name="Total Vehicles"
              />
              <Line 
                type="monotone" 
                dataKey="active" 
                stroke="#10b981" 
                strokeWidth={4}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                name="Active Vehicles"
              />
              <Line 
                type="monotone" 
                dataKey="expired" 
                stroke="#ef4444" 
                strokeWidth={3}
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                name="Expired Vehicles"
              />
              <Line 
                type="monotone" 
                dataKey="noRegistration" 
                stroke="#9ca3af" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#9ca3af', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#9ca3af', strokeWidth: 2 }}
                name="No Registration"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
         )}
         
         {/* Chart Legend - Positioned at bottom with minimal spacing */}
         {trendData.length > 0 && (
           <div className="flex flex-wrap justify-center gap-4 text-gray-600 dark:text-gray-400" style={{ 
             fontSize: isMobile ? '10px' : '12px', 
             fontWeight: '500',
             paddingTop: '0px',
             textAlign: 'center'
           }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Total Vehicles</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Active Vehicles</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Expired Vehicles</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <span>No Registration</span>
            </div>
          </div>
         )}
       </div>

       {/* Custom Range Modal - Show when custom range modal is open */}
       {showCustomRangeModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
         </div>
       )}

       {/* Month Selection Modal */}
       {showMonthModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
         </div>
       )}

       {/* Municipality Selection Modal */}
       {showMunicipalityModal && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
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
               
               {/* Municipality Grid */}
               <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto scrollbar-hide">
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
         </div>
       )}
     </div>
   );
 };
 
 export default VehicleTrendChart;
