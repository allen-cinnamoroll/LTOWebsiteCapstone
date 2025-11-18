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

const ViolationAnalyticsExport = ({ 
  analyticsData, 
  selectedYear,
  className = "" 
}) => {
  const [exporting, setExporting] = useState(false);
  
  const getDisplayPeriod = (year) => {
    if (!year) {
      return 'All Time';
    }
    
    if (year === 'All') {
      return 'All Time';
    }
    
    return `Year ${year}`;
  };

  const exportToXLSX = async () => {
    if (!analyticsData) return;
    
    try {
      setExporting(true);
      const period = getDisplayPeriod(selectedYear);
      
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // 1. Violation Monitoring Sheet (Yearly Trends)
      let monitoringData = [];
      if (analyticsData.yearlyTrends && analyticsData.yearlyTrends.length > 0) {
        const sortedTrends = [...analyticsData.yearlyTrends].sort((a, b) => {
          const yearA = a._id?.year || 0;
          const yearB = b._id?.year || 0;
          return yearA - yearB;
        });
        
        monitoringData = sortedTrends.map(item => ({
          'Year': item._id?.year || 'N/A',
          'Violations': item.count || 0
        }));
      }
      
      if (monitoringData.length === 0) {
        monitoringData = [['Year', 'Violations'], ['No data available', 0]];
      } else {
        monitoringData = [
          ['Year', 'Violations'],
          ...monitoringData.map(item => [item.Year, item.Violations])
        ];
      }
      
      const monitoringSheet = XLSX.utils.aoa_to_sheet(monitoringData);
      XLSX.utils.book_append_sheet(workbook, monitoringSheet, 'Violation Monitoring');
      
      // 2. Violation Types Distribution Sheet
      let typesData = [];
      if (analyticsData.violationsByType && analyticsData.violationsByType.length > 0) {
        const total = analyticsData.violationsByType.reduce((sum, item) => sum + (item.count || 0), 0);
        typesData = analyticsData.violationsByType.map(item => {
          const count = item.count || 0;
          const type = item._id || item.type || 'N/A';
          const percentage = total > 0 ? ((count / total) * 100).toFixed(2) : 0;
          return {
            'Type': type === 'confiscated' ? 'Confiscated' : type === 'alarm' ? 'Alarm' : type === 'impounded' ? 'Impounded' : type,
            'Count': count,
            'Percentage (%)': percentage
          };
        });
      }
      
      if (typesData.length === 0) {
        typesData = [['Type', 'Count', 'Percentage (%)'], ['No data available', 0, 0]];
      } else {
        typesData = [
          ['Type', 'Count', 'Percentage (%)'],
          ...typesData.map(item => [item.Type, item.Count, item['Percentage (%)']])
        ];
      }
      
      const typesSheet = XLSX.utils.aoa_to_sheet(typesData);
      XLSX.utils.book_append_sheet(workbook, typesSheet, 'Violation Types Distribution');
      
      // 3. Top Violations Sheet
      let topViolationsData = [];
      if (analyticsData.mostCommonViolations && analyticsData.mostCommonViolations.length > 0) {
        const sorted = [...analyticsData.mostCommonViolations].sort((a, b) => (b.count || 0) - (a.count || 0));
        topViolationsData = sorted.map((item, index) => ({
          'Rank': index + 1,
          'Violation': item._id || item.violation || 'N/A',
          'Count': item.count || 0
        }));
      }
      
      if (topViolationsData.length === 0) {
        topViolationsData = [['Rank', 'Violation', 'Count'], ['No data available', 'N/A', 0]];
      } else {
        topViolationsData = [
          ['Rank', 'Violation', 'Count'],
          ...topViolationsData.map(item => [item.Rank, item.Violation, item.Count])
        ];
      }
      
      const topViolationsSheet = XLSX.utils.aoa_to_sheet(topViolationsData);
      XLSX.utils.book_append_sheet(workbook, topViolationsSheet, 'Top Violations');
      
      // 4. Apprehending Officers Sheet
      let officersData = [];
      if (analyticsData.topOfficers && analyticsData.topOfficers.length > 0) {
        const sorted = [...analyticsData.topOfficers].sort((a, b) => {
          const countA = a.violationCount || a.count || 0;
          const countB = b.violationCount || b.count || 0;
          return countB - countA;
        });
        
        officersData = sorted.map((item, index) => ({
          'Rank': index + 1,
          'Officer': item.officerName || item.officer || 'N/A',
          'Violations': item.violationCount || item.count || 0
        }));
      }
      
      if (officersData.length === 0) {
        officersData = [['Rank', 'Officer', 'Violations'], ['No data available', 'N/A', 0]];
      } else {
        officersData = [
          ['Rank', 'Officer', 'Violations'],
          ...officersData.map(item => [item.Rank, item.Officer, item.Violations])
        ];
      }
      
      const officersSheet = XLSX.utils.aoa_to_sheet(officersData);
      XLSX.utils.book_append_sheet(workbook, officersSheet, 'Apprehending Officers');
      
      // 5. Summary Sheet
      const summaryData = [
        ['Violation Analytics Report'],
        [`Period: ${period}`],
        [`Generated: ${new Date().toLocaleDateString()}`],
        [''],
        ['SUMMARY', ''],
        ['Metric', 'Value'],
        ['Total Violations', analyticsData.totalViolations || 0],
        ['Total Traffic Violators', analyticsData.totalTrafficViolators || 0],
        ['Recent Violations', analyticsData.recentViolations || 0]
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      
      // Write the workbook to a file
      const filename = `violation_analytics_${period.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
    } catch (error) {
      console.error('Error exporting to XLSX:', error);
      alert('Error exporting data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    if (!analyticsData) return;
    
    const csvData = [];
    const period = getDisplayPeriod(selectedYear);
    
    // Add header
    csvData.push(['Violation Analytics Report']);
    csvData.push([`Period: ${period}`]);
    csvData.push([`Generated: ${new Date().toLocaleDateString()}`]);
    csvData.push(['']); // Empty row
    
    // Add summary data
    csvData.push(['Summary', '']);
    csvData.push(['Metric', 'Value']);
    csvData.push(['Total Violations', analyticsData.totalViolations || 0]);
    csvData.push(['Total Traffic Violators', analyticsData.totalTrafficViolators || 0]);
    csvData.push(['Recent Violations', analyticsData.recentViolations || 0]);
    csvData.push(['']); // Empty row
    
    // Add most common violations
    if (analyticsData.mostCommonViolations && analyticsData.mostCommonViolations.length > 0) {
      csvData.push(['Most Common Violations', 'Count']);
      analyticsData.mostCommonViolations.forEach(violation => {
        csvData.push([violation.violation || 'N/A', violation.count || 0]);
      });
      csvData.push(['']); // Empty row
    }
    
    // Add top officers
    if (analyticsData.topOfficers && analyticsData.topOfficers.length > 0) {
      csvData.push(['Top Officers', 'Count']);
      analyticsData.topOfficers.forEach(officer => {
        csvData.push([officer.officer || 'N/A', officer.count || 0]);
      });
      csvData.push(['']); // Empty row
    }
    
    // Add violations by type
    if (analyticsData.violationsByType && analyticsData.violationsByType.length > 0) {
      csvData.push(['Violations by Type', 'Count']);
      analyticsData.violationsByType.forEach(type => {
        csvData.push([type.type || 'N/A', type.count || 0]);
      });
      csvData.push(['']); // Empty row
    }
    
    // Add yearly trends
    if (analyticsData.yearlyTrends && analyticsData.yearlyTrends.length > 0) {
      csvData.push(['Yearly Trends', 'Count']);
      analyticsData.yearlyTrends.forEach(trend => {
        csvData.push([trend.year || 'N/A', trend.count || 0]);
      });
    }
    
    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(cell => `"${String(cell)}"`).join(',')
    ).join('\n');
    
    // Download file
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `violation_analytics_${period.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    if (!analyticsData) return;
    
    const period = getDisplayPeriod(selectedYear);
    
    const exportData = {
      exportInfo: {
        timestamp: new Date().toISOString(),
        period: period,
        filters: {
          year: selectedYear
        }
      },
      summary: {
        totalViolations: analyticsData.totalViolations || 0,
        totalTrafficViolators: analyticsData.totalTrafficViolators || 0,
        recentViolations: analyticsData.recentViolations || 0
      },
      mostCommonViolations: analyticsData.mostCommonViolations || [],
      topOfficers: analyticsData.topOfficers || [],
      violationsByType: analyticsData.violationsByType || [],
      yearlyTrends: analyticsData.yearlyTrends || [],
      violationCombinations: analyticsData.violationCombinations || [],
      violationPatterns: analyticsData.violationPatterns || []
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `violation_analytics_${period.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportReport = () => {
    if (!analyticsData) return;
    
    const period = getDisplayPeriod(selectedYear);
    
    const reportContent = `
VIOLATION ANALYTICS REPORT
Generated: ${new Date().toLocaleDateString()}
Period: ${period}
Filter: Year=${selectedYear || 'All'}

SUMMARY
========
Total Violations: ${analyticsData.totalViolations || 0}
Total Traffic Violators: ${analyticsData.totalTrafficViolators || 0}
Recent Violations: ${analyticsData.recentViolations || 0}

${analyticsData.mostCommonViolations && analyticsData.mostCommonViolations.length > 0 ? `
MOST COMMON VIOLATIONS
=====================
${analyticsData.mostCommonViolations.slice(0, 10).map((v, i) => `${i + 1}. ${v.violation || 'N/A'}: ${v.count || 0} violations`).join('\n')}
` : ''}

${analyticsData.topOfficers && analyticsData.topOfficers.length > 0 ? `
TOP OFFICERS
============
${analyticsData.topOfficers.slice(0, 10).map((o, i) => `${i + 1}. ${o.officer || 'N/A'}: ${o.count || 0} violations`).join('\n')}
` : ''}

${analyticsData.violationsByType && analyticsData.violationsByType.length > 0 ? `
VIOLATIONS BY TYPE
==================
${analyticsData.violationsByType.map(type => `${type.type || 'N/A'}: ${type.count || 0} violations`).join('\n')}
` : ''}

${analyticsData.yearlyTrends && analyticsData.yearlyTrends.length > 0 ? `
YEARLY TRENDS
=============
${analyticsData.yearlyTrends.map(trend => `${trend.year || 'N/A'}: ${trend.count || 0} violations`).join('\n')}
` : ''}
    `.trim();
    
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `violation_report_${period.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`);
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

export default ViolationAnalyticsExport;

