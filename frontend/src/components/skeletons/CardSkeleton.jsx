import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * CardSkeleton - Reusable skeleton loader for card components
 * Used for dashboard cards, info panels, etc.
 */
const CardSkeleton = ({ 
  showTitle = true, 
  showContent = true, 
  contentHeight = "h-48",
  className = "" 
}) => {
  return (
    <div className={`rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-neutral-900 dark:to-neutral-800 shadow-lg border border-gray-200 dark:border-gray-700 p-4 h-full ${className}`}>
      {showTitle && <Skeleton className="h-6 w-40 mb-4" />}
      {showContent && <Skeleton className={`${contentHeight} w-full rounded`} />}
    </div>
  );
};

export default CardSkeleton;

