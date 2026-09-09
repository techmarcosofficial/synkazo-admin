import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getProjectScheduleSummary,
  isScheduleActive,
  isSchedulePaused,
} from './scheduleSummary';

import type { Job, PriorityQueueConfig } from '@/types';

const baseJob: Job = {
  id: 'job-1',
  projectId: 'project-1',
  name: 'Customers',
  sourceObject: 'customers',
  destObject: 'contacts',
  status: 'active',
  syncDirection: 'one_way',
  syncEnabled: true,
  scheduleState: 'active',
  timezone: 'America/New_York',
  nextRunAt: '2026-09-08T13:00:00.000Z',
};

const baseConfig: PriorityQueueConfig = {
  schedulerMode: 'individual',
  queue: null,
  queueJobs: [],
  associationQueueItems: [],
  activeCycle: null,
  currentExecution: null,
  currentQueueJob: null,
  nextQueueJob: null,
  displayStatus: 'idle',
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-08T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('project schedule summary', () => {
  it('summarizes independent schedules without counting two-way polling jobs', () => {
    const jobs: Job[] = [
      baseJob,
      {
        ...baseJob,
        id: 'job-2',
        name: 'Locations',
        scheduleState: 'paused',
        timezone: 'America/Chicago',
        nextRunAt: '2026-09-08T12:30:00.000Z',
      },
      {
        ...baseJob,
        id: 'job-3',
        name: 'Webhooks',
        syncDirection: 'two_way',
      },
    ];

    expect(isScheduleActive(jobs[0])).toBe(true);
    expect(isSchedulePaused(jobs[1])).toBe(true);
    expect(getProjectScheduleSummary(jobs, baseConfig)).toEqual({
      jobCount: 3,
      enabledCount: 1,
      pausedCount: 1,
      modeLabel: 'Independent',
      timezoneLabel: '2 timezones',
      nextRunAt: '2026-09-08T13:00:00.000Z',
    });
  });

  it('uses only real queue timezone and next-start values in priority mode', () => {
    const config: PriorityQueueConfig = {
      ...baseConfig,
      schedulerMode: 'priority',
      queue: {
        id: 'queue-1',
        projectId: 'project-1',
        status: 'idle',
        timezone: 'Asia/Kolkata',
        nextStartAt: '2026-09-08T14:00:00.000Z',
        associationQueueEnabled: true,
        associationDelayMinutes: 0,
        companyOwnerSyncEnabled: false,
      },
    };

    expect(getProjectScheduleSummary([baseJob], config)).toMatchObject({
      modeLabel: 'Priority queue',
      timezoneLabel: 'Asia/Kolkata',
      nextRunAt: '2026-09-08T14:00:00.000Z',
    });
  });
});
