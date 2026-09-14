import { describe, expect, it } from 'vitest';

import {
  getProjectOverviewMetrics,
  getUpcomingScheduledJobs,
} from './projectOverview';

import type { JobExt, ProjectExt } from '@/features/projects/hooks';

const baseProject = {
  id: 'project-1',
  name: 'Customer sync',
  organisationId: 'org-1',
  sourcePlatformId: 'servicetitan',
  destPlatformId: 'hubspot',
  status: 'active',
} as ProjectExt;

function job(id: string, overrides: Partial<JobExt> = {}): JobExt {
  return {
    id,
    projectId: baseProject.id,
    name: `Job ${id}`,
    sourceObject: 'customers',
    destObject: 'contacts',
    status: 'active',
    ...overrides,
  };
}

describe('getProjectOverviewMetrics', () => {
  it('uses project totals as the authoritative lifetime values, including zero', () => {
    const metrics = getProjectOverviewMetrics(
      { ...baseProject, totalRecordsSynced: 0, totalErrorCount: 0 },
      [job('1', { recordsSynced: 25, errorCount: 3 })],
    );

    expect(metrics.totalRecordsSynced).toBe(0);
    expect(metrics.totalErrors).toBe(0);
  });

  it('falls back to job totals and uses the latest valid sync timestamp', () => {
    const metrics = getProjectOverviewMetrics(baseProject, [
      job('1', {
        recordsSynced: 25,
        errorCount: 1,
        lastSyncedAt: '2026-09-04T10:00:00.000Z',
      }),
      job('2', {
        recordsSynced: 75,
        errorCount: 2,
        lastSyncedAt: '2026-09-05T10:00:00.000Z',
      }),
    ]);

    expect(metrics).toEqual({
      totalRecordsSynced: 100,
      totalErrors: 3,
      lastSyncedAt: '2026-09-05T10:00:00.000Z',
    });
  });
});

describe('getUpcomingScheduledJobs', () => {
  it('returns the next four enabled future runs in chronological order', () => {
    const now = new Date('2026-09-05T10:00:00.000Z');
    const jobs = [
      job('late', {
        isEnabled: true,
        nextRunAt: '2026-09-05T14:00:00.000Z',
      }),
      job('paused', {
        isEnabled: true,
        isSchedulePaused: true,
        nextRunAt: '2026-09-05T10:30:00.000Z',
      }),
      job('past', {
        isEnabled: true,
        nextRunAt: '2026-09-05T09:00:00.000Z',
      }),
      ...[1, 2, 3, 4, 5].map((hour) =>
        job(`future-${hour}`, {
          isEnabled: true,
          nextRunAt: `2026-09-05T${10 + hour}:00:00.000Z`,
        }),
      ),
    ];

    expect(getUpcomingScheduledJobs(jobs, now).map(({ id }) => id)).toEqual([
      'future-1',
      'future-2',
      'future-3',
      'late',
    ]);
  });
});
