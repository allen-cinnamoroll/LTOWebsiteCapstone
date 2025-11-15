import React, { useEffect, useState } from "react";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import StatCard from "@/components/home/StatCard";
import CircularKpi from "@/components/home/CircularKpi";
import OnlineUsersPanel from "@/components/home/OnlineUsersPanel";
import { Users, Car, ChartSpline, ChartPie, UserCog, Calendar, AlertCircle, FileCheck, TrendingUp, TrendingDown, AlertTriangle, Shield, Activity, Target, BarChart3 } from "lucide-react";
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
      expiringRegistrations: 0, 
      pendingViolations: 0, 
      todaysRegistrations: 0,
      forecastedRegistrationsNext30Days: 0,
      previous30DaysRegistrations: 0,
      percentageChange: null
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

  return (
    <div className="container mx-auto p-4 md:p-6 bg-white dark:bg-black min-h-screen space-y-4 md:space-y-6 rounded-lg">
      <section className="text-2xl md:text-3xl font-bold">Dashboard</section>
      
      {loading ? (
        <div className="space-y-4">
          {/* Loading Rectangular Stat Cards - Top Row */}
          <section className="max-h-full w-full grid grid-flow-row lg:grid-flow-col grid-cols-1 gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
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
          <section className="max-h-full w-full grid grid-flow-row lg:grid-flow-col grid-cols-1 gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
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
          {/* Rectangular Stat Cards - Top Row */}
          <section className="max-h-full w-full grid grid-flow-row lg:grid-flow-col grid-cols-1 gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-4">
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
          </section>

          {/* Circular KPIs - Second Row */}
          <section className="max-h-full w-full grid grid-flow-row lg:grid-flow-col grid-cols-1 gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-5">
            <CircularKpi
              label="System Users"
              value={(stats.userStats?.total || 0).toString()}
              subtitle={`${stats.userStats?.employees || 0} Employees, ${stats.userStats?.admins || 0} Admins`}
              icon={UserCog}
              tone="info"
              ariaLabel={`System Users: ${stats.userStats?.total || 0} total (${stats.userStats?.employees || 0} employees, ${stats.userStats?.admins || 0} admins)`}
            />
            <CircularKpi
              label="Expiring Registrations"
              value={(stats.kpi?.expiringRegistrations || 0).toString()}
              subtitle="Next 30 days"
              icon={Calendar}
              tone="warning"
              ariaLabel={`Expiring Registrations: ${stats.kpi?.expiringRegistrations || 0} vehicles expiring in the next 30 days`}
            />
            <CircularKpi
              label="Pending Violations"
              value={(stats.kpi?.pendingViolations || 0).toString()}
              subtitle="Awaiting Resolution"
              icon={AlertCircle}
              tone="danger"
              trendLabel={(stats.kpi?.pendingViolations || 0) > 100 ? "High backlog" : (stats.kpi?.pendingViolations || 0) > 50 ? "Moderate" : "Normal"}
              trendVariant={(stats.kpi?.pendingViolations || 0) > 100 ? "negative" : (stats.kpi?.pendingViolations || 0) > 50 ? "neutral" : "positive"}
              ariaLabel={`Pending Violations: ${stats.kpi?.pendingViolations || 0} violations awaiting resolution`}
            />
            <CircularKpi
              label="Today's Registrations"
              value={(stats.kpi?.todaysRegistrations || 0).toString()}
              subtitle="So far today"
              icon={FileCheck}
              tone="success"
              ariaLabel={`Today's Registrations: ${stats.kpi?.todaysRegistrations || 0} registrations created today`}
            />
            <CircularKpi
              label="Forecasted Registrations"
              value={(stats.kpi?.forecastedRegistrationsNext30Days || 0).toString()}
              subtitle="Next 30 days (forecast)"
              icon={BarChart3}
              tone={stats.kpi?.percentageChange !== null && stats.kpi?.percentageChange !== undefined && stats.kpi.percentageChange < 0 ? "danger" : "success"}
              trendLabel={
                stats.kpi?.percentageChange !== null && stats.kpi?.percentageChange !== undefined
                  ? `${stats.kpi.percentageChange > 0 ? '↑' : '↓'} ${Math.abs(stats.kpi.percentageChange).toFixed(1)}% vs last 30 days`
                  : undefined
              }
              trendVariant={
                stats.kpi?.percentageChange !== null && stats.kpi?.percentageChange !== undefined
                  ? stats.kpi.percentageChange > 0 ? "positive" : "negative"
                  : "neutral"
              }
              ariaLabel={`Forecasted Registrations: ${stats.kpi?.forecastedRegistrationsNext30Days || 0} predicted for next 30 days${stats.kpi?.percentageChange !== null && stats.kpi?.percentageChange !== undefined ? ` (${stats.kpi.percentageChange > 0 ? '+' : ''}${stats.kpi.percentageChange.toFixed(1)}% vs last 30 days)` : ''}`}
            />
          </section>

          <ViolationsChart />
          
          {/* Online Users Panel - Only for admin and superadmin */}
          {(userData?.role === "0" || userData?.role === "1") && (
            <section className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-5">
              <div className="lg:col-span-1">
                <OnlineUsersPanel />
              </div>
              <div className="lg:col-span-3">
          {/* Advanced KPI Summary Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
                  {/* Violations Analytics Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">Violations Analytics</h3>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Comprehensive violation metrics</p>
                      </div>
                      <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-blue-700 dark:text-blue-200" />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Violations</span>
                          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {(stats.violations?.total || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Last 30 days:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.violations?.recent || 0}</span>
                          {parseFloat(metrics.violationGrowthRate) !== 0 && (
                            <span className={`flex items-center gap-1 ${parseFloat(metrics.violationGrowthRate) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {parseFloat(metrics.violationGrowthRate) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {Math.abs(parseFloat(metrics.violationGrowthRate))}%
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">Per Owner</span>
                          <span className="font-bold text-gray-900 dark:text-white">{metrics.violationsPerDriver}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">Per Vehicle</span>
                          <span className="font-bold text-gray-900 dark:text-white">{metrics.violationsPerVehicle}</span>
                        </div>
                      </div>

                      {(stats.violations?.byType || []).length > 0 && (
                        <div className="pt-3 border-t border-blue-200 dark:border-blue-800">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase">Top Violation Types</p>
                          <div className="space-y-2">
                            {(stats.violations?.byType || [])
                              .sort((a, b) => b.count - a.count)
                              .slice(0, 3)
                              .map((type, index) => {
                                const percentage = ((type.count / (stats.violations?.total || 1)) * 100).toFixed(1);
                                return (
                                  <div key={index} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{type._id || 'Unknown'}</span>
                                      <span className="font-bold text-gray-900 dark:text-white ml-2">{type.count} ({percentage}%)</span>
                                    </div>
                                    <Progress value={parseFloat(percentage)} className="h-1.5" />
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Accidents Analytics Card */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border border-orange-200 dark:border-orange-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100">Accidents Analytics</h3>
                        <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">Safety and incident metrics</p>
                      </div>
                      <div className="p-2 bg-orange-200 dark:bg-orange-800 rounded-lg">
                        <Activity className="w-6 h-6 text-orange-700 dark:text-orange-200" />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-orange-100 dark:border-orange-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Accidents</span>
                          <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {(stats.accidents?.total || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <Target className="w-3 h-3" />
                          <span>Accident-to-Violation Ratio: <span className="font-semibold text-orange-600 dark:text-orange-400">{metrics.accidentToViolationRatio}%</span></span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">Per Owner</span>
                          <span className="font-bold text-gray-900 dark:text-white">{metrics.accidentsPerDriver}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">Per 1000 Vehicles</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {(stats.vehicles?.total || 0) > 0 
                              ? (((stats.accidents?.total || 0) / (stats.vehicles?.total || 1)) * 1000).toFixed(2)
                              : '0'
                            }
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-orange-200 dark:border-orange-800">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">Risk Assessment</p>
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-700 dark:text-gray-300">Accident Severity Index</span>
                              <span className={`font-bold ${
                                parseFloat(metrics.accidentToViolationRatio) > 5 ? 'text-red-600' : 
                                parseFloat(metrics.accidentToViolationRatio) > 2 ? 'text-orange-600' : 
                                'text-green-600'
                              }`}>
                                {parseFloat(metrics.accidentToViolationRatio) > 5 ? 'High' : 
                                 parseFloat(metrics.accidentToViolationRatio) > 2 ? 'Medium' : 
                                 'Low'}
                              </span>
                            </div>
                            <Progress 
                              value={Math.min(parseFloat(metrics.accidentToViolationRatio) * 10, 100)} 
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System Health & Safety Score Card */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 border border-green-200 dark:border-green-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-green-900 dark:text-green-100">System Health</h3>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">Overall safety metrics</p>
                      </div>
                      <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                        <Shield className="w-6 h-6 text-green-700 dark:text-green-200" />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-green-100 dark:border-green-800">
                        <div className="text-center mb-3">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Safety Score</p>
                          <div className="relative inline-flex items-center justify-center">
                            <svg className="w-24 h-24 transform -rotate-90">
                              <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-gray-200 dark:text-gray-700"
                              />
                              <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 40}`}
                                strokeDashoffset={`${2 * Math.PI * 40 * (1 - metrics.safetyScore / 100)}`}
                                className={`${
                                  metrics.safetyScore >= 80 ? 'text-green-500' :
                                  metrics.safetyScore >= 60 ? 'text-yellow-500' :
                                  metrics.safetyScore >= 40 ? 'text-orange-500' :
                                  'text-red-500'
                                } transition-all duration-1000`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-3xl font-bold text-gray-900 dark:text-white">{metrics.safetyScore}</span>
                            </div>
                          </div>
                          <p className={`text-xs font-semibold mt-2 ${
                            metrics.safetyScore >= 80 ? 'text-green-600' :
                            metrics.safetyScore >= 60 ? 'text-yellow-600' :
                            metrics.safetyScore >= 40 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {metrics.safetyScore >= 80 ? 'Excellent' :
                             metrics.safetyScore >= 60 ? 'Good' :
                             metrics.safetyScore >= 40 ? 'Fair' :
                             'Needs Improvement'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-green-100 dark:border-green-800">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Vehicle Status</p>
                          <div className="space-y-2">
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-gray-600 dark:text-gray-400">Active Vehicles</span>
                                <span className="font-bold text-green-600 dark:text-green-400">{metrics.activeVehicleRate}%</span>
                              </div>
                              <Progress value={parseFloat(metrics.activeVehicleRate)} className="h-1.5 bg-gray-200 dark:bg-gray-700" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-gray-600 dark:text-gray-400">Expired Vehicles</span>
                                <span className="font-bold text-red-600 dark:text-red-400">{metrics.expiredVehicleRate}%</span>
                              </div>
                              <Progress value={parseFloat(metrics.expiredVehicleRate)} className="h-1.5 bg-gray-200 dark:bg-gray-700" />
                            </div>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-green-100 dark:border-green-800">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Key Ratios</p>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Owners per Vehicle</span>
                              <span className="font-bold text-gray-900 dark:text-white">
                                {(stats.vehicles?.total || 0) > 0 ? (((stats.drivers?.total || 0) / (stats.vehicles?.total || 1))).toFixed(2) : '0'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Violations per 100 Owners</span>
                              <span className="font-bold text-gray-900 dark:text-white">
                                {(stats.drivers?.total || 0) > 0 ? (((stats.violations?.total || 0) / (stats.drivers?.total || 1)) * 100).toFixed(1) : '0'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Advanced KPI Summary Section - For employees (no online users panel) */}
          {userData?.role === "2" && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
            {/* Violations Analytics Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">Violations Analytics</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Comprehensive violation metrics</p>
                </div>
                <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-blue-700 dark:text-blue-200" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Violations</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {(stats.violations?.total || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Last 30 days:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.violations?.recent || 0}</span>
                    {parseFloat(metrics.violationGrowthRate) !== 0 && (
                      <span className={`flex items-center gap-1 ${parseFloat(metrics.violationGrowthRate) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {parseFloat(metrics.violationGrowthRate) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(parseFloat(metrics.violationGrowthRate))}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">Per Owner</span>
                    <span className="font-bold text-gray-900 dark:text-white">{metrics.violationsPerDriver}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">Per Vehicle</span>
                    <span className="font-bold text-gray-900 dark:text-white">{metrics.violationsPerVehicle}</span>
                  </div>
                </div>

                {(stats.violations?.byType || []).length > 0 && (
                  <div className="pt-3 border-t border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase">Top Violation Types</p>
                    <div className="space-y-2">
                      {(stats.violations?.byType || [])
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 3)
                        .map((type, index) => {
                          const percentage = ((type.count / (stats.violations?.total || 1)) * 100).toFixed(1);
                          return (
                            <div key={index} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{type._id || 'Unknown'}</span>
                                <span className="font-bold text-gray-900 dark:text-white ml-2">{type.count} ({percentage}%)</span>
                              </div>
                              <Progress value={parseFloat(percentage)} className="h-1.5" />
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Accidents Analytics Card */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border border-orange-200 dark:border-orange-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100">Accidents Analytics</h3>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">Safety and incident metrics</p>
                </div>
                <div className="p-2 bg-orange-200 dark:bg-orange-800 rounded-lg">
                  <Activity className="w-6 h-6 text-orange-700 dark:text-orange-200" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-orange-100 dark:border-orange-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Accidents</span>
                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {(stats.accidents?.total || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Target className="w-3 h-3" />
                    <span>Accident-to-Violation Ratio: <span className="font-semibold text-orange-600 dark:text-orange-400">{metrics.accidentToViolationRatio}%</span></span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">Per Owner</span>
                    <span className="font-bold text-gray-900 dark:text-white">{metrics.accidentsPerDriver}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">Per 1000 Vehicles</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {(stats.vehicles?.total || 0) > 0 
                        ? (((stats.accidents?.total || 0) / (stats.vehicles?.total || 1)) * 1000).toFixed(2)
                        : '0'
                      }
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-orange-200 dark:border-orange-800">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">Risk Assessment</p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-700 dark:text-gray-300">Accident Severity Index</span>
                        <span className={`font-bold ${
                          parseFloat(metrics.accidentToViolationRatio) > 5 ? 'text-red-600' : 
                          parseFloat(metrics.accidentToViolationRatio) > 2 ? 'text-orange-600' : 
                          'text-green-600'
                        }`}>
                          {parseFloat(metrics.accidentToViolationRatio) > 5 ? 'High' : 
                           parseFloat(metrics.accidentToViolationRatio) > 2 ? 'Medium' : 
                           'Low'}
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(parseFloat(metrics.accidentToViolationRatio) * 10, 100)} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Health & Safety Score Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 border border-green-200 dark:border-green-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-green-900 dark:text-green-100">System Health</h3>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">Overall safety metrics</p>
                </div>
                <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                  <Shield className="w-6 h-6 text-green-700 dark:text-green-200" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-green-100 dark:border-green-800">
                  <div className="text-center mb-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Safety Score</p>
                    <div className="relative inline-flex items-center justify-center">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - metrics.safetyScore / 100)}`}
                          className={`${
                            metrics.safetyScore >= 80 ? 'text-green-500' :
                            metrics.safetyScore >= 60 ? 'text-yellow-500' :
                            metrics.safetyScore >= 40 ? 'text-orange-500' :
                            'text-red-500'
                          } transition-all duration-1000`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">{metrics.safetyScore}</span>
                      </div>
                    </div>
                    <p className={`text-xs font-semibold mt-2 ${
                      metrics.safetyScore >= 80 ? 'text-green-600' :
                      metrics.safetyScore >= 60 ? 'text-yellow-600' :
                      metrics.safetyScore >= 40 ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {metrics.safetyScore >= 80 ? 'Excellent' :
                       metrics.safetyScore >= 60 ? 'Good' :
                       metrics.safetyScore >= 40 ? 'Fair' :
                       'Needs Improvement'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-green-100 dark:border-green-800">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Vehicle Status</p>
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Active Vehicles</span>
                          <span className="font-bold text-green-600 dark:text-green-400">{metrics.activeVehicleRate}%</span>
                        </div>
                        <Progress value={parseFloat(metrics.activeVehicleRate)} className="h-1.5 bg-gray-200 dark:bg-gray-700" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Expired Vehicles</span>
                          <span className="font-bold text-red-600 dark:text-red-400">{metrics.expiredVehicleRate}%</span>
                        </div>
                        <Progress value={parseFloat(metrics.expiredVehicleRate)} className="h-1.5 bg-gray-200 dark:bg-gray-700" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-green-100 dark:border-green-800">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Key Ratios</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Owners per Vehicle</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {(stats.vehicles?.total || 0) > 0 ? (((stats.drivers?.total || 0) / (stats.vehicles?.total || 1))).toFixed(2) : '0'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Violations per 100 Owners</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {(stats.drivers?.total || 0) > 0 ? (((stats.violations?.total || 0) / (stats.drivers?.total || 1)) * 100).toFixed(1) : '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          )}
        </>
      )}
    </div>
  );
};

export default HomePage;
