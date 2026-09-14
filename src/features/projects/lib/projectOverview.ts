import type { JobExt, ProjectExt } from '@/features/projects/hooks';

export interface ProjectOverviewMetrics {
  totalRecordsSynced: number;
  totalErrors: number;
  lastSyncedAt: string | null;
}

export function getUpcomingScheduledJobs(
  jobs: JobExt[],
  now = new Date(),
): JobExt[] {
  const nowMs = now.getTime();

  return jobs
    .filter((job) => {
      if (!job.isEnabled || job.isSchedulePaused || !job.nextRunAt)
        return false;
      const nextRunMs = new Date(job.nextRunAt).getTime();
      return Number.isFinite(nextRunMs) && nextRunMs > nowMs;
    })
    .sort(
      (a, b) =>
        new Date(a.nextRunAt!).getTime() - new Date(b.nextRunAt!).getTime(),
    )
    .slice(0, 4);
}

function sumJobMetric(
  jobs: JobExt[],
  readValue: (job: JobExt) => number | null | undefined,
): number {
  return jobs.reduce((total, job) => total + (readValue(job) ?? 0), 0);
}

function latestValidTimestamp(values: Array<string | null | undefined>) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ value, timestamp: new Date(value).getTime() }))
    .filter(({ timestamp }) => Number.isFinite(timestamp));

  if (timestamps.length === 0) return null;
  return timestamps.reduce((latest, candidate) =>
    candidate.timestamp > latest.timestamp ? candidate : latest,
  ).value;
}

export function getProjectOverviewMetrics(
  project: ProjectExt,
  jobs: JobExt[],
): ProjectOverviewMetrics {
  return {
    totalRecordsSynced:
      project.totalRecordsSynced ??
      sumJobMetric(jobs, (job) => job.recordsSynced),
    totalErrors:
      project.totalErrorCount ?? sumJobMetric(jobs, (job) => job.errorCount),
    lastSyncedAt: latestValidTimestamp([
      project.lastSyncedAt,
      ...jobs.map((job) => job.lastSyncedAt),
    ]),
  };
}
