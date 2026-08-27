import { Lock } from 'lucide-react';
import { useState } from 'react';

import { jobsApi } from '@/api/jobs';
import { priorityQueueApi } from '@/api/priorityQueue';
import { usePlanUpgradePrompt } from '@/components/shared/PlanGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import type { ProjectExt } from '@/features/projects/hooks';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { showToast } from '@/lib/toast';
import { useEntitlements } from '@/queries/useEntitlements';

export default function SchedulerSettingsCard({
  project,
  jobCount,
  onUpdated,
}: {
  project: ProjectExt;
  jobCount: number;
  onUpdated: (updated: ProjectExt) => void;
}) {
  const [priorityEnabled, setPriorityEnabled] = useState(
    project.schedulerMode === 'priority',
  );
  const [prioritySaving, setPrioritySaving] = useState(false);
  const [pauseAllBusy, setPauseAllBusy] = useState(false);
  const { priorityScheduling: canUsePriorityScheduling } = useEntitlements();
  const { prompt: promptUpgrade, dialog: upgradeDialog } =
    usePlanUpgradePrompt();
  const { confirm } = useConfirmDialog();

  const applyTogglePriority = async (next: boolean) => {
    setPrioritySaving(true);
    try {
      const updated = await priorityQueueApi.setMode(project.id, next);
      setPriorityEnabled(next);
      onUpdated(updated as ProjectExt);
    } catch {
      showToast.error('Something went wrong.');
    } finally {
      setPrioritySaving(false);
    }
  };

  const handleTogglePriority = () => {
    if (!canUsePriorityScheduling) {
      promptUpgrade(
        "Priority scheduling isn't available on your current plan. Upgrade to run jobs sequentially in priority order.",
      );
      return;
    }
    const next = !priorityEnabled;
    if (next) {
      confirm({
        variant: 'info',
        title: 'Enable Priority Scheduling?',
        description:
          'Priority Scheduling will control when jobs run. Individual job schedules will be temporarily ignored while this mode is active. Their existing configuration will not be changed.',
        confirmLabel: 'Enable',
        onConfirm: () => applyTogglePriority(true),
      });
    } else {
      confirm({
        variant: 'warning',
        title: 'Disable Priority Scheduling?',
        description:
          'The priority queue will stop controlling job execution. Your individual job scheduler configurations will remain unchanged and will not be automatically enabled.',
        confirmLabel: 'Disable',
        onConfirm: () => applyTogglePriority(false),
      });
    }
  };

  const handlePauseAll = async () => {
    setPauseAllBusy(true);
    try {
      await jobsApi.pauseAllJobs(project.id);
      showToast.success('All job schedules paused.');
    } catch {
      showToast.error('Something went wrong.');
    } finally {
      setPauseAllBusy(false);
    }
  };

  const handleResumeAll = async () => {
    setPauseAllBusy(true);
    try {
      await jobsApi.resumeAllJobs(project.id);
      showToast.success('All job schedules resumed.');
    } catch {
      showToast.error('Something went wrong.');
    } finally {
      setPauseAllBusy(false);
    }
  };

  return (
    <Card>
      {upgradeDialog}
      <CardHeader>
        <CardTitle>Scheduler</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium">
              Priority Scheduling
              {!canUsePriorityScheduling && (
                <Lock className="text-muted-foreground size-3" />
              )}
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              Run jobs sequentially in priority order instead of all at once.
            </p>
          </div>
          <Switch
            checked={priorityEnabled}
            onCheckedChange={handleTogglePriority}
            disabled={prioritySaving}
          />
        </div>

        <div className="border-t pt-4">
          <p className="mb-2 text-sm font-medium">Bulk Schedule Control</p>
          <p className="text-muted-foreground mb-4 text-xs">
            Pause or resume all job schedules in this project at once.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePauseAll}
              disabled={pauseAllBusy || jobCount === 0}
            >
              {pauseAllBusy ? <Spinner /> : null}
              Pause All
            </Button>
            <Button
              variant="outline"
              onClick={handleResumeAll}
              disabled={pauseAllBusy || jobCount === 0}
            >
              {pauseAllBusy ? <Spinner /> : null}
              Resume All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
