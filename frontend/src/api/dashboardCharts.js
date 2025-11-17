"use client";

import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

// Simple hook to fetch November data for all dashboard charts
export function useDashboardCharts() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [municipalityTop3, setMunicipalityTop3] = useState([]);
  const [violationsTop5, setViolationsTop5] = useState([]);
  const [bottomMunicipalityTop3, setBottomMunicipalityTop3] = useState([]);
  const [topOfficersTop3, setTopOfficersTop3] = useState([]);
  const [accidentMunicipalityTop5, setAccidentMunicipalityTop5] = useState([]);
  const [weeklyAccidentPattern, setWeeklyAccidentPattern] = useState([]);
  const [violationTypeDistribution, setViolationTypeDistribution] = useState([]);

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        setError(null);
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // use current month (1-12)

        // 1) Municipality totals (vehicles + drivers) for November (use totals endpoint)
        const muniRes = await apiClient.get(`/dashboard/municipality-registration-totals?month=${month}&year=${year}`, {
          headers: { Authorization: token },
        });
        // API returns array of { municipality, vehicles, drivers }
        const muniList = muniRes?.data?.data || [];
        // Transform: sort by total registrations (vehicles+drivers)
        const muniWithTotals = muniList
          .map(m => ({ name: m.municipality, total: (m.vehicles ?? 0) + (m.drivers ?? 0) }))
          .sort((a,b) => b.total - a.total);
        setMunicipalityTop3(muniWithTotals.slice(0, 3).map(m => ({ name: m.name, value: m.total })));
        setBottomMunicipalityTop3(muniWithTotals.slice(-3).reverse().map(m => ({ name: m.name, value: m.total })));

        // 2) Violation analytics (top violations, top officers, violations by type) for November
        const vioRes = await apiClient.get(`/violations/analytics?month=${month}&year=${year}`, {
          headers: { Authorization: token },
        });
        
        const mostCommon = vioRes?.data?.data?.mostCommonViolations || [];
        const topOfficers = vioRes?.data?.data?.topOfficers || [];
        const byType = vioRes?.data?.data?.violationsByType || [];


        setViolationsTop5(
          mostCommon.slice(0,5).map(v => ({ violation: v._id, value: v.count }))
        );
        setTopOfficersTop3(
          topOfficers.slice(0,3).map(o => ({ officer: o.officerName, value: o.violationCount }))
        );
        // Only Alarm, Confiscated, Impounded
        const typeMap = { alarm: "Alarm", confiscated: "Confiscated", impounded: "Impounded" };
        const filteredTypes = byType
            .filter(t => ["alarm","confiscated","impounded"].includes(String(t._id).toLowerCase()))
            .map(t => ({ type: typeMap[String(t._id).toLowerCase()] || t._id, value: t.count }));
        setViolationTypeDistribution(filteredTypes);

        // 3) Accident analytics for current month (weekly and municipality)
        const accRes = await apiClient.get(`/accident/analytics/summary?period=currentMonth`, {
          headers: { Authorization: token },
        });
        const distributions = accRes?.data?.data?.distributions || {};
        const dayOfWeek = distributions?.dayOfWeek || [];
        const municipalityDist = distributions?.municipality || [];

        // Weekly Accident Pattern: map to Monday..Sunday order
        const order = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
        // Backend likely returns day numbers or names - normalize
        const dowMap = new Map();
        dayOfWeek.forEach(item => {
          // item could be { _id: <1-7> , count } where 1=Sunday
          let name;
          if (typeof item._id === "number") {
            const idx = item._id; // 1=Sunday
            const sundayFirst = ["Sunday", ...order.slice(0,6)];
            name = sundayFirst[idx-1] || "Unknown";
          } else {
            name = String(item._id);
          }
          dowMap.set(name, item.count || item.value || 0);
        });
        const weekly = order.map(day => ({ weekLabel: day, value: dowMap.get(day) || 0 }));
        setWeeklyAccidentPattern(weekly);

        // Top 5 Municipality Accident
        const muniAcc = (municipalityDist || [])
          .map(m => ({ name: m._id || m.municipality || "Unknown", value: m.count || m.total || 0 }))
          .sort((a,b) => b.value - a.value)
          .slice(0,5);
        setAccidentMunicipalityTop5(muniAcc);

      } catch (err) {
        console.error("Dashboard charts load error:", err);
        setError("Failed to load charts");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [token]);

  return {
    loading,
    error,
    municipalityTop3,
    violationsTop5,
    bottomMunicipalityTop3,
    topOfficersTop3,
    accidentMunicipalityTop5,
    weeklyAccidentPattern,
    violationTypeDistribution,
  };
}


