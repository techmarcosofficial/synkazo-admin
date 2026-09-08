import {
  ArrowRight,
  CalendarClock,
  Info,
  ListOrdered,
  Shuffle,
} from 'lucide-react';

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
    <Card size="sm">
      <CardContent className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
          {enabled ? (
            <ListOrdered className="size-4" aria-hidden="true" />
          ) : (
            <Shuffle
              className="text-muted-foreground size-4"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              Priority Scheduling
              <Badge variant="secondary" className="gap-1.5">
                <span className="bg-foreground size-1.5 rounded-full opacity-70" />
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

function ExecutionOrder() {
  return (
    <div className="min-w-0 lg:text-right">
      <div
        className="flex flex-wrap items-center gap-2 lg:justify-end"
        aria-label="Execution order: Priority Queue, then Association Queue"
      >
        <Badge
          variant="secondary"
          className="size-6 rounded-full p-0 font-semibold"
        >
          1
        </Badge>
        <span className="text-xs font-medium">Priority Queue</span>
        <ArrowRight
          className="text-muted-foreground size-3.5"
          aria-hidden="true"
        />
        <Badge
          variant="secondary"
          className="size-6 rounded-full p-0 font-semibold"
        >
          2
        </Badge>
        <span className="text-xs font-medium">Association Queue</span>
      </div>
      <p className="text-muted-foreground mt-1.5 max-w-lg text-xs">
        Priority jobs run first. Association rules run after the job queue
        finishes.
      </p>
    </div>
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
        <Spinner className="text-muted-foreground size-6" />
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
      <Card size="sm">
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-xl">
              <CalendarClock className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Job Scheduler</h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Control when jobs run and define the order in which work is
                processed.
              </p>
            </div>
          </div>
          <ExecutionOrder />
        </CardContent>
      </Card>

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
