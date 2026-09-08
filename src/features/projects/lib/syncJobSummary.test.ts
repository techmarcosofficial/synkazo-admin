import { describe, expect, it } from 'vitest';

import {
  deriveSyncJobSummary,
  formatDurationMs,
  formatEntityLabel,
} from './syncJobSummary';

describe('deriveSyncJobSummary', () => {
  it('does not count partial runs as successful', () => {
    const summary = deriveSyncJobSummary({ lastSyncedAt: null }, [
      { status: 'success', durationMs: 10_000 },
      { status: 'partial', durationMs: 20_000 },
    ]);

    expect(summary.successRate).toBe(50);
    expect(summary.averageDurationMs).toBe(15_000);
  });

  it('excludes unfinished runs and uses the latest run as a date fallback', () => {
    const summary = deriveSyncJobSummary({}, [
      {
        status: 'running',
        durationMs: 5_000,
        startedAt: '2026-09-05T10:00:00.000Z',
      },
      {
        status: 'completed',
        durationMs: 12_000,
        finishedAt: '2026-09-05T09:00:00.000Z',
      },
    ]);

    expect(summary.successRate).toBe(100);
    expect(summary.averageDurationMs).toBe(12_000);
    expect(summary.lastSyncAt).toBe('2026-09-05T09:00:00.000Z');
  });
});

describe('sync job summary formatting', () => {
  it('formats compact durations and readable entity names', () => {
    expect(formatDurationMs(117_000)).toBe('1m 57s');
    expect(formatEntityLabel('customer_contacts')).toBe('Customer Contacts');
    expect(formatEntityLabel('2-4214989')).toBe('2-4214989');
  });
});
