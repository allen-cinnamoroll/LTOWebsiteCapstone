import React, { useState } from 'react';
import { Calendar, BarChart3, TrendingUp } from 'lucide-react';

export function MonthlyViolationMonitoring({ onOpen }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm
        transition-all duration-300 transform hover:-translate-y-0.5
        ${isHovered 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40' 
          : 'bg-blue-500 text-white shadow-md hover:shadow-xl'
        }
      `}
    >
      <Calendar className="w-4 h-4" />
      <span>Monthly Violation Monitoring</span>
      <div className="flex items-center space-x-1">
        <BarChart3 className="w-3 h-3" />
        <TrendingUp className="w-3 h-3" />
      </div>
    </button>
  );
}
