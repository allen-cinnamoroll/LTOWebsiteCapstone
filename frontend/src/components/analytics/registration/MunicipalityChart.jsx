import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { getMunicipalityRegistrationTotals } from '../../../api/registrationAnalytics.js';
import { getMonthNumber } from '../../../api/registrationAnalytics.js';
import BarangayModal from './BarangayModal.jsx';

const MunicipalityChart = ({ selectedMonth, selectedYear, loading: parentLoading }) => {
  const [municipalityData, setMunicipalityData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAllModal, setShowAllModal] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' for lowest to highest, 'desc' for highest to lowest
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showBarangayModal, setShowBarangayModal] = useState(false);
  const [selectedMunicipality, setSelectedMunicipality] = useState(null);
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

  // Fetch municipality data
  const fetchMunicipalityData = async () => {
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
      
      // API call scenarios:
      // 1. monthNumber=2, yearValue=null -> February across all years
      // 2. monthNumber=null, yearValue=2024 -> All months in 2024
      // 3. monthNumber=2, yearValue=2024 -> February 2024 only
      // 4. monthNumber=null, yearValue=null -> All data
      
      
      const response = await getMunicipalityRegistrationTotals(monthNumber, yearValue);
      
      if (response.success) {
        setMunicipalityData(response.data);
      } else {
        setError('Failed to fetch municipality data');
        setMunicipalityData([]);
      }
    } catch (err) {
      console.error('Error fetching municipality data:', err);
      setError('Error loading municipality data');
    } finally {
      setLoading(false);
    }
  };

  // Load initial data when component mounts
  useEffect(() => {
    fetchMunicipalityData();
    setAnimationComplete(false);
  }, []);

  // Fetch data when month or year changes
  useEffect(() => {
    fetchMunicipalityData();
    setAnimationComplete(false);
  }, [selectedMonth, selectedYear]);

  // Sort municipalities by vehicle count based on sortOrder
  const sortedMunicipalities = [...municipalityData].sort((a, b) => 
    sortOrder === 'asc' ? a.vehicles - b.vehicles : b.vehicles - a.vehicles
  );
  const top5Municipalities = sortedMunicipalities.slice(0, 5);
  

  // Trigger animation after data loads
  useEffect(() => {
    if (municipalityData.length > 0) {
      const timer = setTimeout(() => setAnimationComplete(true), 100);
      return () => clearTimeout(timer);
    }
  }, [municipalityData]);

  // Format data for Recharts
  const formatChartData = (municipalities) => {
    return municipalities.map((municipality, index) => ({
      name: municipality.municipality,
      vehicles: municipality.vehicles,
      index: index,
      totalCount: municipalities.length
    }));
  };


  // Get bar color based on registration level and sort order
  const getBarColor = (index, totalCount) => {
    if (sortOrder === 'asc') {
      // Ascending: lowest to highest (red → blue)
      if (index < 5) {
        if (index === 0) return "#dc2626"; // red-600
        if (index === 1) return "#ea580c"; // orange-600
        if (index === 2) return "#d97706"; // amber-600
        if (index === 3) return "#ca8a04"; // yellow-600
        return "#eab308"; // yellow-500
      }
      if (index >= 5 && index < totalCount - 5) {
        return "#84cc16"; // lime-500
      }
      if (index >= totalCount - 5) {
        if (index === totalCount - 1) return "#1d4ed8"; // blue-700
        if (index === totalCount - 2) return "#2563eb"; // blue-600
        if (index === totalCount - 3) return "#3b82f6"; // blue-500
        if (index === totalCount - 4) return "#60a5fa"; // blue-400
        return "#93c5fd"; // blue-300
      }
    } else {
      // Descending: highest to lowest (blue → red)
      if (index < 5) {
        if (index === 0) return "#1d4ed8"; // blue-700
        if (index === 1) return "#2563eb"; // blue-600
        if (index === 2) return "#3b82f6"; // blue-500
        if (index === 3) return "#60a5fa"; // blue-400
        return "#93c5fd"; // blue-300
      }
      if (index >= 5 && index < totalCount - 5) {
        return "#84cc16"; // lime-500
      }
      if (index >= totalCount - 5) {
        if (index === totalCount - 1) return "#dc2626"; // red-600
        if (index === totalCount - 2) return "#ea580c"; // orange-600
        if (index === totalCount - 3) return "#d97706"; // amber-600
        if (index === totalCount - 4) return "#ca8a04"; // yellow-600
        return "#eab308"; // yellow-500
      }
    }
    return "#3b82f6"; // blue-500 default
  };

  // Enhanced custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      
      return (
        <div className="bg-gray-100/90 dark:bg-gray-700/90 border border-gray-400/40 dark:border-gray-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{label}</p>
                <p className="text-blue-600 dark:text-blue-400 text-xs">
                  <span className="font-semibold text-lg">{value.toLocaleString()}</span> vehicles
                </p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                Click to view barangay ranking
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  // Handle municipality bar click
  const handleMunicipalityClick = (municipality) => {
    setSelectedMunicipality(municipality);
    setShowBarangayModal(true);
  };

  // Close barangay modal
  const handleCloseBarangayModal = () => {
    setShowBarangayModal(false);
    setSelectedMunicipality(null);
  };

  // Convert string to title case
  const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  };

  // Abbreviate municipality names
  const abbreviateMunicipalityName = (name) => {
    const abbreviations = {
      'CITY OF MATI': 'Mati City',
      'GOVERNOR GENEROSO': 'GovGen',
      'BANAYBANAY': 'Banay...',
      // Add more abbreviations as needed
    };

    // Check if there's a specific abbreviation
    if (abbreviations[name.toUpperCase()]) {
      return abbreviations[name.toUpperCase()];
    }

    // General abbreviation logic for long names
    if (name.length > 12) {
      // If it contains "CITY OF", replace with "City"
      if (name.toUpperCase().includes('CITY OF')) {
        const cityName = name.replace(/CITY OF\s*/i, '').trim();
        return `${toTitleCase(cityName)} City`;
      }
      
      // If it's two words, take first 4 chars of each
      const words = name.split(' ');
      if (words.length === 2) {
        const abbrev = words[0].substring(0, 4) + words[1].substring(0, 4);
        return toTitleCase(abbrev);
      }
      
      // Otherwise, take first 8 characters and add ellipsis
      return toTitleCase(name.substring(0, 8)) + '...';
    }

    return toTitleCase(name);
  };

  // Calculate KPIs
  const calculateKPIs = () => {
    if (sortedMunicipalities.length === 0) {
      return {
        totalRegionalVehicles: 0,
        topMunicipality: null,
        topMunicipalityCount: 0,
        lowestPerforming: []
      };
    }

    // Total Regional Vehicles: Sum of all municipality vehicles
    const totalRegionalVehicles = sortedMunicipalities.reduce((sum, m) => sum + (m.vehicles || 0), 0);

    // Top Municipality: Highest performing (first in descending order, or last in ascending)
    const topMunicipalityData = sortOrder === 'desc' 
      ? sortedMunicipalities[0] 
      : sortedMunicipalities[sortedMunicipalities.length - 1];
    const topMunicipality = topMunicipalityData ? toTitleCase(topMunicipalityData.municipality) : null;
    const topMunicipalityCount = topMunicipalityData?.vehicles || 0;

    // Lowest Performing Municipalities: Top 3 municipalities with lowest performance
    // When sorted descending, the last 3 are lowest performing
    // When sorted ascending, the first 3 are lowest performing
    const lowestPerforming = sortOrder === 'desc'
      ? sortedMunicipalities.slice(-3).reverse().map(m => ({
          name: toTitleCase(m.municipality),
          count: m.vehicles
        }))
      : sortedMunicipalities.slice(0, 3).map(m => ({
          name: toTitleCase(m.municipality),
          count: m.vehicles
        }));

    return {
      totalRegionalVehicles,
      topMunicipality,
      topMunicipalityCount,
      lowestPerforming
    };
  };

  const kpis = calculateKPIs();

  return (
    <>
      {/* Municipality Chart Container */}
       <div className="border-2 border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl bg-white dark:bg-black backdrop-blur-sm">
        {/* Header */}
        <div className="px-4 py-3 border-b-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-md shadow-orange-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Top Municipalities by Vehicle Registration</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                  Top performing municipalities by vehicle registration volume
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm">
                    {(() => {
                      // Both month and year are selected (not "All")
                      if (selectedMonth && selectedMonth !== 'All' && selectedYear && selectedYear !== 'All') {
                        return `${selectedMonth} ${selectedYear}`;
                      }
                      // Only month is selected (year is "All" or not selected)
                      if (selectedMonth && selectedMonth !== 'All' && (!selectedYear || selectedYear === 'All')) {
                        return `${selectedMonth} across all years`;
                      }
                      // Only year is selected (month is "All" or not selected)
                      if (selectedYear && selectedYear !== 'All' && (!selectedMonth || selectedMonth === 'All')) {
                        return `All months in ${selectedYear}`;
                      }
                      // Default: All Time
                      return 'All Time';
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Responsive layout */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-1 h-full">
          {/* Left: Charts area */}
          <div className="xl:col-span-4 p-3 sm:p-4 pr-2">
            <div className="space-y-3">
              {/* Charts Area */}
              <div className="relative rounded-xl p-3 sm:p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-2 border-orange-100/60 dark:border-orange-900/40 shadow-xl overflow-hidden">
                <div className="mb-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                      Municipality Rankings
                    </h4>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-2.5 py-1.5 text-[11px] font-semibold bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white hover:border-orange-400 dark:hover:border-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md flex items-center gap-1"
                      title={`Sort ${sortOrder === 'asc' ? 'Highest to Lowest' : 'Lowest to Highest'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortOrder === 'asc' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                        )}
                      </svg>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>

                {/* Chart Container */}
                <div className="w-full min-h-[320px] h-[400px]">
                  {loading || parentLoading ? (
                    <div className="flex items-center justify-center w-full h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center w-full h-full text-red-500">
                      <p>{error}</p>
                    </div>
                  ) : sortedMunicipalities.length === 0 ? (
                    <div className="flex items-center justify-center w-full h-full text-gray-500 dark:text-gray-400">
                      <p>No data available</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                      <BarChart
                        data={formatChartData(sortedMunicipalities)}
                        margin={{ top: 10, right: 10, left: 5, bottom: 20 }}
                        barCategoryGap="5%"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.7} vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#6b7280"
                          fontSize={9}
                          height={20}
                          interval={0}
                          tick={{ fill: '#6b7280', fontWeight: 500 }}
                          tickFormatter={(value) => abbreviateMunicipalityName(value)}
                        />
                        <YAxis 
                          stroke="#6b7280"
                          fontSize={9}
                          tickFormatter={(value) => value.toLocaleString()}
                          tick={{ fill: '#6b7280', fontWeight: 500 }}
                          width={50}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar 
                          dataKey="vehicles" 
                          radius={[6, 6, 0, 0]}
                          onClick={(data) => handleMunicipalityClick(data.name)}
                          style={{ cursor: 'pointer' }}
                          maxBarSize={80}
                        >
                          {formatChartData(sortedMunicipalities).map((entry, index) => {
                            const originalColor = getBarColor(entry.index, entry.totalCount);
                            
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={originalColor}
                                stroke={originalColor}
                                strokeWidth={2}
                                style={{ 
                                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))',
                                  transition: 'all 0.3s ease',
                                  cursor: 'pointer'
                                }}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                
                {/* Chart Legend */}
                {sortedMunicipalities.length > 0 && !loading && !parentLoading && (
                  <div className="flex flex-wrap justify-center gap-4 text-gray-600 dark:text-gray-400 mt-3" style={{ 
                    fontSize: isMobile ? '10px' : '12px', 
                    fontWeight: '500',
                    paddingTop: '0px',
                    paddingBottom: '0px',
                    textAlign: 'center'
                  }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-700"></div>
                      <span>High</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>Medium-high</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>Medium</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span>Low</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>Lowest</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: KPI Cards */}
          <div className="xl:col-span-1 p-3 sm:p-4 pl-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 h-full">
              {/* Total Regional Vehicles */}
              {!loading && !parentLoading && sortedMunicipalities.length > 0 && (
                <>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-950/30 shadow-md border-2 border-blue-100/60 dark:border-blue-900/40 flex flex-col items-start hover:shadow-lg transition-shadow duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm shadow-blue-500/30 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Total Regional Vehicles</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
                      {kpis.totalRegionalVehicles.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                      Sum of all municipality registration volumes
                    </div>
                  </div>

                  {/* Top Municipality */}
                  <div className="p-3 rounded-xl bg-gradient-to-br from-white to-green-50/30 dark:from-gray-800 dark:to-green-950/30 shadow-md border-2 border-green-100/60 dark:border-green-900/40 flex flex-col items-start hover:shadow-lg transition-shadow duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-sm shadow-green-500/30 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Top Municipality</span>
                    </div>
                    <div className="w-full">
                      <div className="text-sm font-bold text-gray-900 dark:text-white mb-1 truncate" title={kpis.topMunicipality || 'N/A'}>
                        {kpis.topMunicipality || 'N/A'}
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 mb-0.5">
                        {kpis.topMunicipalityCount.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                      Highest-performing municipality
                    </div>
                  </div>

                  {/* Lowest Performance */}
                  <div className="p-3 rounded-xl bg-gradient-to-br from-white to-orange-50/30 dark:from-gray-800 dark:to-orange-950/30 shadow-md border-2 border-orange-100/60 dark:border-orange-900/40 flex flex-col items-start hover:shadow-lg transition-shadow duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm shadow-orange-500/30 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Lowest Performance</span>
                    </div>
                    <div className="space-y-1.5 w-full">
                      {kpis.lowestPerforming.length > 0 ? (
                        kpis.lowestPerforming.map((municipality, index) => (
                          <div key={index} className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate flex-1">
                              {index + 1}. {municipality.name}
                            </p>
                            <p className="text-xs font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                              {municipality.count.toLocaleString()}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No data available</p>
                      )}
                    </div>
                    <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-2">
                      Top 3 municipalities with lowest registration volume
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View All Modal */}
      {showAllModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 w-full max-w-5xl max-h-[85vh] overflow-hidden shadow-2xl dark:!bg-transparent dark:!border-[#2A2A3E] dark:!shadow-none dark:!from-transparent dark:!to-transparent">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M3 3v18h18"/>
                    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                    <path d="M16 5l3 3-3 3"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  All Municipalities
                  {selectedYear === 'All' && selectedMonth && selectedMonth !== 'All' && (
                    <span className="text-lg font-normal text-muted-foreground ml-2">
                      ({selectedMonth} across all years)
                    </span>
                  )}
                  {selectedMonth === 'All' && selectedYear && selectedYear !== 'All' && (
                    <span className="text-lg font-normal text-muted-foreground ml-2">
                      (All months in {selectedYear})
                    </span>
                  )}
                </h2>
              </div>
              <button
                onClick={() => setShowAllModal(false)}
                className="p-2 hover:bg-muted rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* All Municipalities Chart Container */}
            <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                <BarChart
                  data={formatChartData(sortedMunicipalities)}
                  margin={{ top: 20, right: 10, left: 10, bottom: 60 }}
                  barCategoryGap="5%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#6b7280" opacity={0.4} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    fontSize={9}
                    height={5}
                    interval={0}
                    tick={{ fill: '#6b7280', fontWeight: 500 }}
                    tickFormatter={(value) => {
                      if (value.length > 12) {
                        return value.substring(0, 12) + '...';
                      }
                      return value;
                    }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => value.toLocaleString()}
                    tick={{ fill: '#6b7280', fontWeight: 500 }}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="vehicles" 
                    radius={[6, 6, 0, 0]}
                    onClick={(data) => handleMunicipalityClick(data.name)}
                    style={{ cursor: 'pointer' }}
                    maxBarSize={80}
                  >
                    {formatChartData(sortedMunicipalities).map((entry, index) => {
                      const originalColor = getBarColor(entry.index, entry.totalCount);
                      
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={originalColor}
                          stroke={originalColor}
                          strokeWidth={1.5}
                          style={{
                            filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.12))',
                            transition: 'all 0.3s ease'
                          }}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Barangay Modal */}
      <BarangayModal
        isOpen={showBarangayModal}
        onClose={handleCloseBarangayModal}
        municipality={selectedMunicipality}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        municipalitiesList={sortedMunicipalities}
      />
    </>
  );
};

export default MunicipalityChart;
