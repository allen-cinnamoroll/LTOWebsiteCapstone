import React, { useState, useEffect } from 'react';
import './RegistrationAnalytics.css';
import {
  getRegistrationAnalytics,
  getMonthNumber,
  exportRegistrationReportPdf,
  exportRegistrationReportCsv
} from '../../../api/registrationAnalytics.js';
import MunicipalityChart from './MunicipalityChart.jsx';
import VehicleTrendChart from './VehicleTrendChart.jsx';
import OwnerMunicipalityChart from './OwnerMunicipalityChart.jsx';
import VehicleClassificationChart from './VehicleClassificationChart.jsx';
import { PredictiveAnalytics } from './PredictiveAnalytics.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RegistrationExportDialog } from './RegistrationExportDialog.jsx';
import { FileText, Download } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Counter animation hook
const useCounterAnimation = (end, duration = 2000) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime;
    const startValue = 0;
    
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(startValue + (end - startValue) * easeOutQuart);
      
      setCount(currentCount);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [end, duration]);
  
  return count;
};

export function RegistrationAnalytics() {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportDefaults, setExportDefaults] = useState(null);

  // Counter animations - must be called at top level
  const vehiclesTotal = useCounterAnimation(analyticsData?.vehicles?.total || 0);
  const vehiclesActive = useCounterAnimation(analyticsData?.vehicles?.active || 0);
  const vehiclesExpired = useCounterAnimation(analyticsData?.vehicles?.expired || 0);
  const driversTotal = useCounterAnimation(analyticsData?.drivers?.total || 0);
  const driversWithLicense = useCounterAnimation(analyticsData?.drivers?.withLicense || 0);
  const driversWithoutLicense = useCounterAnimation(analyticsData?.drivers?.withoutLicense || 0);
  const platesTotal = useCounterAnimation(analyticsData?.plateClassification?.total || 0);
  const platesPermanent = useCounterAnimation(analyticsData?.plateClassification?.permanent || 0);
  const platesTemporary = useCounterAnimation(analyticsData?.plateClassification?.temporary || 0);

  const months = [
    'All', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = ['All', ...Array.from({ length: 7 }, (_, i) => (currentYear + i).toString())];


  const handleMonthSelect = (month) => {
    // Add click animation
    const trigger = document.querySelector('[data-month-select]');
    if (trigger) {
      trigger.classList.add('click-pulse');
      setTimeout(() => trigger.classList.remove('click-pulse'), 200);
    }
    setSelectedMonth(month);
  };

  const handleYearSelect = (year) => {
    // Add click animation
    const trigger = document.querySelector('[data-year-select]');
    if (trigger) {
      trigger.classList.add('click-pulse');
      setTimeout(() => trigger.classList.remove('click-pulse'), 200);
    }
    setSelectedYear(year);
  };

  // Helper function to get display period text
  const getDisplayPeriod = (month, year) => {
    if (!month && !year) {
      return 'All Time';
    }
    
    if (month === 'All' && year === 'All') {
      return 'All Time';
    }
    
    if (month === 'All' && year && year !== 'All') {
      return `All Months in ${year}`;
    }
    
    if (month && month !== 'All' && year === 'All') {
      return `All ${month}s (All Years)`;
    }
    
    if (month && month !== 'All' && year && year !== 'All') {
      return `${month} ${year}`;
    }
    
    if (month && month !== 'All' && !year) {
      return `All ${month}s (All Years)`;
    }
    
    if (!month && year && year !== 'All') {
      return `All Months in ${year}`;
    }
    
    return 'All Time';
  };

  // Fetch analytics data
  const fetchAnalyticsData = async (month, year) => {
    try {
      setLoading(true);
      setError(null);
      
      // Handle "All" selections
      let monthNumber = null;
      let yearValue = null;
      
      if (month && month !== 'All') {
        monthNumber = getMonthNumber(month);
      }
      
      if (year && year !== 'All') {
        yearValue = year;
      }
      
      const response = await getRegistrationAnalytics(monthNumber, yearValue);
      
      if (response.success) {
        setAnalyticsData(response.data);
      } else {
        setError('Failed to fetch analytics data');
      }
    } catch (err) {
      setError('Error loading analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExportDialog = () => {
    const now = dayjs();
    const monthNumber =
      selectedMonth && selectedMonth !== 'All'
        ? getMonthNumber(selectedMonth)
        : now.month() + 1;
    const yearValue =
      selectedYear && selectedYear !== 'All' ? selectedYear : now.year().toString();

    setExportDefaults({
      scope: 'monthly',
      month: monthNumber,
      year: yearValue,
      municipality: 'ALL',
      vehicleType: 'all',
      licenseStatus: 'all'
    });
    setExportDialogOpen(true);
  };

  const handleGenerateReport = async (payload) => {
    try {
      const [pdfResponse, csvResponse] = await Promise.all([
        exportRegistrationReportPdf(payload),
        exportRegistrationReportCsv(payload)
      ]);
      downloadBlob(pdfResponse.blob, pdfResponse.filename);
      downloadBlob(csvResponse.blob, csvResponse.filename);
      toast.success('Registration reports generated successfully.');
    } catch (err) {
      toast.error('Failed to generate registration reports.');
      throw err;
    }
  };





  // Load initial data when component mounts
  useEffect(() => {
    // Load all data initially
    fetchAnalyticsData('All', 'All');
  }, []);

  // Fetch data when month or year changes
  useEffect(() => {
    // Only fetch data if at least one filter is selected
    if (selectedMonth || selectedYear) {
      fetchAnalyticsData(selectedMonth, selectedYear);
    } else {
      // If no filters are selected, show all data
      fetchAnalyticsData('All', 'All');
    }
  }, [selectedMonth, selectedYear]);


  return (
    <div className="container mx-auto p-6 bg-white dark:bg-transparent min-h-screen rounded-lg page-container">
      <div className="registration-analytics-header flex flex-wrap items-center justify-between gap-4">
        <div className="header-fade-in">
          <h1 className="registration-analytics-title flex items-center gap-2 smooth-transition">
            <FileText className="h-8 w-8 text-blue-500 icon-pulse" />
            Registration Analytics
          </h1>
          <p className="registration-analytics-subtitle subtitle-fade-in">
            Vehicle and Owners Registration Analytics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleOpenExportDialog}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          {loading ? (
            <div className="registration-analytics-controls controls-fade-in loading-fade">
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded w-32"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded w-32"></div>
              </div>
            </div>
          ) : (
            <div className="registration-analytics-controls controls-fade-in smooth-transition">
              {/* Month Dropdown */}
              <Select value={selectedMonth || ''} onValueChange={handleMonthSelect}>
                <SelectTrigger className="w-[140px] smooth-transition hover-smooth" data-month-select>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month} className="smooth-transition">
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Year Dropdown */}
              <Select value={selectedYear || ''} onValueChange={handleYearSelect}>
                <SelectTrigger className="w-[120px] smooth-transition hover-smooth" data-year-select>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year} className="smooth-transition">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
      
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="space-y-6 loading-fade smooth-transition">
          {/* Loading Controls */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-card border border-border rounded-lg smooth-transition">
            <div className="animate-pulse">
              <div className="h-6 bg-muted rounded w-32 mb-2"></div>
              <div className="h-8 bg-muted rounded w-24"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-6 bg-muted rounded w-32 mb-2"></div>
              <div className="h-8 bg-muted rounded w-24"></div>
            </div>
          </div>

          {/* Loading Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 smooth-transition">
                <div className="animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                      <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-24"></div>
                    </div>
                    <div className="w-12 h-12 bg-muted rounded"></div>
                  </div>
                  <div className="h-1 bg-muted rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Loading Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-6 smooth-transition">
                <div className="animate-pulse">
                  <div className="h-6 bg-muted rounded w-48 mb-4"></div>
                  <div className="h-64 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Loading Additional Chart */}
          <div className="bg-card border border-border rounded-lg p-6 smooth-transition">
            <div className="animate-pulse">
              <div className="h-6 bg-muted rounded w-40 mb-4"></div>
              <div className="h-96 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      ) : (
        // Metrics Section - Individual Cards
        <div 
          key={`${selectedMonth}-${selectedYear}`}
          className={`mb-0 content-appear smooth-transition ${loading ? 'loading-fade' : 'data-reload filter-change'}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-1">
            {/* Registered Vehicles Card */}
            <div className={`group relative dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 dark:border-gray-700 bg-gradient-to-br from-white to-red-50/30 border-2 border-gray-200 rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 transform overflow-hidden animate-stagger-1`}>
              {/* Gradient shading effect */}
              <div className={`absolute top-0 right-0 w-24 h-24 dark:bg-gradient-to-br dark:from-red-500/20 dark:to-red-600/10 bg-gradient-to-br from-red-500/15 to-red-600/8 rounded-full -translate-y-6 translate-x-6 group-hover:scale-125 transition-transform duration-500 blur-xl`}></div>
              <div className="absolute top-4 right-4">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400 icon-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
                  <circle cx="7" cy="17" r="2"></circle>
                  <path d="M9 17h6"></path>
                  <circle cx="17" cy="17" r="2"></circle>
                </svg>
              </div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-10">
                    <div className="mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">REGISTERED VEHICLES</h3>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2 number-animate">
                      {loading ? '...' : vehiclesTotal}
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 flex items-center text-xs text-gray-600 dark:text-gray-400 mb-3">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {loading ? '...' : vehiclesActive} Active
                </span>
                <span className="mx-2">•</span>
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {loading ? '...' : vehiclesExpired} Expired
                </span>
              </div>
              <div className="relative z-10 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-0.5 flex overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-0.5 transition-all duration-1000 ease-out shadow-sm animate-pulse"
                  style={{ 
                    width: `${Math.min(((analyticsData?.vehicles?.active || 0) / (analyticsData?.vehicles?.total || 1)) * 100, 100)}%`,
                    animation: 'slideInFromLeft 1.5s ease-out'
                  }}
                ></div>
                <div 
                  className="bg-gradient-to-r from-red-400 to-red-600 h-0.5 transition-all duration-1000 ease-out shadow-sm animate-pulse"
                  style={{ 
                    width: `${Math.min(((analyticsData?.vehicles?.expired || 0) / (analyticsData?.vehicles?.total || 1)) * 100, 100)}%`,
                    animation: 'slideInFromLeft 1.5s ease-out 0.3s both'
                  }}
                ></div>
              </div>
            </div>

            {/* Registered Owners Card */}
            <div className={`group relative dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 dark:border-gray-700 bg-gradient-to-br from-white to-blue-50/30 border-2 border-gray-200 rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 transform overflow-hidden animate-stagger-2`}>
              {/* Gradient shading effect */}
              <div className={`absolute top-0 right-0 w-24 h-24 dark:bg-gradient-to-br dark:from-blue-500/20 dark:to-blue-600/10 bg-gradient-to-br from-blue-500/15 to-blue-600/8 rounded-full -translate-y-6 translate-x-6 group-hover:scale-125 transition-transform duration-500 blur-xl`}></div>
              <div className="absolute top-4 right-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 icon-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-10">
                    <div className="mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">REGISTERED OWNERS</h3>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2 number-animate">
                      {loading ? '...' : driversTotal}
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 flex items-center text-xs text-gray-600 dark:text-gray-400 mb-3">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {loading ? '...' : driversWithLicense} With License
                </span>
                <span className="mx-2">•</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {loading ? '...' : driversWithoutLicense} Without License
                </span>
              </div>
              <div className="relative z-10 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-0.5 flex overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-0.5 transition-all duration-1000 ease-out shadow-sm"
                  style={{ 
                    width: `${Math.min(((analyticsData?.drivers?.withLicense || 0) / (analyticsData?.drivers?.total || 1)) * 100, 100)}%`,
                    animation: 'slideInFromLeft 1.5s ease-out'
                  }}
                ></div>
                <div 
                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-0.5 transition-all duration-1000 ease-out shadow-sm"
                  style={{ 
                    width: `${Math.min(((analyticsData?.drivers?.withoutLicense || 0) / (analyticsData?.drivers?.total || 1)) * 100, 100)}%`,
                    animation: 'slideInFromLeft 1.5s ease-out 0.3s both'
                  }}
                ></div>
              </div>
            </div>

            {/* Plate Classification Card */}
            <div className={`group relative dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 dark:border-gray-700 bg-gradient-to-br from-white to-purple-50/30 border-2 border-gray-200 rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 transform overflow-hidden animate-stagger-3`}>
              {/* Gradient shading effect */}
              <div className={`absolute top-0 right-0 w-24 h-24 dark:bg-gradient-to-br dark:from-purple-500/20 dark:to-purple-600/10 bg-gradient-to-br from-purple-500/15 to-purple-600/8 rounded-full -translate-y-6 translate-x-6 group-hover:scale-125 transition-transform duration-500 blur-xl`}></div>
              <div className="absolute top-4 right-4">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400 icon-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <rect x="2" y="6" width="20" height="12" rx="2" ry="2"/>
                  <rect x="4" y="8" width="16" height="8" rx="1" ry="1"/>
                  <path d="M8 10h2"/>
                  <path d="M12 10h2"/>
                  <path d="M16 10h2"/>
                  <path d="M8 12h2"/>
                  <path d="M12 12h2"/>
                  <path d="M16 12h2"/>
                </svg>
              </div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-10">
                    <div className="mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">PLATE CLASSIFICATION</h3>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2 number-animate">
                      {loading ? '...' : platesTotal}
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 flex items-center text-xs text-gray-600 dark:text-gray-400 mb-3">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {loading ? '...' : platesPermanent} Permanent
                </span>
                <span className="mx-2">•</span>
                <span className="text-purple-400 dark:text-purple-400 font-medium">
                  {loading ? '...' : platesTemporary} Temporary
                </span>
              </div>
              <div className="relative z-10 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-0.5 flex overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-0.5 transition-all duration-1000 ease-out shadow-sm"
                  style={{ 
                    width: `${Math.min(((analyticsData?.plateClassification?.permanent || 0) / (analyticsData?.plateClassification?.total || 1)) * 100, 100)}%`,
                    animation: 'slideInFromLeft 1.5s ease-out'
                  }}
                ></div>
                <div 
                  className="bg-gradient-to-r from-purple-400 to-purple-600 h-0.5 transition-all duration-1000 ease-out shadow-sm"
                  style={{ 
                    width: `${Math.min(((analyticsData?.plateClassification?.temporary || 0) / (analyticsData?.plateClassification?.total || 1)) * 100, 100)}%`,
                    animation: 'slideInFromLeft 1.5s ease-out 0.3s both'
                  }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Charts Row - Vehicle Trend Chart and Municipality Chart */}
          <div className="flex flex-col gap-6 mb-6 smooth-transition">
            <div className="w-full chart-fade-in smooth-transition">
              <VehicleTrendChart />
            </div>
            <div className="w-full chart-fade-in smooth-transition" style={{ animationDelay: '0.2s' }}>
              <MunicipalityChart 
                selectedMonth={selectedMonth} 
                selectedYear={selectedYear} 
                loading={loading}
              />
            </div>
          </div>
          
          {/* Vehicle Classification Chart and Owner Municipality Chart */}
          <div className="flex flex-col lg:flex-row gap-6 smooth-transition">
            <div className="flex-1 lg:flex-[0.7] chart-scale-in smooth-transition">
              <VehicleClassificationChart 
                selectedMonth={selectedMonth} 
                selectedYear={selectedYear} 
                loading={loading}
              />
            </div>
            <div className="flex-1 lg:flex-[1.3] chart-scale-in smooth-transition" style={{ animationDelay: '0.1s' }}>
              <OwnerMunicipalityChart 
                selectedMonth={selectedMonth} 
                selectedYear={selectedYear} 
                loading={loading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Predictive Analytics Container */}
      <div className="section-fade-in smooth-transition" style={{ animationDelay: '0.3s' }}>
        <PredictiveAnalytics />
      </div>

      <RegistrationExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        defaultFilters={exportDefaults}
        onGenerate={handleGenerateReport}
      />
    </div>
  );
}
