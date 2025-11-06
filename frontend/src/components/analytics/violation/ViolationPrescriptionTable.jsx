import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';
import { Button } from '@/components/ui/button';

// Function to get recommended action based on violation type
const getViolationAction = (violationName) => {
  const violation = violationName?.toLowerCase() || '';
  
  // Documentation violations
  if (violation.includes('no license') || violation.includes('without license')) {
    return 'Conduct mandatory license verification checkpoints and implement driver education programs. Increase penalties for driving without valid license.';
  }
  
  if (violation.includes('no registration') || violation.includes('unregistered')) {
    return 'Establish mobile registration units in high-traffic areas. Provide incentives for early registration renewal. Increase enforcement in unregistered vehicle hotspots.';
  }
  
  // Safety violations
  if (violation.includes('no helmet') || violation.includes('helmet')) {
    return 'Launch helmet safety awareness campaigns. Distribute free or subsidized helmets in collaboration with motorcycle dealers. Enforce strict helmet laws at checkpoints.';
  }
  
  if (violation.includes('seatbelt') || violation.includes('no seatbelt')) {
    return 'Implement seatbelt enforcement campaigns. Require seatbelt reminders in all vehicles. Conduct educational programs on seatbelt importance.';
  }
  
  // Traffic violations
  if (violation.includes('speeding') || violation.includes('over speed')) {
    return 'Install speed cameras in high-risk areas. Implement variable speed limits based on traffic conditions. Conduct speed awareness campaigns and driver re-education programs.';
  }
  
  if (violation.includes('reckless') || violation.includes('reckless driving')) {
    return 'Increase penalties for reckless driving. Implement mandatory defensive driving courses for repeat offenders. Deploy more traffic enforcers in high-risk areas.';
  }
  
  if (violation.includes('red light') || violation.includes('traffic light')) {
    return 'Install red light cameras at major intersections. Implement longer yellow light durations. Increase enforcement at traffic signal violations.';
  }
  
  if (violation.includes('wrong way') || violation.includes('wrong lane')) {
    return 'Improve road signage and lane markings. Conduct public awareness campaigns on proper lane usage. Increase penalties for lane violations.';
  }
  
  // Vehicle condition violations
  if (violation.includes('no headlight') || violation.includes('headlight')) {
    return 'Conduct vehicle inspection programs. Enforce mandatory headlight checks during registration renewal. Provide lighting system awareness campaigns.';
  }
  
  if (violation.includes('defective') || violation.includes('broken')) {
    return 'Implement mandatory vehicle inspection programs. Require repair before vehicle registration renewal. Conduct vehicle safety awareness campaigns.';
  }
  
  // Alcohol/DUI violations
  if (violation.includes('drunk') || violation.includes('alcohol') || violation.includes('dui') || violation.includes('dwi')) {
    return 'Implement zero-tolerance policy for drunk driving. Increase random breathalyzer checkpoints. Launch anti-drunk driving campaigns. Mandatory alcohol education programs for offenders.';
  }
  
  // Mobile phone violations
  if (violation.includes('phone') || violation.includes('mobile') || violation.includes('texting')) {
    return 'Enforce hands-free device requirements. Increase penalties for mobile phone use while driving. Launch distracted driving awareness campaigns.';
  }
  
  // Parking violations
  if (violation.includes('parking') || violation.includes('illegal parking')) {
    return 'Improve parking infrastructure and signage. Implement smart parking systems. Increase enforcement in no-parking zones.';
  }
  
  // Vehicle modification violations
  if (violation.includes('modification') || violation.includes('altered') || violation.includes('tinted')) {
    return 'Enforce vehicle modification regulations. Require modification permits and inspections. Conduct awareness campaigns on legal vehicle modifications.';
  }
  
  // Confiscated/Impounded items
  if (violation.includes('confiscated') || violation.includes('impound')) {
    return 'Review confiscation policies and procedures. Ensure proper documentation and return processes. Implement transparent confiscation handling system.';
  }
  
  // Default action for other violations
  return 'Increase enforcement and public awareness campaigns. Conduct regular review of violation patterns. Implement targeted interventions based on violation trends.';
};

export function ViolationPrescriptionTable({ displayData, loading, totalViolations }) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Get violations data
  const violations = displayData?.mostCommonViolations || [];
  
  // Calculate percentage for each violation
  const violationsWithPercentage = violations.map(violation => {
    const percentage = totalViolations > 0 
      ? ((violation.count || 0) / totalViolations) * 100 
      : 0;
    const isHighPriority = percentage >= 50;
    
    return {
      ...violation,
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      isHighPriority,
      action: getViolationAction(violation._id)
    };
  });
  
  // Sort by percentage (highest first)
  const sortedViolations = [...violationsWithPercentage].sort((a, b) => b.percentage - a.percentage);
  
  // Pagination calculations
  const totalPages = Math.ceil(sortedViolations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentViolations = sortedViolations.slice(startIndex, endIndex);
  
  // Pagination handlers
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };
  
  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };
  
  const handlePageClick = (page) => {
    setCurrentPage(page);
  };
  
  // Reset to page 1 when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [displayData?.mostCommonViolations]);
  
  if (loading) {
    return (
      <div className={`${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-6 mb-8`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (!violations || violations.length === 0) {
    return (
      <div className={`${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-6 mb-8`}>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Violation Prescription & Action Plan
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
          No violation data available
        </p>
      </div>
    );
  }
  
  return (
    <div className={`${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-6 mb-8`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingDown className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Violation Prescription & Action Plan
          </h2>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total Violations: <span className="font-semibold text-gray-900 dark:text-white">{totalViolations.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800 dark:text-yellow-300">
            <strong>Priority Alert:</strong> Violations with 50% or higher occurrence rate are marked as <strong>HIGH PRIORITY</strong> and require immediate action from LTO.
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Violation
              </th>
              <th className={`text-center py-3 px-4 text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Occurrences
              </th>
              <th className={`text-center py-3 px-4 text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Percentage
              </th>
              <th className={`text-center py-3 px-4 text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Priority
              </th>
              <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Recommended Action
              </th>
            </tr>
          </thead>
          <tbody>
            {currentViolations.map((violation, index) => (
              <tr 
                key={violation._id || index}
                className={`border-b ${isDarkMode ? 'border-gray-800 hover:bg-gray-900/50' : 'border-gray-200 hover:bg-gray-50'} transition-colors`}
              >
                <td className="py-4 px-4">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {violation._id || 'N/A'}
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {violation.count?.toLocaleString() || '0'}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {violation.percentage.toFixed(2)}%
                    </span>
                    <div className={`w-16 h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                      <div 
                        className={`h-full transition-all duration-500 ${
                          violation.isHighPriority 
                            ? 'bg-gradient-to-r from-red-500 to-red-600' 
                            : violation.percentage >= 25
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                            : 'bg-gradient-to-r from-green-500 to-green-600'
                        }`}
                        style={{ width: `${Math.min(violation.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  {violation.isHighPriority ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-700">
                      <AlertTriangle className="h-3 w-3" />
                      HIGH
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700">
                      <CheckCircle className="h-3 w-3" />
                      NORMAL
                    </span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300 max-w-md">
                    {violation.action}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedViolations.length)} of {sortedViolations.length} violations
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="border-gray-300 dark:border-gray-600"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      onClick={() => handlePageClick(page)}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className={`min-w-[40px] ${
                        currentPage === page
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {page}
                    </Button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span key={page} className="px-2 text-gray-500 dark:text-gray-400">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>
            
            <Button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
              className="border-gray-300 dark:border-gray-600"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {sortedViolations.filter(v => v.isHighPriority).length > 0 && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-red-900 dark:text-red-300 mb-1">
                Immediate Action Required
              </div>
              <div className="text-sm text-red-800 dark:text-red-400">
                {sortedViolations.filter(v => v.isHighPriority).length} violation(s) require immediate attention. 
                These violations represent 50% or more of all recorded violations and should be prioritized in LTO action plans.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

