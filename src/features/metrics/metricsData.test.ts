import { describe, expect, it } from 'vitest';

import {
  buildRecentCreationTrend,
  buildRecentRecordsTrend,
  getMetricsPeriodStart,
  unwrapOrganizationLogs,
} from './metricsData';

import type { OrgSyncLog } from '@/features/dashboard/types';

describe('metrics data', () => {
  const now = new Date('2026-09-05T12:00:00.000Z');

  it('uses rolling operational ranges for dashboard periods', () => {
    expect(getMetricsPeriodStart('daily', now)).toBe(
      '2026-09-05T00:00:00.000Z',
    );
    expect(getMetricsPeriodStart('weekly', now)).toBe(
      '2026-08-30T00:00:00.000Z',
    );
    expect(getMetricsPeriodStart('monthly', now)).toBe(
      '2026-08-07T00:00:00.000Z',
    );
    expect(getMetricsPeriodStart('yearly', now)).toBe(
      '2025-10-01T00:00:00.000Z',
    );
  });

  it('unwraps the sync-log API envelope', () => {
    const logs = [{ id: 'log-1' }] as OrgSyncLog[];

    expect(unwrapOrganizationLogs({ data: logs })).toEqual(logs);
    expect(unwrapOrganizationLogs(logs)).toEqual(logs);
    expect(unwrapOrganizationLogs(null)).toEqual([]);
  });

  it('builds a seven-day creation trend from real timestamps', () => {
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

  it('builds a seven-day records trend and rejects incomplete timestamps', () => {
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
