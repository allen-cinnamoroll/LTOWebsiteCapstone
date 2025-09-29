import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

// NOTE: SAMPLE DATA ONLY — not connected to backend
const SAMPLE_MONTHLY = {
  "CITY OF MATI": { Jan: 1200, Feb: 1180, Mar: 1300, Apr: 1250, May: 1400, Jun: 1500, Jul: 1480, Aug: 1420, Sep: 1350, Oct: 1380, Nov: 1400, Dec: 1520 },
  "MANAY": { Jan: 800, Feb: 780, Mar: 900, Apr: 860, May: 920, Jun: 980, Jul: 950, Aug: 920, Sep: 880, Oct: 900, Nov: 910, Dec: 1000 },
  "BAGANGA": { Jan: 650, Feb: 680, Mar: 720, Apr: 700, May: 750, Jun: 780, Jul: 760, Aug: 740, Sep: 720, Oct: 730, Nov: 740, Dec: 800 },
  "BANAYBANAY": { Jan: 450, Feb: 460, Mar: 480, Apr: 470, May: 500, Jun: 520, Jul: 510, Aug: 490, Sep: 480, Oct: 485, Nov: 490, Dec: 530 },
  "BOSTON": { Jan: 320, Feb: 330, Mar: 350, Apr: 340, May: 360, Jun: 370, Jul: 365, Aug: 355, Sep: 350, Oct: 352, Nov: 355, Dec: 380 },
  "CARAGA": { Jan: 280, Feb: 290, Mar: 310, Apr: 300, May: 320, Jun: 330, Jul: 325, Aug: 315, Sep: 310, Oct: 312, Nov: 315, Dec: 340 },
  "CATEEL": { Jan: 380, Feb: 390, Mar: 410, Apr: 400, May: 420, Jun: 430, Jul: 425, Aug: 415, Sep: 410, Oct: 412, Nov: 415, Dec: 440 },
  "GOVERNOR GENEROSO": { Jan: 520, Feb: 530, Mar: 550, Apr: 540, May: 570, Jun: 580, Jul: 575, Aug: 565, Sep: 560, Oct: 562, Nov: 565, Dec: 590 },
  "LUPON": { Jan: 680, Feb: 690, Mar: 720, Apr: 700, May: 740, Jun: 760, Jul: 750, Aug: 730, Sep: 720, Oct: 725, Nov: 730, Dec: 780 },
  "SAN ISIDRO": { Jan: 420, Feb: 430, Mar: 450, Apr: 440, May: 460, Jun: 470, Jul: 465, Aug: 455, Sep: 450, Oct: 452, Nov: 455, Dec: 480 },
  "TARRAGONA": { Jan: 350, Feb: 360, Mar: 380, Apr: 370, May: 390, Jun: 400, Jul: 395, Aug: 385, Sep: 380, Oct: 382, Nov: 385, Dec: 410 }
};

// Compute yearly totals by summing months
const SAMPLE_YEARLY = Object.keys(SAMPLE_MONTHLY).reduce((acc, municipality) => {
  const monthlyData = SAMPLE_MONTHLY[municipality];
  const yearlyTotal = Object.values(monthlyData).reduce((sum, value) => sum + value, 0);
  acc[municipality] = yearlyTotal;
  return acc;
}, {});

export function PredictiveAnalytics() {
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'yearly'
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);
  
  // Get current year and predict next year
  const currentYear = new Date().getFullYear();
  const predictionYear = currentYear + 1;

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Compute KPI values from sample data
  const computeKPIs = () => {
    // Total Predicted (Year) - sum across all municipalities
    const totalPredicted = Object.values(SAMPLE_YEARLY).reduce((sum, total) => sum + total, 0);
    
    // Top Municipality (Year) - highest yearly total
    const topMunicipalityYear = Object.entries(SAMPLE_YEARLY).reduce((max, [municipality, total]) => 
      total > max.total ? { municipality, total } : max, 
      { municipality: '', total: 0 }
    );
    
    // Top Municipality (Peak Month) - municipality + month with highest single-month value
    let peakValue = 0;
    let peakMunicipality = '';
    let peakMonth = '';
    Object.entries(SAMPLE_MONTHLY).forEach(([municipality, monthlyData]) => {
      Object.entries(monthlyData).forEach(([month, value]) => {
        if (value > peakValue) {
          peakValue = value;
          peakMunicipality = municipality;
          peakMonth = month;
        }
      });
    });
    
    // Fastest Growth (YoY %) - placeholder formula (simulated)
    const fastestGrowth = 12.5; // Placeholder percentage
    
    return {
      totalPredicted,
      topMunicipalityYear,
      peakMunicipality,
      peakMonth,
      peakValue,
      fastestGrowth
    };
  };

  const kpis = computeKPIs();

  // Chart data processing
  const processChartData = () => {
    if (viewMode === 'monthly') {
      // Monthly line chart data - always show all municipalities
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const chartData = months.map(month => {
        const dataPoint = { month };
        
        // Show all municipalities
        Object.entries(SAMPLE_MONTHLY).forEach(([municipality, monthlyData]) => {
          dataPoint[municipality] = monthlyData[month];
        });
        
        return dataPoint;
      });
      return chartData;
    } else {
      // Yearly bar chart data - always show all municipalities
      return Object.entries(SAMPLE_YEARLY).map(([municipality, total]) => ({
        municipality,
        total
      }));
    }
  };

  const chartData = processChartData();

  // Soft Pastel Palette (clean, minimal)
  const colors = [
    '#4E79A7', // soft blue
    '#F28E2B', // warm orange
    '#E15759', // muted red
    '#76B7B2', // teal
    '#59A14F', // green
    '#EDC948', // mustard yellow
    '#B07AA1', // lavender purple
    '#FF9DA7', // pastel pink
    '#9C755F', // brown-gray
    '#BAB0AC', // light gray
    '#4E79A7'  // additional soft blue
  ];

  // Simple and elegant tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Sort municipalities by value (highest to lowest)
      const sortedPayload = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
      
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-blue-200 dark:border-blue-700 rounded-lg shadow-lg max-w-xs">
          <p className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 text-center">
            {viewMode === 'monthly' ? `${label}` : `${label}`}
          </p>
          <div className="space-y-1">
            {sortedPayload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate" title={entry.dataKey}>
                    {entry.dataKey}
                  </span>
                </div>
                <span className="text-xs font-medium flex-shrink-0 ml-2" style={{ color: entry.color }}>
                  {entry.value?.toLocaleString() || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Enhanced export functionality
  const exportData = (format) => {
    let content = '';
    let filename = '';
    let mimeType = '';
    
    if (viewMode === 'monthly') {
      // Monthly data export
      if (format === 'csv') {
        content = 'Municipality,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec\n';
        Object.entries(SAMPLE_MONTHLY).forEach(([municipality, data]) => {
          const row = [municipality, ...Object.values(data)].join(',');
          content += row + '\n';
        });
        filename = `predictive_analytics_monthly_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else if (format === 'json') {
        content = JSON.stringify(SAMPLE_MONTHLY, null, 2);
        filename = `predictive_analytics_monthly_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else if (format === 'excel') {
        // For Excel, we'll create a CSV that Excel can open
        content = 'Municipality,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec\n';
        Object.entries(SAMPLE_MONTHLY).forEach(([municipality, data]) => {
          const row = [municipality, ...Object.values(data)].join(',');
          content += row + '\n';
        });
        filename = `predictive_analytics_monthly_${new Date().toISOString().split('T')[0]}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }
    } else {
      // Yearly data export
      if (format === 'csv') {
        content = 'Municipality,Total\n';
        Object.entries(SAMPLE_YEARLY).forEach(([municipality, total]) => {
          content += `${municipality},${total}\n`;
        });
        filename = `predictive_analytics_yearly_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else if (format === 'json') {
        content = JSON.stringify(SAMPLE_YEARLY, null, 2);
        filename = `predictive_analytics_yearly_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else if (format === 'excel') {
        content = 'Municipality,Total\n';
        Object.entries(SAMPLE_YEARLY).forEach(([municipality, total]) => {
          content += `${municipality},${total}\n`;
        });
        filename = `predictive_analytics_yearly_${new Date().toISOString().split('T')[0]}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }
    }

    // Create and download file
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    // Close export menu
    setShowExportMenu(false);
  };

  return (
    <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-blue-200/50 dark:border-blue-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Predictive Analytics</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Uses the SARIMA algorithm to forecast future trends based on historical and current data, providing insights on risks, traffic patterns, and vehicle registrations.
              </p>
              <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                Predicting {predictionYear} (Based on the last data available)
              </div>
            </div>
          </div>
         
        </div>
      </div>



      {/* Main Content - Responsive layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 h-full">
        {/* Left: Charts area */}
        <div className="xl:col-span-2 p-2 sm:p-4">
          <div className="space-y-4 sm:space-y-6">

            {/* Charts Area */}
            <div className="relative bg-gradient-to-br from-green-50/80 via-blue-50/60 to-orange-50/40 dark:from-green-900/20 dark:via-blue-900/20 dark:to-orange-900/20 backdrop-blur-sm rounded-xl p-3 sm:p-6 border border-green-200/30 dark:border-green-700/30 shadow-lg overflow-hidden">
              {/* Nature-inspired background pattern */}
              <div className="absolute inset-0 opacity-5">
                <svg className="w-full h-full" viewBox="0 0 400 300" fill="none">
                  {/* Mountain silhouette */}
                  <path d="M0,200 L50,150 L100,180 L150,120 L200,160 L250,100 L300,140 L350,80 L400,120 L400,300 L0,300 Z" fill="#2E7D32" />
                  {/* Wave pattern */}
                  <path d="M0,250 Q100,220 200,250 T400,250 L400,300 L0,300 Z" fill="#1565C0" />
                  {/* Leaf pattern */}
                  <circle cx="80" cy="80" r="15" fill="#81C784" />
                  <circle cx="320" cy="60" r="12" fill="#FBC02D" />
                  <circle cx="150" cy="200" r="10" fill="#F57C00" />
                </svg>
              </div>
               <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                 <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                   {viewMode === 'monthly' ? 'Monthly Trends' : 'Yearly Totals'}
                 </h4>
                 
                 {/* Controls aligned to the right */}
                 <div className="flex flex-col sm:flex-row gap-2 sm:gap-3" style={{ pointerEvents: 'auto' }}>
                   {/* Toggle: Monthly/Yearly */}
                   <div className="flex items-center gap-1">
                     <span className="text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">View:</span>
                     <div className="flex bg-gray-100 dark:bg-gray-600 rounded-md p-0.5">
                       <button
                         onClick={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           console.log('Monthly button clicked');
                           setViewMode('monthly');
                         }}
                         className={`px-2 sm:px-3 py-1.5 text-xs rounded transition-all duration-200 cursor-pointer select-none z-10 relative touch-manipulation ${
                           viewMode === 'monthly'
                             ? 'bg-white dark:bg-gray-500 text-gray-900 dark:text-white shadow-sm font-medium'
                             : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-500'
                         }`}
                         type="button"
                         style={{ pointerEvents: 'auto' }}
                       >
                         Monthly
                       </button>
                       <button
                         onClick={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           console.log('Yearly button clicked');
                           setViewMode('yearly');
                         }}
                         className={`px-2 sm:px-3 py-1.5 text-xs rounded transition-all duration-200 cursor-pointer select-none z-10 relative touch-manipulation ${
                           viewMode === 'yearly'
                             ? 'bg-white dark:bg-gray-500 text-gray-900 dark:text-white shadow-sm font-medium'
                             : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-500'
                         }`}
                         type="button"
                         style={{ pointerEvents: 'auto' }}
                       >
                         Yearly
                       </button>
                     </div>
                   </div>



                   {/* Enhanced Export Button with Dropdown */}
                   <div className="flex items-center gap-2 ml-auto relative">
                     <div className="relative" ref={exportMenuRef}>
                       <button
                         onClick={() => setShowExportMenu(!showExportMenu)}
                         className="px-2 sm:px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors duration-200 flex items-center gap-1 touch-manipulation"
                       >
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                         </svg>
                         <span className="hidden sm:inline">Export</span>
                         <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       </button>
                       
                       {/* Export Dropdown Menu */}
                       {showExportMenu && (
                         <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                           <div className="py-1">
                             <button
                               onClick={() => exportData('csv')}
                               className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                               </svg>
                               Export as CSV
                             </button>
                             <button
                               onClick={() => exportData('json')}
                               className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                               </svg>
                               Export as JSON
                             </button>
                             <button
                               onClick={() => exportData('excel')}
                               className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                               </svg>
                               Export as Excel
                             </button>
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
               </div>
              
              <div className="h-64 sm:h-80 lg:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === 'monthly' ? (
                    <LineChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      aria-label="Monthly registration trends chart"
                    >
                      <CartesianGrid 
                        strokeDasharray="2 4" 
                        stroke="#4E79A7" 
                        strokeOpacity={0.2}
                        vertical={false}
                      />
                      <XAxis 
                        dataKey="month" 
                        stroke="#4E79A7"
                        fontSize={10}
                        fontWeight="500"
                        tick={{ fill: '#4E79A7' }}
                      />
                      <YAxis 
                        stroke="#4E79A7"
                        fontSize={10}
                        fontWeight="500"
                        tick={{ fill: '#4E79A7' }}
                        tickFormatter={(value) => value.toLocaleString()}
                      />
                      <Tooltip 
                        content={<CustomTooltip />}
                        cursor={{ stroke: '#76B7B2', strokeWidth: 1, strokeDasharray: '3 3' }}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          fontSize: '11px', 
                          fontWeight: '500',
                          color: '#4E79A7',
                          paddingTop: '10px'
                        }}
                        onClick={(data) => {
                          console.log('Legend clicked:', data);
                        }}
                      />
                      {Object.keys(SAMPLE_MONTHLY).map((municipality, index) => (
                        <Line
                          key={municipality}
                          type="monotone"
                          dataKey={municipality}
                          stroke={colors[index % colors.length]}
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          dot={{ 
                            r: 5, 
                            fill: colors[index % colors.length],
                            stroke: '#fff',
                            strokeWidth: 2
                          }}
                          activeDot={{ 
                            r: 8, 
                            fill: colors[index % colors.length],
                            stroke: '#fff',
                            strokeWidth: 3,
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                          }}
                          name={municipality}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  ) : (
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 20, left: 20, bottom: 10 }}
                      aria-label="Yearly registration totals chart"
                    >
                      <CartesianGrid 
                        strokeDasharray="2 4" 
                        stroke="#4E79A7" 
                        strokeOpacity={0.2}
                        vertical={false}
                      />
                      <XAxis 
                        dataKey="municipality" 
                        stroke="#4E79A7"
                        fontSize={10}
                        fontWeight="500"
                        angle={-45}
                        textAnchor="end"
                        height={120}
                        interval={0}
                        tick={{ 
                          fontSize: 9, 
                          fill: '#4E79A7',
                          textAnchor: 'end'
                        }}
                        tickFormatter={(value) => {
                          // Split long names into two lines
                          if (value === 'GOVERNOR GENEROSO') {
                            return ['GOVERNOR', 'GENEROSO'];
                          }
                          if (value === 'CITY OF MATI') {
                            return ['CITY OF', 'MATI'];
                          }
                          return value;
                        }}
                      />
                      <YAxis 
                        stroke="#4E79A7"
                        fontSize={13}
                        fontWeight="500"
                        tick={{ fill: '#4E79A7' }}
                        tickFormatter={(value) => value.toLocaleString()}
                      />
                      <Tooltip 
                        content={<CustomTooltip />}
                        cursor={{ fill: '#76B7B2', fillOpacity: 0.1 }}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          fontSize: '11px', 
                          fontWeight: '500',
                          color: '#4E79A7',
                          paddingTop: '10px'
                        }}
                      />
                      <Bar 
                        dataKey="total" 
                        fill="url(#pastelGradient)"
                        name="Total Registrations"
                        radius={[6, 6, 0, 0]}
                        stroke="#4E79A7"
                        strokeWidth={1}
                      />
                      <defs>
                        <linearGradient id="pastelGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#76B7B2" />
                          <stop offset="50%" stopColor="#4E79A7" />
                          <stop offset="100%" stopColor="#B07AA1" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
              
            </div>
          </div>
        </div>

        {/* Right: KPI Cards */}
        <div className="xl:col-span-1 p-2 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 sm:gap-4">
            {/* Total Predicted (Year) */}
            <div className="p-3 rounded-xl bg-white dark:bg-gray-800/60 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-start">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Predicted</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {kpis.totalPredicted.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Across Davao Oriental</div>
            </div>

            {/* Top Municipality (Year) */}
            <div className="p-3 rounded-xl bg-white dark:bg-gray-800/60 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-start">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Top Municipality</span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white truncate w-full">
                {kpis.topMunicipalityYear.municipality}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {kpis.topMunicipalityYear.total.toLocaleString()} registrations
              </div>
            </div>

            {/* Top Municipality (Peak Month) */}
            <div className="p-3 rounded-xl bg-white dark:bg-gray-800/60 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-start">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Peak Month</span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white truncate w-full">
                {kpis.peakMunicipality}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {kpis.peakMonth}: {kpis.peakValue.toLocaleString()}
              </div>
            </div>

            {/* Fastest Growth (YoY %) */}
            <div className="p-3 rounded-xl bg-white dark:bg-gray-800/60 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-start">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Growth Rate</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                +{kpis.fastestGrowth}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Year over Year</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
