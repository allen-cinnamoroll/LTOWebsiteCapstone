import React, { useState, useEffect } from 'react';
import { getMunicipalityRegistrationTotals } from '../../../api/registrationAnalytics.js';
import { getMonthNumber } from '../../../api/registrationAnalytics.js';
import BarangayModal from './BarangayModal.jsx';

const MunicipalityChart = ({ selectedMonth, selectedYear, loading: parentLoading }) => {
  const [municipalityData, setMunicipalityData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAllModal, setShowAllModal] = useState(false);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' for lowest to highest, 'desc' for highest to lowest
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showBarangayModal, setShowBarangayModal] = useState(false);
  const [selectedMunicipality, setSelectedMunicipality] = useState(null);

  // Fetch municipality data
  const fetchMunicipalityData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Handle "All" selections
      let monthNumber = null;
      let yearValue = null;
      
      if (selectedMonth && selectedMonth !== 'All') {
        monthNumber = getMonthNumber(selectedMonth);
      }
      
      if (selectedYear && selectedYear !== 'All') {
        yearValue = selectedYear;
      }
      
      const response = await getMunicipalityRegistrationTotals(monthNumber, yearValue);
      setMunicipalityData(response);
    } catch (err) {
      console.error('Error fetching municipality data:', err);
      setError('Error loading municipality data');
    } finally {
      setLoading(false);
    }
  };

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
  const maxValue = Math.max(...municipalityData.map(item => item.vehicles), 0);

  // Calculate bar width percentage with balanced scaling for optimal visibility
  const getBarWidth = (vehicles) => {
    if (maxValue === 0) return 0;
    
    // Use a hybrid approach: linear for low values, compressed for high values
    if (vehicles <= 50) {
      // Linear scaling for values 0-50 to preserve exact differences
      const percentage = (vehicles / maxValue) * 100;
      
      // Only apply minimum height for very small values, and make it proportional
      if (vehicles === 0) {
        return 1; // Boston gets minimal height
      } else if (vehicles <= 10) {
        return Math.max(percentage, 3); // Small values get 3% minimum
      } else {
        return percentage; // Larger values use exact percentage
      }
    } else {
      // Compressed scaling for higher values to prevent dominance
      const adjustedValue = 50 + Math.sqrt(vehicles - 50) * 10;
      const adjustedMax = 50 + Math.sqrt(maxValue - 50) * 10;
      const percentage = (adjustedValue / adjustedMax) * 100;
      return Math.max(percentage, 2);
    }
  };

  // Get bar color based on registration level and sort order
  const getBarColor = (vehicles, index, totalCount) => {
    // Calculate percentage of max value for more meaningful coloring
    const percentageOfMax = maxValue > 0 ? (vehicles / maxValue) * 100 : 0;
    
    if (sortOrder === 'asc') {
      // Ascending: lowest to highest (red → blue)
      if (index < 5) {
        if (index === 0) return "bg-gradient-to-t from-red-800 to-red-600 shadow-red-700/40";
        if (index === 1) return "bg-gradient-to-t from-red-500 to-orange-400 shadow-red-400/20";
        if (index === 2) return "bg-gradient-to-t from-orange-600 to-orange-400 shadow-orange-500/20";
        if (index === 3) return "bg-gradient-to-t from-orange-500 to-orange-300 shadow-orange-400/20";
        return "bg-gradient-to-t from-orange-400 to-yellow-300 shadow-orange-300/20";
      }
      if (index >= 5 && index < totalCount - 5) {
        if (index === 5) return "bg-gradient-to-t from-yellow-600 to-yellow-400 shadow-yellow-500/20";
        if (index === 6) return "bg-gradient-to-t from-yellow-500 to-yellow-300 shadow-yellow-400/20";
        return "bg-gradient-to-t from-yellow-400 to-yellow-200 shadow-yellow-300/20";
      }
      if (index >= totalCount - 5) {
        if (index === totalCount - 1) return "bg-gradient-to-t from-blue-800 to-blue-600 shadow-blue-500/20";
        if (index === totalCount - 2) return "bg-gradient-to-t from-blue-700 to-blue-500 shadow-blue-400/20";
        if (index === totalCount - 3) return "bg-gradient-to-t from-blue-600 to-blue-400 shadow-blue-300/20";
        if (index === totalCount - 4) return "bg-gradient-to-t from-blue-500 to-blue-300 shadow-blue-200/20";
        return "bg-gradient-to-t from-blue-400 to-blue-200 shadow-blue-100/20";
      }
    } else {
      // Descending: highest to lowest (blue → red)
      if (index < 5) {
        if (index === 0) return "bg-gradient-to-t from-blue-800 to-blue-600 shadow-blue-500/20";
        if (index === 1) return "bg-gradient-to-t from-blue-700 to-blue-500 shadow-blue-400/20";
        if (index === 2) return "bg-gradient-to-t from-blue-600 to-blue-400 shadow-blue-300/20";
        if (index === 3) return "bg-gradient-to-t from-blue-500 to-blue-300 shadow-blue-200/20";
        return "bg-gradient-to-t from-blue-400 to-blue-200 shadow-blue-100/20";
      }
      if (index >= 5 && index < totalCount - 5) {
        if (index === 5) return "bg-gradient-to-t from-yellow-600 to-yellow-400 shadow-yellow-500/20";
        if (index === 6) return "bg-gradient-to-t from-yellow-500 to-yellow-300 shadow-yellow-400/20";
        return "bg-gradient-to-t from-yellow-400 to-yellow-200 shadow-yellow-300/20";
      }
      if (index >= totalCount - 5) {
        if (index === totalCount - 1) return "bg-gradient-to-t from-red-700 to-red-500 shadow-red-600/30";
        if (index === totalCount - 2) return "bg-gradient-to-t from-red-500 to-orange-400 shadow-red-400/20";
        if (index === totalCount - 3) return "bg-gradient-to-t from-orange-600 to-orange-400 shadow-orange-500/20";
        if (index === totalCount - 4) return "bg-gradient-to-t from-orange-500 to-orange-300 shadow-orange-400/20";
        return "bg-gradient-to-t from-orange-400 to-yellow-300 shadow-orange-300/20";
      }
    }
    return "bg-gradient-to-t from-blue-700 to-blue-500 shadow-blue-400/20";
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
      <div className="bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg p-4 w-[600px] h-fit ml-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M3 3v18h18"/>
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                <path d="M16 5l3 3-3 3"/>
              </svg>
            </div>
            <h2 className="text-base font-bold text-foreground">DavOr Vehicle Registration Rankings</h2>
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

        {/* Chart */}
        <div className="h-64 flex items-end justify-between gap-2 px-4 relative">
          {/* Grid Background */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-full border-t border-dotted border-gray-300 dark:border-gray-600 opacity-30"
                  style={{ height: '1px' }}
                />
              ))}
            </div>
            {/* Vertical Grid Lines */}
            <div className="absolute inset-0 flex justify-between px-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-full border-l border-dotted border-gray-300 dark:border-gray-600 opacity-30"
                  style={{ width: '1px' }}
                />
              ))}
            </div>
          </div>
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
            top5Municipalities.map((municipality, index) => {
              const vehicles = municipality.vehicles;
              const barHeight = getBarWidth(vehicles);
              const barColor = getBarColor(vehicles, index, top5Municipalities.length);
              
              return (
                <div 
                  key={municipality.municipality} 
                  className="flex flex-col items-center flex-1 group cursor-pointer relative z-10"
                  onClick={() => handleMunicipalityClick(municipality.municipality)}
                  title="View Barangays' Total Registration"
                >
                  
                  {/* Bar */}
                  <div className="relative w-full flex flex-col justify-end h-48 mb-2">
                    {/* Hover background highlight */}
                    <div className="absolute inset-0 bg-gray-200/70 dark:bg-gray-600/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></div>
                    <div
                      className={`w-full ${barColor} rounded-t-md transition-all duration-700 ease-out relative z-10 border border-white/20 shadow-lg ${
                        animationComplete 
                          ? 'animate-in slide-in-from-bottom-4 fade-in duration-700' 
                          : 'opacity-0'
                      }`}
                      style={{ 
                        height: animationComplete ? `${barHeight}%` : '0%',
                        transitionDelay: `${index * 100}ms`
                      }}
                    >
                      {/* Value label on top of bar */}
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-foreground whitespace-nowrap z-20">
                        {formatNumber(vehicles)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Municipality label */}
                  <div className="text-[10px] text-center text-muted-foreground max-w-[90px] leading-tight h-8 flex items-center justify-center">
                    {municipality.municipality}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* View All Modal */}
      {showAllModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M3 3v18h18"/>
                    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                    <path d="M16 5l3 3-3 3"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-foreground">All Municipalities</h2>
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

            {/* All Municipalities Chart */}
            <div className="h-96 flex items-end justify-between gap-1 px-4 overflow-x-auto relative">
              {/* Grid Background */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Horizontal Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div
                      key={i}
                      className="w-full border-t border-dotted border-gray-300 dark:border-gray-600 opacity-30"
                      style={{ height: '1px' }}
                    />
                  ))}
                </div>
                {/* Vertical Grid Lines - More lines for the larger chart */}
                <div className="absolute inset-0 flex justify-between px-4">
                  {Array.from({ length: 12 }, (_, i) => (
                    <div
                      key={i}
                      className="h-full border-l border-dotted border-gray-300 dark:border-gray-600 opacity-30"
                      style={{ width: '1px' }}
                    />
                  ))}
                </div>
              </div>
              {sortedMunicipalities.map((municipality, index) => {
                const vehicles = municipality.vehicles;
                const barHeight = getBarWidth(vehicles);
                const barColor = getBarColor(vehicles, index, sortedMunicipalities.length);
                
                return (
                  <div 
                    key={municipality.municipality} 
                    className="flex flex-col items-center flex-shrink-0 min-w-[60px] group cursor-pointer relative z-10"
                    onClick={() => handleMunicipalityClick(municipality.municipality)}
                    title="View Barangays' Total Registration"
                  >
                    
                    {/* Bar */}
                    <div className="relative w-full flex flex-col justify-end h-80 mb-2">
                      {/* Hover background highlight */}
                      <div className="absolute inset-0 bg-gray-200/70 dark:bg-gray-600/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></div>
                      <div
                        className={`w-full ${barColor} rounded-t-md transition-all duration-700 ease-out relative z-10 border border-white/20 shadow-lg ${
                          animationComplete 
                            ? 'animate-in slide-in-from-bottom-4 fade-in duration-700' 
                            : 'opacity-0'
                        }`}
                        style={{ 
                          height: animationComplete ? `${barHeight}%` : '0%',
                          transitionDelay: `${index * 50}ms`
                        }}
                      >
                        {/* Value label on top of bar */}
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-foreground whitespace-nowrap z-20">
                          {formatNumber(vehicles)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Municipality label */}
                    <div className="text-xs text-center text-muted-foreground max-w-[60px] leading-tight h-8 flex items-center justify-center">
                      {municipality.municipality}
                    </div>
                  </div>
                );
              })}
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
