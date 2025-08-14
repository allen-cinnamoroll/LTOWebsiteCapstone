import React, { useLayoutEffect, useState } from "react";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import StatCard from "@/components/home/StatCard";
import { Users, Car, ChartSpline, ChartPie } from "lucide-react";
import { ViolationsChart } from "@/components/home/ViolationsChart";
import { Calendar } from "@/components/ui/calendar";
import DriverLogs from "@/components/home/DriverLogs";

const HomePage = () => {
  const loading = useState(false);
  return (
    <div className="p-4 space-y-4">
      <section className="text-3xl font-bold">Dashboard</section>
      <section className="max-h-full w-full grid grid-flow-row lg:grid-flow-col grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          name={"Registered Vehicles"}
          value={"100"}
          icon={Car}
          statuses={[
            { label: "87 Active", color: "#047857", bgColor: "#d1fae5" }, // Green
            { label: "13 Expired", color: "#dc2626", bgColor: "#fee2e2" }, // Red
          ]}
        />
        <StatCard
          name={"Registered Drivers"}
          value={"130"}
          icon={Users}
          statuses={[
            { label: "100 Active", color: "#047857", bgColor: "#d1fae5" }, // Green
            { label: "30 Expired", color: "#dc2626", bgColor: "#fee2e2" }, // Red
          ]}
        />
        <StatCard name={"Violations"} value={"24,828"} icon={ChartSpline} />
        <StatCard name={"Accidents"} value={"25,010"} icon={ChartPie} />
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
