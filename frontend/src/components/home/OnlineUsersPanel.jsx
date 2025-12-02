import React, { useState, useEffect } from "react";
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
    if (token && (userData?.role === "0" || userData?.role === "1" || userData?.role === "2")) {
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

  // Only render for superadmin, admin, and employees
  if (!userData || (userData.role !== "0" && userData.role !== "1" && userData.role !== "2")) {
    return null;
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold mb-1">
          <Users className="h-4 w-4 text-blue-500" />
          Online Users
        </div>
        <div className="text-xs text-gray-500 mb-3">Currently logged in users</div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold mb-1">
          <Users className="h-4 w-4 text-blue-500" />
          Online Users
        </div>
        <div className="text-xs text-gray-500 mb-3">Currently logged in users</div>
        <div className="flex items-center gap-2 py-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      </div>
    );
  }

  // Get data based on user role
  const admins = onlineData?.admins || [];
  const employees = onlineData?.employees || [];
  const isSuperAdmin = userData?.role === "0";

  return (
    <div className="relative">
      <div className="mb-3">
        <div className="flex items-start gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/15">
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="space-y-0">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active Users</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
              Currently logged in system users
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Admins row - Only show for superadmin */}
        {isSuperAdmin && (
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-blue-500/10">
                  <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Online Admins</span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium">{admins.length}</span>
            </div>
            {admins.length === 0 ? (
              <div className="text-[11px] text-gray-500 mt-1">No admins online</div>
            ) : (
              <div className="mt-2 space-y-1">
                {admins.map((admin) => (
                  <div key={admin.id} className="text-[11px] text-gray-600 dark:text-gray-400 pl-6">
                    <span className="text-green-500">•</span> {admin.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Employees row - Show for superadmin, admin, and employees */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-green-500/10">
                <UserCheck className="h-3.5 w-3.5 text-green-500" />
              </div>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Online Employees</span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium">{employees.length}</span>
          </div>
          {employees.length === 0 ? (
            <div className="text-[11px] text-gray-500 mt-1">No employees online</div>
          ) : (
            <div className="mt-2 space-y-1">
              {employees.map((employee) => (
                <div key={employee.id} className="text-[11px] text-gray-600 dark:text-gray-400 pl-6">
                  <span className="text-green-500">•</span> {employee.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnlineUsersPanel;

