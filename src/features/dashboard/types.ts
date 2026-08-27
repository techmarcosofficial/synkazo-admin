import type { LucideIcon } from 'lucide-react';

export interface KpiTrend {
  /** e.g. "12.5%" — already formatted, sign is conveyed by `positive` */
  value: string;
  positive: boolean;
  label: string; // e.g. "vs last 7 days"
}

export interface KpiSparklinePoint {
  date: string; // ISO date string, e.g. "2026-07-01"
  value: number;
}

export interface KpiSecondaryStat {
  label: string;
  value: string | number;
  tone?: 'default' | 'success' | 'danger';
}

export interface DashboardStat {
  id: string;
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  iconClassName: string;
  iconBgClassName: string;
  trend?: KpiTrend;
  chartData?: KpiSparklinePoint[];
  chartColor?: string;
  /** Where the whole card navigates to when clicked. */
  href?: string;
  /** Compact extra numbers shown under the main value, e.g. success rate + error count. */
  secondaryStats?: KpiSecondaryStat[];
}

export interface DashboardStatsProject {
  id: string;
  status: string;
  totalRecordsSynced?: number;
}

export interface DashboardStatsJob {
  id: string;
  isRunning: boolean;
  status: string;
  errorCount?: number;
}

export interface OrgSyncLogMetadata {
  triggeredBy?: string;
  status?: 'success' | 'partial' | 'failed' | 'cancelled';
  jobName?: string;
  projectName?: string;
  sourceObject?: string;
  destObject?: string;
  sourcePlatformId?: string;
  destPlatformId?: string;
}

export interface OrgSyncLog {
  id?: string;
  level?: string;
  message?: string;
  createdAt?: string;
  jobId?: string;
  projectId?: string;
  jobRunId?: string;
  recordsProcessed?: number;
  durationMs?: number | null;
  metadata?: OrgSyncLogMetadata | null;
}
