import type { DashboardMetricsPeriod } from '@/api/dashboard';
import type { OrgSyncLog } from '@/features/dashboard/types';

export interface DailyMetricPoint {
  date: string;
  value: number;
}

export const METRICS_PERIOD_LABELS: Record<DashboardMetricsPeriod, string> = {
  daily: 'Today',
  weekly: 'Last 7 Days',
  monthly: 'Last 30 Days',
  yearly: 'Last 12 Months',
  custom: 'Custom Range',
};

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
  period: DashboardMetricsPeriod,
  now = new Date(),
): string {
  const start = utcDay(now);

  if (period === 'weekly') {
    start.setUTCDate(start.getUTCDate() - 6);
  } else if (period === 'monthly') {
    start.setUTCDate(start.getUTCDate() - 29);
  } else if (period === 'yearly') {
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - 11);
  }

  return start.toISOString();
}

export function unwrapOrganizationLogs(value: unknown): OrgSyncLog[] {
  if (Array.isArray(value)) return value as OrgSyncLog[];
  if (!value || typeof value !== 'object') return [];

  const data = (value as { data?: unknown }).data;
  return Array.isArray(data) ? (data as OrgSyncLog[]) : [];
}
