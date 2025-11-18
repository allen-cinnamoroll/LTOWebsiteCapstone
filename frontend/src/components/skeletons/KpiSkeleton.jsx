import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * KpiSkeleton - Reusable skeleton loader for KPI cards
 * Used for dashboard stat cards, metric displays, etc.
 */
const KpiSkeleton = ({ className = "" }) => {
  return (
    <div className={`rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-neutral-900 dark:to-neutral-800 shadow-lg border border-gray-200 dark:border-gray-700 p-4 h-full ${className}`}>
      <Skeleton className="h-5 w-32 mb-4" />
      <Skeleton className="h-8 w-20" />
    </div>
  );
};

export default KpiSkeleton;

