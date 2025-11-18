import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/theme/theme-provider";

const StatCard = ({ name, icon: Icon, value, color, loading, statuses=[], description }) => {
  // Use the theme context
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Map color prop to Tailwind color classes
  const getColorClasses = (colorProp) => {
    const colorMap = {
      orange: {
        bg: 'from-white to-orange-50/30',
        bgDark: 'from-neutral-900 to-neutral-800',
        border: 'border-gray-200',
        borderDark: 'border-neutral-800',
        hoverShadow: 'hover:shadow-orange-500/40',
        iconColor: 'text-orange-600 dark:text-orange-400',
        textColor: 'text-orange-600 dark:text-orange-400',
        blurBg: 'from-orange-500/15 to-orange-600/8',
        blurBgDark: 'from-orange-500/20 to-orange-600/10',
        progressBar: 'from-orange-500 via-orange-600 to-orange-700',
        progressShadow: 'shadow-orange-500/50',
      },
      red: {
        bg: 'from-white to-red-50/30',
        bgDark: 'from-neutral-900 to-neutral-800',
        border: 'border-gray-200',
        borderDark: 'border-neutral-800',
        hoverShadow: 'hover:shadow-red-500/40',
        iconColor: 'text-red-600 dark:text-red-400',
        textColor: 'text-red-600 dark:text-red-400',
        blurBg: 'from-red-500/15 to-red-600/8',
        blurBgDark: 'from-red-500/20 to-red-600/10',
        progressBar: 'from-red-500 via-red-600 to-red-700',
        progressShadow: 'shadow-red-500/50',
      },
      blue: {
        bg: 'from-white to-blue-50/30',
        bgDark: 'from-neutral-900 to-neutral-800',
        border: 'border-gray-200',
        borderDark: 'border-neutral-800',
        hoverShadow: 'hover:shadow-blue-500/40',
        iconColor: 'text-blue-600 dark:text-blue-400',
        textColor: 'text-blue-600 dark:text-blue-400',
        blurBg: 'from-blue-500/15 to-blue-600/8',
        blurBgDark: 'from-blue-500/20 to-blue-600/10',
        progressBar: 'from-blue-500 via-blue-600 to-blue-700',
        progressShadow: 'shadow-blue-500/50',
      },
      green: {
        bg: 'from-white to-green-50/30',
        bgDark: 'from-neutral-900 to-neutral-800',
        border: 'border-gray-200',
        borderDark: 'border-neutral-800',
        hoverShadow: 'hover:shadow-green-500/40',
        iconColor: 'text-green-600 dark:text-green-400',
        textColor: 'text-green-600 dark:text-green-400',
        blurBg: 'from-green-500/15 to-green-600/8',
        blurBgDark: 'from-green-500/20 to-green-600/10',
        progressBar: 'from-green-500 via-green-600 to-green-700',
        progressShadow: 'shadow-green-500/50',
      },
      yellow: {
        bg: 'from-white to-yellow-50/30',
        bgDark: 'from-neutral-900 to-neutral-800',
        border: 'border-gray-200',
        borderDark: 'border-neutral-800',
        hoverShadow: 'hover:shadow-yellow-500/40',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        textColor: 'text-yellow-600 dark:text-yellow-400',
        blurBg: 'from-yellow-500/15 to-yellow-600/8',
        blurBgDark: 'from-yellow-500/20 to-yellow-600/10',
        progressBar: 'from-yellow-500 via-yellow-600 to-yellow-700',
        progressShadow: 'shadow-yellow-500/50',
      },
    };
    return colorMap[colorProp] || colorMap.blue;
  };

  const colorClasses = getColorClasses(color);

  if (loading) {
    return (
      <div className={`${isDarkMode ? `bg-gradient-to-br ${colorClasses.bgDark} ${colorClasses.borderDark}` : `bg-gradient-to-br ${colorClasses.bg} ${colorClasses.border}`} border-2 rounded-2xl p-5 animate-pulse shadow-xl`}>
        <div className="flex items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 ${isDarkMode ? 'bg-neutral-800' : 'bg-gray-200'} rounded-xl`}></div>
              <div className={`h-3 w-24 ${isDarkMode ? 'bg-neutral-800' : 'bg-gray-200'} rounded`}></div>
            </div>
            <div className={`h-8 ${isDarkMode ? 'bg-neutral-800' : 'bg-gray-200'} rounded mb-2`}></div>
            <div className={`h-3 w-32 ${isDarkMode ? 'bg-neutral-800' : 'bg-gray-200'} rounded mb-3`}></div>
            <div className={`h-1 w-full ${isDarkMode ? 'bg-neutral-800' : 'bg-gray-200'} rounded-full`}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`${isDarkMode ? `bg-gradient-to-br ${colorClasses.bgDark} ${colorClasses.borderDark}` : `bg-gradient-to-br ${colorClasses.bg} ${colorClasses.border}`} border-2 rounded-2xl shadow-xl p-5 ${colorClasses.hoverShadow} hover:-translate-y-1.5 transition-all duration-300 transform relative overflow-hidden group animate-in slide-in-from-bottom-4 fade-in duration-500`}
    >
      {/* Decorative blur circle */}
      <div className={`absolute top-0 right-0 w-24 h-24 ${isDarkMode ? `bg-gradient-to-br ${colorClasses.blurBgDark}` : `bg-gradient-to-br ${colorClasses.blurBg}`} rounded-full -translate-y-6 translate-x-6 group-hover:scale-125 transition-transform duration-500 blur-xl`}></div>
      
      {/* Icon in top-right */}
      <div className="absolute top-4 right-4">
        <Icon className={`w-6 h-6 ${colorClasses.iconColor}`} />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 pr-10">
            <div className="mb-2">
              <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                {name}
              </p>
            </div>
            <div className="text-3xl font-extrabold text-black dark:text-white mb-2">
              {value}
            </div>
            {description && (
              <p className={`text-xs font-semibold ${colorClasses.textColor} mb-0.5`}>
                {description}
              </p>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200/60 dark:bg-neutral-800/60 rounded-full h-1 overflow-hidden backdrop-blur-sm">
          <div 
            className={`bg-gradient-to-r ${colorClasses.progressBar} h-1 rounded-full shadow-lg ${colorClasses.progressShadow}`}
            style={{ 
              width: '100%',
            }}
          ></div>
        </div>
      </div>
    </motion.div>
  );
};
export default StatCard;
