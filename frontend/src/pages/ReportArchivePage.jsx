import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, 
  RefreshCw, 
  CheckCircle2,
  Archive,
  Loader2,
  Filter
} from 'lucide-react';
import apiClient from '@/api/axios';
import { toast } from 'sonner';
import dayjs from 'dayjs';

const ReportArchivePage = () => {
  const [automatedReports, setAutomatedReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', 'daily', 'monthly'

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
      toast.error('Failed to fetch reports');
    } finally {
      setLoadingReports(false);
    }
  };

  // Filter and sort reports based on selected type (latest to oldest)
  const filteredReports = useMemo(() => {
    let reports = filterType === 'all' 
      ? automatedReports 
      : automatedReports.filter(report => report.type === filterType);
    
    // Sort by date (latest to oldest) - parse date string to Date object for proper sorting
    return reports.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      // If dates are equal, sort by type (daily before monthly) then by filename
      if (dateB.getTime() === dateA.getTime()) {
        if (a.type !== b.type) {
          return a.type === 'daily' ? -1 : 1;
        }
        return b.filename.localeCompare(a.filename);
      }
      return dateB - dateA; // Descending order (newest first)
    });
  }, [automatedReports, filterType]);

  const downloadAutomatedReport = async (filename) => {
    try {
      toast.loading('Downloading report...', { id: `download-${filename}` });
      
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

      toast.success('Report downloaded successfully!', { id: `download-${filename}` });
    } catch (error) {
      console.error('Error downloading automated report:', error);
      toast.error('Failed to download report. Please try again.', { id: `download-${filename}` });
    }
  };

  return (
    <div className="h-full bg-white dark:bg-black overflow-hidden rounded-lg">
      <div className="container mx-auto px-6 py-4 h-full flex flex-col">
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col space-y-4">
          {/* Header */}
          <Card className="flex-shrink-0 rounded-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Archive className="h-6 w-6" />
                  <CardTitle>Report Archive</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAutomatedReports}
                  disabled={loadingReports}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingReports ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <CardDescription>
                View and download automated system reports. Reports are automatically generated daily at 11:59 PM.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Automated Reports List */}
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-lg">
            <CardHeader className="flex-shrink-0 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Automated Reports
                  </CardTitle>
                  <CardDescription>
                    System-generated reports
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reports</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {loadingReports ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading reports...</span>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Archive className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground font-medium">
                    {automatedReports.length === 0 
                      ? 'No automated reports available yet'
                      : `No ${filterType === 'daily' ? 'daily' : 'monthly'} reports found`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {automatedReports.length === 0
                      ? 'Reports are automatically generated daily at 11:59 PM'
                      : 'Try selecting a different filter'}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden flex-1 flex flex-col min-h-0">
                  <div className="overflow-y-auto flex-1" style={{ maxHeight: '400px' }}>
                    <table className="w-full">
                      <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">
                        <tr className="border-b">
                          <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Report Type</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Date</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Filename</th>
                          <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReports.map((report, index) => (
                          <tr 
                            key={report.filename} 
                            className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                              index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-gray-900/30'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <Badge variant={report.type === 'daily' ? 'default' : 'secondary'}>
                                {report.type === 'daily' ? 'Daily' : 'Monthly'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {dayjs(report.date).format('MMMM DD, YYYY')}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground font-mono text-xs">
                              {report.filename}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadAutomatedReport(report.filename)}
                                className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {filteredReports.length > 0 && (
                <div className="text-xs text-muted-foreground mt-3 text-center">
                  Showing {filteredReports.length} of {automatedReports.length} report{automatedReports.length !== 1 ? 's' : ''}
                  {filterType !== 'all' && ` (${filterType} only)`}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportArchivePage;

