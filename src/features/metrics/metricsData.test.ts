import { describe, expect, it } from 'vitest';

import {
  buildRecentCreationTrend,
  buildRecentRecordsTrend,
  buildRecordsPerJobData,
  buildSyncActivity,
  getMetricsPeriodStart,
  unwrapOrganizationLogs,
} from './metricsData';

import type { OrgSyncLog } from '@/features/dashboard/types';
import type { Job } from '@/types';

describe('metrics data', () => {
  it('builds records per job from the selected period logs', () => {
    const jobs = [
      { id: '1', name: 'Contacts' },
      { id: '2', name: 'Companies' },
    ] as Job[];
    const logs = [
      { jobId: '1', recordsProcessed: 12 },
      { jobId: '2', recordsProcessed: 30 },
      { jobId: '2', recordsProcessed: 12 },
    ] as OrgSyncLog[];

    expect(buildRecordsPerJobData(jobs, logs, 2)).toEqual([
      { name: 'Companies', records: 42 },
      { name: 'Contacts', records: 12 },
    ]);
  });

  it('builds a weekly activity series including days with no runs', () => {
    const now = new Date('2026-09-05T12:00:00.000Z');
    const logs = [
      { createdAt: '2026-08-30T08:00:00.000Z' },
      { createdAt: '2026-09-05T08:00:00.000Z', recordsProcessed: 10 },
      { createdAt: '2026-09-05T09:00:00.000Z', recordsProcessed: 15 },
    ] as OrgSyncLog[];

    const points = buildSyncActivity(logs, 'weekly', now);

    expect(points).toHaveLength(7);
    expect(points[0]).toEqual({
      date: '2026-08-30',
      label: 'Aug 30',
      runs: 1,
      records: 0,
    });
    expect(points[1]?.runs).toBe(0);
    expect(points[6]?.runs).toBe(2);
    expect(points[6]?.records).toBe(25);
  });

  it('builds daily activity by hour and yearly activity by month', () => {
    const now = new Date('2026-09-05T12:00:00.000Z');
    const logs = [
      { createdAt: '2026-09-05T08:30:00.000Z', recordsProcessed: 10 },
      { createdAt: '2025-10-20T09:00:00.000Z', recordsProcessed: 20 },
    ] as OrgSyncLog[];

    const daily = buildSyncActivity(logs, 'daily', now);
    const yearly = buildSyncActivity(logs, 'yearly', now);

    expect(daily).toHaveLength(24);
    expect(daily[8]).toMatchObject({ label: '08:00', runs: 1, records: 10 });
    expect(yearly).toHaveLength(12);
    expect(yearly[0]).toMatchObject({
      label: 'Oct 2025',
      runs: 1,
      records: 20,
    });
  });

  it('returns the correct start for each metrics period', () => {
    const now = new Date('2026-09-05T12:00:00.000Z');

    expect(getMetricsPeriodStart('daily', now)).toBe(
      '2026-09-05T00:00:00.000Z',
    );
    expect(getMetricsPeriodStart('weekly', now)).toBe(
      '2026-08-30T00:00:00.000Z',
    );
    expect(getMetricsPeriodStart('monthly', now)).toBe(
      '2026-09-01T00:00:00.000Z',
    );
    expect(getMetricsPeriodStart('yearly', now)).toBe(
      '2025-10-01T00:00:00.000Z',
    );
  });

  it('builds monthly activity from the first day through today', () => {
    const now = new Date('2026-09-05T12:00:00.000Z');
    const logs = [
      { createdAt: '2026-09-01T08:00:00.000Z', recordsProcessed: 10 },
      { createdAt: '2026-09-05T09:00:00.000Z', recordsProcessed: 15 },
    ] as OrgSyncLog[];

    const points = buildSyncActivity(logs, 'monthly', now);

    expect(points).toHaveLength(5);
    expect(points[0]).toMatchObject({ label: 'Sep 1', runs: 1, records: 10 });
    expect(points[4]).toMatchObject({ label: 'Sep 5', runs: 1, records: 15 });
  });

  it('unwraps the sync-log API envelope', () => {
    const logs = [{ id: 'log-1' }] as OrgSyncLog[];

    expect(unwrapOrganizationLogs({ data: logs })).toEqual(logs);
    expect(unwrapOrganizationLogs(logs)).toEqual(logs);
    expect(unwrapOrganizationLogs(null)).toEqual([]);
  });

  it('builds a seven-day creation trend from real timestamps', () => {
    const now = new Date('2026-09-05T12:00:00.000Z');
    const points = buildRecentCreationTrend(
      [
        { createdAt: '2026-08-30T08:00:00.000Z' },
        { createdAt: '2026-09-05T09:00:00.000Z' },
      ],
      now,
    );

    expect(points).toHaveLength(7);
    expect(points?.[0]).toEqual({ date: '2026-08-30', value: 1 });
    expect(points?.[6]).toEqual({ date: '2026-09-05', value: 1 });
  });

  it('builds records trends without inventing missing timestamp data', () => {
    const now = new Date('2026-09-05T12:00:00.000Z');
    const points = buildRecentRecordsTrend(
      [
        { createdAt: '2026-09-05T08:00:00.000Z', recordsProcessed: 10 },
        { createdAt: '2026-09-05T09:00:00.000Z', recordsProcessed: 15 },
      ],
      now,
    );

    expect(points?.[6]).toEqual({ date: '2026-09-05', value: 25 });
    expect(
      buildRecentRecordsTrend([{ recordsProcessed: 25 }], now),
    ).toBeUndefined();
  });
});
