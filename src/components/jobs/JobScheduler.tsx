import {
  ArrowRight,
  CalendarClock,
  Info,
  ListOrdered,
  Shuffle,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

import IndividualSchedulerList from './IndividualSchedulerList';
import PriorityQueuePanel from './priority-queue/PriorityQueuePanel';
import BulkScheduleControlsCard from './scheduler/BulkScheduleControlsCard';
import ScheduleSummaryCard from './scheduler/ScheduleSummaryCard';

import { PlanLock, PlanLockBadge } from '@/components/shared/PlanGate';
import StatusBadge from '@/components/shared/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

const PRIORITY_PLAN_MESSAGE =
  "Priority scheduling isn't available on your current plan. Upgrade to run jobs sequentially in priority order.";

function SchedulerSkeleton() {
  return (
    <div
      className="space-y-4"
      aria-label="Loading schedule and execution settings"
    >
      <Skeleton className="h-48 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

function ExecutionModeCard({
  priorityMode,
  canUsePriorityScheduling,
  saving,
  error,
  onToggle,
}: {
  priorityMode: boolean;
  canUsePriorityScheduling: boolean;
  saving: boolean;
  error: string | null;
  onToggle: () => void;
}) {
  const locked = !priorityMode && !canUsePriorityScheduling;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution mode</CardTitle>
        <CardDescription>
          Choose whether jobs follow their own schedules or run sequentially.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-xl">
              {priorityMode ? (
                <ListOrdered className="size-5" aria-hidden="true" />
              ) : (
                <Shuffle className="size-5" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={priorityMode ? 'priority' : 'individual'}
                  size="sm"
                />
                {locked && <PlanLockBadge label="Upgrade required" />}
              </div>
              <p className="text-muted-foreground text-sm">
                {priorityMode
                  ? 'Jobs run one at a time in priority order. Saved individual schedules are temporarily ignored.'
                  : 'Each job runs independently using its saved schedule.'}
              </p>
            </div>
          </div>

          <PlanLock locked={locked} message={PRIORITY_PLAN_MESSAGE}>
            <Switch
              checked={priorityMode}
              onCheckedChange={onToggle}
              disabled={saving || locked}
              aria-label="Use priority queue execution"
            />
          </PlanLock>
        </div>

        {saving && (
          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <Spinner /> Updating execution mode…
          </p>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function ExecutionOrder() {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
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
  );
}

function SectionHeading({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description: string;
  children?: ReactNode;
  id: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div>
        <h3 id={id} className="font-heading text-base font-semibold">
          {title}
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      {children}
    </div>
  );
}

export default function JobScheduler({ projectId }: { projectId: string }) {
  const { confirm } = useConfirmDialog();
  const { priorityScheduling: canUsePriorityScheduling } = useEntitlements();
  const [modeError, setModeError] = useState<string | null>(null);
  const [schedulerRefreshKey, setSchedulerRefreshKey] = useState(0);

  const jobsQuery = useProjectJobsQuery(projectId);
  const queueQuery = usePriorityQueueQuery(projectId);
  const setModeMutation = useSetSchedulerModeMutation(projectId);

  if (jobsQuery.isLoading || queueQuery.isLoading) return <SchedulerSkeleton />;

  if (
    (jobsQuery.isError && !jobsQuery.data) ||
    (queueQuery.isError && !queueQuery.data) ||
    !queueQuery.data
  ) {
    return (
      <Alert variant="destructive">
        <CalendarClock aria-hidden="true" />
        <AlertTitle>Schedule settings could not be loaded</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>
            Your existing schedules are unchanged. Try loading this section
            again.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void jobsQuery.refetch();
              void queueQuery.refetch();
            }}
            disabled={jobsQuery.isFetching || queueQuery.isFetching}
          >
            {(jobsQuery.isFetching || queueQuery.isFetching) && <Spinner />}
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const jobs = jobsQuery.data ?? [];
  const config = queueQuery.data;
  const isTwoWayProject =
    jobs.length > 0 &&
    jobs.every((job) => (job.syncDirection ?? 'one_way') === 'two_way');
  const priorityMode = config.schedulerMode === 'priority';

  const refreshSchedules = async () => {
    await jobsQuery.refetch();
    setSchedulerRefreshKey((key) => key + 1);
  };

  const applyModeToggle = (next: boolean) => {
    setModeError(null);
    setModeMutation.mutate(next, {
      onError: () => {
        setModeError('Execution mode could not be updated. Please try again.');
      },
    });
  };

  const handleModeToggle = () => {
    const next = !priorityMode;
    if (next) {
      confirm({
        variant: 'info',
        title: 'Enable Priority Scheduling?',
        description:
          'Priority Scheduling will control when jobs run. Individual job schedules will be temporarily ignored while this mode is active. Their existing configuration will not be changed.',
        confirmLabel: 'Enable priority mode',
        onConfirm: () => applyModeToggle(true),
      });
    } else {
      confirm({
        variant: 'warning',
        title: 'Disable Priority Scheduling?',
        description:
          'Any active priority cycle will be cancelled. Each job will return to its saved individual schedule; schedules that were paused will remain paused.',
        confirmLabel: 'Disable priority mode',
        onConfirm: () => applyModeToggle(false),
      });
    }
  };

  if (isTwoWayProject) {
    return (
      <div className="space-y-4">
        <ScheduleSummaryCard jobs={jobs} config={config} />
        <Card>
          <CardHeader>
            <CardTitle>Automatic two-way scheduling</CardTitle>
            <CardDescription>
              Two-way projects use their platform polling configuration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info aria-hidden="true" />
              <AlertDescription>
                {TWO_WAY_SCHEDULER_TAB_MESSAGE}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScheduleSummaryCard jobs={jobs} config={config} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ExecutionModeCard
          priorityMode={priorityMode}
          canUsePriorityScheduling={canUsePriorityScheduling}
          saving={setModeMutation.isPending}
          error={modeError}
          onToggle={handleModeToggle}
        />
        <BulkScheduleControlsCard
          projectId={projectId}
          jobs={jobs}
          priorityMode={priorityMode}
          onChanged={refreshSchedules}
        />
      </div>

      {priorityMode ? (
        <section className="space-y-3" aria-labelledby="priority-queues-title">
          <SectionHeading
            id="priority-queues-title"
            title="Priority and association queues"
            description="Configure when the queue starts and the order each stage runs."
          >
            <ExecutionOrder />
          </SectionHeading>
          <PriorityQueuePanel projectId={projectId} />
        </section>
      ) : (
        <section className="space-y-4" aria-labelledby="job-schedules-title">
          <SectionHeading
            id="job-schedules-title"
            title="Job schedules"
            description="Review saved cadence, pause or resume a job, and inspect recent runs."
          />
          <IndividualSchedulerList
            projectId={projectId}
            refreshKey={schedulerRefreshKey}
          />
        </section>
      )}
    </div>
  );
}
