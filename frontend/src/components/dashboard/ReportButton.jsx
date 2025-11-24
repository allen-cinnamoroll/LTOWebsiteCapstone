import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Download, Calendar, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import apiClient from '@/api/axios';
import { toast } from 'sonner';
import dayjs from 'dayjs';

const ReportButton = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [automatedReports, setAutomatedReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Fetch automatically generated reports
  useEffect(() => {
    fetchAutomatedReports();
  }, []);

  const fetchAutomatedReports = async () => {
    try {
      setLoadingReports(true);
      const { data } = await apiClient.get('/dashboard/automated-reports');
      if (data.success) {
        setAutomatedReports(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching automated reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const generateReport = async (reportType) => {
    try {
      setIsGenerating(true);
      
      // Prepare query params based on report type
      let params = { period: reportType };
      
      if (reportType === 'monthly') {
        const now = new Date();
        params.targetMonth = now.getMonth() + 1; // 1-12
        params.targetYear = now.getFullYear();
      } else if (reportType === 'daily') {
        const now = new Date();
        params.targetDate = dayjs(now).format('YYYY-MM-DD');
      }

      toast.loading('Generating report...', { id: 'report-generation' });

      // Make request to backend
      const response = await apiClient.get('/dashboard/report-export', {
        params,
        responseType: 'blob', // Important for file download
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = dayjs().format('YYYY-MM-DD_HHmmss');
      const filename = `LTO_Report_${reportType}_${timestamp}.xlsx`;
      link.setAttribute('download', filename);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${reportType === 'daily' ? 'Daily' : 'Monthly'} report generated successfully!`, { 
        id: 'report-generation' 
      });
      // Refresh automated reports list
      fetchAutomatedReports();
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report. Please try again.', { 
        id: 'report-generation' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAutomatedReport = async (filename) => {
    try {
      const response = await apiClient.get(`/dashboard/automated-reports/${filename}`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully!');
    } catch (error) {
      console.error('Error downloading automated report:', error);
      toast.error('Failed to download report. Please try again.');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="default" 
          size="default"
          disabled={isGenerating}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-h-[600px] overflow-y-auto">
        <DropdownMenuLabel>Generate Report</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => generateReport('daily')}
          disabled={isGenerating}
          className="cursor-pointer"
        >
          <Calendar className="mr-2 h-4 w-4" />
          <span>Generate Daily Report</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => generateReport('monthly')}
          disabled={isGenerating}
          className="cursor-pointer"
        >
          <Clock className="mr-2 h-4 w-4" />
          <span>Generate Monthly Report</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Automated Reports</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              fetchAutomatedReports();
            }}
            disabled={loadingReports}
          >
            <RefreshCw className={`h-3 w-3 ${loadingReports ? 'animate-spin' : ''}`} />
          </Button>
        </DropdownMenuLabel>
        {loadingReports ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Loading reports...
          </div>
        ) : automatedReports.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No automated reports available yet
            <div className="text-xs mt-1">
              Reports are generated daily at 11:59 PM
            </div>
          </div>
        ) : (
          <>
            {automatedReports.slice(0, 10).map((report) => (
              <DropdownMenuItem
                key={report.filename}
                onClick={() => downloadAutomatedReport(report.filename)}
                className="cursor-pointer"
              >
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-medium">
                    {report.type === 'daily' ? 'Daily' : 'Monthly'} Report
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {dayjs(report.date).format('MMM DD, YYYY')}
                  </span>
                </div>
                <Download className="ml-2 h-3 w-3" />
              </DropdownMenuItem>
            ))}
            {automatedReports.length > 10 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                Showing latest 10 reports
              </div>
            )}
          </>
        )}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          <div>Reports include vehicle, violation, and accident data</div>
          <div className="mt-1">Automated reports generated daily at 11:59 PM</div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ReportButton;

