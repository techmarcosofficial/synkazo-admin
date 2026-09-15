import { describe, expect, it } from 'vitest';

import {
  buildScheduleUpdatePayload,
  getNextRunCardState,
  hasScheduleDefinition,
} from './ScheduleTab';

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

describe('buildScheduleUpdatePayload', () => {
  it('does not leak daily values into an interval schedule update', () => {
    expect(
      buildScheduleUpdatePayload(
        {
          mode: 'interval',
          times: ['09:00'],
          days: [1, 2, 3, 4, 5],
          interval: { amount: 2, unit: 'hours' },
        },
        'Asia/Kolkata',
      ),
    ).toEqual({
      scheduleMode: 'interval',
      scheduleTimes: null,
      scheduleDays: null,
      intervalMinutes: 120,
      timezone: 'Asia/Kolkata',
      cronExpression: null,
    });
  });

  it('does not leak day-specific or interval values into a daily update', () => {
    expect(
      buildScheduleUpdatePayload(
        {
          mode: 'daily_time',
          times: ['08:00', '16:00'],
          days: [1, 3, 5],
          interval: { amount: 30, unit: 'minutes' },
        },
        'UTC',
      ),
    ).toEqual({
      scheduleMode: 'daily_time',
      scheduleTimes: ['08:00', '16:00'],
      scheduleDays: null,
      intervalMinutes: null,
      timezone: 'UTC',
      cronExpression: null,
    });
  });

  it('keeps only selected days for a day-specific update', () => {
    expect(
      buildScheduleUpdatePayload(
        {
          mode: 'day_specific',
          times: ['10:30'],
          days: [1, 4],
          interval: { amount: 1, unit: 'hours' },
        },
        'Europe/London',
      ),
    ).toEqual({
      scheduleMode: 'day_specific',
      scheduleTimes: ['10:30'],
      scheduleDays: [1, 4],
      intervalMinutes: null,
      timezone: 'Europe/London',
      cronExpression: null,
    });
  });
});
