import JobScheduleSettings, {
  JobScheduleSettingsHeader,
} from '../settings/JobScheduleSettings';

export default function ScheduleTab() {
  return (
    <div
      className="min-w-0 space-y-4"
      aria-labelledby="job-settings-section-title"
    >
      <div className="px-1 py-1">
        <JobScheduleSettingsHeader />
      </div>
      <div>
        <JobScheduleSettings />
      </div>
    </div>
  );
}

// Compatibility exports for schedule utility tests and external callers.
export {
  buildScheduleUpdatePayload,
  getNextRunCardState,
  hasScheduleDefinition,
} from '@/features/jobs/lib/jobScheduleSettings';
