import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * ChartSkeleton - Reusable skeleton loader for chart components
 * Used for recharts, bar charts, pie charts, etc.
 */
const ChartSkeleton = ({ 
  height = "h-56",
  showTitle = true,
  className = "" 
}) => {
  return (
    <div className={`rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-neutral-900 dark:to-neutral-800 shadow-lg border border-gray-200 dark:border-gray-700 p-4 h-full ${className}`}>
      {showTitle && <Skeleton className="h-6 w-44 mb-4" />}
      <Skeleton className={`${height} w-full rounded`} />
    </div>
  );
};

export default ChartSkeleton;

