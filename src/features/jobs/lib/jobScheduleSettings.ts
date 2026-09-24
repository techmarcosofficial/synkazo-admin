export interface IntervalConfig {
  amount: number;
  unit: 'minutes' | 'hours';
}

export interface ScheduleDraft {
  mode: string;
  times: string[];
  days: number[];
  interval: IntervalConfig;
}

export function hasScheduleDefinition(schedule: {
  scheduleMode?: string | null;
  intervalMinutes?: number | null;
  scheduleTimes?: string[] | null;
  scheduleDays?: number[] | null;
  cronExpression?: string | null;
  oneTimeAt?: string | null;
}): boolean {
  if (schedule.scheduleMode === 'interval') {
    return Boolean(schedule.intervalMinutes);
  }
  if (schedule.scheduleMode === 'daily_time') {
    return Boolean(schedule.scheduleTimes?.length);
  }
  if (schedule.scheduleMode === 'day_specific') {
    return Boolean(
      schedule.scheduleDays?.length && schedule.scheduleTimes?.length,
    );
  }
  if (schedule.scheduleMode === 'one_time') {
    return Boolean(schedule.oneTimeAt);
  }
  return Boolean(schedule.cronExpression);
}

export function getIntervalMinutes(interval: IntervalConfig) {
  return interval.unit === 'hours' ? interval.amount * 60 : interval.amount;
}

export function buildScheduleUpdatePayload(
  draft: ScheduleDraft,
  timezone: string,
) {
  return {
    scheduleMode: draft.mode,
    scheduleTimes: draft.mode !== 'interval' ? draft.times : null,
    scheduleDays: draft.mode === 'day_specific' ? draft.days : null,
    intervalMinutes:
      draft.mode === 'interval' ? getIntervalMinutes(draft.interval) : null,
    timezone,
    cronExpression: null,
  };
}

export function capitalizeFirst(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

export function formatScheduledAt(
  value: string | null | undefined,
  timezone: string,
) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';

  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function getNextRunCardState({
  scheduleConfigured,
  schedulePaused,
  nextRunAt,
  timezone,
}: {
  scheduleConfigured: boolean;
  schedulePaused: boolean;
  nextRunAt?: string | null;
  timezone: string;
}): { value: string; description: string } {
  if (!scheduleConfigured) {
    return { value: '—', description: 'Configure a schedule' };
  }
  if (schedulePaused) {
    return { value: 'Not scheduled', description: 'Schedule is paused' };
  }
  if (!nextRunAt) {
    return {
      value: 'Not scheduled',
      description: 'Waiting for the next run time',
    };
  }
  return {
    value: formatScheduledAt(nextRunAt, timezone),
    description: 'Next scheduled run',
  };
}
