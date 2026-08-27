import { Activity, FolderOpen, Plug, Zap } from 'lucide-react';

import type {
  DashboardStat,
  DashboardStatsJob as Job,
  DashboardStatsProject as Project,
  KpiSparklinePoint,
  KpiTrend,
  OrgSyncLog,
} from './types';

import type { DashboardSummary } from '@/api/dashboard';

/** Formats large counts the same way the rest of the dashboard does. */
function formatNum(n: number | undefined | null): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/**
 * Builds a day-by-day sparkline from org sync logs, IF the logs carry enough
 * history to say anything. Returns undefined (not a fake flat array) when
 * there isn't enough data — the card then falls back to a quiet placeholder
 * instead of implying a trend that doesn't exist.
 *
 * `days` = how many buckets to build (7 = last 7 days).
 * `matcher` lets you count only logs relevant to a given stat, e.g. only
 * "error" level logs for the Failed Jobs card.
 */
export function buildSparklineFromLogs(
  logs: OrgSyncLog[],
  days: number,
  matcher: (log: OrgSyncLog) => boolean = () => true,
): KpiSparklinePoint[] | undefined {
  if (!logs || logs.length === 0) return undefined;

  const buckets = new Map<string, number>();
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  let matchedAny = false;
  for (const log of logs) {
    if (!log.createdAt || !matcher(log)) continue;
    const key = log.createdAt.slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
      matchedAny = true;
    }
  }

  // If nothing in the window actually matched, there's no real signal to
  // chart — let the caller fall back rather than draw a flat zero line.
  if (!matchedAny) return undefined;

  return Array.from(buckets.entries()).map(([date, value]) => ({
    date,
    value,
  }));
}

/**
 * Compares the last two halves of a sparkline to produce a trend. Returns
 * undefined if there isn't a real, non-zero baseline to compare against —
 * a "0% change" from "0 to 0" isn't a trend worth showing.
 */
export function trendFromSparkline(
  points: KpiSparklinePoint[] | undefined,
  label = 'vs last 7 days',
): KpiTrend | undefined {
  if (!points || points.length < 2) return undefined;

  const mid = Math.floor(points.length / 2);
  const firstHalf = points.slice(0, mid).reduce((s, p) => s + p.value, 0);
  const secondHalf = points.slice(mid).reduce((s, p) => s + p.value, 0);

  if (firstHalf === 0) return undefined; // can't compute a % change from zero

  const pctChange = ((secondHalf - firstHalf) / firstHalf) * 100;
  return {
    value: `${Math.abs(pctChange).toFixed(1)}%`,
    positive: pctChange >= 0,
    label,
  };
}

export function computeDashboardStats(input: {
  projects: Project[];
  jobs: Job[];
  logs: OrgSyncLog[];
  summary: DashboardSummary | null | undefined;
}): DashboardStat[] {
  const { projects, jobs, logs, summary } = input;

  const totalProjects = summary?.totalProjects ?? projects.length;
  const activeProjects =
    summary?.activeProjects ??
    projects.filter((p) => p.status === 'active').length;

  const totalConnections = summary?.totalConnections;
  const connectedConnections = summary?.connectedConnections;

  const totalJobs = summary?.totalJobs ?? jobs.length;
  const enabledJobs =
    summary?.enabledJobs ?? jobs.filter((j) => j.status === 'active').length;
  const runningJobs = jobs.filter((j) => j.isRunning).length;

  const totalRecordsSynced = summary?.totalRecordsSynced ?? 0;
  const totalErrors =
    summary?.totalErrors ??
    jobs.reduce((sum, j) => sum + (j.errorCount ?? 0), 0);

  // Success rate needs a denominator > 0, otherwise "100%" or "0%" would be
  // a fabricated number rather than a real measurement.
  const successDenominator = totalRecordsSynced + totalErrors;
  const successRate =
    successDenominator > 0
      ? ((totalRecordsSynced / successDenominator) * 100).toFixed(1) + '%'
      : undefined;

  const recordsSparkline = buildSparklineFromLogs(logs, 7, (l) =>
    (l.message ?? '').toLowerCase().includes('sync'),
  );

  return [
    {
      id: 'projects',
      label: 'Projects',
      value: totalProjects,
      sublabel: `${activeProjects} active`,
      icon: FolderOpen,
      iconClassName: 'text-violet-600',
      iconBgClassName: 'bg-violet-100/40',
      chartColor: 'oklch(0.55 0.2 290)',
      href: '/projects',
    },
    {
      id: 'connections',
      label: 'Connections',
      value: totalConnections ?? '—',
      sublabel:
        totalConnections != null
          ? `${connectedConnections ?? 0} connected`
          : 'not tracked yet',
      icon: Plug,
      iconClassName: 'text-emerald-600',
      iconBgClassName: 'bg-emerald-100/40',
      chartColor: 'oklch(0.6 0.15 160)',
      href: '/connections',
    },
    {
      id: 'active-jobs',
      label: 'Active Sync Jobs',
      value: enabledJobs,
      sublabel: `${totalJobs} total · ${runningJobs} running now`,
      icon: Zap,
      iconClassName: 'text-blue-600',
      iconBgClassName: 'bg-blue-100/40',
      chartColor: 'oklch(0.6 0.18 250)',
      href: '/jobs',
    },
    {
      id: 'records-synced',
      label: 'Records Synced',
      value: formatNum(totalRecordsSynced),
      sublabel: recordsSparkline ? undefined : 'all time',
      icon: Activity,
      iconClassName: 'text-orange-600',
      iconBgClassName: 'bg-orange-100/40',
      chartData: recordsSparkline,
      trend: trendFromSparkline(recordsSparkline),
      chartColor: 'oklch(0.65 0.18 60)',
      href: '/logs',
      secondaryStats: [
        { label: 'Success rate', value: successRate ?? '—', tone: 'success' },
        {
          label: 'Errors',
          value: totalErrors,
          tone: totalErrors > 0 ? 'danger' : 'default',
        },
      ],
    },
  ];
}
