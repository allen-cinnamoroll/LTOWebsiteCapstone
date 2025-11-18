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

const RegistrationAnalyticsExport = ({ 
  analyticsData, 
  selectedMonth, 
  selectedYear,
  className = "" 
}) => {
  
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

  const exportToCSV = () => {
    if (!analyticsData) return;
    
    const csvData = [];
    const period = getDisplayPeriod(selectedMonth, selectedYear);
    
    // Add header
    csvData.push(['Registration Analytics Report']);
    csvData.push([`Period: ${period}`]);
    csvData.push([`Generated: ${new Date().toLocaleDateString()}`]);
    csvData.push(['']); // Empty row
    
    // Add summary data
    csvData.push(['Summary', '']);
    csvData.push(['Metric', 'Value']);
    csvData.push(['Total Vehicles', analyticsData.vehicles?.total || 0]);
    csvData.push(['Active Vehicles', analyticsData.vehicles?.active || 0]);
    csvData.push(['Expired Vehicles', analyticsData.vehicles?.expired || 0]);
    csvData.push(['Total Owners', analyticsData.drivers?.total || 0]);
    csvData.push(['Owners With License', analyticsData.drivers?.withLicense || 0]);
    csvData.push(['Owners Without License', analyticsData.drivers?.withoutLicense || 0]);
    csvData.push(['Total Plates', analyticsData.plateClassification?.total || 0]);
    csvData.push(['Permanent Plates', analyticsData.plateClassification?.permanent || 0]);
    csvData.push(['Temporary Plates', analyticsData.plateClassification?.temporary || 0]);
    csvData.push(['']); // Empty row
    
    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(cell => `"${String(cell)}"`).join(',')
    ).join('\n');
    
    // Download file
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `registration_analytics_${period.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

export default RegistrationAnalyticsExport;

