import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { getOwnerMunicipalityData } from '../../../api/registrationAnalytics.js';
import { getMonthNumber } from '../../../api/registrationAnalytics.js';

const OwnerMunicipalityChart = ({ selectedMonth, selectedYear, loading: parentLoading }) => {
  const [ownerData, setOwnerData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMunicipalitiesModalOpen, setIsMunicipalitiesModalOpen] = useState(false);

  // Handle responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch owner municipality data
  const fetchOwnerData = async () => {
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
      
      
      const response = await getOwnerMunicipalityData(monthNumber, yearValue);
      
      if (response.success) {
        setOwnerData(response.data);
      } else {
        setError('Failed to fetch owner municipality data');
        setOwnerData([]);
      }
    } catch (err) {
      setError('Error loading owner municipality data');
    } finally {
      setLoading(false);
    }
  };

  // Load initial data when component mounts
  useEffect(() => {
    fetchOwnerData();
    setAnimationComplete(false);
  }, []);

  // Fetch data when month or year changes
  useEffect(() => {
    fetchOwnerData();
    setAnimationComplete(false);
  }, [selectedMonth, selectedYear]);

  // Trigger animation after data loads
  useEffect(() => {
    if (ownerData.length > 0) {
      const timer = setTimeout(() => setAnimationComplete(true), 100);
      return () => clearTimeout(timer);
    }
  }, [ownerData]);

  // Handle ESC key to close modal and prevent body scroll
  useEffect(() => {
    if (isModalOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      // Handle ESC key
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          setIsModalOpen(false);
        }
      };
      document.addEventListener('keydown', handleEsc);
      
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isModalOpen]);

  // Handle ESC key to close municipalities modal and prevent body scroll
  useEffect(() => {
    if (isMunicipalitiesModalOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      // Handle ESC key
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          setIsMunicipalitiesModalOpen(false);
        }
      };
      document.addEventListener('keydown', handleEsc);
      
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isMunicipalitiesModalOpen]);

  // Format data for Recharts
  const formatChartData = (data) => {
    return data.map((item) => ({
      name: item.municipality,
      withLicense: item.withLicense,
      withoutLicense: item.withoutLicense,
      total: item.totalOwners
    }));
  };

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    if (!ownerData || ownerData.length === 0) {
      return {
        totalOwners: 0,
        overallComplianceRate: 0,
        topComplianceMunicipality: { name: 'N/A', rate: 0 },
        highestNeedArea: { name: 'N/A', rate: 0 },
        municipalitiesNeedingAttention: 0,
        municipalitiesNeedingAttentionList: []
      };
    }

    const totalOwners = ownerData.reduce((sum, item) => sum + (item.totalOwners || 0), 0);
    const totalWithLicense = ownerData.reduce((sum, item) => sum + (item.withLicense || 0), 0);
    const overallComplianceRate = totalOwners > 0 ? Math.round((totalWithLicense / totalOwners) * 100) : 0;

    // Find top compliance municipality
    const complianceData = ownerData.map(item => {
      const total = item.totalOwners || 0;
      const withLicense = item.withLicense || 0;
      const rate = total > 0 ? (withLicense / total) * 100 : 0;
      return {
        name: item.municipality,
        rate: Math.round(rate)
      };
    });
    const topCompliance = complianceData.reduce((max, item) => 
      item.rate > max.rate ? item : max, 
      { name: 'N/A', rate: 0 }
    );

    // Find highest need area (highest percentage without license)
    const needData = ownerData.map(item => {
      const total = item.totalOwners || 0;
      const withoutLicense = item.withoutLicense || 0;
      const rate = total > 0 ? (withoutLicense / total) * 100 : 0;
      return {
        name: item.municipality,
        rate: Math.round(rate)
      };
    });
    const highestNeed = needData.reduce((max, item) => 
      item.rate > max.rate ? item : max, 
      { name: 'N/A', rate: 0 }
    );

    // Get municipalities below 50% compliance with their rates
    const municipalitiesNeedingAttention = complianceData
      .filter(item => item.rate < 50)
      .sort((a, b) => a.rate - b.rate); // Sort by compliance rate (lowest first)

    return {
      totalOwners,
      overallComplianceRate,
      topComplianceMunicipality: topCompliance,
      highestNeedArea: highestNeed,
      municipalitiesNeedingAttention: municipalitiesNeedingAttention.length,
      municipalitiesNeedingAttentionList: municipalitiesNeedingAttention
    };
  }, [ownerData]);

  // Enhanced custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const withLicense = payload.find(p => p.dataKey === 'withLicense')?.value || 0;
      const withoutLicense = payload.find(p => p.dataKey === 'withoutLicense')?.value || 0;
      const total = withLicense + withoutLicense;
      
      return (
        <div className="bg-gray-100/90 dark:bg-gray-700/90 border border-gray-400/40 dark:border-gray-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
          <div className="space-y-2">
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{label}</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
                <span className="text-green-600 dark:text-green-400 text-xs" style={{ color: '#10B981' }}>
                  <span className="font-semibold">{withLicense.toLocaleString()}</span> With License
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
                <span className="text-red-600 dark:text-red-400 text-xs" style={{ color: '#EF4444' }}>
                  <span className="font-semibold">{withoutLicense.toLocaleString()}</span> Without License
                </span>
              </div>
              <div className="border-t border-gray-300 dark:border-gray-600 pt-1">
                <span className="text-xs font-semibold" style={{ color: '#3B82F6' }}>
                  Total: {total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom legend component
  const CustomLegend = ({ payload }) => {
    return (
      <div className="flex justify-center gap-6 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 w-full max-w-4xl mx-auto h-fit shadow-sm dark:!bg-transparent dark:!border-gray-700 min-h-[400px] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M3 3v18h18"/>
              <path d="M8 9v8"/>
              <path d="M8 12v6"/>
              <path d="M8 15v4"/>
              <path d="M12 9v4"/>
              <path d="M12 12v2"/>
              <path d="M12 15v1"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-foreground">
                Registered Owners by Municipality
              </h2>
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
            <p className="text-xs text-muted-foreground">
              Vehicle owners with and without driver's licenses by location
            </p>
          </div>
        </div>
        {/* View More Button */}
        {!loading && !parentLoading && ownerData.length > 0 && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200 shadow-sm"
            style={{ color: '#3B82F6' }}
          >
            View More
          </button>
        )}
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
        ) : ownerData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full text-muted-foreground">
            <p>No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={300}>
            <BarChart
              data={formatChartData(ownerData)}
              margin={{ 
                top: 0, 
                right: isMobile ? 5 : 10, 
                left: isMobile ? 5 : 10, 
                bottom: isMobile ? 40 : 30 
              }}
              barCategoryGap="3%"
            >
              <CartesianGrid strokeDasharray="2 4" stroke="#9CA3AF" strokeOpacity={0.25} vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280"
                fontSize={isMobile ? 7 : 9}
                height={isMobile ? 35 : 25}
                interval={0}
                angle={-45}
                textAnchor="end"
                tick={{ fill: '#6b7280', fontWeight: 500 }}
                tickFormatter={(value) => {
                  // Truncate long municipality names to prevent overlap
                  if (value.length > 10) {
                    return value.substring(0, 10) + '...';
                  }
                  return value;
                }}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={isMobile ? 10 : 12}
                tickFormatter={(value) => value.toLocaleString()}
                tick={{ fill: '#6b7280', fontWeight: 500 }}
                width={isMobile ? 50 : 70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="withLicense" 
                stackId="owners"
                name="With Driver's License"
                fill="#10B981"
                radius={[0, 0, 0, 0]}
                maxBarSize={isMobile ? 150 : 200}
              />
              <Bar 
                dataKey="withoutLicense" 
                stackId="owners"
                name="Without Driver's License"
                fill="#EF4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={isMobile ? 150 : 200}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        
        {/* Legend positioned below the chart */}
        {ownerData.length > 0 && (
          <div className="flex justify-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">With Driver's License</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Without Driver's License</span>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Municipality License Compliance Details
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Comprehensive analysis of driver's license compliance across municipalities
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden p-6">
              <div className="flex flex-col lg:flex-row gap-6 h-full">
                {/* Left Side - Expanded Chart (70%) */}
                <div className="flex-1 lg:flex-[0.7]">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                      Municipality Compliance Overview
                    </h3>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={formatChartData(ownerData)}
                          margin={{ 
                            top: 10, 
                            right: isMobile ? 5 : 20, 
                            left: isMobile ? 5 : 15, 
                            bottom: isMobile ? 60 : 70 
                          }}
                          barCategoryGap={isMobile ? "3%" : "6%"}
                        >
                          <CartesianGrid strokeDasharray="2 4" stroke="#9CA3AF" strokeOpacity={0.25} vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            stroke="#6b7280"
                            fontSize={isMobile ? 8 : 10}
                            height={60}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
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
                            fontSize={isMobile ? 9 : 11}
                            tickFormatter={(value) => value.toLocaleString()}
                            tick={{ fill: '#6b7280', fontWeight: 500 }}
                            width={isMobile ? 45 : 70}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar 
                            dataKey="withLicense" 
                            stackId="owners"
                            name="With Driver's License"
                            fill="#10B981"
                            radius={[0, 0, 0, 0]}
                            maxBarSize={isMobile ? 120 : 150}
                          />
                          <Bar 
                            dataKey="withoutLicense" 
                            stackId="owners"
                            name="Without Driver's License"
                            fill="#EF4444"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={isMobile ? 120 : 150}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div className="flex justify-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">With Driver's License</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">Without Driver's License</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - KPI Panel (30%) */}
                <div className="flex-1 lg:flex-[0.3] flex flex-col gap-2">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-0.5">
                    Key Metrics
                  </h3>
                  
                  {/* Total Vehicle Owners */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 shadow-md">
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className="w-4 h-4 dark:opacity-90" style={{ color: '#F59E0B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">Total Vehicle Owners</span>
                    </div>
                    <div className="text-lg font-bold dark:opacity-90" style={{ color: '#F59E0B' }}>
                      {kpiMetrics.totalOwners.toLocaleString()}
                    </div>
                  </div>

                  {/* Overall Compliance Rate */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 shadow-md">
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className="w-4 h-4 dark:opacity-90" style={{ color: '#EF4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">Overall Compliance Rate</span>
                    </div>
                    <div className="text-lg font-bold dark:opacity-90" style={{ color: '#EF4444' }}>
                      {kpiMetrics.overallComplianceRate}%
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">with licenses</p>
                  </div>

                  {/* Top Compliance Municipality */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 shadow-md">
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className="w-4 h-4 dark:opacity-90" style={{ color: '#10B981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">Top Compliance Municipality</span>
                    </div>
                    <div className="text-sm font-bold dark:opacity-90" style={{ color: '#10B981' }}>
                      {kpiMetrics.topComplianceMunicipality.name}
                    </div>
                    <div className="text-base font-bold dark:opacity-90 mt-0.5" style={{ color: '#10B981' }}>
                      {kpiMetrics.topComplianceMunicipality.rate}%
                    </div>
                  </div>

                  {/* Highest Need Area */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 shadow-md">
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className="w-4 h-4 dark:opacity-90" style={{ color: '#EF4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">Highest Need Area</span>
                    </div>
                    <div className="text-sm font-bold dark:opacity-90" style={{ color: '#EF4444' }}>
                      {kpiMetrics.highestNeedArea.name}
                    </div>
                    <div className="text-base font-bold dark:opacity-90 mt-0.5" style={{ color: '#EF4444' }}>
                      {kpiMetrics.highestNeedArea.rate}%
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">without licenses</p>
                  </div>

                  {/* Municipalities Needing Attention */}
                  <div 
                    className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border-2 border-gray-200 dark:border-gray-700 shadow-md cursor-pointer hover:shadow-lg hover:border-red-300 dark:hover:border-red-700 transition-all group"
                    onClick={() => kpiMetrics.municipalitiesNeedingAttentionList.length > 0 && setIsMunicipalitiesModalOpen(true)}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className="w-4 h-4 dark:opacity-90" style={{ color: '#EF4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">Municipalities Needing Attention</span>
                      {kpiMetrics.municipalitiesNeedingAttentionList.length > 0 && (
                        <svg 
                          className="w-3 h-3 ml-auto text-gray-400 group-hover:text-red-500 transition-colors" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold dark:opacity-90" style={{ color: '#EF4444' }}>
                        {kpiMetrics.municipalitiesNeedingAttention}
                      </div>
                      {kpiMetrics.municipalitiesNeedingAttentionList.length > 0 && (
                        <span className="text-[9px] text-gray-500 dark:text-gray-400 group-hover:text-red-500 transition-colors font-medium">
                          Click to view
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">areas below 50% compliance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Municipalities Needing Attention Modal */}
      {isMunicipalitiesModalOpen && kpiMetrics.municipalitiesNeedingAttentionList.length > 0 && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsMunicipalitiesModalOpen(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Municipalities Needing Attention
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Areas below 50% driver's license compliance
                </p>
              </div>
              <button
                onClick={() => setIsMunicipalitiesModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {kpiMetrics.municipalitiesNeedingAttentionList.map((municipality, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                        <span className="text-sm font-bold" style={{ color: '#EF4444' }}>
                          {index + 1}
                        </span>
                      </div>
                      <span className="text-base font-semibold text-gray-900 dark:text-white">
                        {municipality.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Compliance Rate:</span>
                      <span className="text-lg font-bold" style={{ color: '#EF4444' }}>
                        {municipality.rate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default OwnerMunicipalityChart;
