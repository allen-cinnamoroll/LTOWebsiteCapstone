import React, { useState, useEffect } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { getVehicleClassificationData } from '../../../api/registrationAnalytics.js';
import { getMonthNumber } from '../../../api/registrationAnalytics.js';

const VehicleClassificationChart = ({ selectedMonth, selectedYear, loading: parentLoading }) => {
  const [classificationData, setClassificationData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animationComplete, setAnimationComplete] = useState(false);
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
      
      // Debug: Log the raw data to check for FOR HRE entries
      if (response.success && response.data) {
        console.log('Raw classification data:', response.data);
        const forHreEntries = response.data.filter(item => 
          item.classification && item.classification.toUpperCase() === "FOR HRE"
        );
        if (forHreEntries.length > 0) {
          console.warn('Found FOR HRE entries in data:', forHreEntries);
        } else {
          console.log('No FOR HRE entries found in data - filtering working correctly');
        }
      }
      
      if (response.success) {
        setClassificationData(response.data);
      } else {
        setError('Failed to fetch vehicle classification data');
        setClassificationData([]);
      }
    } catch (err) {
      console.error('Error fetching vehicle classification data:', err);
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
    console.log('formatChartData - Input data:', data);
    // Normalize the data and filter out invalid entries
    const normalizedData = {};
    
    data.forEach((item) => {
      console.log('Processing item:', item);
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
    
    console.log('formatChartData - Final result:', result);
    return result;
  };

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

  // Custom legend component with clean, aligned design
  const CustomLegend = ({ payload }) => {
    return (
      <div className="flex flex-col gap-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full shadow-sm" 
              style={{ 
                backgroundColor: entry.color,
                border: `2px solid ${entry.color}20`
              }}
            ></div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {entry.value}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {entry.payload?.percentage || 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 w-full max-w-2xl mx-auto h-fit shadow-sm dark:!bg-transparent dark:!border-gray-700 min-h-[400px] flex flex-col">
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
       <div className="h-80 w-full min-h-[320px] flex-1 relative flex flex-col">
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
             <div className="flex items-center gap-6">
               {/* Pie Chart */}
               <div className="flex-shrink-0 animate-fade-in">
                 <ResponsiveContainer width={isMobile ? 200 : 280} height={isMobile ? 200 : 280}>
                   <PieChart>
                     <Pie
                       data={formatChartData(classificationData)}
                       cx="50%"
                       cy="50%"
                       labelLine={false}
                       outerRadius={isMobile ? 80 : 100}
                       innerRadius={isMobile ? 20 : 40}
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
                       {formatChartData(classificationData).map((entry, index) => (
                         <Cell 
                           key={`cell-${entry.name}`} 
                           fill={getColorForClassification(entry.name)}
                           stroke="#ffffff"
                           strokeWidth={2}
                           style={{
                             filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))',
                             transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                             transformOrigin: 'center'
                           }}
                           onMouseEnter={(e) => {
                             e.target.style.filter = 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25)) brightness(1.05)';
                             e.target.style.transform = 'scale(1.02)';
                           }}
                           onMouseLeave={(e) => {
                             e.target.style.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))';
                             e.target.style.transform = 'scale(1)';
                           }}
                         />
                       ))}
                     </Pie>
                     <Tooltip 
                       content={<CustomTooltip />}
                       position={{ x: 0, y: 0 }}
                       offset={20}
                     />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
               
               {/* Legend positioned beside the chart */}
               <div className="flex-shrink-0 animate-slide-in-right">
                 <CustomLegend payload={formatChartData(classificationData).map((entry) => ({
                   value: entry.name,
                   color: getColorForClassification(entry.name),
                   payload: { percentage: entry.percentage }
                 }))} />
               </div>
             </div>
           </div>
         )}
       </div>
    </div>
  );
};

export default VehicleClassificationChart;
