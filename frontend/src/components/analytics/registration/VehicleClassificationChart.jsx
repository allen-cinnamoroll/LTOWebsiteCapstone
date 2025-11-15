import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  Tooltip,
  Label
} from 'recharts';
import { getVehicleClassificationData } from '../../../api/registrationAnalytics.js';
import { getMonthNumber } from '../../../api/registrationAnalytics.js';

const VehicleClassificationChart = ({ selectedMonth, selectedYear, loading: parentLoading }) => {
  const [classificationData, setClassificationData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(null);

  // Handle responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch vehicle classification data
  const fetchClassificationData = async () => {
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
      
      const response = await getVehicleClassificationData(monthNumber, yearValue);
      
      if (response.success) {
        setClassificationData(response.data);
      } else {
        setError('Failed to fetch vehicle classification data');
        setClassificationData([]);
      }
    } catch (err) {
      setError('Error loading vehicle classification data');
    } finally {
      setLoading(false);
    }
  };

  // Load initial data when component mounts
  useEffect(() => {
    fetchClassificationData();
    setAnimationComplete(false);
  }, []);

  // Fetch data when month or year changes
  useEffect(() => {
    fetchClassificationData();
    setAnimationComplete(false);
  }, [selectedMonth, selectedYear]);

  // Trigger animation after data loads
  useEffect(() => {
    if (classificationData.length > 0) {
      const timer = setTimeout(() => setAnimationComplete(true), 100);
      return () => clearTimeout(timer);
    }
  }, [classificationData]);

  // Format data for Recharts with strict data normalization
  const formatChartData = (data) => {
    // Normalize the data and filter out invalid entries
    const normalizedData = {};
    
    data.forEach((item) => {
      // Skip any "FOR HRE" entries completely (case-insensitive)
      if (item.classification && item.classification.toUpperCase() === "FOR HRE") {
        return; // Skip this entry entirely
      }
      
      // Only include valid classifications (case-insensitive)
      const validClassifications = ["PRIVATE", "FOR HIRE", "GOVERNMENT"];
      if (!validClassifications.includes(item.classification.toUpperCase())) {
        return; // Skip invalid classifications
      }
      
      const normalizedName = item.classification.toUpperCase();
      
      if (normalizedName in normalizedData) {
        normalizedData[normalizedName].count += item.count;
      } else {
        normalizedData[normalizedName] = {
          classification: normalizedName,
          count: item.count
        };
      }
    });
    
    // Convert back to array and recalculate percentages
    const totalCount = Object.values(normalizedData).reduce((sum, item) => sum + item.count, 0);
    
    const result = Object.values(normalizedData).map((item) => ({
      name: item.classification,
      value: item.count,
      percentage: totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0
    }));
    
    return result;
  };

  // Calculate KPIs from chart data
  const kpis = useMemo(() => {
    const chartData = formatChartData(classificationData);
    const totalVehicles = chartData.reduce((sum, item) => sum + item.value, 0);
    const largestSegment = chartData.length > 0 
      ? chartData.reduce((max, item) => item.value > max.value ? item : max, chartData[0])
      : null;
    
    // Calculate Fleet Diversity based on distribution balance
    let fleetDiversity = 'Low';
    if (largestSegment) {
      const largestPercent = largestSegment.percentage;
      if (largestPercent >= 80) {
        fleetDiversity = 'Low'; // Very unbalanced - one segment dominates
      } else if (largestPercent >= 50) {
        fleetDiversity = 'Medium'; // Somewhat balanced
      } else {
        fleetDiversity = 'High'; // Well balanced
      }
    }
    
    return {
      totalVehicles,
      largestSegment: largestSegment ? largestSegment.name : 'N/A',
      fleetDiversity
    };
  }, [classificationData]);

  // Generate insight based on data
  const generateInsight = useMemo(() => {
    const chartData = formatChartData(classificationData);
    if (chartData.length === 0) return 'No data available for analysis.';
    
    const privateData = chartData.find(item => item.name === 'PRIVATE');
    const forHireData = chartData.find(item => item.name === 'FOR HIRE');
    const govtData = chartData.find(item => item.name === 'GOVERNMENT');
    
    if (privateData && privateData.percentage >= 80) {
      return 'Private vehicles make up the vast majority of the registered fleet.';
    } else if (privateData && privateData.percentage >= 60) {
      return 'Private vehicles dominate the vehicle registration landscape.';
    } else if (forHireData && forHireData.percentage > govtData?.percentage) {
      return 'For-hire vehicles outnumber government vehicles in the registration system.';
    } else if (govtData && govtData.percentage > forHireData?.percentage) {
      return 'Government vehicles represent a larger share than for-hire vehicles.';
    } else {
      return 'Vehicle registrations are distributed across multiple classification types.';
    }
  }, [classificationData]);

  // Fixed appealing colors for the pie chart - professional and eye-friendly
  // These colors are LOCKED and will NEVER change regardless of data order or refresh
  const COLORS = ['#3b82f6', '#ef4444', '#10b981']; // Blue, Red, Green - consistent and appealing
  
  // Color mapping to ensure consistent colors for each classification
  const getColorForClassification = (classification) => {
    switch (classification) {
      case 'PRIVATE':
        return '#3b82f6'; // Blue
      case 'FOR HIRE':
        return '#ef4444'; // Red
      case 'GOVERNMENT':
        return '#10b981'; // Green
      default:
        return '#6b7280'; // Gray fallback
    }
  };

  // Get text color for Fleet Diversity KPI based on value
  const getFleetDiversityColor = (diversity) => {
    switch (diversity) {
      case 'Low':
        return '#EF4444'; // Red
      case 'Medium':
        return '#F59E0B'; // Orange
      case 'High':
        return '#10B981'; // Green
      default:
        return '#6B7280'; // Gray fallback
    }
  };

  // Compact custom tooltip component
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: data.color }}
            ></div>
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{data.name}</span>
          </div>
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {data.value.toLocaleString()} vehicles ({data.payload.percentage}%)
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom legend component with interactive design
  const CustomLegend = ({ payload }) => {
    const handleLegendClick = (entry) => {
      if (selectedSegment === entry.value) {
        setSelectedSegment(null); // Deselect if clicking the same
      } else {
        setSelectedSegment(entry.value); // Select new segment
      }
    };

    return (
      <div className="flex flex-col gap-4">
        {payload.map((entry, index) => {
          const isSelected = selectedSegment === entry.value;
          return (
            <div 
              key={index} 
              className={`flex items-center gap-3 cursor-pointer transition-all duration-200 rounded-lg p-2 ${
                isSelected 
                  ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 dark:ring-blue-400' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
              onClick={() => handleLegendClick(entry)}
            >
              <div 
                className="w-4 h-4 rounded-full shadow-sm transition-transform duration-200"
                style={{ 
                  backgroundColor: isSelected ? entry.color : entry.color,
                  border: `2px solid ${entry.color}${isSelected ? 'ff' : '20'}`,
                  transform: isSelected ? 'scale(1.2)' : 'scale(1)'
                }}
              ></div>
              <div className="flex flex-col">
                <span className={`text-sm font-semibold transition-colors duration-200 ${
                  isSelected 
                    ? 'text-blue-700 dark:text-blue-300' 
                    : 'text-gray-800 dark:text-gray-200'
                }`}>
                  {entry.value}
                </span>
                <span className={`text-xs transition-colors duration-200 ${
                  isSelected 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {entry.payload?.percentage || 0}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 w-full max-w-lg h-fit shadow-sm dark:!bg-transparent dark:!border-gray-700 min-h-[400px] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
              <path d="M12 2v10l8 8"/>
            </svg>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-foreground">
                Vehicle Classification
              </h2>
              <p className="text-xs text-muted-foreground">
                Distribution of vehicles by type (Private, For Hire, Government)
              </p>
            </div>
            {(selectedYear === 'All' && selectedMonth && selectedMonth !== 'All') && (
              <span className="text-sm font-normal text-muted-foreground">
                ({selectedMonth} across all years)
              </span>
            )}
            {(selectedMonth === 'All' && selectedYear && selectedYear !== 'All') && (
              <span className="text-sm font-normal text-muted-foreground">
                (All months in {selectedYear})
              </span>
            )}
          </div>
        </div>
      </div>

       {/* Chart Container */}
       <div className="flex flex-col lg:flex-row gap-4 mb-3">
         {/* Chart Section */}
         <div className="flex-1 flex flex-col items-center">
           <div className="h-64 w-full min-h-[240px] relative flex flex-col">
             {loading || parentLoading ? (
               <div className="flex items-center justify-center w-full h-full">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
               </div>
             ) : error ? (
               <div className="flex items-center justify-center w-full h-full text-red-500">
                 <p>{error}</p>
               </div>
             ) : classificationData.length === 0 ? (
               <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                 <p>No data available</p>
               </div>
             ) : (
               <div className="flex items-center justify-center h-full">
                 <div className="flex-shrink-0 animate-fade-in">
                   <PieChart width={isMobile ? 180 : 220} height={isMobile ? 180 : 220}>
                     <Pie
                       data={formatChartData(classificationData)}
                       cx="50%"
                       cy="50%"
                       labelLine={false}
                       outerRadius={isMobile ? 70 : 85}
                       innerRadius={isMobile ? 20 : 30}
                       fill="#8884d8"
                       dataKey="value"
                       animationBegin={0}
                       animationDuration={1800}
                       animationEasing="ease-out"
                       stroke="#ffffff"
                       strokeWidth={2}
                       startAngle={90}
                       endAngle={450}
                     >
                       {formatChartData(classificationData).map((entry, index) => {
                         const isSelected = selectedSegment === entry.name;
                         const baseColor = getColorForClassification(entry.name);
                         return (
                           <Cell 
                             key={`cell-${entry.name}`} 
                             fill={isSelected ? baseColor : baseColor}
                             stroke="#ffffff"
                             strokeWidth={isSelected ? 3 : 2}
                             style={{
                               filter: isSelected 
                                 ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) brightness(1.1)' 
                                 : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))',
                               transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                               transformOrigin: 'center',
                               opacity: selectedSegment && !isSelected ? 0.5 : 1
                             }}
                             onMouseEnter={(e) => {
                               if (!selectedSegment || isSelected) {
                                 e.target.style.filter = 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25)) brightness(1.05)';
                                 e.target.style.transform = 'scale(1.02)';
                               }
                             }}
                             onMouseLeave={(e) => {
                               if (!selectedSegment || isSelected) {
                                 e.target.style.filter = isSelected 
                                   ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) brightness(1.1)' 
                                   : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))';
                                 e.target.style.transform = 'scale(1)';
                               }
                             }}
                             onClick={() => {
                               if (selectedSegment === entry.name) {
                                 setSelectedSegment(null);
                               } else {
                                 setSelectedSegment(entry.name);
                               }
                             }}
                           />
                         );
                       })}
                     </Pie>
                     <Tooltip 
                       content={<CustomTooltip />}
                       position={{ x: 0, y: 0 }}
                       offset={20}
                     />
                   </PieChart>
                 </div>
               </div>
             )}
           </div>
           
            {/* Labels below chart */}
            {!loading && !parentLoading && classificationData.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mt-0">
                {formatChartData(classificationData).map((entry, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <div 
                      className="w-2.5 h-2.5 rounded-full shadow-sm" 
                      style={{ 
                        backgroundColor: getColorForClassification(entry.name),
                        border: `1px solid ${getColorForClassification(entry.name)}40`
                      }}
                    ></div>
                    <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                      {entry.name}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      ({entry.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
         </div>

         {/* KPI Section - Right Side */}
         {!loading && !parentLoading && classificationData.length > 0 && (
           <div className="flex-shrink-0 w-full lg:w-48 flex flex-col gap-2 mt-6">
             {/* Total Vehicles KPI */}
             <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 shadow-md">
               <div className="flex items-center gap-1.5 mb-0.5">
                 <svg className="w-3 h-3 dark:opacity-90" style={{ color: '#3B82F6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2m5-1a2 2 0 1 0-4 0m8 0a2 2 0 1 0-4 0" />
                 </svg>
                 <div className="text-[10px] font-medium dark:opacity-90" style={{ color: '#3B82F6' }}>Total Vehicles</div>
               </div>
               <div className="text-base font-bold dark:opacity-90" style={{ color: '#3B82F6' }}>
                 {kpis.totalVehicles.toLocaleString()}
               </div>
             </div>
             
             {/* Largest Segment KPI */}
             <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 shadow-md">
               <div className="flex items-center gap-1.5 mb-0.5">
                 <svg className="w-3 h-3 dark:opacity-90" style={{ color: '#10B981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                 </svg>
                 <div className="text-[10px] font-medium dark:opacity-90" style={{ color: '#10B981' }}>Largest Segment</div>
               </div>
               <div className="text-base font-bold dark:opacity-90" style={{ color: '#10B981' }}>
                 {kpis.largestSegment}
               </div>
             </div>
             
             {/* Fleet Diversity KPI */}
             <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 shadow-md">
               <div className="flex items-center gap-1.5 mb-0.5">
                 <svg className="w-3 h-3 dark:opacity-90" style={{ color: getFleetDiversityColor(kpis.fleetDiversity) }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                 </svg>
                 <div className="text-[10px] font-medium dark:opacity-90" style={{ color: getFleetDiversityColor(kpis.fleetDiversity) }}>Fleet Diversity</div>
               </div>
               <div className="text-base font-bold mb-0.5 dark:opacity-90" style={{ color: getFleetDiversityColor(kpis.fleetDiversity) }}>
                 {kpis.fleetDiversity}
               </div>
               <div className="text-[9px] text-gray-600 dark:text-gray-400 italic leading-tight">
                 (Qualitative measure of how balanced the fleet is)
               </div>
             </div>
           </div>
         )}
       </div>

    </div>
  );
};

export default VehicleClassificationChart;
