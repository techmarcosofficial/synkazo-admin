import type { Job, SyncRun } from '@/types';

const IN_PROGRESS_STATUSES = new Set([
  'running',
  'pending',
  'queued',
  'paused',
]);

const SUCCESS_STATUSES = new Set(['success', 'completed']);

export interface SyncJobSummary {
  averageDurationMs: number | null;
  lastSyncAt: string | null;
  successRate: number | null;
}

export function deriveSyncJobSummary(
  job: Pick<Job, 'lastSyncedAt'>,
  runs: Array<
    Pick<SyncRun, 'durationMs' | 'finishedAt' | 'startedAt'> & {
      status: string;
    }
  >,
): SyncJobSummary {
  const finishedRuns = runs.filter(
    (run) => run.status && !IN_PROGRESS_STATUSES.has(run.status),
  );
  const durations = finishedRuns
    .map((run) => run.durationMs)
    .filter(
      (duration): duration is number =>
        typeof duration === 'number' && duration >= 0,
    );
  const latestRunAt = finishedRuns
    .map((run) => run.finishedAt ?? run.startedAt)
    .filter((date): date is string => Boolean(date))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return {
    averageDurationMs: durations.length
      ? durations.reduce((total, duration) => total + duration, 0) /
        durations.length
      : null,
    lastSyncAt: job.lastSyncedAt ?? latestRunAt ?? null,
    successRate: finishedRuns.length
      ? (finishedRuns.filter((run) => SUCCESS_STATUSES.has(run.status)).length /
          finishedRuns.length) *
        100
      : null,
  };
}

export function formatDurationMs(durationMs: number | null): string {
  if (durationMs == null) return '—';

  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatEntityLabel(value: string): string {
  if (/^\d+-\d+$/.test(value)) return value;

  const label = value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();

  return label || 'Unknown object';
}
