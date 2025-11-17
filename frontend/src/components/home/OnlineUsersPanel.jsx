import React, { useState, useEffect } from "react";
import { Shield, UserCheck, Loader2, AlertCircle } from "lucide-react";
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

  // Single-card layout for both superadmin and admin
  const admins = onlineData?.admins || [];
  const employees = onlineData?.employees || [];
  const totalUsers = (admins.length || 0) + (employees.length || 0);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 flex flex-col">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Online Users</h2>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 flex flex-col">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Online Users</h2>
        <div className="flex items-center gap-2 py-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 flex flex-col">
      <h2 className="text-sm font-semibold text-slate-800 mb-2">Online Users</h2>
      <p className="text-xs text-slate-500 mb-4">Currently logged in users</p>
      
      {/* Main status line */}
      <div className="text-2xl font-semibold text-slate-900 mb-4">
        {totalUsers} {totalUsers === 1 ? 'user' : 'users'} online
      </div>

      {/* Two rows with icons */}
      <div className="space-y-3">
        {/* Online Admins row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-700">Online Admins</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">{admins.length}</span>
        </div>

        {/* Online Employees row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-700">Online Employees</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">{employees.length}</span>
        </div>
      </div>
    </div>
  );
};

export default OnlineUsersPanel;

