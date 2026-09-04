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
}: {
  summary: DashboardSummary;
  projects?: Project[];
  jobs: Job[];
  logs: OrgSyncLog[];
}): DashboardStat[] {
  const enabledJobs = jobs.filter((job) => job.isEnabled === true);

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
      chartData: buildRecentCreationTrend(projects),
      chartColor: 'var(--primary)',
      chartLabel: 'Projects created (last 7 days)',
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
      chartData: buildRecentCreationTrend(enabledJobs),
      chartColor: 'var(--primary)',
      chartLabel: 'Active jobs created (last 7 days)',
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
      chartData: buildRecentRecordsTrend(logs),
      chartColor: 'var(--primary)',
      chartLabel: 'Records synced (last 7 days)',
    },
  ];
}
