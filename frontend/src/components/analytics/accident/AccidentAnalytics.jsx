import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  LineChart,
  Line,
  ComposedChart,
  ScatterChart,
  Scatter,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Car, 
  MapPin,
  Activity,
  Clock,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  Zap,
  Eye,
  Download,
  Filter
} from 'lucide-react';
import apiClient from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import AccidentMap from './AccidentMap';
import AccidentHeatmap from './AccidentHeatmap';
import AccidentComparison from './AccidentComparison';
import EnhancedAccidentMap from './EnhancedAccidentMap';
import ExportUtilities from './ExportUtilities';

// Theme-aware colors that work in both light and dark modes
// Optimized for severity distribution with better contrast
const COLORS = {
  light: ['#DC2626', '#EA580C', '#059669', '#2563EB'], // Red, Orange, Green, Blue
  dark: ['#EF4444', '#F97316', '#10B981', '#3B82F6']   // Brighter versions for dark mode
};

// Animated Number Component
const AnimatedNumber = ({ value, duration = 2000, className = "" }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      let startTime;
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(value * easeOutQuart);
        
        setDisplayValue(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [value, duration, isVisible]);

  return (
    <div ref={ref} className={`${className} transition-all duration-500 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'}`}>
      {displayValue.toLocaleString()}
    </div>
  );
};

// Animated Progress Bar Component
const AnimatedProgressBar = ({ percentage, color = "bg-blue-500", delay = 0 }) => {
  const [width, setWidth] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setWidth(percentage);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, percentage, delay]);

  return (
    <div ref={ref} className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
      <div 
        className={`${color} h-1.5 rounded-full transition-all duration-1000 ease-out`}
        style={{ width: `${width}%` }}
      ></div>
    </div>
  );
};

export function AccidentAnalytics() {
  const [timePeriod, setTimePeriod] = useState('alltime');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('area');
  const [showAdvancedCharts, setShowAdvancedCharts] = useState(false);
  const { token } = useAuth();

  // Detect theme (light/dark mode)
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };
    
    checkTheme();
    
    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  // Get theme-appropriate colors
  const getColors = () => isDarkMode ? COLORS.dark : COLORS.light;

  useEffect(() => {
    fetchAnalyticsData();
  }, [timePeriod]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const timestamp = Date.now(); // Add timestamp to bypass cache
      console.log(`Fetching analytics data for period: ${timePeriod} at ${new Date(timestamp).toISOString()}`);
      
      const [analyticsResponse, riskResponse] = await Promise.all([
        apiClient.get(`/accident/analytics/summary?period=${timePeriod}&_t=${timestamp}`, {
          headers: { Authorization: token }
        }),
        apiClient.get(`/accident/analytics/risk?period=${timePeriod}&_t=${timestamp}`, {
          headers: { Authorization: token }
        })
      ]);

      if (analyticsResponse.data.success) {
        console.log('Frontend received analytics data:', analyticsResponse.data.data);
        console.log('Municipality data:', analyticsResponse.data.data.distributions?.municipality);
        setAnalyticsData(analyticsResponse.data.data);
      }
      
      if (riskResponse.data.success) {
        setRiskData(riskResponse.data.data);
      }
    } catch (err) {
      console.error('Error fetching accident analytics:', err);
      setError('Failed to load accident analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (period) => {
    switch (period) {
      case 'week': return 'Last Week';
      case 'month': return 'Last Month';
      case '3months': return 'Last 3 Months';
      case '6months': return 'Last 6 Months';
      case 'year': return 'Last Year';
      case 'alltime': return 'All Time';
      default: return 'Last 6 Months';
    }
  };

  const formatMonthlyTrends = (trends) => {
    return trends.map(trend => ({
      month: `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}`,
      accidents: trend.count
    }));
  };

  const formatSeverityData = (severityData) => {
    return severityData.map(item => ({
      name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      value: item.count,
      severity: item._id
    }));
  };

  // Custom tooltip component for municipality distribution with green accent
  const MunicipalityTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const municipalityData = formatMunicipalityData(analyticsData.distributions.municipality);
      const entry = municipalityData.find(item => item.name === data.name);
      
      // Get the theme-aware green color (using the third color from the palette)
      const greenColor = getColors()[2]; // Green color
      
      return (
        <div 
          className="p-3 rounded-lg shadow-lg border transition-all duration-200 ease-in-out"
          style={{
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
            color: isDarkMode ? '#f9fafb' : '#111827',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
          }}
        >
          <p className="font-semibold text-sm mb-1">Municipality: {label}</p>
          <p className="text-sm" style={{ color: greenColor, fontWeight: '600' }}>
            Accidents: {data.value} accidents
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip component for severity distribution with dynamic colors
  const SeverityTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const colors = getColors();
      const severityData = formatSeverityData(analyticsData.distributions.severity);
      
      // Map severity levels to specific colors for consistency
      const severityColorMap = {
        'Fatal': colors[0],     // Red
        'Severe': colors[1],    // Orange  
        'Minor': colors[2],     // Green
        'Moderate': colors[3]   // Blue
      };
      
      const segmentColor = severityColorMap[data.name] || colors[0];
      
      // Theme-compatible styling
      const backgroundColor = isDarkMode ? '#1f2937' : '#ffffff';
      const borderColor = segmentColor;
      const textColor = segmentColor;
      
      // Enhanced shadow for better visibility in both themes
      const shadowColor = isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.15)';
      const glowColor = isDarkMode ? `${segmentColor}60` : `${segmentColor}30`;
      
      return (
        <div 
          className="p-3 rounded-lg shadow-lg border transition-all duration-200 ease-in-out"
          style={{
            backgroundColor: backgroundColor,
            border: `2px solid ${borderColor}`,
            boxShadow: `${shadowColor} 0 8px 25px, 0 0 0 1px ${glowColor}`,
            fontWeight: '600',
            backdropFilter: isDarkMode ? 'blur(8px)' : 'none'
          }}
        >
          <p 
            style={{ 
              color: textColor, 
              margin: 0,
              fontSize: '14px',
              fontWeight: '700',
              textShadow: isDarkMode 
                ? `0 0 12px ${segmentColor}80, 0 0 4px ${segmentColor}40` 
                : `0 0 8px ${segmentColor}60, 0 0 2px ${segmentColor}30`,
              filter: isDarkMode ? 'brightness(1.1)' : 'brightness(1)'
            }}
          >
            {`${data.name} : ${data.value}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const formatVehicleTypeData = (vehicleData) => {
    return vehicleData.map(item => ({
      name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      value: item.count,
      type: item._id
    }));
  };

  const formatMunicipalityData = (municipalityData) => {
    console.log('formatMunicipalityData input:', municipalityData);
    const formatted = municipalityData.map(item => ({
      name: item._id,
      accidents: item.count,
      // Add percentage calculation for better insights
      percentage: municipalityData.length > 0 ? 
        ((item.count / municipalityData.reduce((sum, m) => sum + m.count, 0)) * 100).toFixed(1) : 0
    })).sort((a, b) => b.accidents - a.accidents); // Ensure proper sorting by accident count
    console.log('formatMunicipalityData output:', formatted);
    return formatted;
  };

  // Enhanced data formatting for advanced visualizations
  const formatHourlyData = (accidents) => {
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: i, accidents: 0 }));
    
    accidents?.forEach(accident => {
      if (accident.accident_date) {
        const hour = new Date(accident.accident_date).getHours();
        hourlyData[hour].accidents++;
      }
    });
    
    return hourlyData.map(item => ({
      ...item,
      timeLabel: `${item.hour}:00`,
      period: item.hour < 6 ? 'Night' : item.hour < 12 ? 'Morning' : item.hour < 18 ? 'Afternoon' : 'Evening'
    }));
  };

  const formatDayOfWeekData = (accidents) => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayData = Array.from({ length: 7 }, (_, i) => ({ 
      day: i, 
      dayName: dayNames[i], 
      accidents: 0 
    }));
    
    accidents?.forEach(accident => {
      if (accident.accident_date) {
        const day = new Date(accident.accident_date).getDay();
        dayData[day].accidents++;
      }
    });
    
    return dayData;
  };

  const formatSeverityTrendData = (trends, severityData) => {
    const severityTrends = {};
    
    // Initialize severity trends
    severityData?.forEach(severity => {
      severityTrends[severity._id] = Array.from({ length: trends.length }, (_, i) => ({
        month: trends[i].month,
        accidents: 0
      }));
    });
    
    // This would need backend support for severity-specific trends
    return severityTrends;
  };

  const formatRiskCorrelationData = (analyticsData, riskData) => {
    if (!analyticsData || !riskData) return [];
    
    return [
      { category: 'High Risk', accidents: riskData.riskPredictions.highRisk, percentage: riskData.riskPredictions.highRiskPercentage },
      { category: 'Medium Risk', accidents: riskData.riskPredictions.mediumRisk, percentage: 100 - riskData.riskPredictions.highRiskPercentage - riskData.riskPredictions.lowRiskPercentage },
      { category: 'Low Risk', accidents: riskData.riskPredictions.lowRisk, percentage: riskData.riskPredictions.lowRiskPercentage }
    ];
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Enhanced Header - Always visible */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2 animate-in slide-in-from-top-5 fade-in duration-700">
                <AlertTriangle className="h-8 w-8 text-red-500 animate-pulse" />
                Accident Analytics
              </h2>
              <p className="text-muted-foreground">
                Comprehensive analysis of accident data for {getPeriodLabel(timePeriod)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded w-32"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded w-40"></div>
              </div>
            </div>
          </div>

          {/* Enhanced Filter Controls - Skeleton Loading */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="animate-pulse">
              <div className="h-6 bg-muted rounded w-32 mb-2"></div>
              <div className="h-8 bg-muted rounded w-24"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-6 bg-muted rounded w-32 mb-2"></div>
              <div className="h-8 bg-muted rounded w-24"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-6 bg-muted rounded w-32 mb-2"></div>
              <div className="h-8 bg-muted rounded w-24"></div>
            </div>
          </div>
        </div>

        {/* Loading Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-muted rounded w-48 mb-4"></div>
                <div className="h-64 bg-muted rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading Map */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-40 mb-4"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
  return (
    <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Enhanced Header */}
      <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2 animate-in slide-in-from-top-5 fade-in duration-700">
              <AlertTriangle className="h-8 w-8 text-red-500 animate-pulse" />
              Accident Analytics
            </h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of accident data for {getPeriodLabel(timePeriod)}
          </p>
        </div>
          <div className="flex items-center gap-2">
            <ExportUtilities 
              analyticsData={analyticsData}
              riskData={riskData}
              timePeriod={timePeriod}
            />
          </div>
        </div>

        {/* Enhanced Filter Controls */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Advanced:</label>
            <button
              onClick={() => setShowAdvancedCharts(!showAdvancedCharts)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                showAdvancedCharts 
                  ? 'text-white bg-primary hover:bg-primary/90 dark:text-white dark:bg-primary dark:hover:bg-primary/90' 
                  : 'text-foreground bg-background border border-border hover:bg-muted dark:text-foreground dark:bg-background dark:border-border dark:hover:bg-muted'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              {showAdvancedCharts ? 'Hide Advanced' : 'Show Advanced'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Date:</label>
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
                <SelectItem value="alltime">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Chart Type:</label>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">Area Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="composed">Composed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom-5 fade-in duration-700">
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-110 transition-transform duration-300"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Total Accidents</CardTitle>
              <Car className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="relative z-10">
              <AnimatedNumber 
                value={analyticsData.summary.totalAccidents} 
                className="text-2xl font-bold"
                duration={1500}
              />
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {analyticsData.summary.accidentChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-red-500 mr-1 animate-pulse" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-green-500 mr-1 animate-pulse" />
                )}
                {Math.abs(analyticsData.summary.accidentChange)}% from previous period
              </div>
              <AnimatedProgressBar 
                percentage={Math.min((analyticsData.summary.totalAccidents / 100) * 100, 100)}
                color="bg-blue-500"
                delay={200}
              />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-110 transition-transform duration-300"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Fatal Accidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent className="relative z-10">
              <AnimatedNumber 
                value={analyticsData.summary.fatalities} 
                className="text-2xl font-bold text-red-600"
                duration={1800}
              />
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {analyticsData.summary.fatalitiesChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-red-500 mr-1 animate-pulse" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-green-500 mr-1 animate-pulse" />
                )}
                {analyticsData.summary.fatalitiesChange} from previous period
              </div>
              <AnimatedProgressBar 
                percentage={Math.min((analyticsData.summary.fatalities / 10) * 100, 100)}
                color="bg-red-500"
                delay={400}
              />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-110 transition-transform duration-300"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">High Risk Areas</CardTitle>
              <MapPin className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent className="relative z-10">
              <AnimatedNumber 
                value={analyticsData.distributions.municipality.length} 
                className="text-2xl font-bold"
                duration={1600}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Municipalities with accidents
              </p>
              <AnimatedProgressBar 
                percentage={Math.min((analyticsData.distributions.municipality.length / 20) * 100, 100)}
                color="bg-orange-500"
                delay={600}
              />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-110 transition-transform duration-300"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Risk Predictions</CardTitle>
              <Activity className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent className="relative z-10">
              <AnimatedNumber 
                value={riskData ? riskData.riskPredictions.highRiskPercentage : 0} 
                className="text-2xl font-bold"
                duration={2000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                High risk predictions
              </p>
              <AnimatedProgressBar 
                percentage={riskData ? riskData.riskPredictions.highRiskPercentage : 0}
                color="bg-purple-500"
                delay={800}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Monthly Trends */}
        {analyticsData && analyticsData.trends.monthly.length > 0 && (
          <Card className="group hover:shadow-lg transition-all duration-300 animate-in slide-in-from-left-5 fade-in duration-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500 animate-pulse" />
                    Accident Trends Over Time
                  </CardTitle>
              <CardDescription>
                Monthly accident frequency for {getPeriodLabel(timePeriod)}
              </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {chartType.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {chartType === 'area' && (
                <AreaChart data={formatMonthlyTrends(analyticsData.trends.monthly)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                    }}
                      stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                  />
                    <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    }}
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: isDarkMode ? '#f9fafb' : '#111827'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="accidents" 
                    stroke={getColors()[0]} 
                    fill={getColors()[0]} 
                    fillOpacity={0.3}
                    strokeWidth={3}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                </AreaChart>
                )}
                {chartType === 'line' && (
                  <LineChart data={formatMonthlyTrends(analyticsData.trends.monthly)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                      }}
                      stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                    />
                    <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                    <Tooltip 
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                      }}
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                        border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: isDarkMode ? '#f9fafb' : '#111827'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="accidents" 
                      stroke={getColors()[0]} 
                      strokeWidth={3}
                      dot={{ fill: getColors()[0], strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: getColors()[0], strokeWidth: 2 }}
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                )}
                {chartType === 'bar' && (
                  <BarChart data={formatMonthlyTrends(analyticsData.trends.monthly)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                      }}
                      stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                    />
                    <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                    <Tooltip 
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                      }}
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                        border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: isDarkMode ? '#f9fafb' : '#111827'
                      }}
                    />
                    <Bar 
                      dataKey="accidents" 
                      fill={getColors()[0]}
                      radius={[4, 4, 0, 0]}
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                )}
                {chartType === 'composed' && (
                  <ComposedChart data={formatMonthlyTrends(analyticsData.trends.monthly)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                      }}
                      stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                    />
                    <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                    <Tooltip 
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                      }}
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                        border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: isDarkMode ? '#f9fafb' : '#111827'
                      }}
                    />
                    <Bar 
                      dataKey="accidents" 
                      fill={getColors()[0]}
                      fillOpacity={0.6}
                      radius={[4, 4, 0, 0]}
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="accidents" 
                      stroke={getColors()[1]} 
                      strokeWidth={2}
                      dot={false}
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Severity Distribution */}
        {analyticsData && analyticsData.distributions.severity.length > 0 && (
          <Card className="animate-in slide-in-from-right-5 fade-in duration-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-orange-500 animate-pulse" />
                Accident Severity Distribution
              </CardTitle>
              <CardDescription>
                Breakdown of accidents by severity level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={formatSeverityData(analyticsData.distributions.severity)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    innerRadius={40}
                    fill="currentColor"
                    dataKey="value"
                    animationDuration={1500}
                    animationEasing="ease-out"
                  >
                    {formatSeverityData(analyticsData.distributions.severity).map((entry, index) => {
                      const colors = getColors();
                      const severityColorMap = {
                        'Fatal': colors[0],     // Red
                        'Severe': colors[1],    // Orange  
                        'Minor': colors[2],     // Green
                        'Moderate': colors[3]   // Blue
                      };
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={severityColorMap[entry.name] || colors[0]} 
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip content={<SeverityTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Vehicle Type Distribution */}
        {analyticsData && analyticsData.distributions.vehicleType.length > 0 && (
          <Card className="group hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-green-500" />
                Vehicle Type Distribution
              </CardTitle>
              <CardDescription>
                Accidents by vehicle type with enhanced visualization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formatVehicleTypeData(analyticsData.distributions.vehicleType)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis 
                    dataKey="name" 
                    stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: isDarkMode ? '#f9fafb' : '#111827',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
                    }}
                    formatter={(value, name) => [`${value} accidents`, 'Count']}
                    labelFormatter={(label) => `Vehicle Type: ${label}`}
                  />
                  <Bar 
                    dataKey="value" 
                    fill={getColors()[1]}
                    radius={[4, 4, 0, 0]}
                    className="hover:opacity-80 transition-opacity duration-200"
                  />
                </BarChart>
              </ResponsiveContainer>
              
              {/* Enhanced insights below chart */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                {(() => {
                  const vehicleData = formatVehicleTypeData(analyticsData.distributions.vehicleType);
                  const total = vehicleData.reduce((sum, item) => sum + item.value, 0);
                  const topVehicle = vehicleData.reduce((max, current) => 
                    current.value > max.value ? current : max
                  );
                  
                  return (
                    <>
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <div className="text-sm font-medium text-green-700 dark:text-green-300">
                          Most Common
                        </div>
                        <div className="text-lg font-bold text-green-900 dark:text-green-100">
                          {topVehicle.name}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400">
                          {topVehicle.value} accidents ({(topVehicle.value / total * 100).toFixed(1)}%)
                        </div>
                      </div>
                      
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Total Vehicles
                        </div>
                        <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                          {vehicleData.length}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          Vehicle types involved
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Municipality Distribution */}
        {analyticsData && analyticsData.distributions.municipality.length > 0 && (
          <Card className="group hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-500" />
                Top Municipalities by Accidents
                {analyticsData?.distributions?.municipality?.some(m => m._id === "Mati") && (
                  <span className="ml-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full border border-red-200 dark:border-red-800">
                    Mati Included
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Municipalities with highest accident counts and risk analysis
                {analyticsData?.distributions?.municipality?.some(m => m._id === "Mati") && (
                  <span className="block text-green-600 dark:text-green-400 text-sm mt-1">
                    ✅ Mati municipality data has been normalized and included in the analysis
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formatMunicipalityData(analyticsData.distributions.municipality)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis 
                    dataKey="name" 
                    stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip content={<MunicipalityTooltip />} />
                  <Bar 
                    dataKey="accidents" 
                    radius={[4, 4, 0, 0]}
                    className="hover:opacity-80 transition-opacity duration-200"
                  >
                    {formatMunicipalityData(analyticsData.distributions.municipality).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.name === "Mati" ? "#ef4444" : getColors()[2]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              
              {/* Enhanced insights below chart */}
              <div className="mt-4 grid grid-cols-3 gap-4">
                {(() => {
                  const municipalityData = formatMunicipalityData(analyticsData.distributions.municipality);
                  const total = municipalityData.reduce((sum, item) => sum + item.accidents, 0);
                  const topMunicipality = municipalityData.reduce((max, current) => 
                    current.accidents > max.accidents ? current : max
                  );
                  const avgAccidents = total / municipalityData.length;
                  const matiData = municipalityData.find(m => m.name === "Mati");
                  
                  return (
                    <>
                      <div className={`p-3 rounded-lg ${topMunicipality.name === "Mati" ? "bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800" : "bg-orange-50 dark:bg-orange-950/20"}`}>
                        <div className={`text-sm font-medium ${topMunicipality.name === "Mati" ? "text-red-700 dark:text-red-300" : "text-orange-700 dark:text-orange-300"}`}>
                          {topMunicipality.name === "Mati" ? "🏆 Top Municipality" : "Highest Risk"}
                        </div>
                        <div className={`text-lg font-bold ${topMunicipality.name === "Mati" ? "text-red-900 dark:text-red-100" : "text-orange-900 dark:text-orange-100"}`}>
                          {topMunicipality.name}
                        </div>
                        <div className={`text-xs ${topMunicipality.name === "Mati" ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"}`}>
                          {topMunicipality.accidents} accidents ({topMunicipality.percentage}%)
                        </div>
                      </div>
                      
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Total Areas
                        </div>
                        <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                          {municipalityData.length}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          Municipalities affected
                        </div>
                      </div>
                      
                      <div className={`p-3 rounded-lg ${matiData ? "bg-red-50 dark:bg-red-950/20" : "bg-purple-50 dark:bg-purple-950/20"}`}>
                        <div className={`text-sm font-medium ${matiData ? "text-red-700 dark:text-red-300" : "text-purple-700 dark:text-purple-300"}`}>
                          {matiData ? "Mati Status" : "Average"}
                        </div>
                        <div className={`text-lg font-bold ${matiData ? "text-red-900 dark:text-red-100" : "text-purple-900 dark:text-purple-100"}`}>
                          {matiData ? `#${municipalityData.findIndex(m => m.name === "Mati") + 1}` : avgAccidents.toFixed(1)}
                        </div>
                        <div className={`text-xs ${matiData ? "text-red-600 dark:text-red-400" : "text-purple-600 dark:text-purple-400"}`}>
                          {matiData ? `${matiData.accidents} accidents` : "Accidents per area"}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Risk Analysis */}
      {riskData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Level Distribution</CardTitle>
              <CardDescription>
                ML-based risk predictions for accidents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>High Risk</span>
                  </div>
                  <Badge variant="destructive">
                    {riskData.riskPredictions.highRisk} ({riskData.riskPredictions.highRiskPercentage}%)
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>Medium Risk</span>
                  </div>
                  <Badge variant="secondary">
                    {riskData.riskPredictions.mediumRisk}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Low Risk</span>
                  </div>
                  <Badge variant="outline">
                    {riskData.riskPredictions.lowRisk}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rule-Based Detection</CardTitle>
              <CardDescription>
                Traditional rule-based risk assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span>Flagged (High Risk)</span>
                  </div>
                  <Badge variant="destructive">
                    {riskData.ruleBasedDetection.flagged} ({riskData.ruleBasedDetection.flaggedPercentage}%)
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span>Safe (Low Risk)</span>
                  </div>
                  <Badge variant="outline">
                    {riskData.ruleBasedDetection.safe} ({riskData.ruleBasedDetection.safePercentage}%)
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Advanced Charts Section */}
      {showAdvancedCharts && analyticsData && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 fade-in duration-700">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-yellow-500 animate-pulse" />
            <h3 className="text-xl font-semibold">Advanced Analytics</h3>
            <Badge variant="secondary" className="ml-2 animate-pulse">Enhanced Visualizations</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enhanced Hourly Distribution */}
            <Card className="group hover:shadow-lg transition-all duration-300 animate-in slide-in-from-left-5 fade-in duration-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-500 animate-pulse" />
                  Hourly Accident Distribution
                </CardTitle>
                <CardDescription>
                  Accidents by hour of day showing peak times and patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={formatHourlyData(analyticsData.mapData)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis 
                      dataKey="timeLabel" 
                      stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                      fontSize={11}
                      interval={1}
                    />
                    <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                        border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: isDarkMode ? '#f9fafb' : '#111827',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
                      }}
                      formatter={(value, name) => [`${value} accidents`, 'Count']}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <Bar 
                      dataKey="accidents" 
                      fill={getColors()[2]}
                      radius={[2, 2, 0, 0]}
                      className="hover:opacity-80 transition-opacity duration-200"
                    />
                  </BarChart>
                </ResponsiveContainer>
                
                {/* Enhanced insights below chart */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {(() => {
                    const hourlyData = formatHourlyData(analyticsData.mapData);
                    const peakHour = hourlyData.reduce((max, current) => 
                      current.accidents > max.accidents ? current : max
                    );
                    const totalAccidents = hourlyData.reduce((sum, item) => sum + item.accidents, 0);
                    
                    return (
                      <>
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <div className="text-sm font-medium text-green-700 dark:text-green-300">
                            Peak Hour
                          </div>
                          <div className="text-lg font-bold text-green-900 dark:text-green-100">
                            {peakHour.timeLabel}
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400">
                            {peakHour.accidents} accidents
                          </div>
                        </div>
                        
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                          <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            Total Accidents
                          </div>
                          <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                            {totalAccidents}
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            Across all hours
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Day of Week Distribution */}
            <Card className="group hover:shadow-lg transition-all duration-300 animate-in slide-in-from-right-5 fade-in duration-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-500 animate-pulse" />
                  Day of Week Analysis
                </CardTitle>
                <CardDescription>
                  Accident patterns by day of the week with risk assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={formatDayOfWeekData(analyticsData.mapData)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis 
                      dataKey="dayName" 
                      stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                      fontSize={12}
                    />
                    <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                        border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: isDarkMode ? '#f9fafb' : '#111827',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
                      }}
                      formatter={(value, name) => [`${value} accidents`, 'Count']}
                      labelFormatter={(label) => `Day: ${label}`}
                    />
                    <Bar 
                      dataKey="accidents" 
                      fill={getColors()[3]}
                      radius={[2, 2, 0, 0]}
                      className="hover:opacity-80 transition-opacity duration-200"
                    />
                  </BarChart>
                </ResponsiveContainer>
                
                {/* Enhanced insights below chart */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {(() => {
                    const dayData = formatDayOfWeekData(analyticsData.mapData);
                    const peakDay = dayData.reduce((max, current) => 
                      current.accidents > max.accidents ? current : max
                    );
                    const weekendData = dayData.filter(d => d.day === 0 || d.day === 6);
                    const weekendTotal = weekendData.reduce((sum, d) => sum + d.accidents, 0);
                    
                    return (
                      <>
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                          <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                            Peak Day
                          </div>
                          <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                            {peakDay.dayName}
                          </div>
                          <div className="text-xs text-purple-600 dark:text-purple-400">
                            {peakDay.accidents} accidents
                          </div>
                        </div>
                        
                        <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                          <div className="text-sm font-medium text-orange-700 dark:text-orange-300">
                            Weekend Total
                          </div>
                          <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                            {weekendTotal}
                          </div>
                          <div className="text-xs text-orange-600 dark:text-orange-400">
                            Sat + Sun accidents
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Risk Correlation Chart */}
            {riskData && (
              <Card className="group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-red-500" />
                    Risk Level Correlation
                  </CardTitle>
                  <CardDescription>
                    Relationship between risk levels and accident counts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={formatRiskCorrelationData(analyticsData, riskData)}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                      <XAxis 
                        dataKey="category" 
                        stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                        fontSize={12}
                      />
                      <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                          border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: isDarkMode ? '#f9fafb' : '#111827'
                        }}
                      />
                      <Scatter 
                        dataKey="accidents" 
                        fill={getColors()[4]}
                        r={8}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Severity Radial Chart */}
            {analyticsData && analyticsData.distributions.severity.length > 0 && (
              <Card className="group hover:shadow-lg transition-all duration-300">
          <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-orange-500" />
                    Severity Distribution (Radial)
                  </CardTitle>
            <CardDescription>
                    Circular view of accident severity breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadialBarChart 
                      cx="50%" 
                      cy="50%" 
                      innerRadius="20%" 
                      outerRadius="80%" 
                      data={formatSeverityData(analyticsData.distributions.severity)}
                    >
                      <RadialBar 
                        dataKey="value" 
                        cornerRadius={4}
                        fill={getColors()[0]}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                          border: isDarkMode ? '1px solid #4b5563' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: isDarkMode ? '#f9fafb' : '#111827',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
              </div>

          {/* Comparison Analysis */}
          <AccidentComparison 
            analyticsData={analyticsData}
            className="w-full"
          />
              </div>
      )}

      {/* Enhanced Geographic Distribution */}
      {analyticsData && analyticsData.mapData && analyticsData.mapData.length > 0 && (
        <EnhancedAccidentMap 
              accidents={analyticsData.mapData} 
              className="w-full"
            />
      )}
    </div>
  );
}
