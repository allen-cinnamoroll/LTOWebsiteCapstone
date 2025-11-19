import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Filter,
  Loader2
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
  const [predLoading, setPredLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('area');
  const [isMobile, setIsMobile] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [predError, setPredError] = useState(null);
  const now = new Date();
  const [predYear, setPredYear] = useState(now.getFullYear());
  const [predMonth, setPredMonth] = useState(now.getMonth() + 1);
  const [predScope, setPredScope] = useState('barangay'); // 'barangay' | 'municipality'
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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
      
      const [analyticsResponse, riskResponse] = await Promise.all([
        apiClient.get(`/accident/analytics/summary?period=${timePeriod}&_t=${timestamp}`, {
          headers: { Authorization: token }
        }),
        apiClient.get(`/accident/analytics/risk?period=${timePeriod}&_t=${timestamp}`, {
          headers: { Authorization: token }
        })
      ]);

      if (analyticsResponse.data.success) {
        setAnalyticsData(analyticsResponse.data.data);
      }
      
      if (riskResponse.data.success) {
        setRiskData(riskResponse.data.data);
      }
    } catch (err) {
      setError('Failed to load accident analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Aggregate predictions by municipality when scope is 'municipality'
  const scopedPredictions = useMemo(() => {
    if (!predictions || predictions.length === 0) return [];
    if (predScope === 'barangay') {
      // Limit to top 10 barangays (already limited by API, but ensure sorting)
      return predictions.slice().sort((a,b)=> (b.predicted_count||0) - (a.predicted_count||0)).slice(0, 10);
    }
    // aggregate by municipality
    const map = new Map();
    predictions.forEach(p => {
      const key = p.municipality || 'Unknown';
      const current = map.get(key) || { municipality: key, predicted_count: 0 };
      const add = typeof p.predicted_count === 'number' ? p.predicted_count : Number(p.predicted_count || 0);
      current.predicted_count += add;
      map.set(key, current);
    });
    // Sort by predicted count and limit to top 10 municipalities
    return Array.from(map.values()).sort((a,b)=> (b.predicted_count||0) - (a.predicted_count||0)).slice(0, 10);
  }, [predictions, predScope]);

  // Memoize chart data computation to avoid recalculating on every render
  const chartData = useMemo(() => {
    if (!scopedPredictions || scopedPredictions.length === 0) return null;
    
    const items = scopedPredictions.map(p => ({
      label: predScope === 'barangay' ? `${p.municipality} • ${p.barangay}` : p.municipality,
      value: typeof p.predicted_count === 'number' ? p.predicted_count : Number(p.predicted_count || 0)
    }));
    
    const total = items.reduce((s, x) => s + (x.value || 0), 0);
    const avg = items.length ? total / items.length : 0;
    const peak = items.reduce((m, x) => (x.value > (m?.value || 0) ? x : m), null);
    const variance = items.length ? items.reduce((s, x) => s + Math.pow((x.value || 0) - avg, 2), 0) / items.length : 0;
    const std = Math.sqrt(variance);
    const volatility = avg > 0 ? Math.round((std / avg) * 100) : 0;
    const trendLabel = volatility > 35 ? 'Decreasing' : volatility < 15 ? 'Increasing' : 'Stable';
    const trendColor = trendLabel === 'Increasing' ? 'text-green-600' : trendLabel === 'Decreasing' ? 'text-red-600' : 'text-gray-600';
    
    // Choose top N for chart - limit to 10 for both barangay and municipality scope
    const topForChart = items
      .slice()
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(x => ({ name: x.label, value: x.value }));
    
    return {
      items,
      total,
      avg,
      peak,
      volatility,
      trendLabel,
      trendColor,
      topForChart
    };
  }, [scopedPredictions, predScope]);

  // Auto-fetch predictions whenever year/month/scope changes with debouncing
  useEffect(() => {
    // Debounce to avoid rapid API calls when user changes filters quickly
    const timeoutId = setTimeout(() => {
      fetchAccidentPredictions();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predYear, predMonth, predScope]);

  // Fetch predictions from Flask API
  const fetchAccidentPredictions = async () => {
    try {
      setPredLoading(true);
      setPredError(null);
      // Don't clear previous predictions immediately - keep them visible while loading
      const baseUrl = import.meta?.env?.VITE_ACCIDENT_PRED_API || 'http://localhost:5004';
      const healthUrl = `${baseUrl}/api/accidents/health`;
      // Limit to top 10 barangays for faster performance (based on historical accident counts)
      const url = `${baseUrl}/api/accidents/predict/all?year=${predYear}&month=${predMonth}&limit=10`;

      // helper with timeout
      const fetchWithTimeout = (resource, options = {}, timeout = 30000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        return fetch(resource, { ...options, signal: controller.signal })
          .finally(() => clearTimeout(id));
      };

      // optional health check (non-blocking) - skip to speed up
      // try {
      //   await fetchWithTimeout(healthUrl, { headers: { 'Content-Type': 'application/json' } }, 3000);
      // } catch (_) {
      //   // ignore health failures, proceed to main request
      // }

      // retry logic for transient network errors like ECONNRESET
      let attempt = 0;
      let lastErr = null;
      while (attempt < 2) {
        try {
          // Timeout set to 15 seconds - predicting top 10 barangays is much faster
          const res = await fetchWithTimeout(url, {
            headers: { 'Content-Type': 'application/json' }
          }, 15000);
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `Failed to fetch predictions (HTTP ${res.status})`);
          }
          const data = await res.json();
          if (!data.success) {
            throw new Error(data.error || 'Prediction API returned an error');
          }
          setPredictions(Array.isArray(data.predictions) ? data.predictions : []);
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          // small backoff before retry
          if (attempt < 1) {
            await new Promise(r => setTimeout(r, 500));
          }
          attempt += 1;
        }
      }
      if (lastErr) {
        throw lastErr;
      }
    } catch (e) {
      // Normalize common network error messages
      const msg = (e && e.message ? String(e.message) : 'Request failed').toLowerCase();
      if (msg.includes('aborted') || msg.includes('timeout')) {
        setPredError('Prediction request timed out. Please try again.');
      } else if (msg.includes('econnreset') || msg.includes('network') || msg.includes('failed to fetch')) {
        setPredError('Cannot reach prediction service. Ensure the Flask API is running and accessible.');
      } else {
        setPredError(e.message || 'Failed to fetch predictions');
      }
      // Only clear predictions on error, not on timeout/network issues
      if (!msg.includes('timeout') && !msg.includes('network')) {
        setPredictions([]);
      }
    } finally {
      setPredLoading(false);
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
    if (!trends || !Array.isArray(trends)) return [];
    
    const formatted = trends.map(trend => {
      // Validate trend structure
      if (!trend || !trend._id || trend._id.year === undefined || trend._id.month === undefined) {
        return null;
      }
      
      const year = trend._id.year;
      const month = String(trend._id.month).padStart(2, '0');
      const dateString = `${year}-${month}-01`;
      
      // Validate date string
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null;
      }
      
      return {
        month: dateString,
        accidents: trend.count || 0
      };
    }).filter(item => item !== null);
    
    // Sort by date to ensure chronological order
    return formatted.sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const formatSeverityData = (severityData) => {
    return severityData.map(item => ({
      name: item._id ? item._id.charAt(0).toUpperCase() + item._id.slice(1) : 'Unknown',
      value: item.count,
      severity: item._id || 'unknown'
    }));
  };

  const buildYearlyPredictionComparison = (trends) => {
    const formattedTrends = formatMonthlyTrends(trends);
    if (!formattedTrends || formattedTrends.length === 0) return [];

    const sortedTrends = [...formattedTrends].sort(
      (a, b) => new Date(a.month) - new Date(b.month)
    );
    const lastYearData = sortedTrends.slice(-12);
    if (lastYearData.length === 0) return [];

    const regressionData = lastYearData.map((item, index) => ({
      x: index,
      y: item.accidents || 0
    }));

    const n = regressionData.length;
    if (n === 0) return [];

    const sumX = regressionData.reduce((sum, point) => sum + point.x, 0);
    const sumY = regressionData.reduce((sum, point) => sum + point.y, 0);
    const sumXY = regressionData.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = regressionData.reduce((sum, point) => sum + point.x * point.x, 0);

    const denominator = n * sumXX - sumX * sumX;
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    const intercept = n !== 0 ? (sumY - slope * sumX) / n : 0;

    const predictions = Array.from({ length: 12 }, (_, index) => {
      const x = n + index;
      const value = slope * x + intercept;
      return value < 0 ? 0 : Math.round(value);
    });

    return lastYearData.map((item, index) => {
      const date = new Date(item.month);
      const monthLabel = isNaN(date.getTime())
        ? `M${index + 1}`
        : date.toLocaleString('en-US', { month: 'short' });

      return {
        month: monthLabel,
        actual: item.accidents || 0,
        prediction2026: predictions[index] ?? predictions[predictions.length - 1] ?? 0
      };
    });
  };

  const yearlyPredictionData = useMemo(() => {
    if (!analyticsData?.trends?.monthly) return [];
    return buildYearlyPredictionComparison(analyticsData.trends.monthly);
  }, [analyticsData]);

  const yearlyPredictionSummary = useMemo(() => {
    if (!yearlyPredictionData.length) return null;

    const actualTotal = yearlyPredictionData.reduce((sum, item) => sum + (item.actual || 0), 0);
    const predictedTotal = yearlyPredictionData.reduce((sum, item) => sum + (item.prediction2026 || 0), 0);
    const growth = actualTotal > 0 ? ((predictedTotal - actualTotal) / actualTotal) * 100 : 0;

    return {
      actualTotal,
      predictedTotal,
      growth: Number.isFinite(growth) ? growth : 0
    };
  }, [yearlyPredictionData]);

  const formatOffenseTypeData = (offenseData) => {
    return offenseData.map(item => ({
      name: item._id || 'Unknown',
      value: item.count,
      type: item._id || 'unknown'
    }));
  };

  const formatCaseStatusData = (caseStatusData) => {
    return caseStatusData.map(item => ({
      name: item._id || 'Unknown',
      value: item.count,
      status: item._id || 'unknown'
    }));
  };

  const formatHourlyData = (hourlyData) => {
    // Create 24-hour array
    // Data is based on timeCommited (when available) or dateCommited hour (fallback)
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, '0')}:00`,
      accidents: 0
    }));
    
    // Fill in actual data from backend aggregation
    // Backend now uses timeCommited when available, falls back to dateCommited hour
    if (hourlyData && Array.isArray(hourlyData)) {
      hourlyData.forEach(item => {
        if (item._id !== null && item._id !== undefined && item._id >= 0 && item._id < 24) {
          hours[item._id].accidents = item.count || 0;
        }
      });
    }
    
    return hours;
  };

  const formatDayOfWeekData = (dayData) => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const days = Array.from({ length: 7 }, (_, i) => ({
      day: i + 1, // MongoDB dayOfWeek starts at 1
      name: dayNames[i],
      accidents: 0
    }));
    
    // Fill in actual data
    dayData.forEach(item => {
      if (item._id >= 1 && item._id <= 7) {
        days[item._id - 1].accidents = item.count;
      }
    });
    
    return days;
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

  // Custom tooltip for High-Risk Time Prediction to avoid duplicate "accidents" labels
  const HighRiskTimeTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0];
    const value = data.value ?? 0;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-lg">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {label}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.color || getColors()[3] }}
          ></span>
          <span>
            Accidents: <span className="font-medium">{value}</span>
          </span>
        </div>
      </div>
    );
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
      name: item._id ? item._id.charAt(0).toUpperCase() + item._id.slice(1) : 'Unknown',
      value: item.count,
      type: item._id || 'unknown'
    }));
  };

  const formatMunicipalityData = (municipalityData) => {
    const formatted = municipalityData.map(item => ({
      name: item._id || 'Unknown',
      accidents: item.count,
      // Add percentage calculation for better insights
      percentage: municipalityData.length > 0 ? 
        ((item.count / municipalityData.reduce((sum, m) => sum + m.count, 0)) * 100).toFixed(1) : 0
    })).sort((a, b) => b.accidents - a.accidents); // Ensure proper sorting by accident count
    return formatted;
  };

  // Enhanced data formatting for advanced visualizations
  if (loading) {
    return (
      <div className="container mx-auto p-6 bg-white dark:bg-black min-h-screen space-y-6 rounded-lg">
        {/* Enhanced Header - Always visible */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight animate-in slide-in-from-top-5 fade-in duration-700">
                Accident Analytics
              </h2>
              <p className="text-muted-foreground">
                Comprehensive Analysis of Accident Data
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
      <div className="container mx-auto p-6 bg-white dark:bg-black min-h-screen rounded-lg">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-white dark:bg-black min-h-screen space-y-6">
      {/* Enhanced Header */}
      <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight animate-in slide-in-from-top-5 fade-in duration-700">
              Accident Analytics
            </h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of accident data
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-bottom-5 fade-in duration-700">
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
          <Card className="order-1 lg:col-span-2 group hover:shadow-lg transition-all duration-300 animate-in slide-in-from-left-5 fade-in duration-700">
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
                      if (!value) return '';
                      const date = new Date(value);
                      if (isNaN(date.getTime())) return value;
                      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                    }}
                      stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                  />
                    <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip 
                    labelFormatter={(value) => {
                      if (!value) return '';
                      const date = new Date(value);
                      if (isNaN(date.getTime())) return value;
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
                        if (!value) return '';
                        const date = new Date(value);
                        if (isNaN(date.getTime())) return value;
                        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                      }}
                      stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                    />
                    <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                    <Tooltip 
                      labelFormatter={(value) => {
                        if (!value) return '';
                        const date = new Date(value);
                        if (isNaN(date.getTime())) return value;
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
                        if (!value) return '';
                        const date = new Date(value);
                        if (isNaN(date.getTime())) return value;
                        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                      }}
                      stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                    />
                    <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                    <Tooltip 
                      labelFormatter={(value) => {
                        if (!value) return '';
                        const date = new Date(value);
                        if (isNaN(date.getTime())) return value;
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
                        if (!value) return '';
                        const date = new Date(value);
                        if (isNaN(date.getTime())) return value;
                        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                      }}
                      stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                    />
                    <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                    <Tooltip 
                      labelFormatter={(value) => {
                        if (!value) return '';
                        const date = new Date(value);
                        if (isNaN(date.getTime())) return value;
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

        {/* Day of Week Distribution */}
        {analyticsData && analyticsData.distributions.dayOfWeek && analyticsData.distributions.dayOfWeek.length > 0 && (
          <Card className="order-3 group hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-500" />
                Weekly Accident Pattern
              </CardTitle>
              <CardDescription>
                Day of week distribution showing high-risk days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formatDayOfWeekData(analyticsData.distributions.dayOfWeek)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis 
                    dataKey="name"
                    stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={70}
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
                  <Bar 
                    dataKey="accidents" 
                    fill={getColors()[2]}
                    radius={[8, 8, 0, 0]}
                    animationDuration={1500}
                  >
                    {formatDayOfWeekData(analyticsData.distributions.dayOfWeek).map((entry, index) => {
                      // Highlight weekends (Friday, Saturday, Sunday)
                      const isWeekend = ['Friday', 'Saturday', 'Sunday'].includes(entry.name);
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={isWeekend ? getColors()[0] : getColors()[2]}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {(() => {
                  const dayData = formatDayOfWeekData(analyticsData.distributions.dayOfWeek);
                  const weekdayAccidents = dayData.slice(1, 6).reduce((sum, d) => sum + d.accidents, 0);
                  const weekendAccidents = dayData[0].accidents + dayData[5].accidents + dayData[6].accidents;
                  
                  return (
                    <>
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded">
                        <div className="text-sm font-medium text-green-700 dark:text-green-300">Weekdays</div>
                        <div className="text-lg font-bold text-green-900 dark:text-green-100">{weekdayAccidents}</div>
                        <div className="text-xs text-green-600 dark:text-green-400">Mon-Fri</div>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded">
                        <div className="text-sm font-medium text-red-700 dark:text-red-300">Weekends</div>
                        <div className="text-lg font-bold text-red-900 dark:text-red-100">{weekendAccidents}</div>
                        <div className="text-xs text-red-600 dark:text-red-400">Sat-Sun + Fri</div>
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
          <Card className="order-2 group hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-500" />
                Top Municipalities by Accidents
              </CardTitle>
              <CardDescription>
                Municipalities with highest accident counts and risk analysis
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
                        fill={getColors()[2]}
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
                      <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                        <div className="text-sm font-medium text-orange-700 dark:text-orange-300">
                          Highest Risk
                        </div>
                        <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                          {topMunicipality.name}
                        </div>
                        <div className="text-xs text-orange-600 dark:text-orange-400">
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
                      
                      <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                        <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                          Average
                        </div>
                        <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                          {avgAccidents.toFixed(1)}
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-400">
                          Accidents per area
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

      {/* PREDICTIVE ANALYTICS SECTION */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="h-6 w-6 text-yellow-500" />
          <h3 className="text-2xl font-bold">Predictive Analytics</h3>
          <Badge variant="outline" className="ml-auto">ML-Powered Forecasting</Badge>
        </div>

        <div className="space-y-6">
          {/* Predicted Accidents per Barangay */}
          <Card className="border-yellow-200 dark:border-yellow-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-yellow-500" />
                Predicted Accidents
              </CardTitle>
              <CardDescription>
                Random Forest regression predictions for top 10 barangays (by historical accident counts) for selected month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Year</label>
                  <Select value={String(predYear)} onValueChange={(v) => setPredYear(Number(v))}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[predYear - 1, predYear, predYear + 1].map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Month</label>
                  <Select value={String(predMonth)} onValueChange={(v) => setPredMonth(Number(v))}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { v: 1, n: 'January' }, { v: 2, n: 'February' }, { v: 3, n: 'March' },
                        { v: 4, n: 'April' }, { v: 5, n: 'May' }, { v: 6, n: 'June' },
                        { v: 7, n: 'July' }, { v: 8, n: 'August' }, { v: 9, n: 'September' },
                        { v: 10, n: 'October' }, { v: 11, n: 'November' }, { v: 12, n: 'December' }
                      ].map(m => (
                        <SelectItem key={m.v} value={String(m.v)}>{m.n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Scope</label>
                  <Select value={predScope} onValueChange={setPredScope}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barangay">Barangay</SelectItem>
                      <SelectItem value="municipality">Municipality</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {predError && (
                <div className="p-3 rounded border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-sm text-red-700 dark:text-red-300 mb-3">
                  {predError}
                </div>
              )}

              {/* Initial loading state for predictions - show skeleton or spinner */}
              {predLoading && (!chartData || chartData.items.length === 0) && !predError && (
                <div className="flex flex-col items-center justify-center w-full py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                </div>
              )}

              {/* KPI tiles + Bar chart (using memoized chartData) */}
              {chartData && chartData.items.length > 0 && (
                <div className="relative">
                  {/* Show loading overlay on top of existing data when refreshing */}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="rounded-lg border bg-blue-50/40 dark:bg-blue-950/10 p-4">
                      <div className="text-sm text-muted-foreground">Total Predicted</div>
                      <div className="text-2xl font-bold">{chartData.total.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{chartData.items.length} areas • Avg: {Math.round(chartData.avg).toLocaleString()}</div>
                    </div>
                    <div className="rounded-lg border bg-rose-50/40 dark:bg-rose-950/10 p-4">
                      <div className="text-sm text-muted-foreground">Trend Direction</div>
                      <div className={`text-2xl font-bold ${chartData.trendColor}`}>{chartData.trendLabel}</div>
                      <div className="text-xs text-muted-foreground">heuristic based on dispersion</div>
                    </div>
                    <div className="rounded-lg border bg-yellow-50/40 dark:bg-yellow-950/10 p-4">
                      <div className="text-sm text-muted-foreground">Peak Area</div>
                      <div className="text-xl font-bold break-words leading-tight min-h-[2.5rem]" title={chartData.peak?.label || ''}>
                        {chartData.peak?.label || '—'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{chartData.peak ? `${chartData.peak.value.toLocaleString()} (highest)` : ''}</div>
                    </div>
                    <div className="rounded-lg border bg-red-50/40 dark:bg-red-950/10 p-4">
                      <div className="text-sm text-muted-foreground">Volatility</div>
                      <div className="text-2xl font-bold">{chartData.volatility}%</div>
                      <div className="text-xs text-muted-foreground">std/avg across areas</div>
                    </div>
                  </div>

                  <div className="w-full">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={chartData.topForChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10 }} 
                          interval={0} 
                          angle={-25} 
                          textAnchor="end" 
                          height={60}
                          style={{ textOverflow: 'ellipsis' }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: 8, 
                            borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                            color: isDarkMode ? '#f9fafb' : '#111827'
                          }} 
                        />
                        <defs>
                          <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.4} />
                          </linearGradient>
                        </defs>
                        <Bar dataKey="value" fill="url(#predGrad)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Top {chartData.topForChart.length} {predScope === 'municipality' ? 'municipalities' : 'barangays'} – Predicted accidents
                    </div>
                  </div>
                </div>
              )}

              {/* Table removed as requested */}
            </CardContent>
          </Card>
        
        {/* Temporal Risk Prediction below Predicted Accidents */}
        {analyticsData && analyticsData.distributions.hourly && (
          <Card className="border-yellow-200 dark:border-yellow-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  High-Risk Time Prediction
                </CardTitle>
                <CardDescription>
                  Predicted accident hotspots by hour (temporal pattern analysis)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={formatHourlyData(analyticsData.distributions.hourly)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis 
                      dataKey="label"
                      stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                      fontSize={9}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                    <Tooltip content={<HighRiskTimeTooltip />} />
                    <Area 
                      type="monotone"
                      dataKey="accidents" 
                      fill={getColors()[3]}
                      stroke={getColors()[3]}
                      fillOpacity={0.3}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="accidents" 
                      stroke={getColors()[0]} 
                      strokeWidth={2}
                      dot={{ fill: getColors()[0], r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {(() => {
                    const hourlyData = formatHourlyData(analyticsData.distributions.hourly);
                    const totalAccidents = hourlyData.reduce((sum, item) => sum + item.accidents, 0);
                    const averageAccidents = totalAccidents / 24;
                    
                    // Find high-risk hours (above average + 1 standard deviation)
                    const variance = hourlyData.reduce((sum, item) => {
                      return sum + Math.pow(item.accidents - averageAccidents, 2);
                    }, 0) / 24;
                    const stdDev = Math.sqrt(variance);
                    const highRiskThreshold = averageAccidents + stdDev;
                    
                    // Find low-risk hours (below average)
                    const highRiskHours = [];
                    const lowRiskHours = [];
                    
                    hourlyData.forEach((item, index) => {
                      if (item.accidents >= highRiskThreshold) {
                        highRiskHours.push(index);
                      } else if (item.accidents < averageAccidents && item.accidents > 0) {
                        lowRiskHours.push(index);
                      }
                    });
                    
                    // Format hour ranges with AM/PM
                    const formatHourRange = (hours) => {
                      if (hours.length === 0) return '';
                      
                      // Sort hours to ensure proper grouping
                      const sortedHours = [...hours].sort((a, b) => a - b);
                      
                      const formatHour = (hour) => {
                        if (hour === 0) return '12 AM';
                        if (hour < 12) return `${hour} AM`;
                        if (hour === 12) return '12 PM';
                        return `${hour - 12} PM`;
                      };
                      
                      if (sortedHours.length === 1) {
                        return formatHour(sortedHours[0]);
                      }
                      
                      // Group consecutive hours
                      const ranges = [];
                      let start = sortedHours[0];
                      let end = sortedHours[0];
                      
                      for (let i = 1; i < sortedHours.length; i++) {
                        if (sortedHours[i] === end + 1) {
                          // Consecutive hour, extend range
                          end = sortedHours[i];
                        } else {
                          // Gap found, save current range and start new one
                          if (start === end) {
                            ranges.push(formatHour(start));
                          } else {
                            ranges.push(`${formatHour(start)} – ${formatHour(end)}`);
                          }
                          start = sortedHours[i];
                          end = sortedHours[i];
                        }
                      }
                      
                      // Add the last range
                      if (start === end) {
                        ranges.push(formatHour(start));
                      } else {
                        ranges.push(`${formatHour(start)} – ${formatHour(end)}`);
                      }
                      
                      return ranges.join(', ');
                    };
                    
                    const highRiskPeriods = formatHourRange(highRiskHours);
                    const lowRiskPeriods = formatHourRange(lowRiskHours);
                    
                    return (
                      <>
                        {highRiskPeriods && (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded">
                            <span className="text-sm font-medium flex-shrink-0">⚠️ Predicted High Risk: <span className="font-semibold">{highRiskPeriods}</span></span>
                            <Badge variant="destructive" className="self-start sm:self-auto">DEPLOY PATROLS</Badge>
                          </div>
                        )}
                        {lowRiskPeriods && (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <span className="text-sm font-medium flex-shrink-0">✓ Predicted Low Risk: <span className="font-semibold">{lowRiskPeriods}</span></span>
                            <Badge variant="outline" className="self-start sm:self-auto">STANDARD MONITORING</Badge>
                          </div>
                        )}
                        {!highRiskPeriods && !lowRiskPeriods && (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                            <span className="text-sm font-medium">ℹ️ Analyzing hourly patterns...</span>
                            <Badge variant="outline" className="self-start sm:self-auto">MONITORING</Badge>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </CardContent>
          </Card>
        )}
        </div>
      </div>

      {/* PRESCRIPTIVE ANALYTICS SECTION */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-6">
          <Target className="h-6 w-6 text-green-500" />
          <h3 className="text-2xl font-bold">Prescriptive Analytics</h3>
          <Badge variant="outline" className="ml-auto">Action Recommendations</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recommended Interventions (AI-Prescribed) - fill full width and split in two */}
          {scopedPredictions && scopedPredictions.length > 0 && (
            <Card className="border-green-200 dark:border-green-900 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  Recommended Interventions
                </CardTitle>
                <CardDescription>
                  {predScope === 'barangay'
                    ? 'Rule-based interventions per barangay derived from predicted accident counts and PNP SOP guidance'
                    : 'Rule-based interventions per municipality derived from predicted accident counts and PNP SOP guidance'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(() => {
                    // Build items based on current prediction scope
                    const baseItems = predScope === 'barangay'
                      ? scopedPredictions.slice(0, 10)
                      : scopedPredictions.slice(0, 10).map(p => {
                          const count = typeof p.predicted_count === 'number'
                            ? p.predicted_count
                            : Number(p.predicted_count || 0);

                          let level = 'LOW';
                          const actions = [];

                          if (count >= 20) {
                            level = 'CRITICAL';
                            actions.push(
                              'Deploy maximum traffic enforcement units during identified high-risk hours.',
                              'Coordinate with LGU for temporary engineering controls (barriers, signage, speed humps).',
                              'Conduct intensive information and education campaigns focusing on speeding and drunk driving.'
                            );
                          } else if (count >= 12) {
                            level = 'HIGH';
                            actions.push(
                              'Increase PNP checkpoints and roving patrols during peak risk periods.',
                              'Tighten enforcement of helmet, seatbelt, and speed limit regulations.',
                              'Engage barangay officials for joint visibility and enforcement operations.'
                            );
                          } else if (count >= 5) {
                            level = 'MEDIUM';
                            actions.push(
                              'Maintain regular patrols and random checkpoints.',
                              'Monitor for emerging hotspots and repeat violators.',
                              'Enhance signage visibility and road markings where needed.'
                            );
                          } else {
                            level = 'LOW';
                            actions.push(
                              'Sustain standard patrol coverage and routine enforcement.',
                              'Continue safety information campaigns through barangay channels.'
                            );
                          }

                          return {
                            ...p,
                            barangay: null,
                            predicted_count: count,
                            prescription: {
                              level,
                              actions
                            }
                          };
                        });

                    return baseItems.map((p, idx) => (
                    <div key={`${p.municipality}-${p.barangay}-${idx}`} className="p-3 rounded border border-border">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold">
                          {predScope === 'barangay'
                            ? `${p.municipality} • ${p.barangay}`
                            : p.municipality}
                          <span className="ml-2 text-xs text-muted-foreground">
                            Pred: {typeof p.predicted_count === 'number' ? p.predicted_count : Number(p.predicted_count)}
                            {p.predicted_count_raw !== undefined && (
                              <span className="ml-1 text-[10px] text-muted-foreground">(raw {p.predicted_count_raw})</span>
                            )}
                          </span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          p?.prescription?.level === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' :
                          p?.prescription?.level === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' :
                          p?.prescription?.level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                          p?.prescription?.level === 'LOW' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300'
                        }`}>
                          {p?.prescription?.level || 'N/A'}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        {(p?.prescription?.actions || []).slice(0, 3).map((a, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span>•</span>
                            <span className="leading-snug">{a}</span>
                          </div>
                        ))}
                        {(p?.prescription?.actions || []).length === 0 && (
                          <div className="text-muted-foreground">No actions available</div>
                        )}
                      </div>
                      {p?.predicted_high_risk_ranges && (
                        <div className="mt-2 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                            High-Risk Times: {p.predicted_high_risk_ranges}
                          </span>
                        </div>
                      )}
                    </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
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
