import { describe, expect, it } from 'vitest';

import {
  getActivityGroup,
  getActivityStatus,
  getActivityTitle,
  shortenActivityMessage,
} from './utils';

describe('dashboard activity utilities', () => {
  it('uses terminal metadata status before the log level', () => {
    expect(
      getActivityStatus({
        level: 'success',
        metadata: { status: 'partial' },
      }),
    ).toBe('warning');
    expect(
      getActivityStatus({
        level: 'error',
        metadata: { status: 'time_limit_reached' },
      }),
    ).toBe('stopped');
  });

  it('falls back to the log level when status metadata is unavailable', () => {
    expect(getActivityStatus({ level: 'success' })).toBe('success');
    expect(getActivityStatus({ level: 'warn' })).toBe('warning');
    expect(getActivityStatus({ level: 'error' })).toBe('failed');
    expect(getActivityStatus({ level: 'info' })).toBe('info');
  });

  it('uses event-first titles for every activity status', () => {
    expect(getActivityTitle('success')).toBe('Sync completed');
    expect(getActivityTitle('warning')).toBe('Sync completed with warnings');
    expect(getActivityTitle('failed')).toBe('Sync failed');
    expect(getActivityTitle('running')).toBe('Sync running');
    expect(getActivityTitle('stopped')).toBe('Sync stopped early');
  });

  it('groups activity into dashboard-friendly time ranges', () => {
    const now = new Date('2026-09-05T12:00:00.000Z');

    expect(getActivityGroup('2026-09-05T08:00:00.000Z', now)).toBe('Today');
    expect(getActivityGroup('2026-09-04T08:00:00.000Z', now)).toBe('Yesterday');
    expect(getActivityGroup('2026-09-01T08:00:00.000Z', now)).toBe(
      'Earlier this week',
    );
    expect(getActivityGroup('2026-08-20T08:00:00.000Z', now)).toBe('Earlier');
    expect(getActivityGroup('invalid', now)).toBe('Earlier');
  });

  it('shortens long messages at a word boundary', () => {
    expect(shortenActivityMessage('Authentication token expired', 40)).toBe(
      'Authentication token expired',
    );
    expect(
      shortenActivityMessage(
        'Authentication token expired while connecting to the destination',
        36,
      ),
    ).toBe('Authentication token expired while…');
  });
});
