import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

const CircularKpi = ({ 
  label, 
  value, 
  subtitle, 
  icon: Icon, 
  loading = false,
  tone = "primary", // primary, success, warning, danger, info, orange, yellow
  trendLabel,
  trendVariant = "neutral", // positive, negative, neutral
  ariaLabel,
  target, // Optional target value to display inside circle
  targetLabel // Optional label for target (e.g., "need to renew this month")
}) => {
  // Enhanced color schemes with gradients
  const colorSchemes = {
    primary: {
      gradient: "from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40",
      text: "text-blue-700 dark:text-blue-300",
      icon: "text-blue-600 dark:text-blue-400",
      border: "border-blue-300/50 dark:border-blue-700/50",
      shadow: "shadow-blue-200/50 dark:shadow-blue-900/30",
      shadowHover: "shadow-blue-300/60 dark:shadow-blue-800/40"
    },
    success: {
      gradient: "from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40",
      text: "text-green-700 dark:text-green-300",
      icon: "text-green-600 dark:text-green-400",
      border: "border-green-300/50 dark:border-green-700/50",
      shadow: "shadow-green-200/50 dark:shadow-green-900/30",
      shadowHover: "shadow-green-300/60 dark:shadow-green-800/40"
    },
    warning: {
      gradient: "from-yellow-100 to-orange-100 dark:from-orange-900/40 dark:to-yellow-900/40",
      text: "text-orange-700 dark:text-orange-300",
      icon: "text-orange-600 dark:text-orange-400",
      border: "border-orange-300/50 dark:border-orange-700/50",
      shadow: "shadow-orange-200/50 dark:shadow-orange-900/30",
      shadowHover: "shadow-orange-300/60 dark:shadow-orange-800/40"
    },
    orange: {
      gradient: "from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40",
      text: "text-orange-700 dark:text-orange-300",
      icon: "text-orange-600 dark:text-orange-400",
      border: "border-orange-300/50 dark:border-orange-700/50",
      shadow: "shadow-orange-200/50 dark:shadow-orange-900/30",
      shadowHover: "shadow-orange-300/60 dark:shadow-orange-800/40"
    },
    yellow: {
      gradient: "from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40",
      text: "text-yellow-700 dark:text-yellow-300",
      icon: "text-yellow-600 dark:text-yellow-400",
      border: "border-yellow-300/50 dark:border-yellow-700/50",
      shadow: "shadow-yellow-200/50 dark:shadow-yellow-900/30",
      shadowHover: "shadow-yellow-300/60 dark:shadow-yellow-800/40"
    },
    danger: {
      gradient: "from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40",
      text: "text-red-700 dark:text-red-300",
      icon: "text-red-600 dark:text-red-400",
      border: "border-red-300/50 dark:border-red-700/50",
      shadow: "shadow-red-200/50 dark:shadow-red-900/30",
      shadowHover: "shadow-red-300/60 dark:shadow-red-800/40"
    },
    info: {
      gradient: "from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40",
      text: "text-purple-700 dark:text-purple-300",
      icon: "text-purple-600 dark:text-purple-400",
      border: "border-purple-300/50 dark:border-purple-700/50",
      shadow: "shadow-purple-200/50 dark:shadow-purple-900/30",
      shadowHover: "shadow-purple-300/60 dark:shadow-purple-800/40"
    }
  };

  const colors = colorSchemes[tone] || colorSchemes.primary;

  // Trend chip colors
  const trendColors = {
    positive: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
    negative: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
    neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700"
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center">
        <Skeleton className="w-24 h-24 md:w-28 md:h-28 rounded-full mb-3" />
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
    );
  }

  // Generate aria-label if not provided
  const computedAriaLabel = ariaLabel || `${label}: ${value}${subtitle ? `, ${subtitle}` : ''}${trendLabel ? `, ${trendLabel}` : ''}`;

  return (
    <motion.div
      className="flex flex-col items-center justify-center cursor-default"
      transition={{ duration: 0.15, ease: "easeOut" }}
      role="region"
      aria-label={computedAriaLabel}
      tabIndex={0}
    >
      {/* Circular badge with gradient */}
      <div
        className={`
          relative w-24 h-24 md:w-28 md:h-28 rounded-full 
          bg-gradient-to-br ${colors.gradient}
          border-2 ${colors.border}
          flex items-center justify-center
          shadow-md ${colors.shadow}
          transition-all duration-200 ease-out
          group
          hover:shadow-lg hover:scale-[1.02]
          focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-white dark:focus-within:ring-offset-gray-900
        `}
      >
        {/* Icon in top-right corner with refined container */}
        {Icon && (
          <div className={`
            absolute -top-1 -right-1 
            ${colors.icon}
            bg-white/80 dark:bg-gray-800/80
            backdrop-blur-sm
            rounded-full
            p-1.5
            border border-white/50 dark:border-gray-700/50
            shadow-sm
            transition-all duration-200
            group-hover:scale-110
          `}>
            <Icon size={18} className="drop-shadow-sm" />
          </div>
        )}
        
        {/* Value in center with enhanced typography */}
        <div className="text-center">
          <p className={`
            text-3xl md:text-4xl 
            font-semibold 
            tracking-tight
            ${colors.text}
            drop-shadow-sm
          `}>
            {value}
          </p>
          {target !== undefined && target !== null && (
            <div className="mt-1">
              <p className={`
                text-[10px] md:text-xs
                font-medium
                ${colors.text}
                opacity-80
              `}>
                Target: {target} {targetLabel || ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Label and subtitle below circle */}
      <div className="mt-4 text-center space-y-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
          {label}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight truncate max-w-[140px]">
            {subtitle}
          </p>
        )}
        
        {/* Optional trend chip */}
        {trendLabel && (
          <div className={`
            inline-flex items-center gap-1
            px-2 py-0.5 rounded-full
            text-xs font-medium
            border
            ${trendColors[trendVariant]}
            mt-1.5
            transition-all duration-200
          `}>
            {trendVariant === "positive" && <TrendingUp size={12} className="flex-shrink-0" />}
            {trendVariant === "negative" && <TrendingDown size={12} className="flex-shrink-0" />}
            <span className="truncate max-w-[120px]">{trendLabel}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CircularKpi;

