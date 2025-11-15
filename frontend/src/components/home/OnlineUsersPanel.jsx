import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Loader2, AlertCircle } from "lucide-react";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";

const OnlineUsersPanel = () => {
  const [onlineData, setOnlineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token, userData } = useAuth();

  const fetchOnlineUsers = async () => {
    try {
      setError(null);
      const { data } = await apiClient.get("/user/online-users", {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        setOnlineData(data.data);
      }
    } catch (err) {
      console.error("Error fetching online users:", err);
      setError("Unable to load online users.");
    } finally {
      setLoading(false);
    }
  };

  // Send heartbeat to keep user online
  const sendHeartbeat = async () => {
    try {
      await apiClient.post("/user/me/heartbeat", {}, {
        headers: {
          Authorization: token,
        },
      });
    } catch (err) {
      // Silently fail - heartbeat is not critical
      console.error("Heartbeat failed:", err);
    }
  };

  // Fetch on mount and set up interval
  useEffect(() => {
    if (token && (userData?.role === "0" || userData?.role === "1")) {
      // Send initial heartbeat
      sendHeartbeat();
      fetchOnlineUsers();
      
      // Send heartbeat every 2 minutes to keep user online
      const heartbeatInterval = setInterval(() => {
        sendHeartbeat();
      }, 120000); // 2 minutes
      
      // Refresh online users list every 30 seconds
      const refreshInterval = setInterval(() => {
        fetchOnlineUsers();
      }, 30000);

      return () => {
        clearInterval(heartbeatInterval);
        clearInterval(refreshInterval);
      };
    }
  }, [token, userData?.role]);

  // Don't render for employees
  if (!userData || (userData.role !== "0" && userData.role !== "1")) {
    return null;
  }

  if (loading) {
    return (
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-blue-500" />
            Online Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-blue-500" />
            Online Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 py-4 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  // SUPERADMIN: Show names of online admins and employees
  if (userData.role === "0") {
    const admins = onlineData?.admins || [];
    const employees = onlineData?.employees || [];

    return (
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-blue-500" />
            Online Users
          </CardTitle>
          <CardDescription className="text-xs">
            Currently logged in users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Online Admins */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-blue-500" />
                Online Admins
              </h3>
              <Badge variant="outline" className="text-xs">
                {admins.length}
              </Badge>
            </div>
            {admins.length > 0 ? (
              <ul className="space-y-1.5">
                {admins.map((admin) => (
                  <li
                    key={admin.id}
                    className="text-xs text-gray-600 dark:text-gray-400 pl-4 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    {admin.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-500 pl-4">
                No admins online
              </p>
            )}
          </div>

          {/* Online Employees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-green-500" />
                Online Employees
              </h3>
              <Badge variant="outline" className="text-xs">
                {employees.length}
              </Badge>
            </div>
            {employees.length > 0 ? (
              <ul className="space-y-1.5">
                {employees.map((emp) => (
                  <li
                    key={emp.id}
                    className="text-xs text-gray-600 dark:text-gray-400 pl-4 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    {emp.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-500 pl-4">
                No employees online
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ADMIN: Show names of online employees
  if (userData.role === "1") {
    const employees = onlineData?.employees || [];

    return (
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-blue-500" />
            Online Employees
          </CardTitle>
          <CardDescription className="text-xs">
            Currently logged in employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-green-500" />
                Online Employees
              </h3>
              <Badge variant="outline" className="text-xs">
                {employees.length}
              </Badge>
            </div>
            {employees.length > 0 ? (
              <ul className="space-y-1.5">
                {employees.map((emp) => (
                  <li
                    key={emp.id}
                    className="text-xs text-gray-600 dark:text-gray-400 pl-4 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    {emp.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-500 pl-4">
                No employees online
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default OnlineUsersPanel;

