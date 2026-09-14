import { differenceInCalendarDays } from 'date-fns';
import { Activity, FolderOpen, Zap } from 'lucide-react';

import type { DashboardStat, OrgSyncLog } from './types';

import type { DashboardSummary } from '@/api/dashboard';
import {
  buildRecentCreationTrend,
  buildRecentRecordsTrend,
} from '@/features/metrics/metricsData';
import type { Job, Project } from '@/types';

export type ActivityStatus =
  'success' | 'warning' | 'failed' | 'running' | 'stopped' | 'info';

export type ActivityGroup =
  'Today' | 'Yesterday' | 'Earlier this week' | 'Earlier';

export function getActivityStatus(log: OrgSyncLog): ActivityStatus {
  switch (log.metadata?.status) {
    case 'success':
      return 'success';
    case 'partial':
      return 'warning';
    case 'failed':
      return 'failed';
    case 'running':
      return 'running';
    case 'cancelled':
    case 'time_limit_reached':
    case 'limit_reached':
      return 'stopped';
    default:
      break;
  }

  if (log.level === 'success') return 'success';
  if (log.level === 'warn') return 'warning';
  if (log.level === 'error') return 'failed';
  return 'info';
}

export function getActivityTitle(status: ActivityStatus): string {
  const titles: Record<ActivityStatus, string> = {
    success: 'Sync completed',
    warning: 'Sync completed with warnings',
    failed: 'Sync failed',
    running: 'Sync running',
    stopped: 'Sync stopped early',
    info: 'Sync activity',
  };

  return titles[status];
}

export function getActivityGroup(
  createdAt?: string,
  now = new Date(),
): ActivityGroup {
  if (!createdAt) return 'Earlier';

  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) return 'Earlier';

  const dayDifference = differenceInCalendarDays(now, createdDate);
  if (dayDifference <= 0) return 'Today';
  if (dayDifference === 1) return 'Yesterday';
  if (dayDifference <= 7) return 'Earlier this week';
  return 'Earlier';
}

export function shortenActivityMessage(
  message?: string,
  maxLength = 88,
): string {
  const normalized = message?.trim() ?? '';
  if (normalized.length <= maxLength) return normalized;

  const shortened = normalized.slice(0, maxLength - 1);
  const lastSpace = shortened.lastIndexOf(' ');
  const cutAt = lastSpace > maxLength * 0.6 ? lastSpace : shortened.length;
  return `${shortened.slice(0, cutAt).trimEnd()}…`;
}

function formatNum(n: number | undefined | null): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function computeDashboardStats({
  summary,
  projects,
  jobs,
  logs,
  now = new Date(),
}: {
  summary: DashboardSummary;
  projects?: Project[];
  jobs: Job[];
  logs: OrgSyncLog[];
  now?: Date;
}): DashboardStat[] {
  const enabledJobs = jobs.filter((job) => job.isEnabled === true);
  const projectTrend = buildRecentCreationTrend(projects, now);
  const activeJobTrend = buildRecentCreationTrend(enabledJobs, now);
  const recordsTrend = buildRecentRecordsTrend(logs, now);
  const projectCreations = sumTrend(projectTrend);
  const activeJobCreations = sumTrend(activeJobTrend);
  const syncedRecords = sumTrend(recordsTrend);

  return [
    {
      id: 'projects',
      label: 'Total Projects',
      value: summary.totalProjects,
      sublabel: `${summary.activeProjects} active`,
      icon: FolderOpen,
      iconClassName: 'text-primary',
      iconBgClassName: 'bg-primary/10',
      href: '/projects',
      chartData: projectTrend,
      chartColor: 'var(--primary)',
      chartLabel: 'Projects created · 7d',
      chartSummary:
        projectCreations === undefined
          ? undefined
          : `${projectCreations.toLocaleString()} ${projectCreations === 1 ? 'project' : 'projects'} created · 7d`,
    },
    {
      id: 'active-jobs',
      label: 'Active Sync Jobs',
      value: summary.enabledJobs,
      sublabel: `${summary.totalJobs} total jobs`,
      icon: Zap,
      iconClassName: 'text-primary',
      iconBgClassName: 'bg-primary/10',
      href: '/jobs',
      chartData: activeJobTrend,
      chartColor: 'var(--primary)',
      chartLabel: 'Active jobs created · 7d',
      chartSummary:
        activeJobCreations === undefined
          ? undefined
          : `${activeJobCreations.toLocaleString()} active ${activeJobCreations === 1 ? 'job' : 'jobs'} created · 7d`,
    },
    {
      id: 'records-synced',
      label: 'Records Synced',
      value: formatNum(summary.totalRecordsSynced),
      sublabel: 'All time',
      icon: Activity,
      iconClassName: 'text-primary',
      iconBgClassName: 'bg-primary/10',
      href: '/logs',
      chartData: recordsTrend,
      chartColor: 'var(--primary)',
      chartLabel: 'Records synced · 7d',
      chartSummary:
        syncedRecords === undefined
          ? undefined
          : `${syncedRecords.toLocaleString()} ${syncedRecords === 1 ? 'record' : 'records'} synced · 7d`,
    },
  ];
}

function sumTrend(points: DashboardStat['chartData']): number | undefined {
  if (!points) return undefined;
  return points.reduce((total, point) => total + point.value, 0);
}
