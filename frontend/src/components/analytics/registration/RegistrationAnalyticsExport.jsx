import React, { useState } from 'react';
import { Download, FileText, Table, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import { 
  getYearlyVehicleTrends, 
  getMonthlyVehicleTrends,
  getMunicipalityRegistrationTotals,
  getVehicleClassificationData,
  getOwnerMunicipalityData,
  getMonthNumber
} from '../../../api/registrationAnalytics.js';
import { getWeeklyPredictions } from '../../../api/predictionApi.js';

const RegistrationAnalyticsExport = ({ 
  analyticsData, 
  selectedMonth, 
  selectedYear,
  className = "" 
}) => {
  const [exporting, setExporting] = useState(false);
  
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

  // Helper function to process monthly predictions from weekly predictions
  const processMonthlyPredictions = (weeklyPredictions, lastDataDate = null) => {
    if (!weeklyPredictions || weeklyPredictions.length === 0) {
      return [];
    }

    // Determine training month from last_data_date or default to July (6)
    let trainingMonth = 6; // Default to July (0-indexed: 6)
    if (lastDataDate) {
      const lastDate = new Date(lastDataDate);
      trainingMonth = lastDate.getMonth(); // 0-indexed (0=Jan, 6=Jul, 7=Aug, etc.)
    }

    // Filter out training month
    const filtered = weeklyPredictions.filter((prediction) => {
      const date = new Date(prediction.date || prediction.week_start);
      const predictionMonth = date.getMonth(); // 0-indexed
      return predictionMonth !== trainingMonth;
    });

    // Group by month
    const monthlyGrouped = {};
    filtered.forEach((prediction) => {
      const date = new Date(prediction.date || prediction.week_start);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!monthlyGrouped[monthKey]) {
        monthlyGrouped[monthKey] = {
          month: monthName,
          monthKey: monthKey,
          monthIndex: date.getMonth(),
          year: date.getFullYear(),
          totalPredicted: 0,
          weekCount: 0
        };
      }
      
      const predictedValue = prediction.predicted_count || prediction.predicted || prediction.total_predicted || 0;
      monthlyGrouped[monthKey].totalPredicted += predictedValue;
      monthlyGrouped[monthKey].weekCount += 1;
    });

    const monthlyProcessed = Object.values(monthlyGrouped).map((monthData) => ({
      month: monthData.month,
      monthKey: monthData.monthKey,
      year: monthData.year,
      totalPredicted: Math.round(monthData.totalPredicted),
      avgPredicted: Math.round(monthData.totalPredicted / monthData.weekCount),
      weekCount: monthData.weekCount
    }));

    monthlyProcessed.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthKey.localeCompare(b.monthKey);
    });

    return monthlyProcessed;
  };

  const exportToXLSX = async () => {
    if (!analyticsData) return;
    
    try {
      setExporting(true);
      const period = getDisplayPeriod(selectedMonth, selectedYear);
      
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Prepare parameters for API calls
      let monthNumber = null;
      let yearValue = null;
      
      if (selectedMonth && selectedMonth !== 'All') {
        monthNumber = getMonthNumber(selectedMonth);
      }
      
      if (selectedYear && selectedYear !== 'All') {
        yearValue = selectedYear;
      }
      
      const currentYear = new Date().getFullYear();
      
      // Fetch all data in parallel
      const [
        vehicleTrendsResponse,
        municipalityResponse,
        classificationResponse,
        ownerMunicipalityResponse,
        predictionsResponse
      ] = await Promise.all([
        // Vehicle Registration Trends - get last 5 years
        getYearlyVehicleTrends(currentYear - 4, currentYear, null).catch(() => ({ success: false, data: [] })),
        // Top Municipalities
        getMunicipalityRegistrationTotals(monthNumber, yearValue).catch(() => ({ success: false, data: [] })),
        // Vehicle Classification
        getVehicleClassificationData(monthNumber, yearValue).catch(() => ({ success: false, data: [] })),
        // Registered Owners by Municipality
        getOwnerMunicipalityData(monthNumber, yearValue).catch(() => ({ success: false, data: [] })),
        // Monthly Registration Predictions
        getWeeklyPredictions(12, null).catch(() => ({ success: false, data: {} }))
      ]);
      
      // 1. Vehicle Registration Trends Sheet
      let vehicleTrendsData = [];
      if (vehicleTrendsResponse.success && vehicleTrendsResponse.data && vehicleTrendsResponse.data.length > 0) {
        // Calculate growth rates if not already present
        const processedData = vehicleTrendsResponse.data.map((item, index) => {
          const currentValue = item.active || 0;
          let growthRate = null;
          
          if (index > 0) {
            const prevValue = vehicleTrendsResponse.data[index - 1].active || 0;
            if (prevValue > 0) {
              growthRate = ((currentValue - prevValue) / prevValue) * 100;
            }
          }
          
          return {
            'Year': item.year || 'N/A',
            'Active Vehicles': currentValue,
            'Growth Rate (%)': growthRate !== null ? growthRate.toFixed(1) : 'N/A'
          };
        });
        
        vehicleTrendsData = [
          ['Year', 'Active Vehicles', 'Growth Rate (%)'],
          ...processedData.map(item => [item.Year, item['Active Vehicles'], item['Growth Rate (%)']])
        ];
      } else {
        vehicleTrendsData = [['Year', 'Active Vehicles', 'Growth Rate (%)'], ['No data available', 0, 'N/A']];
      }
      
      const vehicleTrendsSheet = XLSX.utils.aoa_to_sheet(vehicleTrendsData);
      XLSX.utils.book_append_sheet(workbook, vehicleTrendsSheet, 'Vehicle Registration Trends');
      
      // 2. Top Municipalities by Vehicle Registration Sheet
      let municipalityData = [];
      if (municipalityResponse.success && municipalityResponse.data) {
        const sorted = [...municipalityResponse.data].sort((a, b) => b.vehicles - a.vehicles);
        municipalityData = sorted.map((item, index) => ({
          'Municipality': item.municipality || 'N/A',
          'Vehicles': item.vehicles || 0,
          'Rank': index + 1
        }));
      }
      
      if (municipalityData.length === 0) {
        municipalityData = [['Municipality', 'Vehicles', 'Rank'], ['No data available', 0, 'N/A']];
      } else {
        municipalityData = [
          ['Municipality', 'Vehicles', 'Rank'],
          ...municipalityData.map(item => [item.Municipality, item.Vehicles, item.Rank])
        ];
      }
      
      const municipalitySheet = XLSX.utils.aoa_to_sheet(municipalityData);
      XLSX.utils.book_append_sheet(workbook, municipalitySheet, 'Top Municipalities');
      
      // 3. Vehicle Classification Sheet
      let classificationData = [];
      if (classificationResponse.success && classificationResponse.data) {
        const total = classificationResponse.data.reduce((sum, item) => sum + (item.count || 0), 0);
        classificationData = classificationResponse.data
          .filter(item => item.classification && item.classification.toUpperCase() !== 'FOR HRE')
          .map(item => {
            const count = item.count || 0;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(2) : 0;
            return {
              'Classification': item.classification || 'N/A',
              'Count': count,
              'Percentage (%)': percentage
            };
          });
      }
      
      if (classificationData.length === 0) {
        classificationData = [['Classification', 'Count', 'Percentage (%)'], ['No data available', 0, 0]];
      } else {
        classificationData = [
          ['Classification', 'Count', 'Percentage (%)'],
          ...classificationData.map(item => [item.Classification, item.Count, item['Percentage (%)']])
        ];
      }
      
      const classificationSheet = XLSX.utils.aoa_to_sheet(classificationData);
      XLSX.utils.book_append_sheet(workbook, classificationSheet, 'Vehicle Classification');
      
      // 4. Registered Owners by Municipality Sheet
      let ownerMunicipalityData = [];
      if (ownerMunicipalityResponse.success && ownerMunicipalityResponse.data) {
        ownerMunicipalityData = ownerMunicipalityResponse.data.map(item => {
          const total = (item.totalOwners || 0);
          const withLicense = (item.withLicense || 0);
          const withoutLicense = (item.withoutLicense || 0);
          const complianceRate = total > 0 ? ((withLicense / total) * 100).toFixed(2) : 0;
          
          return {
            'Municipality': item.municipality || 'N/A',
            'Total Owners': total,
            'With License': withLicense,
            'Without License': withoutLicense,
            'Compliance Rate (%)': complianceRate
          };
        });
      }
      
      if (ownerMunicipalityData.length === 0) {
        ownerMunicipalityData = [['Municipality', 'Total Owners', 'With License', 'Without License', 'Compliance Rate (%)'], ['No data available', 0, 0, 0, 0]];
      } else {
        ownerMunicipalityData = [
          ['Municipality', 'Total Owners', 'With License', 'Without License', 'Compliance Rate (%)'],
          ...ownerMunicipalityData.map(item => [item.Municipality, item['Total Owners'], item['With License'], item['Without License'], item['Compliance Rate (%)']])
        ];
      }
      
      const ownerMunicipalitySheet = XLSX.utils.aoa_to_sheet(ownerMunicipalityData);
      XLSX.utils.book_append_sheet(workbook, ownerMunicipalitySheet, 'Owners by Municipality');
      
      // 5. Monthly Registration Predictions Sheet (If Possible)
      let monthlyPredictionsData = [];
      if (predictionsResponse.success && predictionsResponse.data?.weekly_predictions) {
        const lastDataDate = predictionsResponse.data.last_data_date || null;
        const monthlyPredictions = processMonthlyPredictions(
          predictionsResponse.data.weekly_predictions, 
          lastDataDate
        );
        monthlyPredictionsData = monthlyPredictions.map(item => ({
          'Month': item.month || 'N/A',
          'Year': item.year || 'N/A',
          'Total Predicted': item.totalPredicted || 0,
          'Average Predicted': item.avgPredicted || 0,
          'Weeks Count': item.weekCount || 0
        }));
      }
      
      if (monthlyPredictionsData.length === 0) {
        monthlyPredictionsData = [['Month', 'Year', 'Total Predicted', 'Average Predicted', 'Weeks Count'], ['No predictions available', 'N/A', 0, 0, 0]];
      } else {
        monthlyPredictionsData = [
          ['Month', 'Year', 'Total Predicted', 'Average Predicted', 'Weeks Count'],
          ...monthlyPredictionsData.map(item => [item.Month, item.Year, item['Total Predicted'], item['Average Predicted'], item['Weeks Count']])
        ];
      }
      
      const monthlyPredictionsSheet = XLSX.utils.aoa_to_sheet(monthlyPredictionsData);
      XLSX.utils.book_append_sheet(workbook, monthlyPredictionsSheet, 'Monthly Predictions');
      
      // 6. SUMMARY Sheet
      const summaryData = [
        ['Registration Analytics Report'],
        [`Period: ${period}`],
        [`Generated: ${new Date().toLocaleDateString()}`],
        [''],
        ['SUMMARY', ''],
        ['Metric', 'Value'],
        ['Total Vehicles', analyticsData.vehicles?.total || 0],
        ['Active Vehicles', analyticsData.vehicles?.active || 0],
        ['Expired Vehicles', analyticsData.vehicles?.expired || 0],
        ['Total Owners', analyticsData.drivers?.total || 0],
        ['Owners With License', analyticsData.drivers?.withLicense || 0],
        ['Owners Without License', analyticsData.drivers?.withoutLicense || 0],
        ['Total Plates', analyticsData.plateClassification?.total || 0],
        ['Permanent Plates', analyticsData.plateClassification?.permanent || 0],
        ['Temporary Plates', analyticsData.plateClassification?.temporary || 0]
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'SUMMARY');
      
      // Write the workbook to a file
      const filename = `registration_analytics_${period.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
    } catch (error) {
      console.error('Error exporting to XLSX:', error);
      alert('Error exporting data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const exportToJSON = () => {
    if (!analyticsData) return;
    
    const period = getDisplayPeriod(selectedMonth, selectedYear);
    
    const exportData = {
      exportInfo: {
        timestamp: new Date().toISOString(),
        period: period,
        filters: {
          month: selectedMonth,
          year: selectedYear
        }
      },
      summary: {
        vehicles: analyticsData.vehicles || {},
        drivers: analyticsData.drivers || {},
        plateClassification: analyticsData.plateClassification || {}
      }
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `registration_analytics_${period.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportReport = () => {
    if (!analyticsData) return;
    
    const period = getDisplayPeriod(selectedMonth, selectedYear);
    
    const reportContent = `
REGISTRATION ANALYTICS REPORT
Generated: ${new Date().toLocaleDateString()}
Period: ${period}
Filters: Month=${selectedMonth || 'All'}, Year=${selectedYear || 'All'}

SUMMARY
========
VEHICLES
Total Vehicles: ${analyticsData.vehicles?.total || 0}
Active Vehicles: ${analyticsData.vehicles?.active || 0}
Expired Vehicles: ${analyticsData.vehicles?.expired || 0}

OWNERS
Total Owners: ${analyticsData.drivers?.total || 0}
Owners With License: ${analyticsData.drivers?.withLicense || 0}
Owners Without License: ${analyticsData.drivers?.withoutLicense || 0}

PLATE CLASSIFICATION
Total Plates: ${analyticsData.plateClassification?.total || 0}
Permanent Plates: ${analyticsData.plateClassification?.permanent || 0}
Temporary Plates: ${analyticsData.plateClassification?.temporary || 0}
    `.trim();
    
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `registration_report_${period.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!analyticsData) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={exporting}>
          <Button variant="outline" size="sm" className="flex items-center gap-2" disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={exportToXLSX} disabled={exporting} className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            Export as XLSX (Multiple Sheets)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToJSON} disabled={exporting} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={exportReport} disabled={exporting} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Export Report
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default RegistrationAnalyticsExport;

