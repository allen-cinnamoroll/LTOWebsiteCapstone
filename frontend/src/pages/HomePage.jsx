import React, { useEffect, useState } from "react";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import StatCard from "@/components/home/StatCard";
import CircularKpi from "@/components/home/CircularKpi";
import OnlineUsersPanel from "@/components/home/OnlineUsersPanel";
import { Users, Car, ChartSpline, ChartPie, UserCog, Calendar, AlertCircle, TrendingUp, TrendingDown, AlertTriangle, Shield, Activity, Target } from "lucide-react";
import { ViolationsChart } from "@/components/home/ViolationsChart";
import { Progress } from "@/components/ui/progress";

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    vehicles: { total: 0, active: 0, expired: 0 },
    drivers: { total: 0 },
    violations: { total: 0, recent: 0, byType: [] },
    accidents: { total: 0 },
    trends: { monthlyViolations: [] },
    userStats: { total: 0, employees: 0, admins: 0 },
    kpi: { 
      renewal: { current: 0, target: 0 }, 
      vehicle: { current: 0, target: 0 }, 
      accidents: { current: 0, target: 0 }
    }
  });
  const { token, userData } = useAuth();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get("/dashboard/stats", {
        headers: {
          Authorization: token,
        },
      });
      
      if (data.success) {
        // Merge with default stats to ensure all properties exist
        setStats(prev => ({
          ...prev,
          ...data.data,
          userStats: data.data.userStats || prev.userStats,
          kpi: data.data.kpi || prev.kpi,
          vehicles: data.data.vehicles || prev.vehicles,
          drivers: data.data.drivers || prev.drivers,
          violations: data.data.violations || prev.violations,
          accidents: data.data.accidents || prev.accidents,
          trends: data.data.trends || prev.trends,
        }));
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate advanced metrics
  const calculateMetrics = () => {
    const violationsPerDriver = (stats.drivers?.total || 0) > 0 
      ? ((stats.violations?.total || 0) / (stats.drivers?.total || 1)).toFixed(2)
      : 0;
    
    const violationsPerVehicle = (stats.vehicles?.total || 0) > 0
      ? ((stats.violations?.total || 0) / (stats.vehicles?.total || 1)).toFixed(2)
      : 0;
    
    const accidentsPerDriver = (stats.drivers?.total || 0) > 0
      ? ((stats.accidents?.total || 0) / (stats.drivers?.total || 1)).toFixed(2)
      : 0;
    
    const activeVehicleRate = (stats.vehicles?.total || 0) > 0
      ? (((stats.vehicles?.active || 0) / (stats.vehicles?.total || 1)) * 100).toFixed(1)
      : 0;
    
    const expiredVehicleRate = (stats.vehicles?.total || 0) > 0
      ? (((stats.vehicles?.expired || 0) / (stats.vehicles?.total || 1)) * 100).toFixed(1)
      : 0;
    
    const violationGrowthRate = (stats.violations?.recent || 0) > 0 && (stats.violations?.total || 0) > 0
      ? ((((stats.violations?.recent || 0) / 30) / ((stats.violations?.total || 1) / 365)) * 100 - 100).toFixed(1)
      : 0;
    
    const accidentToViolationRatio = (stats.violations?.total || 0) > 0
      ? (((stats.accidents?.total || 0) / (stats.violations?.total || 1)) * 100).toFixed(2)
      : 0;
    
    const safetyScore = Math.max(0, Math.min(100, 
      100 - (parseFloat(violationsPerDriver) * 10) - (parseFloat(accidentsPerDriver) * 20)
    )).toFixed(0);
    
    return {
      violationsPerDriver,
      violationsPerVehicle,
      accidentsPerDriver,
      activeVehicleRate,
      expiredVehicleRate,
      violationGrowthRate,
      accidentToViolationRatio,
      safetyScore
    };
  };

  const metrics = calculateMetrics();

  // Calculate Vehicle Renewal performance tone based on percentage of target achieved
  const getRenewalTone = () => {
    const current = stats.kpi?.renewal?.current || 0;
    const target = stats.kpi?.renewal?.target || 0;
    
    if (target === 0) {
      return "warning"; // Default to warning if no target
    }
    
    const percentage = (current / target) * 100;
    
    if (percentage < 20) {
      return "danger"; // Red for low (0-20%)
    } else if (percentage < 40) {
      return "orange"; // Orange for mid-low (20-40%)
    } else if (percentage < 60) {
      return "yellow"; // Yellow for mid (40-60%)
    } else if (percentage < 80) {
      return "success"; // Green for hi-mid (60-80%)
    } else {
      return "primary"; // Blue for high (80%+)
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 bg-white dark:bg-black min-h-screen space-y-4 md:space-y-6 rounded-lg">
      <section className="text-2xl md:text-3xl font-bold">Dashboard</section>
      
      {loading ? (
        <div className="space-y-4">
          {/* Loading Rectangular Stat Cards - Top Row */}
          <section className="max-h-full w-full grid grid-flow-row lg:grid-flow-col grid-cols-1 gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-card shadow-sm border border-border overflow-hidden rounded-xl p-6">
                <div className="animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-4 bg-muted rounded w-32"></div>
                    <div className="w-5 h-5 bg-muted rounded"></div>
                  </div>
                  <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-20"></div>
                </div>
              </div>
            ))}
          </section>

          {/* Loading Circular KPIs - Second Row */}
          <section className="max-h-full w-full grid grid-flow-row lg:grid-flow-col grid-cols-1 gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center justify-center">
                <div className="animate-pulse">
                  <div className="w-24 h-24 md:w-28 md:h-28 bg-muted rounded-full mb-4"></div>
                  <div className="h-4 bg-muted rounded w-32 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-24"></div>
                </div>
              </div>
            ))}
          </section>

          {/* Loading Chart */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-muted rounded w-48 mb-4"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>

        </div>
      ) : (
        <>
          {/* Vehicle Renewal KPI - Featured at Top */}
          <section className="w-full flex justify-center">
            <div className="w-full max-w-md">
              <CircularKpi
                label="Vehicle Renewal"
                value={(stats.kpi?.renewal?.current || 0).toString()}
                subtitle="Renewed this month"
                icon={Calendar}
                tone={getRenewalTone()}
                target={stats.kpi?.renewal?.target || 0}
                ariaLabel={`Vehicle Renewal: ${stats.kpi?.renewal?.current || 0} renewed this month out of ${stats.kpi?.renewal?.target || 0} predicted (based on Monthly Registration Prediction)`}
              />
            </div>
          </section>

          {/* Rectangular Stat Cards - Overview Statistics */}
          <section className="max-h-full w-full grid grid-flow-row lg:grid-flow-col grid-cols-1 gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-5">
            <StatCard
              name={"Registered Vehicles"}
              value={(stats.vehicles?.total || 0).toString()}
              icon={Car}
              statuses={[
                { label: `${stats.vehicles?.active || 0} Active`, color: "#047857", bgColor: "#d1fae5" }, // Green
                { label: `${stats.vehicles?.expired || 0} Expired`, color: "#dc2626", bgColor: "#fee2e2" }, // Red
              ]}
            />
            <StatCard
              name={"Registered Owners"}
              value={(stats.drivers?.total || 0).toString()}
              icon={Users}
            />
            <StatCard 
              name={"Violations"} 
              value={(stats.violations?.total || 0).toString()} 
              icon={ChartSpline} 
            />
            <StatCard 
              name={"Accidents"} 
              value={(stats.accidents?.total || 0).toString()} 
              icon={ChartPie} 
            />
            <StatCard
              name={"System Users"}
              value={(stats.userStats?.total || 0).toString()}
              icon={UserCog}
              statuses={[
                { label: `${stats.userStats?.employees || 0} Employees`, color: "#0369a1", bgColor: "#dbeafe" }, // Blue
                { label: `${stats.userStats?.admins || 0} Admins`, color: "#7c3aed", bgColor: "#ede9fe" }, // Purple
              ]}
            />
          </section>

          {/* Violations Chart */}
          <ViolationsChart />
          
          {/* Online Users Panel - Only for admin and superadmin */}
          {(userData?.role === "0" || userData?.role === "1") && (
            <section className="w-full">
              <OnlineUsersPanel />
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default HomePage;


