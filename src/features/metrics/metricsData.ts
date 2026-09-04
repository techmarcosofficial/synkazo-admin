import type { OrgSyncLog } from '@/features/dashboard/types';
import type { Job } from '@/types';

export interface RecordsPerJobPoint {
  name: string;
  records: number;
}

export type MetricsPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface SyncActivityPoint {
  date: string;
  label: string;
  runs: number;
  records: number;
}

export interface DailyMetricPoint {
  date: string;
  value: number;
}

export const METRICS_PERIOD_LABELS: Record<MetricsPeriod, string> = {
  daily: 'Today',
  weekly: 'Last 7 Days',
  monthly: 'This Month',
  yearly: 'Last 12 Months',
};

const MONTHS = [
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
  'Dec',
] as const;

function utcDay(date: Date): Date {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createDailyMetricBuckets(
  days: number,
  now: Date,
): Map<string, DailyMetricPoint> {
  const end = utcDay(now);
  const points = new Map<string, DailyMetricPoint>();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - offset);
    points.set(dayKey(date), { date: dayKey(date), value: 0 });
  }

  return points;
}

export function buildRecentCreationTrend(
  items: Array<{ createdAt?: string }> | undefined,
  now = new Date(),
  days = 7,
): DailyMetricPoint[] | undefined {
  if (!items || days < 1) return undefined;

  const points = createDailyMetricBuckets(days, now);

  for (const item of items) {
    if (!item.createdAt) return undefined;
    const createdAt = new Date(item.createdAt);
    if (Number.isNaN(createdAt.getTime())) return undefined;

    const point = points.get(dayKey(createdAt));
    if (point) point.value += 1;
  }

  return Array.from(points.values());
}

export function buildRecentRecordsTrend(
  logs: OrgSyncLog[] | undefined,
  now = new Date(),
  days = 7,
): DailyMetricPoint[] | undefined {
  if (!logs || days < 1) return undefined;

  const points = createDailyMetricBuckets(days, now);

  for (const log of logs) {
    if (!log.createdAt) return undefined;
    const createdAt = new Date(log.createdAt);
    if (Number.isNaN(createdAt.getTime())) return undefined;

    const point = points.get(dayKey(createdAt));
    if (point) point.value += log.recordsProcessed ?? 0;
  }

  return Array.from(points.values());
}

export function getMetricsPeriodStart(
  period: MetricsPeriod,
  now = new Date(),
): string {
  const start = utcDay(now);

  if (period === 'weekly') {
    start.setUTCDate(start.getUTCDate() - 6);
  } else if (period === 'monthly') {
    start.setUTCDate(1);
  } else if (period === 'yearly') {
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - 11);
  }

  return start.toISOString();
}

export function buildRecordsPerJobData(
  jobs: Job[],
  logs: OrgSyncLog[],
  limit = 8,
): RecordsPerJobPoint[] {
  const jobNames = new Map(jobs.map((job) => [job.id, job.name]));
  const recordsByJob = new Map<string, RecordsPerJobPoint>();

  for (const log of logs) {
    const key = log.jobId ?? log.metadata?.jobName;
    const name =
      (log.jobId ? jobNames.get(log.jobId) : undefined) ??
      log.metadata?.jobName;
    if (!key || !name) continue;

    const current = recordsByJob.get(key) ?? { name, records: 0 };
    current.records += log.recordsProcessed ?? 0;
    recordsByJob.set(key, current);
  }

  return Array.from(recordsByJob.values())
    .filter((point) => point.records > 0)
    .sort((a, b) => b.records - a.records || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function hourlyActivity(now: Date): Map<string, SyncActivityPoint> {
  const day = utcDay(now);
  const points = new Map<string, SyncActivityPoint>();

  for (let hour = 0; hour < 24; hour += 1) {
    const date = new Date(day);
    date.setUTCHours(hour);
    const key = date.toISOString().slice(0, 13);
    points.set(key, {
      date: key,
      label: `${String(hour).padStart(2, '0')}:00`,
      runs: 0,
      records: 0,
    });
  }

  return points;
}

function weeklyActivity(now: Date): Map<string, SyncActivityPoint> {
  const end = utcDay(now);
  const points = new Map<string, SyncActivityPoint>();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - offset);
    points.set(dayKey(date), {
      date: dayKey(date),
      label: `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`,
      runs: 0,
      records: 0,
    });
  }

  return points;
}

function yearlyActivity(now: Date): Map<string, SyncActivityPoint> {
  const end = utcDay(now);
  end.setUTCDate(1);
  const points = new Map<string, SyncActivityPoint>();

  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setUTCMonth(end.getUTCMonth() - offset);
    const key = date.toISOString().slice(0, 7);
    points.set(key, {
      date: key,
      label: `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
      runs: 0,
      records: 0,
    });
  }

  return points;
}

function monthlyActivity(now: Date): Map<string, SyncActivityPoint> {
  const end = utcDay(now);
  const points = new Map<string, SyncActivityPoint>();

  for (let day = 1; day <= end.getUTCDate(); day += 1) {
    const date = new Date(end);
    date.setUTCDate(day);
    points.set(dayKey(date), {
      date: dayKey(date),
      label: `${MONTHS[date.getUTCMonth()]} ${day}`,
      runs: 0,
      records: 0,
    });
  }

  return points;
}

export function buildSyncActivity(
  logs: OrgSyncLog[],
  period: MetricsPeriod,
  now = new Date(),
): SyncActivityPoint[] {
  const points =
    period === 'daily'
      ? hourlyActivity(now)
      : period === 'weekly'
        ? weeklyActivity(now)
        : period === 'monthly'
          ? monthlyActivity(now)
          : yearlyActivity(now);

  for (const log of logs) {
    if (!log.createdAt) continue;
    const createdAt = new Date(log.createdAt);
    if (Number.isNaN(createdAt.getTime())) continue;

    const key =
      period === 'daily'
        ? createdAt.toISOString().slice(0, 13)
        : period === 'weekly' || period === 'monthly'
          ? dayKey(createdAt)
          : createdAt.toISOString().slice(0, 7);
    const point = points.get(key);
    if (point) {
      point.runs += 1;
      point.records += log.recordsProcessed ?? 0;
    }
  }

  return Array.from(points.values());
}

export function unwrapOrganizationLogs(value: unknown): OrgSyncLog[] {
  if (Array.isArray(value)) return value as OrgSyncLog[];
  if (!value || typeof value !== 'object') return [];

  const data = (value as { data?: unknown }).data;
  return Array.isArray(data) ? (data as OrgSyncLog[]) : [];
}
