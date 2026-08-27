import { ListOrdered, Shuffle, Info } from 'lucide-react';

import IndividualSchedulerList from './IndividualSchedulerList';
import PriorityQueuePanel from './priority-queue/PriorityQueuePanel';

import { usePlanUpgradePrompt } from '@/components/shared/PlanGate';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { TWO_WAY_SCHEDULER_TAB_MESSAGE } from '@/features/jobs/utils';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { cn } from '@/lib/utils';
import { useEntitlements } from '@/queries/useEntitlements';
import { useProjectJobsQuery } from '@/queries/useJobs';
import {
  usePriorityQueueQuery,
  useSetSchedulerModeMutation,
} from '@/queries/usePriorityQueue';

function ModeToggle({
  enabled,
  onToggle,
  saving,
  locked,
}: {
  enabled: boolean;
  onToggle: () => void;
  saving: boolean;
  locked: boolean;
}) {
  return (
    <Card className={cn(enabled && 'border-paused/50')}>
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              enabled ? 'bg-paused/10' : 'bg-muted',
            )}
          >
            {enabled ? (
              <ListOrdered className="text-paused size-4" />
            ) : (
              <Shuffle className="text-muted-foreground size-4" />
            )}
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              Priority Scheduling
              <Badge className="bg-muted text-muted-foreground gap-1.5">
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    enabled ? 'bg-paused' : 'bg-muted-foreground',
                  )}
                />
                {enabled ? 'ON' : 'OFF'}
              </Badge>
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {enabled
                ? 'Jobs run one at a time from the priority queue below. Individual job schedules are ignored while this mode is active.'
                : 'Each job runs independently on its own cron schedule (default behavior).'}
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={saving || locked}
        />
      </CardContent>
    </Card>
  );
}

export default function JobScheduler({ projectId }: { projectId: string }) {
  const { confirm } = useConfirmDialog();
  const { priorityScheduling: canUsePriorityScheduling } = useEntitlements();
  const { prompt: promptUpgrade, dialog: upgradeDialog } =
    usePlanUpgradePrompt();

  const jobsQuery = useProjectJobsQuery(projectId);
  const queueQuery = usePriorityQueueQuery(projectId);
  const setModeMutation = useSetSchedulerModeMutation(projectId);

  if (jobsQuery.isLoading || queueQuery.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner className="text-paused size-6" />
      </div>
    );
  }

  const jobs = jobsQuery.data ?? [];
  const isTwoWayProject =
    jobs.length > 0 &&
    jobs.every((j) => (j.syncDirection ?? 'one_way') === 'two_way');

  if (isTwoWayProject) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Job Scheduler</h3>
        </div>
        <Card>
          <CardContent className="text-muted-foreground flex items-start gap-3 py-6 text-sm">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p>{TWO_WAY_SCHEDULER_TAB_MESSAGE}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const priorityMode = queueQuery.data?.schedulerMode === 'priority';

  const applyModeToggle = (next: boolean) => setModeMutation.mutate(next);

  const handleModeToggle = () => {
    if (!priorityMode && !canUsePriorityScheduling) {
      promptUpgrade(
        "Priority scheduling isn't available on your current plan. Upgrade to run jobs sequentially in priority order.",
      );
      return;
    }
    const next = !priorityMode;
    if (next) {
      confirm({
        variant: 'info',
        title: 'Enable Priority Scheduling?',
        description:
          'Priority Scheduling will control when jobs run. Individual job schedules will be temporarily ignored while this mode is active. Their existing configuration will not be changed.',
        confirmLabel: 'Enable',
        onConfirm: () => applyModeToggle(true),
      });
    } else {
      confirm({
        variant: 'warning',
        title: 'Disable Priority Scheduling?',
        description:
          'The priority queue will stop controlling job execution. Your individual job scheduler configurations will remain unchanged and will not be automatically enabled.',
        confirmLabel: 'Disable',
        onConfirm: () => applyModeToggle(false),
      });
    }
  };

  return (
    <div className="space-y-4">
      {upgradeDialog}
      <div>
        <h3 className="text-sm font-semibold">Job Scheduler</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Control how and when jobs in this project run.
        </p>
      </div>

      <ModeToggle
        enabled={priorityMode}
        onToggle={handleModeToggle}
        saving={setModeMutation.isPending}
        locked={!priorityMode && !canUsePriorityScheduling}
      />

      {!priorityMode && !canUsePriorityScheduling && (
        <Alert className="bg-muted/50">
          <AlertDescription>
            Priority scheduling isn&apos;t available on your current plan.
          </AlertDescription>
        </Alert>
      )}

      {priorityMode ? (
        <PriorityQueuePanel projectId={projectId} />
      ) : (
        <IndividualSchedulerList projectId={projectId} />
      )}
    </div>
  );
}
