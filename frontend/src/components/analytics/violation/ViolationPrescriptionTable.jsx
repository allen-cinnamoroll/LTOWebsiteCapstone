import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Info, TrendingUp, Sparkles } from 'lucide-react';
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

  return {
    rows,
    meta: {
      datasetSize: records.length,
      topMonths,
      uniqueViolations: typeStats.size,
      heuristics,
      dominantViolation,
      keyMonths
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

  const dominantMonth = meta.topMonths?.[0];
  const peakYear = dominantMonth?.peakYear ?? null;

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
      <header className={`${prefersDark ? 'bg-slate-950' : 'bg-white'} px-6 py-6 md:px-8 md:py-8 border-b ${prefersDark ? 'border-slate-900' : 'border-slate-200'}`}>
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
              <div className={`${prefersDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-blue-500 text-white'} rounded-2xl p-2.5`}>
                <ClipboardList className="w-6 h-6" />
          </div>
          <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {planningYear} Enforcement Intelligence Brief
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  Clean, rule-based directives for LTO chiefs and planners.
                </p>
              </div>
            </div>
            <div className={`${prefersDark ? 'bg-slate-900/80 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-200 text-slate-600'} text-xs rounded-2xl px-4 py-3 flex items-center gap-2`}>
              <Info className="w-4 h-4 shrink-0" />
              <span>
                Dataset evaluated: {meta.datasetSize} record{meta.datasetSize === 1 ? '' : 's'} · {meta.uniqueViolations} violation theme{meta.uniqueViolations === 1 ? '' : 's'}
              </span>
          </div>
        </div>

          {/* Executive KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className={`${prefersDark ? 'bg-slate-900 border-slate-800' : 'bg-sky-50 border-sky-100'} border rounded-2xl px-4 py-3 flex flex-col gap-1`}>
              <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Dominant violation</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-500" />
                {meta.dominantViolation ?? 'N/A'}
              </span>
            </div>
            <div className={`${prefersDark ? 'bg-slate-900 border-slate-800' : 'bg-amber-50 border-amber-100'} border rounded-2xl px-4 py-3 flex flex-col gap-1`}>
              <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Highest violation month</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                {dominantMonth?.monthName ?? 'N/A'}
              </span>
            </div>
            <div className={`${prefersDark ? 'bg-slate-900 border-slate-800' : 'bg-emerald-50 border-emerald-100'} border rounded-2xl px-4 py-3 flex flex-col gap-1`}>
              <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Records analysed</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {meta.datasetSize.toLocaleString()}
              </span>
            </div>
            <div className={`${prefersDark ? 'bg-slate-900 border-slate-800' : 'bg-violet-50 border-violet-100'} border rounded-2xl px-4 py-3 flex flex-col gap-1`}>
              <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Top peak year</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                {peakYear ?? '—'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className={`${prefersDark ? 'bg-slate-950/40' : 'bg-slate-50'} px-6 md:px-8 py-6 border-b ${prefersDark ? 'border-slate-900' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Highest violation months
          </h3>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-300">
            <TrendingUp className="w-4 h-4 text-rose-500" />
            <span>Top months by violation volume.</span>
          </div>
        </div>

        {meta.topMonths?.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {meta.topMonths.map((month) => (
              <div
                key={month.monthIndex}
                className={`${prefersDark ? 'bg-slate-950 border border-slate-900' : 'bg-white border border-slate-200'} rounded-2xl px-4 py-4 space-y-2 shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{month.monthName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-300">
                      {month.totalViolations.toLocaleString()} cases · {month.share.toFixed(1)}% share
                    </p>
              </div>
                  <span
                    className={`${
                      prefersDark ? 'bg-slate-900/80 text-slate-100 border-slate-700' : 'bg-slate-50 text-slate-700 border-slate-200'
                    } border px-2.5 py-1 rounded-full text-[10px] font-medium`}
                  >
                    Peak {month.peakYear ?? '—'} ({month.peakYearCount || 0})
                  </span>
              </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Dominant violation: <span className="font-semibold">{month.topViolation ?? 'General compliance'}</span>
                </p>
            </div>
          ))}
        </div>
        ) : (
          <div
            className={`${
              prefersDark
                ? 'bg-slate-900/60 border border-slate-800 text-slate-300'
                : 'bg-white border border-slate-200 text-slate-600'
            } rounded-2xl px-4 py-6 text-sm`}
          >
            Insufficient historical data to summarise monthly patterns.
          </div>
        )}
      </section>

      {/* Rule-based model prescription */}
      <section className="px-6 md:px-8 pb-8">
        <div
          className={`${
            prefersDark ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
          } border rounded-3xl p-6 md:p-7 space-y-4`}
        >
          <div className="flex flex-col gap-1 mb-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {planningYear} Rule‑based enforcement brief
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              High-level prescription generated using a transparent rule-based analytics model, based on {meta.datasetSize.toLocaleString()} historical
              record{meta.datasetSize === 1 ? '' : 's'} and the dominant violation (
              {meta.dominantViolation ?? '1A – NO DRIVER&apos;S LICENSE/CONDUCTOR PERMIT'}).
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div
              className={`${
                prefersDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              } border rounded-2xl px-4 py-4 space-y-2`}
            >
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Strategic objective
              </h4>
              <p className="text-sm text-slate-800 dark:text-slate-100">
                Reduce repeat cases of {meta.dominantViolation ?? 'the most frequent violation'} across the peak months (
                {meta.keyMonths?.length ? meta.keyMonths.join(', ') : 'identified high-volume months'}) while keeping checkpoint presence predictable and
                fair.
              </p>
            </div>

            <div
              className={`${
                prefersDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              } border rounded-2xl px-4 py-4 space-y-2`}
            >
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Enforcement focus
              </h4>
              <p className="text-sm text-slate-800 dark:text-slate-100">
                Align weekly operations plans so at least one checkpoint cycle per week explicitly targets documentation-related violations (e.g. 1A, 1H,
                11) in routes that historically show the highest counts.
              </p>
            </div>

            <div
              className={`${
                prefersDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              } border rounded-2xl px-4 py-4 space-y-2`}
            >
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Citizen experience
              </h4>
              <p className="text-sm text-slate-800 dark:text-slate-100">
                Publish simple public advisories two weeks before the key months, clarifying common violations, documentary requirements, and the
                schedule of intensified checkpoints to support transparency and voluntary compliance.
              </p>
            </div>

            <div
              className={`${
                prefersDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              } border rounded-2xl px-4 py-4 space-y-2`}
            >
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Monitoring and review
              </h4>
              <p className="text-sm text-slate-800 dark:text-slate-100">
                At the end of each peak month, compare apprehension counts and seminar attendance with the same period last year, and adjust next
                month&apos;s checkpoint locations and messaging based on the updated analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

