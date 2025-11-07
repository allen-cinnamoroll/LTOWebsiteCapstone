import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, TrendingDown, ChevronLeft, ChevronRight, X, Calendar, ClipboardList, BarChart3, Target, Shield, TrendingUp } from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';
import { getViolations } from '@/api/violationAnalytics';

// Function to get recommended action based on violation type
const getViolationAction = (violationName) => {
  const violation = violationName?.toUpperCase() || '';
  const violationLower = violationName?.toLowerCase() || '';
  
  // License and Documentation Violations
  if (violation.includes('1A') || violation.includes("NO DRIVER'S LICENSE") || violation.includes("CONDUCTOR PERMIT")) {
    return 'Conduct mandatory license verification checkpoints at strategic locations. Implement driver education programs for unlicensed drivers. Increase penalties and mandatory license acquisition before vehicle release. Establish mobile licensing units in rural areas.';
  }
  
  if (violation.includes('1I') || violation.includes('FAILURE TO CARRY') || violationLower.includes('carry driver')) {
    return 'Launch awareness campaigns on importance of carrying valid documents. Implement digital license verification system. Conduct regular document checks at checkpoints. Provide reminders through mobile apps and SMS notifications.';
  }
  
  if (violation.includes('4-8') || violation.includes('UNAUTHORIZED/NO-LICENSE DRIVER')) {
    return 'Strengthen commercial vehicle operator verification. Require mandatory background checks for drivers. Implement real-time driver license verification system. Increase penalties for operators hiring unlicensed drivers.';
  }
  
  // Criminal Activity Violations
  if (violation.includes('1B') || violation.includes('DRIVING DURING CRIME')) {
    return 'Enhance coordination with law enforcement agencies. Implement immediate vehicle impoundment protocols. Strengthen background checks for vehicle registration. Establish rapid response units for criminal activity reports.';
  }
  
  if (violation.includes('1C') || violation.includes('CRIME DURING APPREHENSION')) {
    return 'Provide specialized training for traffic enforcers on handling dangerous situations. Implement body camera requirement for all enforcers. Establish emergency response protocols. Strengthen coordination with police departments.';
  }
  
  // DUI and Substance Abuse
  if (violation.includes('1D') || violation.includes('DRIVING UNDER THE INFLUENCE') || violation.includes('ALCOHOL') || violation.includes('DRUGS')) {
    return 'Implement zero-tolerance policy with immediate vehicle impoundment. Increase random breathalyzer and drug testing checkpoints. Launch nationwide anti-DUI campaigns. Mandatory alcohol/drug education programs for offenders. Establish rehabilitation programs for repeat offenders.';
  }
  
  // Reckless Driving
  if (violation.includes('1E') || violation.includes('RECKLESS DRIVING')) {
    return 'Increase penalties for reckless driving with mandatory license suspension. Implement mandatory defensive driving courses for repeat offenders. Deploy more traffic enforcers in high-risk areas. Install speed cameras and traffic monitoring systems.';
  }
  
  if (violation.includes('4-7') || violation.includes('RECKLESS/INSOLENT/ARROGANT DRIVER')) {
    return 'Implement behavior modification programs for commercial drivers. Strengthen penalties for insolent behavior. Require customer service training for public utility vehicle drivers. Establish complaint hotlines for passenger reports.';
  }
  
  // Fake Documents
  if (violation.includes('1F') || violation.includes('FAKE DOCUMENTS')) {
    return 'Implement document verification system with QR codes. Strengthen document authentication training for enforcers. Increase penalties for document forgery. Establish partnership with printing companies to prevent counterfeiting.';
  }
  
  if (violation.includes('1J40') || violation.includes('4-6') || violation.includes('FRAUDULENT DOCS')) {
    return 'Implement digital verification system for all documents. Strengthen document issuance security features. Conduct regular audits of document authenticity. Increase penalties and criminal charges for document fraud.';
  }
  
  // Seatbelt Violations
  if (violation.includes('1G1') || violation.includes('NO SEATBELT (DRIVER/FRONT')) {
    return 'Launch seatbelt awareness campaigns emphasizing driver and front passenger safety. Install seatbelt reminder systems in vehicles. Increase enforcement at checkpoints. Conduct educational programs in schools and communities.';
  }
  
  if (violation.includes('1G2') || violation.includes('NO SEATBELT (PASSENGER')) {
    return 'Strengthen seatbelt enforcement for rear passengers. Launch public awareness campaigns on passenger safety. Require seatbelt installation in all vehicle seats. Increase penalties for non-compliance.';
  }
  
  // Helmet Violations
  if (violation.includes('1H') || violation.includes('N1') || violation.includes('NOT WEARING HELMET')) {
    return 'Launch comprehensive helmet safety awareness campaigns. Distribute free or subsidized ICC-certified helmets in collaboration with motorcycle dealers. Enforce strict helmet laws at all checkpoints. Conduct helmet safety education programs in schools and communities.';
  }
  
  if (violation.includes('R.A 10054') || violation.includes('SUBSTANDARD HELMET') || violation.includes('NO ICC')) {
    return 'Launch awareness campaigns on ICC-certified helmet standards. Establish partnerships with helmet manufacturers for quality assurance. Conduct market inspections to remove substandard helmets. Provide subsidies for ICC-certified helmet purchases.';
  }
  
  if (violation.includes('N5-1') || violation.includes('FLIPFLOPS') || violation.includes('SANDALS') || violation.includes('SLIPPERS')) {
    return 'Launch footwear safety awareness campaigns for motorcycle riders. Emphasize proper protective footwear requirements. Increase enforcement at checkpoints. Provide educational materials on proper riding gear.';
  }
  
  // Parking Violations
  if (violation.includes('1J1') || violation.includes('ILLEGAL PARKING')) {
    return 'Improve parking infrastructure and signage in high-traffic areas. Implement smart parking systems with mobile payment. Increase enforcement in no-parking zones. Establish designated parking areas with clear markings.';
  }
  
  // Traffic Sign Violations
  if (violation.includes('1J2') || violation.includes('DISREGARDING TRAFFIC SIGNS')) {
    return 'Improve visibility and maintenance of traffic signs. Launch awareness campaigns on traffic sign recognition. Increase enforcement at intersections with traffic violations. Conduct driver education on traffic sign importance.';
  }
  
  // Default action for unrecognized violations
  return 'Increase enforcement and public awareness campaigns. Conduct regular review of violation patterns. Implement targeted interventions based on violation trends. Strengthen coordination between enforcement units.';
};

// Month Detail Modal Component
const MonthDetailModal = ({ isOpen, onClose, monthData, year, monthName, violationsData, loading }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (!isOpen) return null;

  // Group violations by type and count occurrences
  const violationCounts = {};
  if (violationsData && violationsData.length > 0) {
    violationsData.forEach(violation => {
      const violations = Array.isArray(violation.violations) 
        ? violation.violations 
        : (typeof violation.violations === 'string' 
            ? violation.violations.split(',').map(v => v.trim()).filter(v => v)
            : []);
      
      violations.forEach(v => {
        const violationName = v.trim();
        if (violationName) {
          violationCounts[violationName] = (violationCounts[violationName] || 0) + 1;
        }
      });
    });
  }

  // Convert to array and sort by count
  const violationsList = Object.entries(violationCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: monthData?.totalViolations > 0 ? (count / monthData.totalViolations) * 100 : 0,
      action: getViolationAction(name)
    }))
    .sort((a, b) => b.count - a.count);

  const totalViolations = monthData?.totalViolations || 0;
  const uniqueViolationTypes = violationsList.length;
  const topViolation = violationsList[0];

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`${isDarkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {/* Header */}
        <div className={`${isDarkMode ? 'bg-gradient-to-r from-gray-800 to-gray-800' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} px-8 py-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-transparent'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-white/40'}`}>
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {monthName} {year} - Violations Analysis
                </h2>
                <div className="flex items-center gap-4 text-sm text-blue-100">
                  <span>Total Violations: <span className="font-bold text-white">{totalViolations.toLocaleString()}</span></span>
                  <span>•</span>
                  <span>Violation Types: <span className="font-bold text-white">{uniqueViolationTypes}</span></span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white/30 hover:bg-white/40'} transition-colors`}
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Stats Summary Bar */}
        {!loading && violationsList.length > 0 && (
          <div className={`${isDarkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-blue-50 border-b border-blue-100'} px-8 py-4`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900' : 'bg-blue-100'}`}>
                  <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Top Violation</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px]">
                    {topViolation?.name || 'N/A'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900' : 'bg-blue-100'}`}>
                  <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Highest Occurrence</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {topViolation?.count.toLocaleString() || '0'} violations
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900' : 'bg-blue-100'}`}>
                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Percentage Share</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {topViolation?.percentage.toFixed(2) || '0.00'}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Loading violations data...
              </div>
            </div>
          ) : violationsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className={`p-4 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} mb-4`}>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                No violations found for this month.
              </p>
            </div>
          ) : (
            <div className="p-6">
              <div className={`overflow-hidden rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`${isDarkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200'}`}>
                        <th className={`text-left py-4 px-6 text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Violation Type
                        </th>
                        <th className={`text-center py-4 px-6 text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Occurrences
                        </th>
                        <th className={`text-center py-4 px-6 text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Percentage
                        </th>
                        <th className={`text-left py-4 px-6 text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Recommended Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {violationsList.map((violation, index) => {
                        const isHighPriority = violation.percentage >= 50;
                        const isMediumPriority = violation.percentage >= 25 && violation.percentage < 50;
                        return (
                          <tr
                            key={index}
                            className={`${isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-blue-50/30'} transition-colors`}
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  isHighPriority ? 'bg-red-500' : isMediumPriority ? 'bg-yellow-500' : 'bg-green-500'
                                }`}></div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {violation.name}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col items-center">
                                <span className="text-base font-bold text-gray-900 dark:text-white">
                                  {violation.count.toLocaleString()}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  occurrences
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-base font-bold text-gray-900 dark:text-white">
                                  {violation.percentage.toFixed(2)}%
                                </span>
                                <div className={`w-full max-w-[100px] h-2.5 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                                  <div
                                    className={`h-full transition-all duration-700 ${
                                      isHighPriority
                                        ? 'bg-gradient-to-r from-red-500 via-red-600 to-red-700'
                                        : isMediumPriority
                                        ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600'
                                        : 'bg-gradient-to-r from-green-400 via-green-500 to-green-600'
                                    }`}
                                    style={{ width: `${Math.min(violation.percentage, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-xs text-gray-700 dark:text-gray-300 max-w-lg leading-relaxed">
                                {violation.action}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Summary */}
        {!loading && violationsList.length > 0 && (
          <div className={`${isDarkMode ? 'bg-gray-800 border-t border-gray-700' : 'bg-gray-50 border-t border-gray-200'} px-8 py-4`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">Low (&lt;25%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">Moderate (25-50%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">High (≥50%)</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Showing {violationsList.length} violation type(s) for {monthName} {year}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export function ViolationPrescriptionTable({ displayData, loading, totalViolations }) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Year filter state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthViolations, setMonthViolations] = useState([]);
  const [loadingMonthData, setLoadingMonthData] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const minYear = 2000;
  const maxYear = 2025;
  
  // Get available years
  const getAvailableYears = () => {
    const years = [];
    for (let year = minYear; year <= maxYear; year++) {
      years.push(year.toString());
    }
    return years.sort((a, b) => parseInt(b) - parseInt(a));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Get monthly data for selected year
  const getMonthlyData = () => {
    if (!displayData?.monthlyTrends || displayData.monthlyTrends.length === 0) {
      return [];
    }

    const selectedYearNum = parseInt(selectedYear);
    const monthlyData = [];

    // Initialize all months with 0
    for (let i = 1; i <= 12; i++) {
      monthlyData.push({
        month: i,
        monthName: monthNames[i - 1],
        monthNameShort: monthNamesShort[i - 1],
        totalViolations: 0
      });
    }

    // Fill in actual data
    displayData.monthlyTrends.forEach(trend => {
      if (trend._id?.year === selectedYearNum) {
        const month = trend._id?.month || 0;
        if (month >= 1 && month <= 12) {
          monthlyData[month - 1].totalViolations = trend.count || 0;
        }
      }
    });

    // Calculate total for the year
    const yearTotal = monthlyData.reduce((sum, month) => sum + month.totalViolations, 0);

    // Calculate percentage and priority for each month
    const monthlyDataWithPercentage = monthlyData.map(month => {
      const percentage = yearTotal > 0 ? (month.totalViolations / yearTotal) * 100 : 0;
    const isHighPriority = percentage >= 50;
    
    return {
        ...month,
        percentage: Math.round(percentage * 100) / 100,
        isHighPriority
    };
  });
  
    // Return in chronological order (January to December)
    return monthlyDataWithPercentage;
  };

  const monthlyData = getMonthlyData();
  const yearTotal = monthlyData.reduce((sum, month) => sum + month.totalViolations, 0);
  const highPriorityCount = monthlyData.filter(m => m.isHighPriority).length;
  
  // Find the month with the highest priority percentage
  const highestPriorityMonth = monthlyData.length > 0 
    ? monthlyData.reduce((max, month) => 
        month.percentage > max.percentage ? month : max, 
        monthlyData[0]
      )
    : null;

  // Fetch violations for selected month
  const fetchMonthViolations = async (year, month) => {
    try {
      setLoadingMonthData(true);
      const response = await getViolations();
      const violations = response.data || response;
      
      // Filter violations for the selected month and year
      const filteredViolations = violations.filter(violation => {
        if (!violation.dateOfApprehension) return false;
        const violationDate = new Date(violation.dateOfApprehension);
        return violationDate.getFullYear() === year && violationDate.getMonth() + 1 === month;
      });
      
      setMonthViolations(filteredViolations);
      setSelectedMonth({ year, month, monthName: monthNames[month - 1] });
    } catch (error) {
      console.error('Error fetching month violations:', error);
      setMonthViolations([]);
    } finally {
      setLoadingMonthData(false);
    }
  };

  const handleMonthClick = (month) => {
    fetchMonthViolations(parseInt(selectedYear), month);
  };

  const handleCloseModal = () => {
    setSelectedMonth(null);
    setMonthViolations([]);
  };
  
  if (loading) {
    return (
      <div className={`${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-xl p-8 mb-8`}>
        <div className="animate-pulse">
          <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-80 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (!displayData || !displayData.monthlyTrends || displayData.monthlyTrends.length === 0) {
    return (
      <div className={`${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-xl p-8 mb-8`}>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Violation Prescription & Action Plan
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center py-12">
          No violation data available
        </p>
      </div>
    );
  }
  
  return (
    <>
      <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-blue-200/90 via-blue-300/80 to-indigo-300/80 border-blue-300'} border-2 rounded-2xl shadow-xl overflow-hidden mb-6 backdrop-blur-sm`}>
        {/* Header Section */}
        <div className={`px-6 py-4 border-b-2 ${isDarkMode ? 'border-gray-700/50 bg-gradient-to-r from-gray-800/60 to-gray-800/40' : 'border-blue-300/60 bg-gradient-to-r from-blue-500/15 via-blue-500/10 to-indigo-500/10'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-blue-600 border border-blue-500 shadow-md`}>
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Violation Prescription & Action Plan
          </h2>
                <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Comprehensive monthly violation analysis with strategic recommendations
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Year Filter */}
              <div className="flex items-center gap-2">
                <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Year:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 ${isDarkMode ? 'bg-gray-800/80 border-gray-600 text-gray-200 hover:bg-gray-700 focus:ring-blue-500/50' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50 focus:ring-blue-500'} focus:outline-none focus:ring-2 transition-all cursor-pointer shadow-sm hover:shadow-md`}
                >
                  {getAvailableYears().map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`px-3 py-2 rounded-lg border-2 shadow-sm ${isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600' : 'bg-gradient-to-br from-white to-gray-50 border-gray-300'}`}>
                <div className={`text-[10px] font-semibold mb-0.5 uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Violations</div>
                <div className={`text-lg font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{yearTotal.toLocaleString()}</div>
              </div>
        </div>
        </div>
      </div>
      
        {/* KPI Section */}
        {highestPriorityMonth && yearTotal > 0 && highestPriorityMonth.totalViolations > 0 && (
          <div className="mt-5 mb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto">
              {/* KPI 1: Highest Priority Month */}
              <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-gray-700' : 'bg-gradient-to-br from-red-50 via-red-50/80 to-red-100/60 border-red-200'} border-2 rounded-xl shadow-lg p-3 hover:shadow-xl transition-all duration-300`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-900/40 border border-red-800/50' : 'bg-red-100 border border-red-200/50'} shadow-sm`}>
                    <TrendingUp className={`h-4 w-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Highest Priority Month
                    </h3>
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-500">
                      {selectedYear}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Calendar className={`h-3 w-3 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                        {highestPriorityMonth.monthName}
                      </div>
                      <div className="text-[10px] text-gray-600 dark:text-gray-400">
                        {highestPriorityMonth.totalViolations.toLocaleString()} violations
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                        Priority Percentage
                      </span>
                      <span className={`text-xs font-bold ${
                        highestPriorityMonth.isHighPriority 
                          ? 'text-red-600 dark:text-red-400' 
                          : highestPriorityMonth.percentage >= 25
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {highestPriorityMonth.percentage.toFixed(2)}%
                      </span>
                    </div>
                    <div className={`w-full h-1 rounded-full mt-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                      <div
                        className={`h-full transition-all duration-700 ${
                          highestPriorityMonth.isHighPriority
                            ? 'bg-gradient-to-r from-red-500 via-red-600 to-red-700'
                            : highestPriorityMonth.percentage >= 25
                            ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600'
                            : 'bg-gradient-to-r from-green-400 via-green-500 to-green-600'
                        }`}
                        style={{ width: `${Math.min(highestPriorityMonth.percentage, 100)}%` }}
                      ></div>
                    </div>
        </div>
        </div>
      </div>
      
              {/* KPI 2: Checkpoint Recommendation */}
              <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-gray-700' : 'bg-gradient-to-br from-orange-50 via-orange-50/80 to-amber-50/60 border-orange-200'} border-2 rounded-xl shadow-lg p-3 hover:shadow-xl transition-all duration-300`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-orange-900/40 border border-orange-800/50' : 'bg-orange-100 border border-orange-200/50'} shadow-sm`}>
                    <Shield className={`h-4 w-4 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Recommended Action
                    </h3>
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-500">
                      Priority Checkpoint
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
        <div className="flex items-start gap-2">
                    <AlertTriangle className={`h-3 w-3 mt-0.5 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'} flex-shrink-0`} />
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white mb-1">
                        Prioritize Checkpoints in {highestPriorityMonth.monthName}
                      </div>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed">
                        This month has the highest violation rate ({highestPriorityMonth.percentage.toFixed(2)}%) for {selectedYear}. 
                        It is recommended to <strong className="text-orange-600 dark:text-orange-400">prioritize conducting checkpoints</strong> during this period 
                        as it is when people mostly violate traffic rules on roads. Increase enforcement presence and implement stricter monitoring 
                        to reduce violations and improve road safety.
                      </p>
                    </div>
                  </div>
                  <div className={`mt-2 p-2 rounded-lg ${isDarkMode ? 'bg-orange-900/30 border border-orange-800/50' : 'bg-orange-100/80 border border-orange-200/50'} shadow-sm`}>
                    <div className="flex items-center gap-1.5">
                      <Target className={`h-3 w-3 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                      <span className="text-[10px] font-semibold text-orange-800 dark:text-orange-300">
                        Focus enforcement efforts during {highestPriorityMonth.monthName} to maximize impact
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      
        {/* Priority Alert Section */}
        {highPriorityCount > 0 && (
          <div className={`mx-6 mt-5 p-3 ${isDarkMode ? 'bg-gradient-to-r from-red-900/30 to-red-800/20 border-red-800/50' : 'bg-gradient-to-r from-red-50 to-red-50/80 border-red-200'} border-2 rounded-xl shadow-md`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-900/40 border border-red-800/50' : 'bg-red-100 border border-red-200/50'} shadow-sm`}>
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-red-900 dark:text-red-300 mb-1">
                  Immediate Action Required
                </div>
                <div className="text-xs font-medium text-red-800 dark:text-red-400 leading-relaxed">
                  <strong>{highPriorityCount}</strong> month(s) marked as <strong>HIGH</strong> (≥50% violation rate) require immediate attention from LTO. Click on any month to view detailed violations and recommended actions.
                </div>
              </div>
        </div>
      </div>
        )}

        {/* Info Banner */}
        <div className={`mx-6 mt-3 mb-5 p-2 ${isDarkMode ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/20 border-green-800/50' : 'bg-gradient-to-r from-green-50 to-emerald-50/80 border-green-200'} border-2 rounded-lg shadow-sm`}>
          <div className="flex items-center gap-1.5">
            <div className={`p-1 rounded-md ${isDarkMode ? 'bg-green-900/40' : 'bg-green-100'}`}>
              <Target className="h-2.5 w-2.5 text-green-600 dark:text-green-400 flex-shrink-0" />
            </div>
            <div className="text-[10px] font-medium text-green-800 dark:text-green-300">
              <strong>Note:</strong> Click on any month row to view detailed violation breakdown, occurrences, and specific recommended actions for that period.
          </div>
        </div>
      </div>
      
        {/* Table Section */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Table - First 6 months */}
            <div className={`overflow-hidden rounded-lg border-2 shadow-md ${isDarkMode ? 'border-gray-700 bg-gradient-to-br from-gray-800/90 to-gray-900/90' : 'border-gray-200 bg-gradient-to-br from-white to-gray-50/50'}`}>
              <div className="p-5">
                {/* Table Header */}
                <div className={`mb-3 pb-3 border-b-2 ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
                  <div className={`grid grid-cols-4 gap-2 text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div className="text-left">Month</div>
                    <div className="text-center">Violations</div>
                    <div className="text-center">Percentage</div>
                    <div className="text-center">Severity</div>
                  </div>
                </div>
                
                {/* Table Rows */}
                <div className="space-y-2">
                  {monthlyData.slice(0, 6).map((month) => (
                    <div
                      key={month.month}
                      onClick={() => handleMonthClick(month.month)}
                      className={`grid grid-cols-4 gap-2 items-center py-3 px-3 rounded-md ${isDarkMode ? 'hover:bg-gray-700/50 border-gray-700/50' : 'hover:bg-blue-50/70 border-gray-200/50'} transition-all duration-300 cursor-pointer group border shadow-sm hover:shadow-md`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-gray-700/50 group-hover:bg-gray-600 border border-gray-600/50' : 'bg-blue-50 group-hover:bg-blue-100 border border-blue-200/50'} transition-colors`}>
                          <Calendar className={`h-3 w-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white text-xs">
                            {month.monthNameShort}
                          </div>
                        </div>
                  </div>
                      <div className="text-center">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {month.totalViolations.toLocaleString()}
                  </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {month.percentage.toFixed(1)}%
                    </span>
                        <div className={`w-full max-w-[60px] h-1.5 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                          <div
                            className={`h-full transition-all duration-700 ${
                              month.isHighPriority
                                ? 'bg-gradient-to-r from-red-500 via-red-600 to-red-700'
                                : month.percentage >= 25
                                ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600'
                                : 'bg-gradient-to-r from-green-400 via-green-500 to-green-600'
                            }`}
                            style={{ width: `${Math.min(month.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                      <div className="text-center">
                        {month.isHighPriority ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-red-100 to-red-50 text-red-700 dark:from-red-900/40 dark:to-red-800/40 dark:text-red-300 border border-red-300 dark:border-red-700">
                            <AlertTriangle className="h-2.5 w-2.5" />
                      HIGH
                    </span>
                        ) : month.percentage >= 25 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-700 dark:from-yellow-900/40 dark:to-yellow-800/40 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            MODERATE
                    </span>
                  ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-green-100 to-green-50 text-green-700 dark:from-green-900/40 dark:to-green-800/40 dark:text-green-300 border border-green-300 dark:border-green-700">
                            <CheckCircle className="h-2.5 w-2.5" />
                            LOW
                    </span>
                  )}
                      </div>
                  </div>
            ))}
                </div>
              </div>
      </div>
      
            {/* Second Table - Last 6 months */}
            <div className={`overflow-hidden rounded-lg border-2 shadow-md ${isDarkMode ? 'border-gray-700 bg-gradient-to-br from-gray-800/90 to-gray-900/90' : 'border-gray-200 bg-gradient-to-br from-white to-gray-50/50'}`}>
              <div className="p-5">
                {/* Table Header */}
                <div className={`mb-3 pb-3 border-b-2 ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
                  <div className={`grid grid-cols-4 gap-2 text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div className="text-left">Month</div>
                    <div className="text-center">Violations</div>
                    <div className="text-center">Percentage</div>
                    <div className="text-center">Severity</div>
          </div>
            </div>
            
                {/* Table Rows */}
                <div className="space-y-2">
                  {monthlyData.slice(6, 12).map((month) => (
                    <div
                      key={month.month}
                      onClick={() => handleMonthClick(month.month)}
                      className={`grid grid-cols-4 gap-2 items-center py-3 px-3 rounded-md ${isDarkMode ? 'hover:bg-gray-700/50 border-gray-700/50' : 'hover:bg-blue-50/70 border-gray-200/50'} transition-all duration-300 cursor-pointer group border shadow-sm hover:shadow-md`}
                    >
            <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-gray-700/50 group-hover:bg-gray-600 border border-gray-600/50' : 'bg-blue-50 group-hover:bg-blue-100 border border-blue-200/50'} transition-colors`}>
                          <Calendar className={`h-3 w-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white text-xs">
                            {month.monthNameShort}
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {month.totalViolations.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {month.percentage.toFixed(1)}%
                        </span>
                        <div className={`w-full max-w-[60px] h-1.5 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                          <div
                            className={`h-full transition-all duration-700 ${
                              month.isHighPriority
                                ? 'bg-gradient-to-r from-red-500 via-red-600 to-red-700'
                                : month.percentage >= 25
                                ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600'
                                : 'bg-gradient-to-r from-green-400 via-green-500 to-green-600'
                            }`}
                            style={{ width: `${Math.min(month.percentage, 100)}%` }}
                          ></div>
          </div>
        </div>
                      <div className="text-center">
                        {month.isHighPriority ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-red-100 to-red-50 text-red-700 dark:from-red-900/40 dark:to-red-800/40 dark:text-red-300 border border-red-300 dark:border-red-700">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            HIGH
                          </span>
                        ) : month.percentage >= 25 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-700 dark:from-yellow-900/40 dark:to-yellow-800/40 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            MODERATE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-green-100 to-green-50 text-green-700 dark:from-green-900/40 dark:to-green-800/40 dark:text-green-300 border border-green-300 dark:border-green-700">
                            <CheckCircle className="h-2.5 w-2.5" />
                            LOW
                    </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
            </div>
            
        {/* Summary Footer */}
        <div className={`${isDarkMode ? 'bg-gradient-to-r from-gray-800/60 to-gray-900/60 border-t-2 border-gray-700/50' : 'bg-gradient-to-r from-gray-50 to-blue-50/30 border-t-2 border-gray-200/50'} px-6 py-3 shadow-inner`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm border border-green-600/30"></div>
                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">Low (&lt;25%)</span>
          </div>
          <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm border border-yellow-600/30"></div>
                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">Moderate (25-50%)</span>
            </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm border border-red-600/30"></div>
                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">High (≥50%)</span>
          </div>
              </div>
            <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">
              Showing {monthlyData.length} months for {selectedYear}
              </div>
            </div>
          </div>
        </div>

      {/* Month Detail Modal */}
      {selectedMonth && (
        <MonthDetailModal
          isOpen={!!selectedMonth}
          onClose={handleCloseModal}
          monthData={monthlyData.find(m => m.month === selectedMonth.month)}
          year={selectedMonth.year}
          monthName={selectedMonth.monthName}
          violationsData={monthViolations}
          loading={loadingMonthData}
        />
      )}
    </>
  );
}
