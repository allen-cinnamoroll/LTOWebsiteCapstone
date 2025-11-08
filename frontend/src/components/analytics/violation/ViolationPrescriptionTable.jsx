import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Info, Calendar, Shield, Target } from 'lucide-react';
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

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

const PRIORITY_SCALE = [
  { threshold: 14, label: 'Critical', tone: 'red', note: 'Deploy saturation checkpoints, inter-agency coordination, real-time reporting.' },
  { threshold: 9, label: 'High', tone: 'amber', note: 'Reinforce operations, stage targeted IEC, extend checkpoint hours.' },
  { threshold: 5, label: 'Elevated', tone: 'blue', note: 'Maintain routine visibility with periodic spot operations.' },
  { threshold: 0, label: 'Monitor', tone: 'slate', note: 'Retain baseline enforcement posture.' }
];

const palette = {
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  slate: 'bg-slate-400'
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

const priorityForShare = (share) => {
  const band = PRIORITY_SCALE.find((step) => share >= step.threshold) ?? PRIORITY_SCALE.at(-1);
  return band;
};

const consolidateActions = (name) => {
  const upper = name?.toUpperCase() || '';
  const lower = name?.toLowerCase() || '';

  if (upper.includes('LICENSE') || upper.includes('1A')) {
    return 'Deploy document-verification checkpoints with LTMS lookup and schedule mobile licensing caravans.';
  }

  if (upper.includes('DUI') || upper.includes('INFLUENCE') || lower.includes('alcohol') || lower.includes('drug')) {
    return 'Extend night sobriety checkpoints, partner with PNP for random testing, and broadcast anti-DUI advisories.';
  }

  if (upper.includes('RECKLESS') || upper.includes('OVERSPEED')) {
    return 'Install portable speed cameras, mandate defensive driving refreshers, and suspend repeat offenders swiftly.';
  }

  if (upper.includes('HELMET') || upper.includes('1H')) {
    return 'Execute ICC helmet inspections, collaborate with rider clubs, and subsidise compliant gear purchases.';
  }

  if (upper.includes('PARKING') || upper.includes('1J1')) {
    return 'Operate tow-away zones near choke points and enforce pay-parking within critical corridors.';
  }

  return 'Maintain targeted enforcement and continue coordination with LGUs for sustained compliance.';
};

const buildSummary = (monthIndex, bucket, total) => {
  const share = total > 0 ? (bucket.total / total) * 100 : 0;
  const priority = priorityForShare(share);

  const peak = Array.from(bucket.yearCounts.entries()).reduce(
    (best, [year, count]) => (count > best.count ? { year, count } : best),
    { year: '—', count: 0 }
  );

  const topViolation = Array.from(bucket.violationCounts.entries()).sort((a, b) => b[1] - a[1])[0];

  return {
    month: monthIndex + 1,
    monthName: MONTH_NAMES[monthIndex],
    monthShort: MONTH_SHORT[monthIndex],
    total: bucket.total,
    share,
    priority,
    peakYear: peak.year,
    topViolation: topViolation?.[0] ?? 'General compliance',
    action: consolidateActions(topViolation?.[0])
  };
};

export function ViolationPrescriptionTable({ loading }) {
  const { theme } = useTheme();
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [historicalLoading, setHistoricalLoading] = useState(true);
  const [historicalError, setHistoricalError] = useState(null);
  const [records, setRecords] = useState([]);

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

  const summaries = useMemo(() => {
    if (!records.length) return [];

    const buckets = MONTH_NAMES.map(() => ({
      total: 0,
      yearCounts: new Map(),
      violationCounts: new Map()
    }));

    records.forEach((record) => {
      if (!record?.dateOfApprehension) return;
      const date = new Date(record.dateOfApprehension);
      if (Number.isNaN(date.getTime())) return;

      const monthIndex = date.getMonth();
      const year = date.getFullYear();
      const bucket = buckets[monthIndex];

      bucket.total += 1;
      bucket.yearCounts.set(year, (bucket.yearCounts.get(year) || 0) + 1);

      parseViolations(record).forEach((violation) => {
        const label = violation.trim();
        if (!label) return;
        bucket.violationCounts.set(label, (bucket.violationCounts.get(label) || 0) + 1);
      });
    });

    const total = buckets.reduce((sum, bucket) => sum + bucket.total, 0);
    if (total === 0) return [];

    return buckets.map((bucket, index) => buildSummary(index, bucket, total));
  }, [records]);

  const busy = loading || historicalLoading;
  const planningYear = 2026;

  if (busy) {
    return (
      <div className={`${dark ? 'bg-gray-950/60 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl shadow-xl p-8 mb-8 animate-pulse space-y-6`}>
        <div className="h-6 w-64 bg-gray-300 dark:bg-gray-700 rounded"></div>
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
      </div>
    );
  }

  if (historicalError) {
    return (
      <div className={`${dark ? 'bg-gray-950/60 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-700'} border rounded-2xl shadow-md p-6 mb-8 text-sm`}>{historicalError}</div>
    );
  }

  if (!summaries.some((summary) => summary.total > 0)) {
    return (
      <div className={`${dark ? 'bg-gray-950/60 border-gray-800 text-gray-300' : 'bg-white border-gray-200 text-gray-600'} border rounded-2xl shadow-xl p-8 mb-8 text-center text-sm`}>
        No historical violation records were found.
      </div>
    );
  }

  const ordered = [...summaries].sort((a, b) => b.share - a.share);
  const topFive = ordered.slice(0, 5);
  const priorityMonths = ordered.filter(({ priority }) => ['Critical', 'High'].includes(priority.label)).map((summary) => summary.monthShort);

  return (
    <div className={`${dark ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl shadow-[0_30px_60px_-35px_rgba(15,23,42,0.55)] mb-8 overflow-hidden`}>
      <header className={`${dark ? 'bg-slate-950 border-b border-gray-800' : 'bg-blue-900 border-b border-blue-900'} px-6 py-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/10 border border-white/20">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">2026 Checkpoint Prescription</h2>
            <p className="text-xs text-blue-100/80">Historical violation density · months ranked by recurring exposure</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-blue-100/80">
          <Info className="w-4 h-4" />
          Focus on Critical/High months. Recommendations are calibrated for {planningYear} deployment.
        </div>
      </header>

      <section className={`${dark ? 'bg-slate-900/40 border-b border-gray-800' : 'bg-slate-50 border-b border-gray-200'} px-6 py-5`}>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Top months by historical exposure</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {topFive.map((month) => (
            <div key={month.month} className={`${dark ? 'bg-gray-950/80 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg shadow-sm p-3 space-y-2`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{month.monthShort}</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">{month.share.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${palette[month.priority.tone] || palette.slate}`}></span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{month.priority.label}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                <strong>{month.topViolation}</strong>
                <div>{consolidateActions(month.action)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Deployment notes</h3>
        <div className={`rounded-xl border ${dark ? 'border-gray-800 bg-gray-950/70' : 'border-gray-200 bg-white/90'} p-4 space-y-3 text-[11px] leading-relaxed`}>
          <div className="flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-blue-500 mt-0.5" />
            <span>
              <strong>Priority coverage:</strong> {priorityMonths.length ? priorityMonths.join(' · ') : 'No months exceeded the High threshold this cycle.'}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
            <span>
              <strong>Scheduling:</strong> Stage checkpoints two weeks ahead of each priority month, ensuring manpower and breathalysers/speed guns align with the dominant violations.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Target className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
            <span>
              <strong>IEC support:</strong> Partner with LGUs for barangay briefings tailored to the highlighted violation themes (licensing, DUI, helmets, etc.).
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

