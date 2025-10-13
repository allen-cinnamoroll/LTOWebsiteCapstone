import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Calendar, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatSimpleDate } from "@/util/dateFormatter";

const RenewalHistoryTab = ({ vehicleId, plateNo }) => {
  const [renewalHistory, setRenewalHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });
  const { token } = useAuth();

  useEffect(() => {
    if (vehicleId) {
      fetchRenewalHistory();
    }
  }, [vehicleId]);

  const fetchRenewalHistory = async (page = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data } = await apiClient.get(`/renewal-history/vehicle/${vehicleId}?page=${page}&limit=10`, {
        headers: {
          Authorization: token,
        },
      });
      
      if (data.success) {
        setRenewalHistory(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching renewal history:", error);
      setError("Failed to fetch renewal history");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Early Renewal":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "On-Time Renewal":
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case "Late Renewal":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      "Early Renewal": {
        variant: "default",
        className: "bg-green-100 text-green-800 border-green-200"
      },
      "On-Time Renewal": {
        variant: "default", 
        className: "bg-blue-100 text-blue-800 border-blue-200"
      },
      "Late Renewal": {
        variant: "destructive",
        className: "bg-red-100 text-red-800 border-red-200"
      }
    };

    const config = statusConfig[status] || {
      variant: "secondary",
      className: "bg-gray-100 text-gray-800 border-gray-200"
    };

    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };

  const handlePageChange = (newPage) => {
    fetchRenewalHistory(newPage);
  };

  if (loading && renewalHistory.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <XCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <Button 
          onClick={() => fetchRenewalHistory()} 
          variant="outline" 
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (renewalHistory.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No renewal history found</p>
        <p className="text-xs text-gray-400">Renewal records will appear here when the vehicle is renewed</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Renewal History Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {renewalHistory.filter(r => r.status === "Early Renewal").length}
              </div>
              <div className="text-sm text-gray-600">Early</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {renewalHistory.filter(r => r.status === "On-Time Renewal").length}
              </div>
              <div className="text-sm text-gray-600">On-Time</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {renewalHistory.filter(r => r.status === "Late Renewal").length}
              </div>
              <div className="text-sm text-gray-600">Late</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Renewal History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Renewal Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled Week</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renewalHistory.map((record, index) => (
                  <TableRow key={record._id || index}>
                    <TableCell className="font-medium">
                      {formatSimpleDate(record.renewalDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.status)}
                        {getStatusBadge(record.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatSimpleDate(record.scheduledWeek)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatSimpleDate(record.dueDate)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {record.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {((pagination.current - 1) * 10) + 1} to {Math.min(pagination.current * 10, pagination.total)} of {pagination.total} records
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current - 1)}
                  disabled={pagination.current <= 1 || loading}
                >
                  Previous
                </Button>
                <span className="px-3 py-1 text-sm bg-gray-100 rounded">
                  {pagination.current} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current + 1)}
                  disabled={pagination.current >= pagination.pages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RenewalHistoryTab;
