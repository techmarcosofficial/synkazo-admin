import { differenceInSeconds } from 'date-fns';
import { Activity, ArrowRight, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import type { PriorityQueueConfig, StageOutcomeStatus } from '@/types';

function formatSeconds(sec: number): string {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.max(0, Math.floor(sec % 60));
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const QUEUE_STATUS_META: Record<string, { className: string }> = {
  running: { className: 'bg-primary/10 text-primary' },
  idle: { className: 'bg-muted text-muted-foreground' },
  paused: { className: 'bg-warning/10 text-warning' },
};

const STAGE_LABEL: Record<StageOutcomeStatus, string> = {
  not_started: 'Not started',
  waiting: 'Waiting',
  running: 'Running',
  completed: 'Completed',
  partially_completed: 'Partially completed',
  failed: 'Failed',
  skipped: 'Skipped',
};

export default function QueueStatusPanel({
  config,
  onPause,
  onResume,
  pausing,
  onClearAndRestart,
  clearingAndRestarting,
}: {
  config: PriorityQueueConfig;
  onPause: () => void;
  onResume: () => void;
  pausing: boolean;
  onClearAndRestart: () => void | Promise<void>;
  clearingAndRestarting: boolean;
}) {
  const { queue, activeCycle, currentExecution, nextQueueJob, displayStatus } =
    config;
  const [, forceTick] = useState(0);
  const { confirm } = useConfirmDialog();

  const handleClearAndRestartClick = () => {
    confirm({
      variant: 'danger',
      title: 'Clear & restart the priority scheduler?',
      description:
        'This clears all live run state — the current cycle, job failure/block counters, and execution lease — and restarts the scheduler from a fresh state. Your queued jobs, association queue, and schedule settings are not affected. This cannot be undone.',
      confirmLabel: 'Clear & Restart',
      onConfirm: onClearAndRestart,
    });
  };

  // Re-render every second so the elapsed/window progress bar moves smoothly
  // between the (5s-while-running) query refetches.
  useEffect(() => {
    if (currentExecution?.status !== 'running') return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [currentExecution?.status]);

  if (!queue) return null;

  const badgeClassName =
    QUEUE_STATUS_META[queue.status]?.className ??
    QUEUE_STATUS_META.idle.className;

  const elapsedSec = currentExecution
    ? differenceInSeconds(new Date(), new Date(currentExecution.startedAt))
    : 0;
  const progressPct = currentExecution
    ? Math.min(100, (elapsedSec / currentExecution.executionWindowSec) * 100)
    : 0;

  const checkpointJob = currentExecution?.job;

  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Activity className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Queue Status</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <Badge className={badgeClassName}>{displayStatus}</Badge>
                {!currentExecution && (
                  <span className="text-muted-foreground text-xs">
                    No job is currently running.
                  </span>
                )}
                {currentExecution && (
                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
                    <span className="truncate">
                      {currentExecution.job?.sourceObject}
                    </span>
                    <ArrowRight
                      className="size-3 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {currentExecution.job?.destObject}
                    </span>
                    {activeCycle && (
                      <span className="text-muted-foreground shrink-0">
                        · Iteration {activeCycle.currentIteration}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {queue.status === 'paused' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onResume}
                disabled={pausing}
              >
                {pausing ? <Spinner /> : <Play />}
                Resume Queue
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={onPause}
                disabled={pausing}
              >
                {pausing ? <Spinner /> : <Pause />}
                Pause Queue
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleClearAndRestartClick}
              disabled={clearingAndRestarting}
            >
              {clearingAndRestarting ? <Spinner /> : <RotateCcw />}
              Clear &amp; Restart Scheduler
            </Button>
          </div>
        </div>

        {queue.status === 'paused' && queue.pauseReason === 'PLAN_LIMIT' && (
          <p className="text-warning border-t pt-3 text-xs">
            Paused — plan limit reached. Upgrade your plan to resume.
          </p>
        )}

        {currentExecution && (
          <div className="grid gap-3 border-t pt-3 md:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)] md:items-center">
            <div className="space-y-1.5">
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>Execution</span>
                <span>
                  {formatSeconds(elapsedSec)} /{' '}
                  {formatSeconds(currentExecution.executionWindowSec)}
                </span>
              </div>
              <Progress value={progressPct} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm md:border-l md:pl-4">
              <div>
                <p className="text-muted-foreground text-xs">
                  Records Processed
                </p>
                <p className="font-medium">
                  {(currentExecution.recordsProcessed ?? 0).toLocaleString()}
                </p>
              </div>
              {checkpointJob?.checkpointPage != null && (
                <div>
                  <p className="text-muted-foreground text-xs">Checkpoint</p>
                  <p className="font-medium">
                    Page {checkpointJob.checkpointPage}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {(nextQueueJob ||
          (activeCycle && queue.associationQueueEnabled) ||
          (activeCycle && queue.companyOwnerSyncEnabled)) && (
          <div className="grid gap-3 border-t pt-3 sm:grid-cols-3">
            {nextQueueJob && (
              <div>
                <p className="text-muted-foreground text-xs">Next Job</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium">
                  {nextQueueJob.job?.sourceObject}
                  <ArrowRight className="size-3" aria-hidden="true" />
                  {nextQueueJob.job?.destObject}
                </p>
              </div>
            )}

            {activeCycle && queue.associationQueueEnabled && (
              <div>
                <p className="text-muted-foreground text-xs">
                  Association Queue
                </p>
                <p className="mt-0.5 text-xs font-medium">
                  {STAGE_LABEL[activeCycle.associationsStatus]}
                </p>
                {activeCycle.associationsStatus === 'waiting' &&
                  activeCycle.associationsDelayUntil && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Starts{' '}
                      {new Date(
                        activeCycle.associationsDelayUntil,
                      ).toLocaleString()}
                    </p>
                  )}
              </div>
            )}

            {activeCycle && queue.companyOwnerSyncEnabled && (
              <div>
                <p className="text-muted-foreground text-xs">
                  Company Owner Sync
                </p>
                <p className="mt-0.5 text-xs font-medium">
                  {STAGE_LABEL[activeCycle.companyOwnerSyncStatus]}
                </p>
                {activeCycle.companyOwnerSyncErrorMessage &&
                  activeCycle.companyOwnerSyncStatus === 'failed' && (
                    <p className="text-destructive mt-0.5 text-xs">
                      {activeCycle.companyOwnerSyncErrorMessage}
                    </p>
                  )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
