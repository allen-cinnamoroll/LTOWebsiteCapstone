import React, { useEffect, useState } from "react";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import StatCard from "@/components/home/StatCard";
import { Users, Car, ChartSpline, ChartPie } from "lucide-react";
import { ViolationsChart } from "@/components/home/ViolationsChart";
import { Calendar } from "@/components/ui/calendar";
import DriverLogs from "@/components/home/DriverLogs";

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    vehicles: { total: 0, active: 0, expired: 0 },
    drivers: { total: 0, active: 0, expired: 0 },
    violations: { total: 0, recent: 0, byType: [] },
    accidents: { total: 0 },
    trends: { monthlyViolations: [] }
  });
  const { token } = useAuth();

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
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <section className="text-3xl font-bold">Dashboard</section>
      <section className="max-h-full w-full grid grid-flow-row lg:grid-flow-col grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          name={"Registered Vehicles"}
          value={loading ? "..." : stats.vehicles.total.toString()}
          icon={Car}
          statuses={[
            { label: `${stats.vehicles.active} Active`, color: "#047857", bgColor: "#d1fae5" }, // Green
            { label: `${stats.vehicles.expired} Expired`, color: "#dc2626", bgColor: "#fee2e2" }, // Red
          ]}
        />
        <StatCard
          name={"Registered Drivers"}
          value={loading ? "..." : stats.drivers.total.toString()}
          icon={Users}
          statuses={[
            { label: `${stats.drivers.active} Active`, color: "#047857", bgColor: "#d1fae5" }, // Green
            { label: `${stats.drivers.expired} Expired`, color: "#dc2626", bgColor: "#fee2e2" }, // Red
          ]}
        />
        <StatCard 
          name={"Violations"} 
          value={loading ? "..." : stats.violations.total.toString()} 
          icon={ChartSpline} 
        />
        <StatCard 
          name={"Accidents"} 
          value={loading ? "..." : stats.accidents.total.toString()} 
          icon={ChartPie} 
        />
      </section>

      <ViolationsChart />
      <section className="flex gap-4 flex-col lg:flex-row">
        <DriverLogs />
        <div className="p-5 border w-full lg:w-min rounded-lg ">
          <Calendar mode="single" className="w-full" />
        </div>
      </section>
    </div>
  );
};

export default HomePage;
