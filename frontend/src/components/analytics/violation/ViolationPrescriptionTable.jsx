import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/components/theme/theme-provider';
import { getViolations } from '@/api/violationAnalytics';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const parseViolations = (record) => {
  const raw =
    record?.violations ??
    record?.violation ??
    record?.violationType ??
    record?.violationName ??
    record?.offense ??
    '';

  if (Array.isArray(raw)) return raw.map((entry) => entry?.trim?.() || '').filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map((entry) => entry.trim()).filter(Boolean);
  return [];
};

const deriveRecommendations = (records, planningYear) => {
  // Use only historical data up to the year BEFORE the planning year
  const cutoffYear = planningYear - 1;
  const basisRecords = Array.isArray(records)
    ? records.filter((r) => {
        if (!r?.dateOfApprehension) return false;
        const year = new Date(r.dateOfApprehension).getFullYear();
        return !Number.isNaN(year) && year <= cutoffYear;
      })
    : [];
  if (!Array.isArray(basisRecords) || !basisRecords.length) {
    return {
      meta: {
        datasetSize: 0,
        topMonths: [],
        dominantViolation: null,
        keyMonths: [],
        top3Violations: [],
        topViolationsWithStats: [],
        recommendations: {
          enforcement: `Keep regular checkpoints in key roads for the whole year ${planningYear}. Assign more teams during busy days, evenings, and weekends.`,
          education: 'Introduce focused sessions for high-risk violations during SP registrations and caravan operations.',
          terminal: 'Deploy traffic personnel before the start of special holidays. Conduct informative briefings about violations, especially high-risk ones.'
        }
      }
    };
  }

  const monthBuckets = MONTH_NAMES.map(() => ({
    recordCount: 0,
    violationCounts: new Map()
  }));

  const typeStats = new Map();

  basisRecords.forEach((record) => {
    if (!record?.dateOfApprehension) return;
    const date = new Date(record.dateOfApprehension);
    if (Number.isNaN(date.getTime())) return;

    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    const bucket = monthBuckets[monthIndex];

    let violationList = parseViolations(record);
    if (!violationList.length && record?.violationType) {
      violationList = [record.violationType];
    }

    bucket.recordCount += 1;

    violationList.forEach((violationRaw) => {
      const label = violationRaw?.trim?.();
      if (!label) return;
      const key = label.toLowerCase();

      if (!bucket.violationCounts.has(key)) {
        bucket.violationCounts.set(key, { label, count: 0 });
      }
      bucket.violationCounts.get(key).count += 1;

      if (!typeStats.has(key)) {
        typeStats.set(key, {
          key,
          name: label,
          total: 0,
          yearCounts: new Map(),
          monthCounts: new Map()
        });
      }
      const stat = typeStats.get(key);
      stat.total += 1;
      stat.yearCounts.set(year, (stat.yearCounts.get(year) || 0) + 1);

      const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      stat.monthCounts.set(monthKey, (stat.monthCounts.get(monthKey) || 0) + 1);
    });
  });

  const monthSummaries = monthBuckets
    .map((bucket, index) => {
      if (bucket.recordCount === 0) return null;
      const violationEntries = Array.from(bucket.violationCounts.values()).sort((a, b) => b.count - a.count);
      const topViolationEntry = violationEntries[0] || null;

      return {
        monthIndex: index,
        monthName: MONTH_NAMES[index],
        recordCount: bucket.recordCount, // Number of apprehensions (records/persons)
        topViolation: topViolationEntry?.label ?? null
      };
    })
    .filter(Boolean);

  if (!monthSummaries.length) {
    return {
      meta: {
        datasetSize: basisRecords.length,
        topMonths: [],
        dominantViolation: null,
        keyMonths: [],
        top3Violations: [],
        topViolationsWithStats: [],
        recommendations: {
          enforcement: `Keep regular checkpoints in key roads for the whole year ${planningYear}. Assign more teams during busy days, evenings, and weekends.`,
          education: 'Introduce focused sessions for high-risk violations during SP registrations and caravan operations.',
          terminal: 'Deploy traffic personnel before the start of special holidays. Conduct informative briefings about violations, especially high-risk ones.'
        }
      }
    };
  }

  // Use recordCount (apprehensions) for Peak Months KPI calculation
  // This counts the number of persons apprehended, not individual violations
  const grandTotal = monthSummaries.reduce((sum, summary) => sum + summary.recordCount, 0);
  const monthSummariesWithShare = monthSummaries
    .map((summary) => ({
      ...summary,
      share: grandTotal > 0 ? (summary.recordCount / grandTotal) * 100 : 0
    }))
    .sort((a, b) => b.share - a.share);

  const topMonths = monthSummariesWithShare.slice(0, 3);
  const focusThemes = [...new Set(topMonths.map((month) => month.topViolation).filter(Boolean))];
  const dominantViolation = focusThemes[0] || topMonths[0]?.topViolation || null;
  const keyMonths = topMonths.map((month) => month.monthName);

  const typeStatsArray = Array.from(typeStats.values());

  // Get top 3 violations by total count (exclude violation types like "alarm", "confiscated", "impounded")
  const violationTypes = ['alarm', 'confiscated', 'impounded'];
  const filteredViolations = typeStatsArray
        .filter(stat => {
          const nameLower = stat.name.toLowerCase().trim();
          return !violationTypes.some(type => nameLower === type || nameLower.includes(type));
        })
    .sort((a, b) => b.total - a.total);
  
  const top3Violations = filteredViolations.slice(0, 3).map(stat => stat.name);
  
  // Calculate total violations for percentage calculation
  const totalViolationsCount = filteredViolations.reduce((sum, stat) => sum + stat.total, 0);
  
  // Get top violations with counts and percentages (for KPI display)
  const topViolationsWithStats = filteredViolations
    .slice(0, 3)
    .map(stat => ({
      name: stat.name,
      count: stat.total,
      percentage: totalViolationsCount > 0 ? (stat.total / totalViolationsCount) * 100 : 0
    }));

  // Rule-Based Recommendation Generation
  // Rule 1: Data-Driven Enforcement Recommendation
  // IF peak months exist AND have significant share (>10% each)
  // THEN recommend enforcement during those specific months
  let enforcementRecommendation = '';
  if (topMonths.length > 0) {
    const peakMonthsList = keyMonths.join(", ");
    enforcementRecommendation = `Based on the analytics patterns from previous years, in year ${planningYear} it is recommended to conduct enforcement during the peak months (${peakMonthsList}).`;
  } else {
    enforcementRecommendation = `Keep regular checkpoints in key roads for the whole year ${planningYear}. Assign more teams during busy days, evenings, and weekends.`;
  }

  // Rule 2: Targeted Education Programs Recommendation
  // IF top violations exist AND have significant count
  // THEN recommend education programs focusing on those violations
  let educationRecommendation = '';
  if (top3Violations.length > 0) {
    const violationsList = top3Violations.slice(0, 3).join(", ");
    educationRecommendation = `Introduce focused sessions for high-risk violations (${violationsList}) during SP registrations and caravan operations.`;
  } else {
    educationRecommendation = `Introduce focused sessions for high-risk violations during SP registrations and caravan operations.`;
  }

  // Rule 3: Terminal Briefings Recommendation
  // IF peak months include holiday months (May, June, August, December)
  // THEN recommend terminal briefings before those months
  const holidayMonths = ['May', 'June', 'August', 'December'];
  const peakHolidayMonths = keyMonths.filter(month => holidayMonths.includes(month));
  let terminalRecommendation = '';
  if (peakHolidayMonths.length > 0) {
    terminalRecommendation = `Deploy traffic personnel before the start of special holidays in ${peakHolidayMonths.join(", ")}. Conduct informative briefings about violations, especially high-risk ones.`;
  } else if (topMonths.length > 0) {
    terminalRecommendation = `Deploy traffic personnel before the start of peak months (${keyMonths.join(", ")}). Conduct informative briefings about violations, especially high-risk ones.`;
  } else {
    terminalRecommendation = `Deploy traffic personnel before the start of special holidays. Conduct informative briefings about violations, especially high-risk ones.`;
  }

  const recommendations = {
    enforcement: enforcementRecommendation,
    education: educationRecommendation,
    terminal: terminalRecommendation
  };

  return {
    meta: {
      datasetSize: records.length,
      topMonths,
      dominantViolation,
      keyMonths,
      top3Violations: top3Violations.length > 0 ? top3Violations : [dominantViolation].filter(Boolean),
      topViolationsWithStats, // Most common violations with counts and percentages
      recommendations // Rule-based generated recommendations
    }
  };
};

export function ViolationPrescriptionTable({ loading }) {
  const { theme } = useTheme();
  const prefersDark = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, [theme]);

  const [historicalLoading, setHistoricalLoading] = useState(true);
  const [historicalError, setHistoricalError] = useState(null);
  const [records, setRecords] = useState([]);

  // Policy year automatically follows the current calendar year
  // Example: in 2025 the prescription is for 2025 (based on 2024 and below);
  // when 2025 ends and the date is in 2026, prescription switches to 2026 (based on 2025 and below).
  const planningYear = new Date().getFullYear();

  useEffect(() => {
    const load = async () => {
      try {
        setHistoricalLoading(true);
        const response = await getViolations();
        // Backend returns: { success: true, data: [...], pagination: {...} }
        // So we need to extract response.data.data (first data is from axios, second is from backend)
        const dataset = Array.isArray(response) 
          ? response 
          : (response?.data && Array.isArray(response.data)) 
            ? response.data 
            : [];
        
        console.log('ViolationPrescriptionTable: Loaded records count:', dataset.length);
        console.log('ViolationPrescriptionTable: Sample record:', dataset[0]);
        
        setRecords(dataset);
      } catch (error) {
        console.error('Failed to load violation records', error);
        setHistoricalError('Unable to load historical violation records.');
      } finally {
        setHistoricalLoading(false);
      }
    };

    load();
  }, []);

  const busy = loading || historicalLoading;

  const { meta } = useMemo(() => deriveRecommendations(records, planningYear), [records, planningYear]);

  if (busy) {
    return (
      <div className={`${prefersDark ? 'bg-gray-950/60 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl shadow-xl p-8 mb-8 animate-pulse space-y-6`}>
        <div className="h-6 w-64 bg-gray-300 dark:bg-gray-700 rounded" />
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  if (historicalError) {
    return (
      <div className={`${prefersDark ? 'bg-gray-950/60 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-700'} border rounded-2xl shadow-md p-6 mb-8 text-sm`}>
        {historicalError}
      </div>
    );
  }

  return (
    <div className={`${prefersDark ? 'bg-gray-900' : 'bg-white'} border ${prefersDark ? 'border-gray-700' : 'border-gray-300'} mb-8 shadow-lg`}>
      {/* Official Document Header */}
      <div className={`${prefersDark ? 'bg-gray-800' : 'bg-blue-50'} border-b ${prefersDark ? 'border-gray-700' : 'border-blue-300'} px-8 py-6 relative overflow-hidden`}>
        {/* Diagonal stripe pattern */}
        <div className={`absolute inset-0 ${prefersDark ? 'opacity-10' : 'opacity-20'}`}>
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255, 255, 255, 0.8) 8px, rgba(255, 255, 255, 0.8) 16px)' 
            }}
          ></div>
        </div>
        
        <div className="relative flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-3">
              <div className={`h-2 w-2 rounded-full ${prefersDark ? 'bg-blue-400' : 'bg-blue-600'} mt-2 flex-shrink-0`}></div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold ${prefersDark ? 'text-white' : 'text-blue-900'} tracking-tight leading-tight uppercase`}>
                  {planningYear} POLICY PRESCRIPTION FOR REDUCING TRAFFIC VIOLATIONS
              </h3>
                <p className={`text-sm ${prefersDark ? 'text-gray-300' : 'text-gray-600'} mt-2`}>
                  Land Transportation Office (LTO) • Violation Analytics Division
              </p>
              </div>
            </div>
          </div>

          <div className={`text-right border-l ${prefersDark ? 'border-gray-600' : 'border-blue-200'} pl-6 ml-6 flex-shrink-0`}>
            <p className={`text-xs ${prefersDark ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider font-semibold mb-2`}>
              Document Reference
            </p>
            <p className={`text-base font-bold ${prefersDark ? 'text-blue-300' : 'text-blue-700'} tracking-tight`}>
              LTO-{planningYear}-{String(meta.datasetSize % 10000).padStart(4, '0')}
            </p>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators Section */}
      <div className="px-8 py-7 border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-b from-transparent to-gray-50/30 dark:to-gray-800/30">
        <div className="flex items-center gap-2 mb-5">
          <div className={`h-0.5 w-8 ${prefersDark ? 'bg-blue-400' : 'bg-blue-600'}`}></div>
          <h4 className={`text-sm font-bold uppercase tracking-wider ${prefersDark ? 'text-gray-300' : 'text-gray-800'} letter-spacing-wide`}>
            Key Performance Indicators
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className={`${prefersDark ? 'bg-gray-800/80' : 'bg-white'} border-l-4 ${prefersDark ? 'border-blue-500' : 'border-blue-600'} ${prefersDark ? 'border-gray-700' : 'border-gray-200'} border shadow-sm p-5 transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between mb-3">
              <p className={`text-xs font-bold uppercase tracking-wider ${prefersDark ? 'text-gray-400' : 'text-gray-600'} leading-tight`}>
                Peak Months<br/><span className="font-normal normal-case text-[10px]">({planningYear - 1} and below)</span>
              </p>
              <div className={`${prefersDark ? 'bg-blue-500/20' : 'bg-blue-100'} rounded-full p-2`}>
                <svg className={`w-4 h-4 ${prefersDark ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
              </div>
            </div>
            {meta.topMonths?.length > 0 ? (
              <div className="space-y-2">
                {meta.topMonths.map((month, index) => (
                  <div key={index} className={`${prefersDark ? 'bg-gray-700/50' : 'bg-gray-50'} p-2 rounded border ${prefersDark ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${prefersDark ? 'text-white' : 'text-gray-900'}`}>
                        {month.monthName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${prefersDark ? 'text-blue-300' : 'text-blue-600'}`}>
                          {month.recordCount?.toLocaleString() || '0'}
                        </span>
                        <span className={`text-xs ${prefersDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          ({month.share.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-lg font-bold ${prefersDark ? 'text-white' : 'text-gray-900'} leading-tight`}>
                No data available
              </p>
            )}
          </div>
          <div className={`${prefersDark ? 'bg-gray-800/80' : 'bg-white'} border-l-4 ${prefersDark ? 'border-emerald-500' : 'border-emerald-600'} ${prefersDark ? 'border-gray-700' : 'border-gray-200'} border shadow-sm p-5 transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between mb-3">
              <p className={`text-xs font-bold uppercase tracking-wider ${prefersDark ? 'text-gray-400' : 'text-gray-600'} leading-tight`}>
                Most Common Violations<br/><span className="font-normal normal-case text-[10px]">({planningYear - 1} and below)</span>
              </p>
              <div className={`${prefersDark ? 'bg-emerald-500/20' : 'bg-emerald-100'} rounded-full p-2`}>
                <svg className={`w-4 h-4 ${prefersDark ? 'text-emerald-400' : 'text-emerald-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            {meta.topViolationsWithStats?.length > 0 ? (
              <div className="space-y-2">
                {meta.topViolationsWithStats.map((violation, index) => (
                  <div key={index} className={`${prefersDark ? 'bg-gray-700/50' : 'bg-gray-50'} p-2 rounded border ${prefersDark ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${prefersDark ? 'text-white' : 'text-gray-900'} leading-tight line-clamp-1`} title={violation.name}>
                        {violation.name}
                      </span>
                      <div className="flex items-center gap-2 ml-2">
                        <span className={`text-xs font-bold ${prefersDark ? 'text-emerald-300' : 'text-emerald-600'}`}>
                          {violation.count.toLocaleString()}
                        </span>
                        <span className={`text-xs ${prefersDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          ({violation.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                </div>
                ))}
              </div>
            ) : (
              <p className={`text-lg font-bold ${prefersDark ? 'text-white' : 'text-gray-900'} leading-tight`}>
                No data available
              </p>
            )}
              </div>
            </div>
          </div>

      {/* Strategic Recommendations Table */}
      <div className="px-8 py-7">
        <div className="flex items-center gap-2 mb-5">
          <div className={`h-0.5 w-8 ${prefersDark ? 'bg-blue-400' : 'bg-blue-600'}`}></div>
          <h4 className={`text-sm font-bold uppercase tracking-wider ${prefersDark ? 'text-gray-300' : 'text-gray-800'} letter-spacing-wide`}>
            Strategic Recommendations
          </h4>
        </div>
        <div className="border-2 border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
              <tr className={`${prefersDark ? 'bg-gray-800' : 'bg-gray-100'} border-b-2 ${prefersDark ? 'border-gray-700' : 'border-gray-300'}`}>
                <th className={`text-left py-4 px-5 text-xs font-bold uppercase tracking-wider ${prefersDark ? 'text-gray-300' : 'text-gray-800'} border-r ${prefersDark ? 'border-gray-700' : 'border-gray-300'} w-[25%]`}>
                  Recommendation
                </th>
                <th className={`text-left py-4 px-5 text-xs font-bold uppercase tracking-wider ${prefersDark ? 'text-gray-300' : 'text-gray-800'} border-r ${prefersDark ? 'border-gray-700' : 'border-gray-300'} w-[50%]`}>
                  Description
                </th>
                <th className={`text-left py-4 px-5 text-xs font-bold uppercase tracking-wider ${prefersDark ? 'text-gray-300' : 'text-gray-800'} w-[25%]`}>
                  Focus Area
                </th>
                  </tr>
                </thead>
            <tbody>
              {/* Row 1 */}
              <tr className={`border-b ${prefersDark ? 'border-gray-700' : 'border-gray-200'} ${prefersDark ? 'hover:bg-gray-800/50' : 'hover:bg-blue-50/30'} transition-colors`}>
                <td className={`py-5 px-5 align-top border-r ${prefersDark ? 'border-gray-700' : 'border-gray-200'} ${prefersDark ? 'text-white' : 'text-gray-900'} font-bold text-sm`}>
                  Strengthen Data-Driven Enforcement
                    </td>
                <td className={`py-5 px-5 align-top border-r ${prefersDark ? 'border-gray-700' : 'border-gray-200'} ${prefersDark ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed`}>
                  {meta.recommendations?.enforcement || `Based on the analytics patterns from previous years, in year ${planningYear} it is recommended to conduct enforcement during the peak months.`}
                    </td>
                <td className={`py-5 px-5 align-top ${prefersDark ? 'text-gray-300' : 'text-gray-700'} text-sm`}>
                  <div className={`${prefersDark ? 'bg-white' : 'bg-white'} p-4 rounded-lg shadow-sm border ${prefersDark ? 'border-gray-200' : 'border-gray-200'}`}>
                    <p className={`text-xs font-bold uppercase mb-3 ${prefersDark ? 'text-gray-700' : 'text-gray-700'}`}>PEAK MONTHS:</p>
                    <div className={`${prefersDark ? 'text-gray-800' : 'text-gray-800'} font-medium text-sm space-y-1`}>
                      {meta.keyMonths?.length ? (
                        meta.keyMonths.map((month, index) => (
                          <p key={index} className="leading-relaxed">
                            • {month}
                          </p>
                        ))
                      ) : (
                        <p>No data</p>
                      )}
                    </div>
                  </div>
                    </td>
                  </tr>
              {/* Row 2 */}
              <tr className={`border-b ${prefersDark ? 'border-gray-700' : 'border-gray-200'} ${prefersDark ? 'hover:bg-gray-800/50' : 'hover:bg-blue-50/30'} transition-colors`}>
                <td className={`py-5 px-5 align-top border-r ${prefersDark ? 'border-gray-700' : 'border-gray-200'} ${prefersDark ? 'text-white' : 'text-gray-900'} font-bold text-sm`}>
                  Implement Targeted Education Programs
                    </td>
                <td className={`py-5 px-5 align-top border-r ${prefersDark ? 'border-gray-700' : 'border-gray-200'} ${prefersDark ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed`}>
                  {meta.recommendations?.education || 'Introduce focused sessions for high-risk violations during SP registrations and caravan operations.'}
                    </td>
                <td rowSpan={2} className={`py-5 px-5 align-top ${prefersDark ? 'text-gray-300' : 'text-gray-700'} text-sm`}>
                  <div className={`${prefersDark ? 'bg-white' : 'bg-white'} p-4 rounded-lg shadow-sm border ${prefersDark ? 'border-gray-200' : 'border-gray-200'}`}>
                    <p className={`text-xs font-bold uppercase mb-3 ${prefersDark ? 'text-gray-700' : 'text-gray-700'}`}>MOST COMMON VIOLATIONS:</p>
                    <div className={`${prefersDark ? 'text-gray-800' : 'text-gray-800'} font-medium text-sm space-y-1`}>
                      {meta.top3Violations?.length ? (
                        meta.top3Violations.map((violation, index) => (
                          <p key={index} className="leading-relaxed">
                            • {violation}
                          </p>
                        ))
                      ) : (
                        <p>• {meta.dominantViolation || "No data"}</p>
                      )}
                    </div>
                  </div>
                    </td>
                  </tr>
              {/* Row 3 */}
              <tr className={`${prefersDark ? 'hover:bg-gray-800/50' : 'hover:bg-blue-50/30'} transition-colors`}>
                <td className={`py-5 px-5 align-top border-r ${prefersDark ? 'border-gray-700' : 'border-gray-200'} ${prefersDark ? 'text-white' : 'text-gray-900'} font-bold text-sm`}>
                  Terminal Briefings
                      </td>
                <td className={`py-5 px-5 align-top border-r ${prefersDark ? 'border-gray-700' : 'border-gray-200'} ${prefersDark ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed`}>
                  {meta.recommendations?.terminal || 'Deploy traffic personnel before the start of special holidays. Conduct informative briefings about violations, especially high-risk ones.'}
                      </td>
                    </tr>
                </tbody>
              </table>
            </div>
          </div>

      {/* Document Footer */}
      <div className={`${prefersDark ? 'bg-gray-800/80' : 'bg-gray-50'} border-t-2 ${prefersDark ? 'border-gray-700' : 'border-gray-300'} px-8 py-5`}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex-1">
            <p className={`font-bold text-xs uppercase tracking-wider ${prefersDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Prescribed by:</p>
            <p className={`${prefersDark ? 'text-gray-200' : 'text-gray-800'} font-semibold text-sm mb-1`}>LTO Analytics System</p>
            <p className={`${prefersDark ? 'text-gray-400' : 'text-gray-600'} text-xs`}>Rule-Based Model · Automated Analysis</p>
            <p className={`${prefersDark ? 'text-gray-500' : 'text-gray-500'} mt-2 text-[10px] italic`}>
              Generated from {meta.datasetSize.toLocaleString()} historical violation records
            </p>
            </div>
          <div className={`md:text-right border-t md:border-t-0 md:border-l-2 ${prefersDark ? 'border-gray-700' : 'border-gray-300'} pt-4 md:pt-0 md:pl-6 md:ml-6`}>
            <p className={`font-bold text-xs uppercase tracking-wider ${prefersDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Valid Until:</p>
            <p className={`${prefersDark ? 'text-gray-200' : 'text-gray-800'} font-semibold text-sm mb-1`}>End of {planningYear}</p>
            <p className={`${prefersDark ? 'text-gray-400' : 'text-gray-600'} text-xs mb-2`}>Annual Policy Document</p>
            <p className={`${prefersDark ? 'text-gray-500' : 'text-gray-500'} text-[10px] italic`}>
              Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

