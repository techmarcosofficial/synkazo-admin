import { Info } from 'lucide-react';
import { useProjectDetailContext } from '../context';

import JobScheduler from '@/components/jobs/JobScheduler';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SchedulerTab() {
  const { projectId } = useProjectDetailContext();
  return (
    <div className="space-y-4">
      <Alert className="border-info/20 bg-info/5 text-info">
        <Info className="size-4" />
        <AlertTitle className="text-foreground text-xs font-semibold">
          Project-wide bulk scheduler (Advanced)
        </AlertTitle>
        <AlertDescription className="text-muted-foreground text-xs">
          Individual sync flows have their own schedules configured per flow. Use this section when you need coordinated project-wide schedules or a strict priority execution order across multiple flows.
        </AlertDescription>
      </Alert>
      <JobScheduler projectId={projectId} />
    </div>
  );
}
