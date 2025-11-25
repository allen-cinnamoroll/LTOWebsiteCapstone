import React, { useEffect, useState } from "react";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import OnlineUsersPanel from "@/components/home/OnlineUsersPanel";
import { Progress } from "@/components/ui/progress";
import VehicleRenewalGauge from "@/components/home/VehicleRenewalGauge";
import Top3Municipality from "@/components/home/charts/Top3Municipality";
import Top5Violation from "@/components/home/charts/Top5Violation";
import Top3BottomMunicipality from "@/components/home/charts/Top3BottomMunicipality";
import Top3Officer from "@/components/home/charts/Top3Officer";
import Top5MunicipalityAccident from "@/components/home/charts/Top5MunicipalityAccident";
import WeeklyAccidentPattern from "@/components/home/charts/WeeklyAccidentPattern";
import ViolationTypeDistribution from "@/components/home/charts/ViolationTypeDistribution";
import { useDashboardCharts } from "@/api/dashboardCharts";
import { AlertTriangle, Car, Users } from "lucide-react";
import StatCard from "@/components/home/StatCard";
import { KpiSkeleton, ChartSkeleton, CardSkeleton } from "@/components/skeletons";

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
      accidents: { current: 0, target: 0 },
      violations: { current: 0 },
      systemUsers: { total: 0 }
    }
  });
  const { token } = useAuth();
  const charts = useDashboardCharts();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  /**
   * fetchDashboardStats - Optimized dashboard stats fetching
   * 
   * IMPROVEMENTS:
   * - Uses parallel fetching (already optimized endpoint)
   * - Critical for first paint: KPI stats load first
   * - Stats endpoint aggregates data server-side for faster response
   */
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
    <div className="container mx-auto p-4 md:p-6 bg-gradient-to-br from-gray-50 to-white dark:from-black dark:to-neutral-950 min-h-screen space-y-4 md:space-y-6 rounded-lg">
      {/* Header Section with Description */}
      <section className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
              {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
              Overview of vehicle registrations, violations, accidents, and system activity for this period
            </p>
          </div>
        </div>
      </section>
      
      {loading ? (
        <>
          {/* OPTIMIZED: Reusable skeleton components for better maintainability */}
          <section className="w-full grid grid-cols-12 gap-4">
            {/* Row 1: Stat Cards Skeleton - Critical for first paint */}
            <div className="col-span-12 md:col-span-4">
              <KpiSkeleton />
            </div>
            <div className="col-span-12 md:col-span-4">
              <KpiSkeleton />
            </div>
            <div className="col-span-12 md:col-span-4">
              <KpiSkeleton />
            </div>

            {/* Row 2: Vehicle Renewal, Most Common Violations, and Online Users Skeleton */}
            <div className="col-span-12 md:col-span-4 lg:col-span-3">
              <CardSkeleton contentHeight="aspect-[4/3]" />
            </div>
            <div className="col-span-12 md:col-span-8 lg:col-span-6">
              <ChartSkeleton />
            </div>
            <div className="col-span-12 md:col-span-4 lg:col-span-3">
              <CardSkeleton showContent={false} />
            </div>

            {/* Row 3: Top Officers and Violation Distribution Skeleton */}
            <div className="col-span-12 md:col-span-8 lg:col-span-8">
              <ChartSkeleton />
            </div>
            <div className="col-span-12 md:col-span-4 lg:col-span-4">
              <ChartSkeleton />
            </div>

            {/* Row 4: System Status & Analysis Skeleton */}
            <div className="col-span-12 lg:col-span-6">
              <ChartSkeleton />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <ChartSkeleton />
            </div>

            {/* Row 5: Accident Analysis Skeleton */}
            <div className="col-span-12 lg:col-span-6">
              <ChartSkeleton />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <ChartSkeleton />
            </div>
          </section>
        </>
      ) : (
        <>
          {/* Dashboard Grid Layout - Reorganized for better visual flow */}
          <section className="w-full grid grid-cols-12 gap-4">
            {/* Row 1: Stat Cards - Violation Total, Total Accident, System Users */}
            <div className="col-span-12 md:col-span-4">
              <StatCard
                name="Total Violation"
                icon={AlertTriangle}
                value={stats.kpi?.violations?.current?.toLocaleString() || 0}
                color="orange"
                loading={loading}
                description="Total violations recorded this month"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <StatCard
                name="Total Accident"
                icon={Car}
                value={stats.kpi?.accidents?.current?.toLocaleString() || 0}
                color="red"
                loading={loading}
                description="Total accidents recorded this month"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <StatCard
                name="System Users"
                icon={Users}
                value={stats.kpi?.systemUsers?.total?.toLocaleString() || stats.userStats?.total?.toLocaleString() || 0}
                color="blue"
                loading={loading}
                description="Total users in the system"
              />
            </div>

            {/* Row 2: Key Performance Indicators and Charts */}
            {/* Vehicle Renewal KPI */}
            <div className="col-span-12 md:col-span-4 lg:col-span-3">
              <div className="w-full">
                <VehicleRenewalGauge
                  actual={stats.kpi?.renewal?.current || 0}
                  target={stats.kpi?.renewal?.target || 0}
                  title="Renewal Progress"
                />
              </div>
            </div>
            
            {/* Most Common Violations */}
            <div className="col-span-12 md:col-span-8 lg:col-span-6">
              {charts.loading ? (
                <ChartSkeleton />
              ) : (
                <Top5Violation data={charts.violationsTop5 || []} />
              )}
            </div>

            {/* Active Users */}
            <div className="col-span-12 md:col-span-4 lg:col-span-3">
              <div className="rounded-xl shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-neutral-900 dark:to-neutral-800 border border-gray-200 dark:border-gray-700 p-4 h-full overflow-hidden relative">
                {/* Decorative gradient background */}
                <div className="absolute top-0 right-0 w-32 h-32 opacity-5 dark:opacity-10 bg-blue-500 rounded-full blur-3xl"></div>
                <OnlineUsersPanel />
              </div>
            </div>

            {/* Row 3: Top Officers and Violation Distribution */}
            {/* Top Performing Officers */}
            <div className="col-span-12 md:col-span-8 lg:col-span-8">
              {charts.loading ? (
                <ChartSkeleton />
              ) : (
                <Top3Officer data={charts.topOfficersTop3 || []} />
              )}
            </div>
            
            {/* Violation Categories */}
            <div className="col-span-12 md:col-span-4 lg:col-span-4">
              {charts.loading ? (
                <ChartSkeleton />
              ) : (
                <ViolationTypeDistribution data={charts.violationTypeDistribution || []} />
              )}
            </div>

            {/* Row 4: System Status & Analysis */}
            {/* Top Performing Municipalities */}
            <div className="col-span-12 lg:col-span-6">
              {charts.loading ? (
                <ChartSkeleton />
              ) : (
                <Top3Municipality data={charts.municipalityTop3 || []} />
              )}
            </div>
            
            {/* Areas Needing Attention */}
            <div className="col-span-12 lg:col-span-6">
              {charts.loading ? (
                <ChartSkeleton />
              ) : (
                <Top3BottomMunicipality data={charts.bottomMunicipalityTop3 || []} />
              )}
            </div>

            {/* Row 5: Accident Analysis */}
            {/* Accident-Prone Areas */}
            <div className="col-span-12 lg:col-span-6">
              {charts.loading ? (
                <ChartSkeleton />
              ) : (
                <Top5MunicipalityAccident data={charts.accidentMunicipalityTop5 || []} />
              )}
            </div>
            
            {/* Weekly Accident Trends */}
            <div className="col-span-12 lg:col-span-6">
              {charts.loading ? (
                <ChartSkeleton />
              ) : (
                <WeeklyAccidentPattern data={charts.weeklyAccidentPattern || []} />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default HomePage;


