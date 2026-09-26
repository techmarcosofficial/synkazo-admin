import { Card, CardContent, CardHeader } from '@/components/ui/card';
import JobScheduleSettings, {
  JobScheduleSettingsHeader,
} from '../settings/JobScheduleSettings';

export default function ScheduleTab() {
  return (
    <Card
      className="min-w-0 gap-0 py-0"
      aria-labelledby="job-settings-section-title"
    >
      <CardHeader className="gap-0 px-4 py-3">
        <JobScheduleSettingsHeader />
      </CardHeader>
      <CardContent className="px-3.5 pt-2.5 pb-3.5 sm:px-4 sm:pb-4">
        <JobScheduleSettings />
      </CardContent>
    </Card>
  );
}

// Compatibility exports for schedule utility tests and external callers.
export {
  buildScheduleUpdatePayload,
  getNextRunCardState,
  hasScheduleDefinition,
} from '@/features/jobs/lib/jobScheduleSettings';
