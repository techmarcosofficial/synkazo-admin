import type { Job, PriorityQueueConfig } from '@/types';

const PAUSED_STATES = new Set(['paused', 'paused_limit_reached']);

export function isConfigurableSchedule(job: Job): boolean {
  return (job.syncDirection ?? 'one_way') !== 'two_way';
}

export function isScheduleActive(job: Job): boolean {
  return (
    isConfigurableSchedule(job) &&
    job.syncEnabled === true &&
    !PAUSED_STATES.has(job.scheduleState ?? '')
  );
}

export function isSchedulePaused(job: Job): boolean {
  return (
    isConfigurableSchedule(job) && PAUSED_STATES.has(job.scheduleState ?? '')
  );
}

export interface ProjectScheduleSummary {
  jobCount: number;
  enabledCount: number;
  pausedCount: number;
  modeLabel: 'Independent' | 'Priority queue';
  timezoneLabel: string;
  nextRunAt: string | null;
}

function nextFutureDate(
  values: Array<string | null | undefined>,
): string | null {
  const now = Date.now();
  const dates = values
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ value, time: new Date(value).getTime() }))
    .filter(({ time }) => Number.isFinite(time) && time > now)
    .sort((a, b) => a.time - b.time);

  return dates[0]?.value ?? null;
}

export function getProjectScheduleSummary(
  jobs: Job[],
  config: PriorityQueueConfig,
): ProjectScheduleSummary {
  const priorityMode = config.schedulerMode === 'priority';
  const scheduleJobs = jobs.filter(isConfigurableSchedule);
  const timezones = new Set(
    scheduleJobs
      .map((job) => job.timezone)
      .filter((timezone): timezone is string => Boolean(timezone)),
  );

  const timezoneLabel = priorityMode
    ? (config.queue?.timezone ?? 'Not configured')
    : timezones.size === 0
      ? 'Not configured'
      : timezones.size === 1
        ? [...timezones][0]
        : `${timezones.size} timezones`;

  return {
    jobCount: jobs.length,
    enabledCount: scheduleJobs.filter(isScheduleActive).length,
    pausedCount: scheduleJobs.filter(isSchedulePaused).length,
    modeLabel: priorityMode ? 'Priority queue' : 'Independent',
    timezoneLabel,
    nextRunAt: priorityMode
      ? nextFutureDate([config.queue?.nextStartAt])
      : nextFutureDate(
          scheduleJobs.filter(isScheduleActive).map((job) => job.nextRunAt),
        ),
  };
}
