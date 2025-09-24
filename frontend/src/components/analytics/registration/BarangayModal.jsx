import React, { useState, useEffect } from 'react';
import { getBarangayRegistrationTotals } from '../../../api/registrationAnalytics.js';
import './RegistrationAnalytics.css';

const BarangayModal = ({ isOpen, onClose, municipality, selectedMonth, selectedYear, municipalitiesList = [] }) => {
  const [barangayData, setBarangayData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for highest to lowest, 'asc' for lowest to highest
  const [isSorting, setIsSorting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMunicipalityIndex, setCurrentMunicipalityIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState('right');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Find current municipality index when modal opens
  useEffect(() => {
    if (isOpen && municipality && municipalitiesList.length > 0) {
      const index = municipalitiesList.findIndex(m => m.municipality === municipality);
      setCurrentMunicipalityIndex(index >= 0 ? index : 0);
    }
  }, [isOpen, municipality, municipalitiesList]);

  // Fetch barangay data when modal opens
  useEffect(() => {
    if (isOpen && municipality) {
      fetchBarangayData();
    }
  }, [isOpen, municipality, selectedMonth, selectedYear]);

  // Handle modal open animation
  useEffect(() => {
    if (isOpen) {
      setIsModalOpen(true);
    } else {
      setIsModalOpen(false);
    }
  }, [isOpen]);

  const fetchBarangayData = async (targetMunicipality = municipality) => {
    try {
      setLoading(true);
      setError(null);
      
      // Handle "All" selections
      let monthNumber = null;
      let yearValue = null;
      
      if (selectedMonth && selectedMonth !== 'All') {
        const months = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        monthNumber = months.indexOf(selectedMonth) + 1;
      }
      
      if (selectedYear && selectedYear !== 'All') {
        yearValue = selectedYear;
      }
      
      const response = await getBarangayRegistrationTotals(targetMunicipality, monthNumber, yearValue);
      setBarangayData(response.data || []);
    } catch (err) {
      console.error('Error fetching barangay data:', err);
      setError('Error loading barangay data');
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions
  const handlePreviousMunicipality = () => {
    if (currentMunicipalityIndex > 0) {
      setSlideDirection('left');
      setIsTransitioning(true);
      setTimeout(() => {
        const newIndex = currentMunicipalityIndex - 1;
        setCurrentMunicipalityIndex(newIndex);
        const newMunicipality = municipalitiesList[newIndex].municipality;
        fetchBarangayData(newMunicipality);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 150);
    }
  };

  const handleNextMunicipality = () => {
    if (currentMunicipalityIndex < municipalitiesList.length - 1) {
      setSlideDirection('right');
      setIsTransitioning(true);
      setTimeout(() => {
        const newIndex = currentMunicipalityIndex + 1;
        setCurrentMunicipalityIndex(newIndex);
        const newMunicipality = municipalitiesList[newIndex].municipality;
        fetchBarangayData(newMunicipality);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 150);
    }
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  const handleSort = () => {
    setIsSorting(true);
    setSortOrder(prevOrder => prevOrder === 'desc' ? 'asc' : 'desc');
    setTimeout(() => setIsSorting(false), 300);
  };

  const sortedBarangayData = [...barangayData].sort((a, b) => {
    if (sortOrder === 'desc') {
      return b.vehicles - a.vehicles; // Highest to lowest
    } else {
      return a.vehicles - b.vehicles; // Lowest to highest
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-gray-200/50 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl dark:!bg-gradient-to-br dark:!from-[#1a1a2e] dark:!via-[#16213e] dark:!to-[#0f3460] dark:!border-[#2A2A3E]/50 dark:!shadow-2xl flex flex-col transition-all duration-500 ease-out transform ${
        isModalOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
      }`}>
        <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:!bg-gradient-to-br dark:!from-[#1a1a2e] dark:!via-[#16213e] dark:!to-[#0f3460] border-b border-gray-200/50 dark:border-gray-700/30 pb-4 mb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M3 3v18h18"/>
                  <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                  <path d="M16 5l3 3-3 3"/>
                </svg>
              </div>
              <div className="flex items-center gap-3">
                {/* Navigation Arrows */}
                {municipalitiesList.length > 1 && (
                  <>
                    <button
                      onClick={handlePreviousMunicipality}
                      disabled={currentMunicipalityIndex === 0}
                      className={`p-1.5 rounded-lg transition-all duration-200 ${
                        currentMunicipalityIndex === 0
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20'
                      }`}
                      title="Previous Municipality"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  </>
                )}
                
                <div className="overflow-hidden">
                  <h2 
                    className={`text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400 transition-all duration-300 ease-in-out ${
                      isTransitioning 
                        ? 'opacity-0 transform translate-x-2' 
                        : 'opacity-100 transform translate-x-0'
                    }`}
                  >
                    {municipalitiesList[currentMunicipalityIndex]?.municipality || municipality}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Barangay Registration Data</p>
                </div>
                
                {/* Navigation Arrows */}
                {municipalitiesList.length > 1 && (
                  <button
                    onClick={handleNextMunicipality}
                    disabled={currentMunicipalityIndex === municipalitiesList.length - 1}
                    className={`p-1.5 rounded-lg transition-all duration-200 ${
                      currentMunicipalityIndex === municipalitiesList.length - 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20'
                    }`}
                    title="Next Municipality"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-105"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-3 border border-blue-200/50 dark:border-blue-700/30 shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="text-xs font-medium text-blue-700 dark:text-blue-300">Total Barangays</div>
              </div>
              <div className="text-xl font-bold text-blue-900 dark:text-blue-100">{barangayData.length}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-3 border border-green-200/50 dark:border-green-700/30 shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0M15 17a2 2 0 104 0" />
                  </svg>
                </div>
                <div className="text-xs font-medium text-green-700 dark:text-green-300">Total Vehicles</div>
              </div>
              <div className="text-xl font-bold text-green-900 dark:text-green-100">
                {formatNumber(barangayData.reduce((sum, item) => sum + item.vehicles, 0))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-3 border border-orange-200/50 dark:border-orange-700/30 shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="text-xs font-medium text-orange-700 dark:text-orange-300">Zero Registrations</div>
              </div>
              <div className="text-xl font-bold text-orange-900 dark:text-orange-100">
                {barangayData.filter(item => item.vehicles === 0).length}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 scrollbar-hide overflow-x-hidden">
          <div 
            className={`transition-all duration-300 ease-in-out ${
              isTransitioning 
                ? 'opacity-0 transform translate-x-4' 
                : 'opacity-100 transform translate-x-0'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-32 text-red-500">
                <p>{error}</p>
              </div>
            ) : barangayData.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p>No barangay data available for {municipalitiesList[currentMunicipalityIndex]?.municipality || municipality}</p>
              </div>
            ) : (
              <div>
                {/* Barangay Table */}
                <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/30 overflow-hidden">
                  <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        Barangay Name
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        onClick={handleSort}
                      >
                        <div className="flex items-center gap-2">
                          Total Registered Vehicles
                          <div className="flex flex-col">
                            <svg 
                              className={`w-3 h-3 ${
                                sortOrder === 'desc' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                              }`} 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            <svg 
                              className={`w-3 h-3 ${
                                sortOrder === 'asc' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                              }`} 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800/30 divide-y divide-gray-200/50 dark:divide-gray-700/30">
                    {sortedBarangayData.map((barangay, index) => {
                      const hasZeroRegistrations = barangay.vehicles === 0;
                      return (
                        <tr 
                          key={barangay.barangay} 
                          className={`hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-all duration-200 ${
                            hasZeroRegistrations ? 'bg-gradient-to-r from-red-50/80 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border-l-4 border-red-500' : ''
                          }`}
                          style={{
                            animation: `smoothFadeIn 0.6s ease-out ${index * 0.03}s both`
                          }}
                        >
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 shadow-sm ${
                                hasZeroRegistrations 
                                  ? 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40' 
                                  : 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40'
                              }`}>
                                <span className={`text-sm font-bold ${
                                  hasZeroRegistrations 
                                    ? 'text-red-700 dark:text-red-300' 
                                    : 'text-blue-700 dark:text-blue-300'
                                }`}>
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className={`text-base font-semibold ${
                                  hasZeroRegistrations 
                                    ? 'text-red-800 dark:text-red-200' 
                                    : 'text-gray-800 dark:text-gray-200'
                                }`}>
                                  {barangay.barangay}
                                </div>
                                {hasZeroRegistrations && (
                                  <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/40 dark:to-red-800/40 dark:text-red-200 rounded-full shadow-sm">
                                    No Registrations
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className={`text-lg font-bold ${
                              hasZeroRegistrations 
                                ? 'text-red-600 dark:text-red-400' 
                                : 'text-gray-800 dark:text-gray-200'
                            }`}>
                              {formatNumber(barangay.vehicles)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarangayModal;
