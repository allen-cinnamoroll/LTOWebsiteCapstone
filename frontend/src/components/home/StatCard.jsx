import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const StatCard = ({ name, icon: Icon, value, color, loading, statuses=[], description }) => {
  // Map color prop to actual color values
  const getColorValue = (colorProp) => {
    const colorMap = {
      orange: "#f59e0b",
      red: "#ef4444",
      blue: "#2563eb",
      green: "#22c55e",
      yellow: "#fbbf24",
    };
    return colorMap[colorProp] || "#2563eb";
  };

  const colorValue = getColorValue(color);

  return (
    <motion.div
      className="rounded-xl shadow-md bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-700 p-4"
      //   whileHover={{ y: -5, boxShadow: "0 15px 20px -12px rgba(0, 0, 0, 0.5)" }}
    >
      {loading ? (
        <Skeleton className={"h-[100px]"} />
      ) : (
        <div className="space-y-3">
          {/* Header Section with Icon */}
          <div className="mb-3">
            <div className="flex items-start gap-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${colorValue}15` }}>
                <Icon className="h-5 w-5" style={{ color: colorValue }} />
              </div>
              <div className="space-y-0">
                <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {name}
                </div>
                {description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Value Display */}
          <div className="mt-1">
            <p className="text-2xl md:text-3xl tracking-tight font-bold text-gray-900 dark:text-gray-100">
              {value}
            </p>
          </div>

         {/* Render statuses if available */}
         {statuses.length > 0 && (
            <div className="space-x-2 mt-2">
              {statuses.map((status, index) => (
                <span
                  key={index}
                  className="text-xs py-1 px-2 rounded-md"
                  style={{
                    color: status.color,
                    backgroundColor: status.bgColor,
                  }}
                >
                  {status.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
export default StatCard;
