import React from 'react';
import { Download, FileText, Image, Table, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';

const ExportUtilities = ({ 
  analyticsData, 
  riskData, 
  timePeriod, 
  selectedSeverity, 
  selectedVehicleType,
  className = "" 
}) => {
  
  const exportToCSV = () => {
    if (!analyticsData) return;
    
    const csvData = [];
    
    // Add summary data
    csvData.push(['Metric', 'Value', 'Change']);
    csvData.push(['Total Accidents', analyticsData.summary.totalAccidents, analyticsData.summary.accidentChange]);
    csvData.push(['Fatal Accidents', analyticsData.summary.fatalities, analyticsData.summary.fatalitiesChange]);
    csvData.push(['High Risk Areas', analyticsData.distributions.municipality.length, '']);
    
    if (riskData) {
      csvData.push(['High Risk Predictions', riskData.riskPredictions.highRisk, riskData.riskPredictions.highRiskPercentage]);
    }
    
    csvData.push(['', '', '']); // Empty row
    
    // Add trends data
    csvData.push(['Month', 'Accidents']);
    analyticsData.trends.monthly.forEach(trend => {
      const date = new Date(trend._id.year, trend._id.month - 1);
      csvData.push([date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), trend.count]);
    });
    
    csvData.push(['', '']); // Empty row
    
    // Add severity distribution
    csvData.push(['Severity', 'Count']);
    analyticsData.distributions.severity.forEach(item => {
      csvData.push([item._id, item.count]);
    });
    
    csvData.push(['', '']); // Empty row
    
    // Add vehicle type distribution
    csvData.push(['Vehicle Type', 'Count']);
    analyticsData.distributions.vehicleType.forEach(item => {
      csvData.push([item._id, item.count]);
    });
    
    csvData.push(['', '']); // Empty row
    
    // Add municipality distribution
    csvData.push(['Municipality', 'Count']);
    analyticsData.distributions.municipality.forEach(item => {
      csvData.push([item._id, item.count]);
    });
    
    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `accident_analytics_${timePeriod}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    if (!analyticsData) return;
    
    const exportData = {
      exportInfo: {
        timestamp: new Date().toISOString(),
        timePeriod: timePeriod,
        filters: {
          severity: selectedSeverity,
          vehicleType: selectedVehicleType
        }
      },
      summary: analyticsData.summary,
      trends: analyticsData.trends,
      distributions: analyticsData.distributions,
      riskData: riskData,
      mapData: analyticsData.mapData
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `accident_analytics_${timePeriod}_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportChartAsImage = (chartType) => {
    // This would require chart refs and html2canvas or similar library
    // For now, we'll show a placeholder
    alert(`Exporting ${chartType} chart as image... (Feature requires additional setup)`);
  };

  const exportReport = () => {
    if (!analyticsData) return;
    
    const reportContent = `
ACCIDENT ANALYTICS REPORT
Generated: ${new Date().toLocaleDateString()}
Time Period: ${timePeriod}
Filters: Severity=${selectedSeverity}, Vehicle Type=${selectedVehicleType}

SUMMARY
========
Total Accidents: ${analyticsData.summary.totalAccidents}
Fatal Accidents: ${analyticsData.summary.fatalities}
High Risk Areas: ${analyticsData.distributions.municipality.length}
Accident Change: ${analyticsData.summary.accidentChange}%

${riskData ? `
RISK ANALYSIS
=============
High Risk Predictions: ${riskData.riskPredictions.highRisk} (${riskData.riskPredictions.highRiskPercentage}%)
Medium Risk: ${riskData.riskPredictions.mediumRisk}
Low Risk: ${riskData.riskPredictions.lowRisk}
` : ''}

MONTHLY TRENDS
==============
${analyticsData.trends.monthly.map(trend => {
  const date = new Date(trend._id.year, trend._id.month - 1);
  return `${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}: ${trend.count} accidents`;
}).join('\n')}

SEVERITY DISTRIBUTION
====================
${analyticsData.distributions.severity.map(item => `${item._id}: ${item.count} accidents`).join('\n')}

VEHICLE TYPE DISTRIBUTION
=========================
${analyticsData.distributions.vehicleType.map(item => `${item._id}: ${item.count} accidents`).join('\n')}

TOP MUNICIPALITIES
==================
${analyticsData.distributions.municipality.slice(0, 10).map(item => `${item._id}: ${item.count} accidents`).join('\n')}
    `.trim();
    
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `accident_report_${timePeriod}_${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          <DropdownMenuItem onClick={exportReport} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Export Report
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => exportChartAsImage('trends')} className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Export Trends Chart
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportChartAsImage('severity')} className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Export Severity Chart
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportChartAsImage('heatmap')} className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Export Heatmap
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ExportUtilities;
