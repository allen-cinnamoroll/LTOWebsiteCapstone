import React, { useState, useEffect } from 'react';
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
  AreaChart
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
  Activity
} from 'lucide-react';
import apiClient from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import AccidentMap from './AccidentMap';

// Theme-aware colors that work in both light and dark modes
const COLORS = {
  light: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'],
  dark: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']
};

export function AccidentAnalytics() {
  const [timePeriod, setTimePeriod] = useState('6months');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      
      const [analyticsResponse, riskResponse] = await Promise.all([
        apiClient.get(`/accident/analytics/summary?period=${timePeriod}`, {
          headers: { Authorization: token }
        }),
        apiClient.get(`/accident/analytics/risk?period=${timePeriod}`, {
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

  const formatVehicleTypeData = (vehicleData) => {
    return vehicleData.map(item => ({
      name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      value: item.count,
      type: item._id
    }));
  };

  const formatMunicipalityData = (municipalityData) => {
    return municipalityData.map(item => ({
      name: item._id,
      accidents: item.count
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading accident analytics...</div>
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Accident Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of accident data for {getPeriodLabel(timePeriod)}
          </p>
        </div>
        <Select value={timePeriod} onValueChange={setTimePeriod}>
          <SelectTrigger className="w-[180px]">
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

      {/* Summary Cards */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Accidents</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.summary.totalAccidents}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {analyticsData.summary.accidentChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                )}
                {Math.abs(analyticsData.summary.accidentChange)}% from previous period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fatal Accidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{analyticsData.summary.fatalities}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {analyticsData.summary.fatalitiesChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                )}
                {analyticsData.summary.fatalitiesChange} from previous period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Areas</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.distributions.municipality.length}</div>
              <p className="text-xs text-muted-foreground">
                Municipalities with accidents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Predictions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {riskData ? `${riskData.riskPredictions.highRiskPercentage}%` : '0%'}
              </div>
              <p className="text-xs text-muted-foreground">
                High risk predictions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        {analyticsData && analyticsData.trends.monthly.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Accident Trends Over Time</CardTitle>
              <CardDescription>
                Monthly accident frequency for {getPeriodLabel(timePeriod)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={formatMonthlyTrends(analyticsData.trends.monthly)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                    }}
                  />
                  <YAxis />
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
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Severity Distribution */}
        {analyticsData && analyticsData.distributions.severity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Accident Severity Distribution</CardTitle>
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
                    fill="currentColor"
                    dataKey="value"
                  >
                    {formatSeverityData(analyticsData.distributions.severity).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getColors()[index % getColors().length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: isDarkMode ? '#f9fafb' : '#111827'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Vehicle Type Distribution */}
        {analyticsData && analyticsData.distributions.vehicleType.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Type Distribution</CardTitle>
              <CardDescription>
                Accidents by vehicle type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formatVehicleTypeData(analyticsData.distributions.vehicleType)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: isDarkMode ? '#f9fafb' : '#111827'
                    }}
                  />
                  <Bar dataKey="value" fill={getColors()[1]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Municipality Distribution */}
        {analyticsData && analyticsData.distributions.municipality.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Municipalities by Accidents</CardTitle>
              <CardDescription>
                Municipalities with highest accident counts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formatMunicipalityData(analyticsData.distributions.municipality)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: isDarkMode ? '#f9fafb' : '#111827'
                    }}
                  />
                  <Bar dataKey="accidents" fill={getColors()[2]} />
                </BarChart>
              </ResponsiveContainer>
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

      {/* Geographic Distribution with Interactive Map */}
      {analyticsData && analyticsData.mapData && analyticsData.mapData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>
              Interactive map showing accident locations with severity indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {analyticsData.mapData.length} accidents with location data
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Click markers for details • Zoom to explore
              </div>
            </div>
            <AccidentMap 
              accidents={analyticsData.mapData} 
              className="w-full"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
