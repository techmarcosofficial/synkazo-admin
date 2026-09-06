import { describe, expect, it } from 'vitest';

import { getNextRunCardState, hasScheduleDefinition } from './ScheduleTab';

describe('Sync & Schedule summary cards', () => {
  it('does not invent a schedule when required schedule values are missing', () => {
    expect(
      hasScheduleDefinition({
        scheduleMode: 'daily_time',
        scheduleTimes: null,
      }),
    ).toBe(false);
    expect(
      getNextRunCardState({
        scheduleConfigured: false,
        schedulePaused: false,
        nextRunAt: null,
        timezone: 'UTC',
      }),
    ).toEqual({ value: '—', description: 'Configure a schedule' });
    expect(
      hasScheduleDefinition({
        scheduleMode: 'one_time',
        oneTimeAt: '2026-09-07T09:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('hides stale next-run data while a configured schedule is paused', () => {
    expect(
      getNextRunCardState({
        scheduleConfigured: true,
        schedulePaused: true,
        nextRunAt: '2026-09-07T09:00:00.000Z',
        timezone: 'UTC',
      }),
    ).toEqual({
      value: 'Not scheduled',
      description: 'Schedule is paused',
    });
  });

  it('shows the real next execution for an active schedule', () => {
    const result = getNextRunCardState({
      scheduleConfigured: true,
      schedulePaused: false,
      nextRunAt: '2026-09-07T09:00:00.000Z',
      timezone: 'UTC',
    });

    expect(result.value).not.toBe('Not scheduled');
    expect(result.description).toBe('Next scheduled run');
  });
});
