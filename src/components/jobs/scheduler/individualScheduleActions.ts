import { hasScheduleDefinition } from '@/features/jobs/lib/jobScheduleSettings';
import type { IndividualScheduleRowJob } from './IndividualScheduleRow';

export function canUseIndividualSchedule(
  job: IndividualScheduleRowJob,
): boolean {
  return (
    job.syncDirection !== 'two_way' &&
    !!job.isEnabled &&
    hasScheduleDefinition(job) &&
    job.scheduleState !== 'paused_limit_reached' &&
    job.scheduleState !== 'held'
  );
}

export function isIndividualScheduleActive(
  job: IndividualScheduleRowJob,
): boolean {
  return (
    canUseIndividualSchedule(job) &&
    !!job.syncEnabled &&
    job.scheduleState !== 'paused'
  );
}

export function canPauseIndividualSchedule(
  job: IndividualScheduleRowJob,
): boolean {
  return isIndividualScheduleActive(job);
}

export function canResumeIndividualSchedule(
  job: IndividualScheduleRowJob,
): boolean {
  return (
    canUseIndividualSchedule(job) &&
    (job.scheduleState === 'paused' || !job.syncEnabled)
  );
}
