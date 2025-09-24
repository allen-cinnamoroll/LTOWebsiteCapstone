import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

const AccidentHeatmap = ({ accidents, className = "" }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [heatmapData, setHeatmapData] = useState(null);

  // Detect theme
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };
    
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  // Generate heatmap data
  useEffect(() => {
    if (!accidents || accidents.length === 0) return;

    const data = generateHeatmapData(accidents, selectedPeriod);
    setHeatmapData(data);
  }, [accidents, selectedPeriod]);

  const generateHeatmapData = (accidents, period) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    
    // Initialize heatmap matrix
    const heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    const totalAccidents = accidents.length;
    
    // Count accidents by day and hour
    accidents.forEach(accident => {
      if (accident.accident_date) {
        const date = new Date(accident.accident_date);
        const day = date.getDay();
        const hour = date.getHours();
        heatmap[day][hour]++;
      }
    });

    // Find max value for intensity calculation
    const maxValue = Math.max(...heatmap.flat());
    
    // Convert to heatmap data format
    const data = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const count = heatmap[day][hour];
        const intensity = maxValue > 0 ? count / maxValue : 0;
        
        data.push({
          day,
          hour,
          dayName: dayNames[day],
          hourLabel: hourLabels[hour],
          count,
          intensity,
          percentage: totalAccidents > 0 ? (count / totalAccidents) * 100 : 0
        });
      }
    }

    return {
      data,
      maxValue,
      totalAccidents,
      dayNames,
      hourLabels
    };
  };

  const getIntensityColor = (intensity) => {
    if (intensity === 0) return isDarkMode ? '#374151' : '#f3f4f6';
    
    const colors = [
      '#fef3c7', // Very light
      '#fde68a', // Light
      '#f59e0b', // Medium
      '#d97706', // High
      '#b45309', // Very high
      '#92400e'  // Highest
    ];
    
    const colorIndex = Math.min(Math.floor(intensity * colors.length), colors.length - 1);
    return colors[colorIndex];
  };

  const getTextColor = (intensity) => {
    return intensity > 0.5 ? '#ffffff' : (isDarkMode ? '#9ca3af' : '#6b7280');
  };

  if (!heatmapData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Accident Heatmap
          </CardTitle>
          <CardDescription>Loading heatmap data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Accident Heatmap
            </CardTitle>
            <CardDescription>
              Accident frequency by day of week and hour of day
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {heatmapData.totalAccidents} Total
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Peak: {heatmapData.maxValue}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Heatmap Grid */}
          <div className="grid grid-cols-25 gap-1 p-4 bg-muted/30 rounded-lg">
            {/* Hour labels (top) */}
            <div></div>
            {heatmapData.hourLabels.map((hour, index) => (
              <div key={index} className="text-xs text-center text-muted-foreground font-medium">
                {index % 4 === 0 ? hour : ''}
              </div>
            ))}
            
            {/* Day rows */}
            {heatmapData.dayNames.map((dayName, dayIndex) => (
              <React.Fragment key={dayIndex}>
                {/* Day label */}
                <div className="text-xs text-muted-foreground font-medium flex items-center justify-center">
                  {dayName}
                </div>
                
                {/* Hour cells for this day */}
                {Array.from({ length: 24 }, (_, hourIndex) => {
                  const cellData = heatmapData.data.find(
                    d => d.day === dayIndex && d.hour === hourIndex
                  );
                  
                  return (
                    <div
                      key={`${dayIndex}-${hourIndex}`}
                      className="relative group cursor-pointer rounded-sm transition-all duration-200 hover:scale-110 hover:z-10"
                      style={{
                        backgroundColor: getIntensityColor(cellData?.intensity || 0),
                        minHeight: '20px',
                        minWidth: '20px'
                      }}
                      title={`${dayName} ${cellData?.hourLabel}: ${cellData?.count || 0} accidents (${cellData?.percentage?.toFixed(1) || 0}%)`}
                    >
                      {cellData?.count > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span 
                            className="text-xs font-medium"
                            style={{ color: getTextColor(cellData.intensity) }}
                          >
                            {cellData.count}
                          </span>
                        </div>
                      )}
                      
                      {/* Hover tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20">
                        {dayName} {cellData?.hourLabel}<br/>
                        {cellData?.count || 0} accidents<br/>
                        {cellData?.percentage?.toFixed(1) || 0}% of total
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Intensity:</span>
              <div className="flex items-center gap-1">
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, index) => (
                  <div
                    key={index}
                    className="w-4 h-4 rounded-sm border border-gray-300"
                    style={{ backgroundColor: getIntensityColor(intensity) }}
                    title={`${Math.round(intensity * 100)}% intensity`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">Low → High</span>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>Peak: {heatmapData.maxValue} accidents</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Total: {heatmapData.totalAccidents}</span>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {(() => {
              const peakDay = heatmapData.data.reduce((max, current) => 
                current.count > max.count ? current : max
              );
              const peakHour = heatmapData.data.reduce((max, current) => 
                current.count > max.count ? current : max
              );
              const totalWeekend = heatmapData.data
                .filter(d => d.day === 0 || d.day === 6)
                .reduce((sum, d) => sum + d.count, 0);
              
              return (
                <>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Peak Day
                    </div>
                    <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {peakDay.dayName}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      {peakDay.count} accidents
                    </div>
                  </div>
                  
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-sm font-medium text-green-700 dark:text-green-300">
                      Peak Hour
                    </div>
                    <div className="text-lg font-bold text-green-900 dark:text-green-100">
                      {peakHour.hourLabel}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      {peakHour.count} accidents
                    </div>
                  </div>
                  
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      Weekend Total
                    </div>
                    <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                      {totalWeekend}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">
                      {((totalWeekend / heatmapData.totalAccidents) * 100).toFixed(1)}% of total
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccidentHeatmap;
