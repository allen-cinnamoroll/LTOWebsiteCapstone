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
      const percentage = sortedMunicipalities.length > 0 
        ? ((value / Math.max(...sortedMunicipalities.map(m => m.vehicles))) * 100).toFixed(1)
        : 0;
      
      return (
        <div className="bg-gray-100/90 dark:bg-gray-700/90 border border-gray-400/40 dark:border-gray-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{label}</p>
              <p className="text-blue-600 dark:text-blue-400 text-xs">
                <span className="font-semibold text-lg">{value.toLocaleString()}</span> vehicles
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                {percentage}% of highest
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

  return (
    <>
      {/* Municipality Chart Container */}
       <div className="bg-gray-100 border border-gray-200 rounded-xl p-3 w-full max-w-4xl mx-auto h-fit shadow-sm dark:!bg-black dark:!border-[#2A2A3E] dark:!shadow-none dark:!from-transparent dark:!to-transparent min-h-[400px] flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-foreground">
                DavOr Vehicle Registration Rankings
                {selectedYear === 'All' && selectedMonth && selectedMonth !== 'All' && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({selectedMonth} across all years)
                  </span>
                )}
                {selectedMonth === 'All' && selectedYear && selectedYear !== 'All' && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (All months in {selectedYear})
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                Top performing municipalities by vehicle registration volume
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors flex items-center gap-1"
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
            <button
              onClick={() => setShowAllModal(true)}
              className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
            >
              View All
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
          ) : top5Municipalities.length === 0 ? (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground">
              <p>No data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minHeight={320}>
              <BarChart
                data={formatChartData(top5Municipalities)}
                margin={{ top: 10, right: 10, left: 5, bottom: 20 }}
                barCategoryGap="10%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#6b7280" opacity={0.4} />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  fontSize={9}
                  height={20}
                  interval={0}
                  tick={{ fill: '#6b7280', fontWeight: 500 }}
                  tickFormatter={(value) => {
                    // Truncate long municipality names to prevent overlap
                    if (value.length > 12) {
                      return value.substring(0, 12) + '...';
                    }
                    return value;
                  }}
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
                  radius={[8, 8, 0, 0]}
                  onClick={(data) => handleMunicipalityClick(data.name)}
                  style={{ cursor: 'pointer' }}
                  maxBarSize={120}
                >
                  {formatChartData(top5Municipalities).map((entry, index) => {
                    const originalColor = getBarColor(entry.index, entry.totalCount);
                    
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={originalColor}
                        stroke={originalColor}
                        strokeWidth={2}
                        style={{ 
                          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          
          {/* Chart Legend */}
          {top5Municipalities.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 text-gray-600 dark:text-gray-400" style={{ 
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

      {/* View All Modal */}
      {showAllModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 w-full max-w-5xl max-h-[85vh] overflow-hidden shadow-2xl dark:!bg-black dark:!border-[#2A2A3E] dark:!shadow-none dark:!from-transparent dark:!to-transparent">
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
