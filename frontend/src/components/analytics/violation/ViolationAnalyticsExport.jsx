import React from 'react';
import { Download, FileText, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';

const ViolationAnalyticsExport = ({ 
  analyticsData, 
  selectedYear,
  className = "" 
}) => {
  
  const getDisplayPeriod = (year) => {
    if (!year) {
      return 'All Time';
    }
    
    if (year === 'All') {
      return 'All Time';
    }
    
    return `Year ${year}`;
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
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={exportToCSV} className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToJSON} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={exportReport} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Export Report
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ViolationAnalyticsExport;

