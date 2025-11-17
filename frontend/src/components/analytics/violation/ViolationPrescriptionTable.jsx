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

const formatMonthKey = (key) => {
  if (!key || typeof key !== 'string') return '';
  const [year, month] = key.split('-');
  const monthIndex = Number(month) - 1;
  if (Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return key;
  return `${MONTH_NAMES[monthIndex]} ${year}`;
};

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

const summarizeRepeatMonths = (entries) => {
  if (!entries?.length) return '—';
  return entries
    .slice(0, 3)
    .map(([key, count]) => `${formatMonthKey(key)} (${count})`)
    .join(', ');
};

const deriveRecommendations = (records, planningYear) => {
  const defaultRows = [
    {
      category: 'Checkpoints',
      recommendations: [
        `Keep regular checkpoints in key roads for the whole year ${planningYear}.`,
        'Assign more teams during busy days, evenings, and weekends.',
        'Record simple checkpoint results (place, time, number of apprehensions) to monitor yearly quota.'
      ],
      basis: [
        'No clear peak month detected yet in the historical data.',
        'Regular, visible checkpoints help drivers remember traffic rules.',
        'Simple records from checkpoints will guide better planning for the next year.'
      ]
    },
    {
      category: 'Seminar',
      recommendations: [
        `Use SP registration and renewal seminars in ${planningYear} to remind drivers about common violations.`,
        'Ask apprehended drivers to attend short road safety talks when they have repeat violations.',
        'Coordinate with schools, transport groups, and cooperatives for simple quarterly seminars.'
      ],
      basis: [
        'Seminars are most effective for repeat violators and high-risk violations.',
        'SP registration and renewal are good touchpoints to reinforce safe driving behavior.',
        'Quarterly review of records will help decide which violations need stronger seminar focus.'
      ]
    },
    {
      category: 'Awareness Campaign',
      recommendations: [
        'Sustain simple road safety messages on social media, radio, and posters.',
        'Work with LGUs and barangays on short community briefings about safe and legal driving.',
        'Highlight stories of safe driving and responsible enforcement to build public trust.'
      ],
      basis: [
        'Awareness campaigns are triggered when we see sudden increases in a specific violation type.',
        'No strong spikes detected yet, so a general road safety advocacy campaign is recommended.',
        `Re-check the data before mid-${planningYear} to see if a more focused campaign is needed.`
      ]
    }
  ];

  if (!Array.isArray(records) || !records.length) {
    return {
      rows: defaultRows,
      meta: {
        datasetSize: 0,
        topMonths: [],
        uniqueViolations: 0,
        heuristics: [
          'Checkpoint priority months = top 3 months by total individual violations.',
          'Seminar requirement = violation type with ≥4 cases across ≥2 years and ≥2 repeat months (each ≥2 cases).',
          'Awareness spike = monthly count ≥ max(1.5× average, average + 2) and ≥3 cases.'
        ],
        dominantViolation: null,
        keyMonths: []
      }
    };
  }

  const monthBuckets = MONTH_NAMES.map(() => ({
    totalViolations: 0,
    recordCount: 0,
    yearCounts: new Map(),
    violationCounts: new Map()
  }));

  const typeStats = new Map();

  records.forEach((record) => {
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

    const violationCountForMonth = violationList.length || 1;
    bucket.totalViolations += violationCountForMonth;
    bucket.recordCount += 1;
    bucket.yearCounts.set(year, (bucket.yearCounts.get(year) || 0) + violationCountForMonth);

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
      if (bucket.totalViolations === 0) return null;
      const violationEntries = Array.from(bucket.violationCounts.values()).sort((a, b) => b.count - a.count);
      const topViolationEntry = violationEntries[0] || null;
      const yearEntries = Array.from(bucket.yearCounts.entries()).sort((a, b) => b[1] - a[1]);
      const peakYearEntry = yearEntries[0] || null;

      return {
        monthIndex: index,
        monthName: MONTH_NAMES[index],
        totalViolations: bucket.totalViolations,
        topViolation: topViolationEntry?.label ?? null,
        peakYear: peakYearEntry ? peakYearEntry[0] : null,
        peakYearCount: peakYearEntry ? peakYearEntry[1] : 0
      };
    })
    .filter(Boolean);

  if (!monthSummaries.length) {
    return {
      rows: defaultRows,
      meta: {
        datasetSize: records.length,
        topMonths: [],
        uniqueViolations: typeStats.size,
        heuristics: [
          'Checkpoint priority months = top 3 months by total individual violations.',
          'Seminar requirement = violation type with ≥4 cases across ≥2 years and ≥2 repeat months (each ≥2 cases).',
          'Awareness spike = monthly count ≥ max(1.5× average, average + 2) and ≥3 cases.'
        ],
        dominantViolation: null,
        keyMonths: []
      }
    };
  }

  const grandTotal = monthSummaries.reduce((sum, summary) => sum + summary.totalViolations, 0);
  const monthSummariesWithShare = monthSummaries
    .map((summary) => ({
      ...summary,
      share: grandTotal > 0 ? (summary.totalViolations / grandTotal) * 100 : 0
    }))
    .sort((a, b) => b.share - a.share);

  const topMonths = monthSummariesWithShare.slice(0, 3);
  const focusThemes = [...new Set(topMonths.map((month) => month.topViolation).filter(Boolean))];
  const dominantViolation = focusThemes[0] || topMonths[0]?.topViolation || null;
  const keyMonths = topMonths.map((month) => month.monthName);

  const checkpointRecommendations = topMonths.length
    ? topMonths.map(
        (month) =>
          `Plan more checkpoints in ${month.monthName} ${planningYear}, focusing on ${dominantViolation || 'the most common violations'} and meeting the yearly apprehension quota.`
      )
    : defaultRows[0].recommendations;

  const checkpointBasis = topMonths.length
    ? topMonths.map(
        (month) =>
          `${month.monthName}: ${month.totalViolations} violations (${month.share.toFixed(1)}% of total, peak ${month.peakYear ?? '—'} at ${month.peakYearCount || 0} cases).`
      )
    : defaultRows[0].basis;

  const typeStatsArray = Array.from(typeStats.values()).map((stat) => {
    const monthlyEntries = Array.from(stat.monthCounts.entries());
    const monthlyCounts = monthlyEntries.map(([, count]) => count);
    const totalMonthly = monthlyCounts.reduce((sum, count) => sum + count, 0);
    const avgMonthly = monthlyEntries.length ? totalMonthly / monthlyEntries.length : 0;
    const repeatMonths = monthlyEntries
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1]);
    const spikeEntries = monthlyEntries
      .filter(([, count]) => {
        if (count < 3) return false;
        const dynamicThreshold = Math.max(avgMonthly * 1.5, avgMonthly + 2);
        return count >= dynamicThreshold || avgMonthly === 0;
      })
      .sort((a, b) => b[1] - a[1]);

    return {
      ...stat,
      uniqueYears: stat.yearCounts.size,
      repeatMonths,
      spikeEntries,
      avgMonthly
    };
  });

  // Get top 3 violations by total count (exclude violation types like "alarm", "confiscated", "impounded")
  const violationTypes = ['alarm', 'confiscated', 'impounded'];
  const top3Violations = typeStatsArray.length > 0
    ? typeStatsArray
        .filter(stat => {
          const nameLower = stat.name.toLowerCase().trim();
          return !violationTypes.some(type => nameLower === type || nameLower.includes(type));
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 3)
        .map(stat => stat.name)
    : [];

  const seminarCandidates = typeStatsArray
    .filter((stat) => stat.total >= 4 && (stat.uniqueYears >= 2 || stat.repeatMonths.length >= 2))
    .sort((a, b) => {
      const scoreA = a.total + a.repeatMonths.length * 2 + a.uniqueYears;
      const scoreB = b.total + b.repeatMonths.length * 2 + b.uniqueYears;
      return scoreB - scoreA;
    })
    .slice(0, 3);

  const seminarRecommendations = seminarCandidates.length
    ? seminarCandidates.map((stat) => {
        const hotspot = stat.repeatMonths[0] ? formatMonthKey(stat.repeatMonths[0][0]) : 'identified repeat months';
        return `Use SP registration, renewal, and post-apprehension seminars in ${planningYear} to explain ${stat.name}, especially for drivers recorded repeatedly around ${hotspot}.`;
      })
    : defaultRows[1].recommendations;

  const seminarBasis = seminarCandidates.length
    ? seminarCandidates.map(
        (stat) =>
          `${stat.name}: ${stat.total} cases across ${stat.uniqueYears} year(s); repeat months – ${summarizeRepeatMonths(stat.repeatMonths)}.`
      )
    : defaultRows[1].basis;

  const surgeScore = (stat) => {
    if (!stat.spikeEntries.length) return 0;
    const maxCount = Math.max(...stat.spikeEntries.map(([, count]) => count));
    const avg = stat.avgMonthly || 0;
    return (maxCount - avg) + stat.spikeEntries.length;
  };

  const awarenessCandidates = typeStatsArray
    .filter((stat) => stat.spikeEntries.length > 0)
    .sort((a, b) => surgeScore(b) - surgeScore(a))
    .slice(0, 3);

  const awarenessRecommendations = awarenessCandidates.length
    ? awarenessCandidates.map((stat) => {
        const leadSpike = stat.spikeEntries[0] ? formatMonthKey(stat.spikeEntries[0][0]) : 'identified spike months';
        return `Before ${leadSpike} ${planningYear}, run a simple road safety campaign on ${stat.name} (posters, social media, barangay announcements) to prevent another spike.`;
      })
    : defaultRows[2].recommendations;

  const awarenessBasis = awarenessCandidates.length
    ? awarenessCandidates.map(
        (stat) =>
          `${stat.name}: surge months – ${summarizeRepeatMonths(stat.spikeEntries)}; historical monthly average ${(stat.avgMonthly || 0).toFixed(1)}.`
      )
    : defaultRows[2].basis;

  const rows = [
    {
      category: 'Checkpoints',
      recommendations: checkpointRecommendations,
      basis: checkpointBasis
    },
    {
      category: 'Seminar',
      recommendations: seminarRecommendations,
      basis: seminarBasis
    },
    {
      category: 'Awareness Campaign',
      recommendations: awarenessRecommendations,
      basis: awarenessBasis
    }
  ];

  const heuristics = [
    'Checkpoints: focus on the top 3 months with the highest number of recorded violations.',
    'Seminars: prioritize violation types with many cases over several years or repeated months.',
    'Awareness campaigns: triggered when we see a sudden increase in a specific violation type in a month.'
  ];

  // Calculate yearly quota estimate based on most recent year
  const allYears = Array.from(new Set(records.map(r => {
    if (!r?.dateOfApprehension) return null;
    return new Date(r.dateOfApprehension).getFullYear();
  }))).filter(Boolean).sort((a, b) => b - a);
  
  // Use the most recent year's count as the quota target
  const mostRecentYear = allYears.length > 0 ? allYears[0] : null;
  const yearlyQuotaEstimate = mostRecentYear
    ? records.filter(r => {
        if (!r?.dateOfApprehension) return false;
        return new Date(r.dateOfApprehension).getFullYear() === mostRecentYear;
      }).length
    : records.length;
  
  // Calculate monthly quota distribution based on peak months
  const monthlyQuotaDistribution = monthSummariesWithShare.map(month => ({
    month: month.monthName,
    targetQuota: Math.round((yearlyQuotaEstimate * (month.share / 100)) * 1.1), // 10% buffer
    share: month.share,
    isPeakMonth: topMonths.some(tm => tm.monthName === month.monthName)
  }));

  // Identify special holiday periods (Balik Skwela typically in May-June)
  const specialHolidayMonths = ['May', 'June', 'August', 'December'];
  const terminalBriefingMonths = specialHolidayMonths.filter(month => 
    monthSummariesWithShare.some(m => m.monthName === month && m.totalViolations > 0)
  );

  // Calculate caravan recommendation based on peak months and LGU coordination needs
  const caravanPriorityMonths = topMonths
    .filter(month => month.share > 10) // Months with >10% share
    .map(month => month.monthName);

  return {
    rows,
    meta: {
      datasetSize: records.length,
      topMonths,
      uniqueViolations: typeStats.size,
      heuristics,
      dominantViolation,
      keyMonths,
      top3Violations: top3Violations.length > 0 ? top3Violations : [dominantViolation].filter(Boolean),
      // New rule-based metrics
      yearlyQuotaEstimate: yearlyQuotaEstimate,
      monthlyQuotaDistribution,
      terminalBriefingMonths,
      caravanPriorityMonths,
      avgYearlyApprehensions: yearlyQuotaEstimate,
      mostRecentYear: mostRecentYear
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

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const planningYear = currentYear + 1;

  useEffect(() => {
    const load = async () => {
      try {
        setHistoricalLoading(true);
        const response = await getViolations();
        const dataset = Array.isArray(response) ? response : response?.data || [];
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
    <div className={`${prefersDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} border rounded-3xl shadow-[0_35px_80px_-40px_rgba(30,41,59,0.5)] mb-8 overflow-hidden`}>
      {/* Rule-Based LTO Prescription Section */}
      <section className="px-6 md:px-8 py-8">
        <div
          className={`${
            prefersDark ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
          } border rounded-3xl p-6 md:p-8 space-y-6`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-700 pb-4">
          <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {planningYear} Enforcement Action Plan
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Rule-Based Prescription · {meta.datasetSize.toLocaleString()} records analyzed
              </p>
              </div>
            <div className={`${prefersDark ? 'bg-slate-900' : 'bg-slate-100'} px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-right`}>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ref #</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">LTO-{planningYear}-{String(meta.datasetSize % 1000).padStart(3, '0')}</p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority Months KPI */}
            <div className={`${prefersDark ? 'bg-white/5 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-5 shadow-sm`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`${prefersDark ? 'bg-blue-500/20' : 'bg-blue-50'} rounded-lg p-2`}>
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Priority Months
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {meta.keyMonths?.length ? (
                  meta.keyMonths.map((month, idx) => (
                    <React.Fragment key={idx}>
                      <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                        {month}
                      </span>
                      {idx < meta.keyMonths.length - 1 && (
                        <span className="text-slate-400 dark:text-slate-500 mx-1">·</span>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400">No data available</p>
                )}
              </div>
            </div>

            {/* Yearly Quota Target KPI */}
            <div className={`${prefersDark ? 'bg-white/5 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-5 shadow-sm`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`${prefersDark ? 'bg-emerald-500/20' : 'bg-emerald-50'} rounded-lg p-2`}>
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Yearly Quota Target
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight mb-1">
                  {meta.yearlyQuotaEstimate?.toLocaleString() ?? 'N/A'}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Apprehensions
                </p>
              </div>
            </div>
          </div>

          {/* Action Items Table */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Action Items</h4>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className={`${prefersDark ? 'bg-slate-900' : 'bg-slate-100'} border-b-2 border-slate-300 dark:border-slate-700`}>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 w-12">#</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Activity</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">When/Where</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Focus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {/* 1. Enforcement Operations */}
                  <tr className={`${prefersDark ? 'hover:bg-slate-900' : 'hover:bg-slate-50'} transition-colors`}>
                    <td className="py-4 px-4 text-center">
                      <span className={`${prefersDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'} text-sm font-bold px-2.5 py-1 rounded-full`}>
                        1
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-slate-900 dark:text-white mb-1">Enforcement Operations</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Conduct checkpoints anytime. Prioritize peak months ({meta.keyMonths?.length ? meta.keyMonths.join(', ') : 'N/A'}) to reach quota of {meta.yearlyQuotaEstimate?.toLocaleString() ?? 'N/A'} apprehensions.
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        <strong>Anytime</strong> · Priority: {meta.keyMonths?.length ? meta.keyMonths.join(', ') : 'Year-round'}
                      </p>
                      {meta.monthlyQuotaDistribution && meta.monthlyQuotaDistribution.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                            Monthly targets
                          </summary>
                          <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                            {meta.monthlyQuotaDistribution.slice(0, 6).map((dist, idx) => (
                              <div key={idx} className={`${dist.isPeakMonth ? (prefersDark ? 'bg-amber-900/20' : 'bg-amber-50') : ''} px-2 py-1 rounded`}>
                                <span className="font-semibold">{dist.month}:</span> {dist.targetQuota.toLocaleString()}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {meta.top3Violations?.length > 0 
                          ? meta.top3Violations.map((v, i) => (
                              <span key={i} className="block text-xs mb-1">
                                {i + 1}. {v}
                              </span>
                            ))
                          : (meta.dominantViolation ?? 'Documentation violations')
                        }
                      </p>
                    </td>
                  </tr>

                  {/* 2. Weekly SP Registration Awareness */}
                  <tr className={`${prefersDark ? 'hover:bg-slate-900' : 'hover:bg-slate-50'} transition-colors`}>
                    <td className="py-4 px-4 text-center">
                      <span className={`${prefersDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'} text-sm font-bold px-2.5 py-1 rounded-full`}>
                        2
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-slate-900 dark:text-white mb-1">SP Registration Seminars</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Educate drivers during weekly SP registration/renewal sessions about common violations and compliance requirements. Highlight and discuss the most dominant violations.  
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        <strong>Weekly</strong> during SP registrations
                      </p>
                      {meta.keyMonths?.length > 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Emphasize before: {meta.keyMonths.join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {meta.top3Violations?.length > 0 
                          ? meta.top3Violations.map((v, i) => (
                              <span key={i} className="block text-xs mb-1">
                                {i + 1}. {v}
                              </span>
                            ))
                          : (meta.dominantViolation ?? 'Common violations')
                        }
                      </p>
                    </td>
                  </tr>

                  {/* 3. Caravan Operations */}
                  {meta.caravanPriorityMonths?.length > 0 && (
                    <tr className={`${prefersDark ? 'hover:bg-slate-900' : 'hover:bg-slate-50'} transition-colors`}>
                      <td className="py-4 px-4 text-center">
                        <span className={`${prefersDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'} text-sm font-bold px-2.5 py-1 rounded-full`}>
                          3
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white mb-1">Caravan Operations</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Coordinate with LGUs/cities for barangay caravans. Include informative and awareness seminars about traffic violations especially the three dominat violations.
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          <strong>As requested</strong> by LGUs/Cities
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Priority months: {meta.caravanPriorityMonths.join(', ')}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {meta.top3Violations?.length > 0 
                            ? meta.top3Violations.map((v, i) => (
                                <span key={i} className="block text-xs mb-1">
                                  {i + 1}. {v}
                                </span>
                              ))
                            : (meta.dominantViolation ?? 'Documentation requirements')
                          }
                        </p>
                      </td>
                    </tr>
                  )}

                  {/* 4. Pre-Holiday Terminal Briefings */}
                  {meta.terminalBriefingMonths?.length > 0 && (
                    <tr className={`${prefersDark ? 'hover:bg-slate-900' : 'hover:bg-slate-50'} transition-colors`}>
                      <td className="py-4 px-4 text-center">
                        <span className={`${prefersDark ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-700'} text-sm font-bold px-2.5 py-1 rounded-full`}>
                          4
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white mb-1">Terminal Briefings</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Conduct awareness briefings at terminals before special holidays (e.g., Balik Skwela).
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          <strong>Days before</strong> special holidays
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Months: {meta.terminalBriefingMonths.join(', ')}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {meta.top3Violations?.length > 0 
                            ? meta.top3Violations.map((v, i) => (
                                <span key={i} className="block text-xs mb-1">
                                  {i + 1}. {v}
                                </span>
                              ))
                            : (meta.dominantViolation ?? 'Licensing requirements')
                          }
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Prescription Footer */}
          <div className="border-t-2 border-dashed border-slate-300 dark:border-slate-700 pt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">Prescribed by:</p>
              <p>LTO Analytics System · Rule-Based Model</p>
              <p className="text-[10px] mt-1">Last Updated: {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-700 dark:text-slate-300">Valid Until:</p>
              <p>End of {planningYear}</p>
              <p className="text-[10px] mt-1">Auto-updates with new data</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

