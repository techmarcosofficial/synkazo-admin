import { differenceInSeconds } from 'date-fns';
import { ArrowRight, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">Queue Status</CardTitle>
        <Badge className={badgeClassName}>{displayStatus}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {queue.status === 'paused' && queue.pauseReason === 'PLAN_LIMIT' && (
          <p className="text-warning text-xs">
            Paused — plan limit reached. Upgrade your plan to resume.
          </p>
        )}

        {currentExecution ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Current Job</p>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  {currentExecution.job?.sourceObject}
                  <ArrowRight size={13} />
                  {currentExecution.job?.destObject}
                </p>
              </div>
              {activeCycle && (
                <p className="text-muted-foreground text-xs">
                  Iteration {activeCycle.currentIteration}
                </p>
              )}
            </div>

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

            <div className="grid grid-cols-2 gap-3 text-sm">
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
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            No job is currently running.
          </p>
        )}

        {nextQueueJob && (
          <div className="border-t pt-3">
            <p className="text-muted-foreground text-xs">Next Job</p>
            <p className="flex items-center gap-1.5 text-sm">
              {nextQueueJob.job?.sourceObject}
              <ArrowRight size={13} />
              {nextQueueJob.job?.destObject}
            </p>
          </div>
        )}

        {activeCycle && queue.associationQueueEnabled && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">Association Queue</p>
              <span className="text-xs font-medium">
                {STAGE_LABEL[activeCycle.associationsStatus]}
              </span>
            </div>
            {activeCycle.associationsStatus === 'waiting' &&
              activeCycle.associationsDelayUntil && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Starts{' '}
                  {new Date(
                    activeCycle.associationsDelayUntil,
                  ).toLocaleString()}
                </p>
              )}
          </div>
        )}

        {activeCycle && queue.companyOwnerSyncEnabled && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">
                Company Owner Sync
              </p>
              <span className="text-xs font-medium">
                {STAGE_LABEL[activeCycle.companyOwnerSyncStatus]}
              </span>
            </div>
            {activeCycle.companyOwnerSyncErrorMessage &&
              activeCycle.companyOwnerSyncStatus === 'failed' && (
                <p className="text-destructive mt-1 text-xs">
                  {activeCycle.companyOwnerSyncErrorMessage}
                </p>
              )}
          </div>
        )}

        <div className="flex items-center gap-2 border-t pt-3">
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
            className="text-destructive hover:text-destructive"
            onClick={handleClearAndRestartClick}
            disabled={clearingAndRestarting}
          >
            {clearingAndRestarting ? <Spinner /> : <RotateCcw />}
            Clear & Restart Scheduler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
