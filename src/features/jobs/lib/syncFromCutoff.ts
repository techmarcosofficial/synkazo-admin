import type { JobConfig } from '@/features/jobs/types';

// Create-job payload fields for a two-way job's "sync from" cutoff. The
// datetime-local value is local time; the API stores UTC.
export function syncFromPayload(
  config: Pick<JobConfig, 'syncFromMode' | 'syncFromDate'>,
): { syncFromMode?: 'date' | 'future_only'; syncFromDate?: string } {
  if (config.syncFromMode === 'date' && config.syncFromDate) {
    return {
      syncFromMode: 'date',
      syncFromDate: new Date(config.syncFromDate).toISOString(),
    };
  }
  return config.syncFromMode === 'future_only'
    ? { syncFromMode: 'future_only' }
    : {};
}

// Error message for the cutoff field, or null when it is valid.
export function syncFromError(
  config: Pick<JobConfig, 'syncDirection' | 'syncFromMode' | 'syncFromDate'>,
): string | null {
  if (config.syncDirection !== 'two_way') return null;
  if (!config.syncFromMode) {
    return 'Choose where two-way sync starts: future changes only, or from a date';
  }
  if (config.syncFromMode === 'date') {
    if (!config.syncFromDate) return 'Choose the date to start syncing from';
    const date = new Date(config.syncFromDate);
    if (Number.isNaN(date.getTime())) return 'Enter a valid date';
    if (date.getTime() > Date.now()) {
      return 'The start date cannot be in the future';
    }
  }
  return null;
}
