"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";

const chartConfig = {
  desktop: {
    label: "Violations",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Accident",
    color: "hsl(var(--chart-2))",
  },
};

export function DriverChart({ driverId }) {
  const [timePeriod, setTimePeriod] = useState("all");
  const [chartData, setChartData] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = useAuth();
  const { token } = auth || {};

  // Fetch chart data when time period or driverId changes
  useEffect(() => {
    if (driverId) {
      fetchChartData();
    }
  }, [timePeriod, driverId]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data } = await apiClient.get(`/dashboard/owner-chart?period=${timePeriod}&ownerId=${driverId}`, {
        headers: {
          Authorization: token,
        },
      });
      
      if (data.success) {
        // Transform API data to radar chart format
        const transformedData = data.data.chartData.map(item => {
          let monthName = '';
          
          if (timePeriod === 'week') {
            // For week view, use day names
            const date = new Date(item.year, item.month - 1, item.day);
            monthName = date.toLocaleDateString("en-US", { weekday: "short" });
          } else if (timePeriod === 'years') {
            // For years view, use year
            monthName = item.year.toString();
          } else {
            // For all other periods, use month names
            const date = new Date(item.year, item.month - 1);
            monthName = date.toLocaleDateString("en-US", { month: "long" });
          }
          
          return {
            month: monthName,
            desktop: item.violations || 0,
            mobile: item.accidents || 0
          };
        });
        
        setChartData(transformedData);
        setViolations(data.data.violations || []);
      }
    } catch (err) {
      console.error("Error fetching driver chart data:", err);
      setError("Failed to load chart data");
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (period) => {
    switch (period) {
      case 'week': return 'Last Week'
      case '3months': return 'Last 3 Months'
      case '6months': return 'Last 6 Months'
      case 'months': return 'Last 12 Months'
      case 'year': return 'Last Year'
      case 'years': return 'Last 5 Years'
      case 'all': return 'All Time'
      default: return 'All Time'
    }
  };
  return (
    <div className="p-6">
      <div className="items-center pb-4">
        <h1 className="font-semibold leading-none tracking-tight">Driver Violation & Accidents Overview</h1>
        <p className="text-muted-foreground text-sm">
          Showing violation and accident frequency for {getPeriodLabel(timePeriod)}
        </p>
        <div className="mt-2">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="months">Last 12 Months</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="years">Last 5 Years</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        {loading ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-red-500">{error}</div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-muted-foreground">No data available for the selected period</div>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <RadarChart
              data={chartData}
              margin={{
                top: -40,
                bottom: -10,
              }}
            >
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <PolarAngleAxis dataKey="month" />
              <PolarGrid />
              <Radar
                dataKey="desktop"
                fill="var(--color-desktop)"
                fillOpacity={0.6}
              />
              <Radar dataKey="mobile" fill="var(--color-mobile)" />
              <ChartLegend className="mt-8" content={<ChartLegendContent />} />
            </RadarChart>
          </ChartContainer>
        )}
      </div>
      
      {/* Violations List */}
      {!loading && !error && violations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Violations for {getPeriodLabel(timePeriod)}</h3>
          <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto scrollbar-transparent">
            {violations.map((violation, index) => 
              violation.violations && violation.violations.length > 0 ? 
                violation.violations.map((v, idx) => (
                  <span key={`${violation._id || index}-${idx}`} className="inline-block bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-sm px-3 py-2 rounded-lg font-medium">
                    {v}
                  </span>
                )) : null
            )}
          </div>
        </div>
      )}
      
      {!loading && !error && violations.length === 0 && (
        <div className="mt-6 text-center text-muted-foreground">
          <p>No violations found for the selected period</p>
        </div>
      )}
    </div>
  );
}
