import { z } from 'zod';

export const createProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Project name must be at least 2 characters.')
      .max(100, 'Project name cannot exceed 100 characters.'),

    description: z
      .string()
      .max(500, 'Description cannot exceed 500 characters.')
      .optional()
      .or(z.literal('')),

    sourcePlatformId: z.string().min(1, 'Please select a source platform.'),

    destPlatformId: z.string().min(1, 'Please select a destination platform.'),

    // Project-level gate: chosen once here, immutable afterwards. Required in
    // the direct create-project form (the DTO keeps it optional so Marketplace
    // projects can be seeded without it and set it later).
    syncMode: z.enum(['one_way', 'two_way'], {
      message: 'Please choose a sync mode.',
    }),
  })
  .refine((values) => values.sourcePlatformId !== values.destPlatformId, {
    path: ['destPlatformId'],
    message: 'Source and destination platforms must be different.',
  });

import type { JobExt } from './hooks/useProjectDetail';
import type { ProjectExtended, ProjectFiltersState } from './types';

import type { Job } from '@/types';

/** Whether a project is still going through the guided setup wizard. */
export function isDraftProject(project: ProjectExtended): boolean {
  // Driven by the guided-setup ratchet, not project.status — a project can
  // be manually flipped to "active" status while setup is still incomplete.
  return !project.setupCompletedAt;
}

/** Compact number formatting, e.g. 1500 -> "1.5k". */
export function formatNum(n: number | undefined | null): number | string {
  if (!n) return 0;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n;
}

/** Applies search / status / environment filters to a project list. */
export function filterProjects(
  projects: ProjectExtended[],
  filters: ProjectFiltersState,
): ProjectExtended[] {
  const search = filters.search.trim().toLowerCase();

  return projects.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search);
    const matchStatus = filters.status === 'all' || p.status === filters.status;
    const matchEnvironment =
      filters.environment === 'all' ||
      p.activeEnvironment === filters.environment;
    return matchSearch && matchStatus && matchEnvironment;
  });
}

const SCHEDULE_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Human-readable summary of a job's schedule config, e.g. "Every 15 min" / "Daily at 9:00". */
export function formatSchedule(job: JobExt): string {
  if (job.scheduleMode === 'interval') {
    const m = job.intervalMinutes || 15;
    if (m >= 60 && m % 60 === 0) return `Every ${m / 60}h`;
    return `Every ${m} min`;
  }
  if (job.scheduleMode === 'daily_time') {
    const t = (job.scheduleTimes || ['09:00'])[0];
    return `Daily at ${t}`;
  }
  if (job.scheduleMode === 'day_specific') {
    const t = (job.scheduleTimes || ['09:00'])[0];
    const days = (job.scheduleDays || [])
      .map((d: number) => SCHEDULE_DAY_LABELS[d])
      .join(',');
    return `${days || '?'} at ${t}`;
  }
  if (job.cronExpression) return job.cronExpression;
  return 'No schedule';
}

/** Builds a projectId -> job count lookup so child components never need to fetch or filter jobs themselves. */
export function buildJobCountsByProject(jobs: Job[]): Record<string, number> {
  return jobs.reduce<Record<string, number>>((acc, job) => {
    acc[job.projectId] = (acc[job.projectId] ?? 0) + 1;
    return acc;
  }, {});
}
