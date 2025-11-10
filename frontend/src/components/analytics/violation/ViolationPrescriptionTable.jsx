import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Info,
  TrendingUp,
  MapPin,
  GraduationCap,
  Megaphone,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
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
        `Maintain monthly checkpoints across priority corridors throughout ${planningYear}.`,
        'Schedule manpower two weeks before special events or market days.',
        'Capture detailed field reports to refine next-year targeting.'
      ],
      basis: [
        'No high-density months detected in current dataset.',
        'Checkpoint playbook remains on routine rotation until new data is ingested.',
        'Continue monitoring violation uploads for fresh spikes.'
      ]
    },
    {
      category: 'Seminar',
      recommendations: [
        'Keep seminars optional while monitoring repeat violations.',
        'Use SMS reminders for drivers due for license renewal.',
        'Coordinate with schools and cooperatives for quarterly refreshers.'
      ],
      basis: [
        'Seminar trigger rule: ≥4 cases across ≥2 years with ≥2 repeat months (each ≥2 cases).',
        'Current dataset shows no violation type meeting the repetition threshold.',
        'Quarterly review recommended to reassess mandatory seminar coverage.'
      ]
    },
    {
      category: 'Awareness Campaign',
      recommendations: [
        'Maintain broad “safe and legal driving” messaging on social media.',
        'Partner with barangays for rotating community briefings.',
        'Leverage radio spots during morning drive hours.'
      ],
      basis: [
        'Awareness spike rule: monthly count ≥ max(1.5× average, average + 2) with ≥3 cases.',
        'No violation type breached the spike threshold in the current dataset.',
        `Re-evaluate awareness focus before Q2 ${planningYear}.`
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
        (month) => `Prioritize checkpoints in ${month.monthName} ${planningYear}, aligning manpower and equipment with the dominant issue: ${dominantViolation || 'top violations'}.`
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
        return `Mandate remedial seminars and issue ${planningYear} warnings for ${stat.name}, focusing on hotspots such as ${hotspot}.`;
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
        return `Launch a targeted awareness blitz for ${stat.name} ahead of ${leadSpike} ${planningYear} to pre-empt recurring spikes.`;
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
    'Checkpoint priority months = top 3 months by total individual violations (not just record count).',
    'Seminar requirement = violation type with ≥4 cases across ≥2 years and ≥2 repeat months (each ≥2 cases).',
    'Awareness spike = monthly count ≥ max(1.5× average, average + 2) and ≥3 cases in that same month.'
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

  const { rows, meta } = useMemo(() => deriveRecommendations(records, planningYear), [records, planningYear]);
  const [expanded, setExpanded] = useState({
    Checkpoints: false,
    Seminar: false,
    Awareness: false
  });

  const toggleExpanded = (category) => {
    setExpanded((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const keyMonthList = Array.isArray(meta.keyMonths) ? meta.keyMonths.slice(0, 3) : [];

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

  const categoryMeta = {
    Checkpoints: {
      icon: MapPin,
      gradient: prefersDark ? 'from-blue-600/25 via-slate-950/60 to-slate-950' : 'from-blue-100 via-white to-white',
      chip: prefersDark ? 'bg-blue-400/20 text-blue-100' : 'bg-blue-100 text-blue-700'
    },
    Seminar: {
      icon: GraduationCap,
      gradient: prefersDark ? 'from-amber-500/25 via-slate-950/60 to-slate-950' : 'from-amber-100 via-white to-white',
      chip: prefersDark ? 'bg-amber-400/20 text-amber-100' : 'bg-amber-100 text-amber-700'
    },
    Awareness: {
      icon: Megaphone,
      gradient: prefersDark ? 'from-emerald-500/25 via-slate-950/60 to-slate-950' : 'from-emerald-100 via-white to-white',
      chip: prefersDark ? 'bg-emerald-400/20 text-emerald-100' : 'bg-emerald-100 text-emerald-700'
    }
  };

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
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{planningYear} Prescriptive Analytics</h1>
                <p className="text-sm text-slate-500 dark:text-slate-300">Clean, rule-based directives for LTO planners.</p>
              </div>
            </div>
            <div className={`${prefersDark ? 'bg-slate-900/80 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-200 text-slate-600'} text-xs rounded-2xl px-4 py-3 flex items-center gap-2`}>
              <Info className="w-4 h-4 shrink-0" />
              <span>
                Dataset evaluated: {meta.datasetSize} record{meta.datasetSize === 1 ? '' : 's'} · {meta.uniqueViolations} violation theme{meta.uniqueViolations === 1 ? '' : 's'}
              </span>
          </div>
        </div>
        </div>
      </header>

      <section className={`${prefersDark ? 'bg-slate-950/40' : 'bg-slate-50'} px-6 md:px-8 py-6 border-b ${prefersDark ? 'border-slate-900' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Historical Violation Overview</h3>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
            <TrendingUp className="w-4 h-4 text-rose-500" />
            <span className="text-rose-600 dark:text-rose-300 font-medium">
              Dominant violation: {meta.dominantViolation ?? meta.topMonths?.[0]?.topViolation ?? 'N/A'}
            </span>
          </div>
        </div>
        {meta.topMonths?.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {meta.topMonths.map((month) => (
              <div
                key={month.monthIndex}
                className={`${prefersDark ? 'bg-slate-950 border border-slate-900' : 'bg-white border border-slate-200'} rounded-2xl px-5 py-5 space-y-3 shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{month.monthName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300">Share {month.share.toFixed(1)}%</p>
              </div>
                  <span className={`${prefersDark ? 'bg-blue-500/20 text-blue-100 border border-blue-400/40' : 'bg-blue-50 text-blue-600 border border-blue-200'} px-3 py-1 rounded-full text-xs font-semibold`}>{month.totalViolations} cases</span>
              </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <p>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Peak year:</span> {month.peakYear ?? '—'} ({month.peakYearCount || 0} cases)
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Dominant violation:</span> {month.topViolation ?? 'General compliance'}
                  </p>
              </div>
            </div>
          ))}
        </div>
        ) : (
          <div className={`${prefersDark ? 'bg-slate-900/60 border border-slate-800 text-slate-300' : 'bg-white border border-slate-200 text-slate-600'} rounded-2xl px-4 py-6 text-sm`}>
            Insufficient historical data to visualise monthly trend.
          </div>
        )}
      </section>

      <section className="px-6 md:px-8 py-8">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-4">{planningYear} Prescriptive Actions</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {rows.map((row) => {
            const metaKey = row.category.startsWith('Awareness') ? 'Awareness' : row.category;
            const config = categoryMeta[metaKey] || categoryMeta.Checkpoints;
            const actions = row.recommendations.slice(0, 3).filter(Boolean);
            const basis = row.basis.slice(0, 3).filter(Boolean);
            const Icon = config.icon;
            return (
              <div key={row.category} className={`relative overflow-hidden rounded-3xl border ${prefersDark ? 'border-slate-800 bg-slate-950' : 'border-transparent'} shadow-xl`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`} />
                <div className="relative p-6 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`${config.chip} inline-flex items-center justify-center w-10 h-10 rounded-2xl`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{row.category.replace('Awareness Campaign', 'Awareness')}</span>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Focus {planningYear}</h4>
                      </div>
                    </div>
                    <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-300">PRIORITY {planningYear}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">What to do</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {actions.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
          </div>
                  <button
                     type="button"
                     onClick={() => toggleExpanded(row.category)}
                    className={`${prefersDark ? 'bg-slate-950/70 border border-slate-800 text-slate-300' : 'bg-white/80 border border-slate-100 text-slate-500'} rounded-xl px-3 py-2 text-[11px] flex items-center justify-between w-full transition-colors`}
                   >
                    <span className="font-medium">{expanded[row.category] ? 'Hide basis' : 'View basis'}</span>
                    {expanded[row.category] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {expanded[row.category] ? (
                    <div className={`${prefersDark ? 'bg-slate-950/70 border border-slate-800' : 'bg-white/80 border border-slate-100'} rounded-2xl p-4`}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Basis</p>
                      <ul className="mt-2 space-y-2 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {basis.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className={`${prefersDark ? 'text-blue-200' : 'text-blue-500'}`}>•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
          </div>
                  ) : null}
          </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}

