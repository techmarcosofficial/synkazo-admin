import type { ExtJob } from './hooks/useJobDetail';

import type { SyncFrequency } from '@/types';

// Static copy shown wherever a two-way sync would otherwise offer schedule
// configuration — two-way sync is not user-schedulable (it polls on a fixed,
// admin-configured interval). Kept here so every surface (setup wizard schedule
// step, job Schedule tab, project Scheduler tab) uses identical wording.
export const TWO_WAY_SCHEDULE_MESSAGE =
  "Two-way syncs poll about every 2 minutes — there's no schedule to set. The exact interval is configured per source platform by your administrator.";
export const TWO_WAY_SCHEDULER_TAB_MESSAGE =
  'Two-way sync has no schedule to configure. ' + TWO_WAY_SCHEDULE_MESSAGE;

/** Compact number formatting, e.g. 1500 -> "1.5k". */
export function formatNum(n: number | undefined | null): number | string {
  if (!n) return 0;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n;
}

const SCHEDULE_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Human-readable summary of a job's schedule config, e.g. "Every 15 min" / "Daily at 09:00". */
export function formatSchedule(
  job: Pick<
    ExtJob,
    | 'scheduleMode'
    | 'intervalMinutes'
    | 'scheduleTimes'
    | 'scheduleDays'
    | 'cronExpression'
  >,
): string {
  if (job.scheduleMode === 'interval') {
    const m = job.intervalMinutes || 15;
    return m >= 60 && m % 60 === 0 ? `every ${m / 60}h` : `every ${m} min`;
  }
  if (job.scheduleMode === 'daily_time')
    return `daily at ${(job.scheduleTimes || ['09:00'])[0]}`;
  if (job.scheduleMode === 'day_specific') {
    const days = (job.scheduleDays || [])
      .map((d) => SCHEDULE_DAY_LABELS[d])
      .join('/');
    return `${days} at ${(job.scheduleTimes || ['09:00'])[0]}`;
  }
  return job.cronExpression || 'no schedule';
}

export const WEEKDAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

/**
 * The three schedule modes, shared by the create wizard's Schedule step, the job detail
 * Schedule tab and the setup-wizard schedule form — previously copy-pasted in all three.
 * Which ones a user may pick is gated by the plan's `scheduling_modes`.
 */
export const SCHEDULE_MODE_OPTIONS = [
  {
    id: 'daily_time',
    label: 'Daily Time',
    desc: 'Run at specific times every day',
  },
  {
    id: 'interval',
    label: 'Interval',
    desc: 'Run N minutes/hours after last run completes',
  },
  {
    id: 'day_specific',
    label: 'Day Specific',
    desc: 'Run on chosen weekdays at specific times',
  },
];

export interface FrequencyPreset {
  label: string;
  desc: string;
  mode: string;
  intervalMinutes?: number;
  times?: string[];
}

/**
 * Fixed cadences granted by the plan's `sync_frequency`. Picking one writes a schedule the
 * user cannot tune; the `custom` frequency instead unlocks the full mode editor below.
 * Each preset maps onto the existing persisted schedule fields — no new scheduler concepts.
 */
export const FREQUENCY_PRESETS: Record<string, FrequencyPreset> = {
  '15min': {
    label: 'Every 15 minutes',
    desc: 'Runs four times an hour',
    mode: 'interval',
    intervalMinutes: 15,
  },
  hourly: {
    label: 'Hourly',
    desc: 'Runs once an hour',
    mode: 'interval',
    intervalMinutes: 60,
  },
  daily: {
    label: 'Daily',
    desc: 'Runs once a day at 09:00',
    mode: 'daily_time',
    times: ['09:00'],
  },
};

/** Order presets fastest → slowest so the picker reads consistently. */
export const FREQUENCY_PRESET_ORDER: SyncFrequency[] = [
  '15min',
  'hourly',
  'daily',
];

/** Which preset (if any) a concrete schedule corresponds to — "custom" when none match. */
export function matchFrequency(
  mode: string,
  intervalMinutes: number,
  times: string[],
): string {
  for (const key of FREQUENCY_PRESET_ORDER) {
    const preset = FREQUENCY_PRESETS[key];
    if (preset.mode !== mode) continue;
    if (preset.intervalMinutes != null) {
      if (preset.intervalMinutes === intervalMinutes) return key;
    } else if (
      preset.times &&
      preset.times.length === times.length &&
      preset.times.every((t, i) => t === times[i])
    ) {
      return key;
    }
  }
  return 'custom';
}

export interface CanvasField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  isCustom: boolean;
  readOnly: boolean;
  /** Allowed values for an enum field. Only HubSpot and ServiceTitan Dropdown
   *  custom fields report these; the Map Values rule needs them to offer the
   *  destination's real options instead of a free-text box. */
  options?: { value: string; label: string }[];
}

/** Normalizes a discovered platform property into the shape FieldMappingCanvas expects. */
export function toCanvasField(f: {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  isCustom?: boolean;
  readOnly?: boolean;
  options?: { value: string; label: string }[];
}): CanvasField {
  return {
    key: f.name,
    label: f.label || f.name,
    type: f.type || 'string',
    required: f.required || false,
    isCustom: f.isCustom || false,
    readOnly: f.readOnly || false,
    ...(f.options?.length ? { options: f.options } : {}),
  };
}

/** Title-cases a snake_case object name, e.g. "job_titles" -> "Job Titles". */
export function fmtObject(str: string | undefined | null): string {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
