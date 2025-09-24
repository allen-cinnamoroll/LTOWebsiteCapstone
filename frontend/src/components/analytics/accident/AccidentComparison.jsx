import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Legend
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Calendar,
  Target,
  AlertTriangle
} from 'lucide-react';

const AccidentComparison = ({ analyticsData, className = "" }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [comparisonType, setComparisonType] = useState('year-over-year');
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);

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

  // Generate comparison data
  useEffect(() => {
    if (!analyticsData) return;
    
    setLoading(true);
    const data = generateComparisonData(analyticsData, comparisonType);
    setComparisonData(data);
    setLoading(false);
  }, [analyticsData, comparisonType]);

  const generateComparisonData = (data, type) => {
    if (!data || !data.trends || !data.trends.monthly) return null;

    const monthlyData = data.trends.monthly;
    const currentYear = new Date().getFullYear();
    
    switch (type) {
      case 'year-over-year':
        return generateYearOverYearData(monthlyData, currentYear);
      case 'quarterly':
        return generateQuarterlyData(monthlyData);
      case 'monthly-trend':
        return generateMonthlyTrendData(monthlyData);
      case 'severity-comparison':
        return generateSeverityComparisonData(data);
      default:
        return null;
    }
  };

  const generateYearOverYearData = (monthlyData, currentYear) => {
    const currentYearData = monthlyData.filter(item => item._id.year === currentYear);
    const previousYearData = monthlyData.filter(item => item._id.year === currentYear - 1);
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return months.map((month, index) => {
      const currentMonth = currentYearData.find(item => item._id.month === index + 1);
      const previousMonth = previousYearData.find(item => item._id.month === index + 1);
      
      return {
        month,
        current: currentMonth?.count || 0,
        previous: previousMonth?.count || 0,
        change: currentMonth && previousMonth ? 
          ((currentMonth.count - previousMonth.count) / previousMonth.count * 100) : 0
      };
    });
  };

  const generateQuarterlyData = (monthlyData) => {
    const quarters = [
      { name: 'Q1', months: [1, 2, 3] },
      { name: 'Q2', months: [4, 5, 6] },
      { name: 'Q3', months: [7, 8, 9] },
      { name: 'Q4', months: [10, 11, 12] }
    ];
    
    const currentYear = new Date().getFullYear();
    const currentYearData = monthlyData.filter(item => item._id.year === currentYear);
    const previousYearData = monthlyData.filter(item => item._id.year === currentYear - 1);
    
    return quarters.map(quarter => {
      const currentQuarter = currentYearData
        .filter(item => quarter.months.includes(item._id.month))
        .reduce((sum, item) => sum + item.count, 0);
      
      const previousQuarter = previousYearData
        .filter(item => quarter.months.includes(item._id.month))
        .reduce((sum, item) => sum + item.count, 0);
      
      return {
        quarter: quarter.name,
        current: currentQuarter,
        previous: previousQuarter,
        change: previousQuarter > 0 ? 
          ((currentQuarter - previousQuarter) / previousQuarter * 100) : 0
      };
    });
  };

  const generateMonthlyTrendData = (monthlyData) => {
    const currentYear = new Date().getFullYear();
    const currentYearData = monthlyData.filter(item => item._id.year === currentYear);
    
    return currentYearData.map(item => ({
      month: new Date(item._id.year, item._id.month - 1).toLocaleDateString('en-US', { month: 'short' }),
      accidents: item.count,
      cumulative: currentYearData
        .filter(prevItem => prevItem._id.month <= item._id.month)
        .reduce((sum, prevItem) => sum + prevItem.count, 0)
    }));
  };

  const generateSeverityComparisonData = (data) => {
    if (!data.distributions || !data.distributions.severity) return null;
    
    const severityData = data.distributions.severity;
    const total = severityData.reduce((sum, item) => sum + item.count, 0);
    
    return severityData.map(item => ({
      severity: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      count: item.count,
      percentage: (item.count / total * 100).toFixed(1),
      trend: Math.random() > 0.5 ? 'up' : 'down' // This would come from actual trend data
    }));
  };

  const getColors = () => isDarkMode ? 
    ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'] :
    ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const renderChart = () => {
    if (!comparisonData || loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    switch (comparisonType) {
      case 'year-over-year':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="month" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
              <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: isDarkMode ? '#f9fafb' : '#111827'
                }}
                formatter={(value, name) => [
                  value, 
                  name === 'current' ? 'Current Year' : 'Previous Year'
                ]}
              />
              <Legend />
              <Bar dataKey="previous" fill={getColors()[1]} fillOpacity={0.6} name="Previous Year" />
              <Bar dataKey="current" fill={getColors()[0]} name="Current Year" />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'quarterly':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="quarter" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
              <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: isDarkMode ? '#f9fafb' : '#111827'
                }}
              />
              <Bar dataKey="current" fill={getColors()[0]} name="Current Year" />
              <Bar dataKey="previous" fill={getColors()[1]} name="Previous Year" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'monthly-trend':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="month" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
              <YAxis yAxisId="left" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
              <YAxis yAxisId="right" orientation="right" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: isDarkMode ? '#f9fafb' : '#111827'
                }}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="accidents" 
                stroke={getColors()[0]} 
                strokeWidth={3}
                name="Monthly Accidents"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cumulative" 
                stroke={getColors()[1]} 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Cumulative Total"
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'severity-comparison':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="severity" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
              <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: isDarkMode ? '#f9fafb' : '#111827'
                }}
                formatter={(value, name) => [
                  name === 'count' ? `${value} accidents` : `${value}%`,
                  name === 'count' ? 'Count' : 'Percentage'
                ]}
              />
              <Bar dataKey="count" fill={getColors()[2]} />
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const getComparisonTitle = () => {
    switch (comparisonType) {
      case 'year-over-year': return 'Year-over-Year Comparison';
      case 'quarterly': return 'Quarterly Analysis';
      case 'monthly-trend': return 'Monthly Trend Analysis';
      case 'severity-comparison': return 'Severity Distribution Comparison';
      default: return 'Comparison Analysis';
    }
  };

  const getComparisonDescription = () => {
    switch (comparisonType) {
      case 'year-over-year': return 'Compare current year accident data with previous year';
      case 'quarterly': return 'Quarterly breakdown of accident trends';
      case 'monthly-trend': return 'Monthly accident patterns with cumulative totals';
      case 'severity-comparison': return 'Accident severity distribution analysis';
      default: return 'Comparative analysis of accident data';
    }
  };

  const getInsights = () => {
    if (!comparisonData || comparisonData.length === 0) return null;

    switch (comparisonType) {
      case 'year-over-year':
        const totalCurrent = comparisonData.reduce((sum, item) => sum + item.current, 0);
        const totalPrevious = comparisonData.reduce((sum, item) => sum + item.previous, 0);
        const overallChange = totalPrevious > 0 ? ((totalCurrent - totalPrevious) / totalPrevious * 100) : 0;
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Current Year</div>
              <div className="text-lg font-bold text-blue-900 dark:text-blue-100">{totalCurrent}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400">Total accidents</div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-sm font-medium text-green-700 dark:text-green-300">Previous Year</div>
              <div className="text-lg font-bold text-green-900 dark:text-green-100">{totalPrevious}</div>
              <div className="text-xs text-green-600 dark:text-green-400">Total accidents</div>
            </div>
            <div className={`p-3 rounded-lg ${overallChange >= 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-green-50 dark:bg-green-950/20'}`}>
              <div className={`text-sm font-medium ${overallChange >= 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                Year-over-Year Change
              </div>
              <div className={`text-lg font-bold ${overallChange >= 0 ? 'text-red-900 dark:text-red-100' : 'text-green-900 dark:text-green-100'}`}>
                {overallChange >= 0 ? '+' : ''}{overallChange.toFixed(1)}%
              </div>
              <div className={`text-xs ${overallChange >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {overallChange >= 0 ? 'Increase' : 'Decrease'}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              {getComparisonTitle()}
            </CardTitle>
            <CardDescription>
              {getComparisonDescription()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={comparisonType} onValueChange={setComparisonType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year-over-year">Year-over-Year</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="monthly-trend">Monthly Trend</SelectItem>
                <SelectItem value="severity-comparison">Severity Comparison</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
        {getInsights()}
      </CardContent>
    </Card>
  );
};

export default AccidentComparison;
