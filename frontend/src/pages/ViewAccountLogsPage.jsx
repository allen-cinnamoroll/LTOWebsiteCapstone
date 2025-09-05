import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoaderCircle, FileText, Search, Download, Filter, Calendar } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { toast } from "sonner";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";

const roleOptions = [
  { value: "0", label: "Superadmin" },
  { value: "1", label: "Admin" },
  { value: "2", label: "Employee" },
];

const logTypes = [
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "register", label: "Registration" },
  { value: "update", label: "Account Update" },
  { value: "delete", label: "Delete" },
  { value: "password_change", label: "Password Change" },
  { value: "otp_verified", label: "OTP Verification" },
  { value: "otp_sent", label: "OTP Sent" },
  { value: "otp_reset", label: "OTP Reset" },
  { value: "add_driver", label: "Add Driver" },
  { value: "add_vehicle", label: "Add Vehicle" },
  { value: "add_accident", label: "Add Accident" },
  { value: "add_violation", label: "Add Violation" },
  { value: "update_driver", label: "Update Driver" },
  { value: "update_vehicle", label: "Update Vehicle" },
  { value: "update_accident", label: "Update Accident" },
  { value: "update_violation", label: "Update Violation" },
  { value: "delete_driver", label: "Delete Driver" },
  { value: "delete_vehicle", label: "Delete Vehicle" },
  { value: "delete_accident", label: "Delete Accident" },
  { value: "delete_violation", label: "Delete Violation" },
];

export default function ViewAccountLogsPage() {
  const { userData: currentUser } = useAuth();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedLogType, setSelectedLogType] = useState("");
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const fetchLogs = async (page = 1) => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (searchEmail) params.append("email", searchEmail);
      if (selectedLogType && selectedLogType !== "all") params.append("logType", selectedLogType);
      if (dateFrom) params.append("dateFrom", dateFrom.toISOString().split('T')[0]);
      if (dateTo) params.append("dateTo", dateTo.toISOString().split('T')[0]);

      // Apply role-based filtering based on current user's role
      if (currentUser?.role === "1") { // Admin can see admin and employee logs (including own logs)
        if (selectedRole && selectedRole !== "all") {
          params.append("role", selectedRole);
        } else {
          // If no specific role selected, show both admin and employee logs
          params.append("roles", "1,2");
        }
      } else if (currentUser?.role === "0") { // Superadmin can see all logs (including own logs)
        if (selectedRole && selectedRole !== "all") {
          params.append("role", selectedRole);
        } else {
          // If no specific role selected, show all logs (superadmin, admin, and employee)
          params.append("roles", "0,1,2");
        }
      }

      const response = await apiClient.get(`/user/logs?${params}`);
      
      if (response.data.success) {
        let filteredLogs = response.data.logs;
        
        // Additional client-side filtering if needed
        if (currentUser?.role === "1") { // Admin can see admin and employee logs (including own logs)
          if (selectedRole && selectedRole !== "all") {
            filteredLogs = filteredLogs.filter(log => log.role === selectedRole);
          } else {
            filteredLogs = filteredLogs.filter(log => log.role === "1" || log.role === "2");
          }
        } else if (currentUser?.role === "0") { // Superadmin can see all logs (including own logs)
          if (selectedRole && selectedRole !== "all") {
            filteredLogs = filteredLogs.filter(log => log.role === selectedRole);
          } else {
            filteredLogs = filteredLogs.filter(log => log.role === "0" || log.role === "1" || log.role === "2");
          }
        }
        
        console.log('Raw logs from API:', response.data.logs); // Debug log
        console.log('Filtered logs:', filteredLogs); // Debug log
        setLogs(filteredLogs);
        setTotalPages(response.data.totalPages);
        setTotalLogs(filteredLogs.length);
        setCurrentPage(page);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch logs";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentUser]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLogs(1);
  };

  const handleClearFilters = () => {
    setSearchEmail("");
    setSelectedRole("");
    setSelectedLogType("");
    setDateFrom(null);
    setDateTo(null);
    setCurrentPage(1);
    fetchLogs(1);
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (searchEmail) params.append("email", searchEmail);
      if (selectedRole) params.append("role", selectedRole);
      if (selectedLogType) params.append("logType", selectedLogType);
      if (dateFrom) params.append("dateFrom", dateFrom.toISOString().split('T')[0]);
      if (dateTo) params.append("dateTo", dateTo.toISOString().split('T')[0]);

      const response = await apiClient.get(`/user/logs/export?${params}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `account-logs-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Logs exported successfully!");
    } catch (error) {
      toast.error("Failed to export logs");
    }
  };

  const getLogTypeBadgeVariant = (logType) => {
    switch (logType) {
      case "login":
        return "default";
      case "logout":
        return "secondary";
      case "register":
        return "outline";
      case "update":
        return "default";
      case "password_change":
        return "destructive";
      case "otp_verified":
        return "secondary";
      case "otp_sent":
        return "outline";
      case "otp_reset":
        return "destructive";
      case "add_driver":
        return "default";
      case "add_vehicle":
        return "default";
      case "add_accident":
        return "destructive";
      case "add_violation":
        return "destructive";
      case "update_driver":
        return "secondary";
      case "update_vehicle":
        return "secondary";
      case "update_accident":
        return "destructive";
      case "update_violation":
        return "destructive";
      case "delete_driver":
        return "destructive";
      case "delete_vehicle":
        return "destructive";
      case "delete_accident":
        return "destructive";
      case "delete_violation":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case "0":
        return "destructive";
      case "1":
        return "default";
      case "2":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                <CardTitle>Account Logs</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportLogs} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
                <Button onClick={handleSearch} size="sm">
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>
            </div>
            <CardDescription>
              {currentUser?.role === "0" 
                ? "View and monitor all account activities and system logs (Superadmin, Admin, and Employee)" 
                : "View and monitor admin and employee account activities and system logs"}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle className="text-lg">Filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <Input
                placeholder="Search by email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roleOptions
                    .filter(option => {
                      // Admin can see admin and employee logs (including own logs)
                      if (currentUser?.role === "1") {
                        return option.value === "1" || option.value === "2";
                      }
                      // Superadmin can see all logs (including own logs)
                      if (currentUser?.role === "0") {
                        return option.value === "0" || option.value === "1" || option.value === "2";
                      }
                      return false;
                    })
                    .map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select value={selectedLogType} onValueChange={setSelectedLogType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by log type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {logTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "MM/dd/yyyy") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "MM/dd/yyyy") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button onClick={handleClearFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Account Activity Logs</CardTitle>
              <div className="text-sm text-muted-foreground">
                Total: {totalLogs} logs
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoaderCircle className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No logs found matching your criteria
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Performed By</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {log.actorName || "N/A"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {log.actorEmail || ""}
                              </span>
                              {log.actorRole && (
                                <Badge variant="outline" className="w-fit mt-1">
                                  {roleOptions.find(r => r.value === log.actorRole)?.label || "Unknown"}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {log.userName || "N/A"}
                          </TableCell>
                          <TableCell>
                            {log.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(log.role)}>
                              {roleOptions.find(r => r.value === log.role)?.label || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getLogTypeBadgeVariant(log.logType)}>
                              {logTypes.find(t => t.value === log.logType)?.label || log.logType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {log.details || "N/A"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">
                              {log.ipAddress === '::1' ? '127.0.0.1' : 
                               log.ipAddress === '::ffff:127.0.0.1' ? '127.0.0.1' :
                               log.ipAddress || "N/A"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.status === "success" ? "default" : "destructive"}>
                              {log.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLogs(currentPage - 1)}
                        disabled={currentPage === 1 || isLoading}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLogs(currentPage + 1)}
                        disabled={currentPage === totalPages || isLoading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
