import {
  CalendarClock,
  Clock,
  Database,
  Info,
  Play,
  RotateCcw,
  Timer,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useJobDetailContext } from '../context';

import UpgradeRequiredDialog from '@/components/shared/UpgradeRequiredDialog';
import StartSyncModal from '@/components/sync/StartSyncModal';
import SyncRunProgress from '@/components/sync/SyncRunProgress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  capitalizeFirst,
  formatScheduledAt,
  getNextRunCardState,
  hasScheduleDefinition,
} from '@/features/jobs/lib/jobScheduleSettings';
import { formatSchedule } from '@/features/jobs/utils';
import {
  deriveSyncJobSummary,
  formatDurationMs,
} from '@/features/projects/lib/syncJobSummary';
import { BROWSER_TIMEZONE } from '@/lib/timezones';
import { usePriorityQueueQuery } from '@/queries/usePriorityQueue';

function SyncSummaryCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card size="sm" className="min-w-0 gap-0 rounded-3xl py-0 shadow-none">
      <CardContent className="space-y-2.5 p-4">
        <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-3xl">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-lg leading-tight font-bold tracking-tight">
            {value}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs font-medium">
            {label}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OverviewTab() {
  const {
    projectId,
    job,
    project,
    jobFieldMappings,
    hasConnection,
    refetch,
    isSyncing,
    toggling,
    stopping,
    cancellingQueue,
    retryingQueue,
    activeRunLog,
    liveProgress,
    runLogs,
    pipelineRequired,
    pipelineConfigured,
    upgradeDialog,
    setUpgradeDialog,
    beginTracking,
    handleRunNow,
    handleSyncAll,
    handleStop,
    handleCancelQueue,
    handleRetryQueue,
    handleToggle,
    handleTabChange,
    manualDialogOpen,
    setManualDialogOpen,
    triggerInactiveGuide,
  } = useJobDetailContext();

  const priorityQueueQuery = usePriorityQueueQuery(projectId);
  const priorityModeActive =
    priorityQueueQuery.data?.schedulerMode === 'priority';
  const projectQueue = priorityQueueQuery.data?.queue;
  const isTwoWay = job.syncDirection === 'two_way';
  const queued = runLogs[0]?.status === 'queued';
  const failedQueueJob = !!runLogs[0]?.bullmqJobId && job.status === 'error';
  const scheduleActive =
    job.syncEnabled &&
    (job.scheduleState === 'active' ||
      job.scheduleState === 'retry_pending' ||
      job.scheduleState === 'resume_pending');
  const effectiveTimezone = BROWSER_TIMEZONE;
  const nextRunAt = priorityModeActive
    ? projectQueue?.nextStartAt
    : job.nextRunAt;
  const scheduleSummary = isTwoWay
    ? 'Managed automatically'
    : priorityModeActive && projectQueue
      ? projectQueue.scheduleMode === 'one_time'
        ? `Once on ${formatScheduledAt(projectQueue.oneTimeAt, effectiveTimezone)}`
        : formatSchedule({
            scheduleMode: projectQueue.scheduleMode ?? undefined,
            intervalMinutes: projectQueue.intervalMinutes,
            scheduleTimes: projectQueue.scheduleTimes ?? undefined,
            scheduleDays: projectQueue.scheduleDays ?? undefined,
            cronExpression: projectQueue.startCronExpression,
          })
      : formatSchedule(job);
  const performance = deriveSyncJobSummary(job, runLogs);
  const scheduleConfigured = isTwoWay
    ? true
    : priorityModeActive
      ? Boolean(
          projectQueue &&
          hasScheduleDefinition({
            scheduleMode: projectQueue.scheduleMode,
            intervalMinutes: projectQueue.intervalMinutes,
            scheduleTimes: projectQueue.scheduleTimes,
            scheduleDays: projectQueue.scheduleDays,
            cronExpression: projectQueue.startCronExpression,
            oneTimeAt: projectQueue.oneTimeAt,
          }),
        )
      : hasScheduleDefinition(job);
  const schedulePaused = priorityModeActive
    ? projectQueue?.status === 'paused'
    : !scheduleActive;
  const nextRunCard = getNextRunCardState({
    scheduleConfigured,
    schedulePaused,
    nextRunAt,
    timezone: effectiveTimezone,
  });
  const summaryCards = [
    {
      label: 'Records synced',
      value: (job.recordsSynced ?? 0).toLocaleString(),
      description: 'Total synced records',
      icon: Database,
    },
    {
      label: 'Schedule at',
      value: scheduleConfigured
        ? capitalizeFirst(scheduleSummary)
        : 'Not configured',
      description: scheduleConfigured
        ? 'Current active schedule'
        : 'Configure a schedule',
      icon: CalendarClock,
    },
    {
      label: 'Avg duration',
      value: formatDurationMs(performance.averageDurationMs),
      description: 'Based on recent runs',
      icon: Timer,
    },
    {
      label: 'Last sync',
      value: performance.lastSyncAt
        ? formatScheduledAt(performance.lastSyncAt, effectiveTimezone)
        : 'Never',
      description: performance.lastSyncAt
        ? 'Most recent completed run'
        : 'No completed runs',
      icon: Clock,
    },
    {
      label: 'Next run',
      value: nextRunCard.value,
      description: nextRunCard.description,
      icon: Play,
    },
  ];
  const canActivate =
    project?.status === 'active' &&
    hasConnection &&
    jobFieldMappings.length > 0 &&
    jobFieldMappings.some((mapping) => mapping.matchDestKey);

  // Sync is physically impossible when already running or queued — keep disabled.
  // When inactive the button stays clickable; clicking it guides to the existing
  // inline alert below instead of opening the dialog.
  const syncBlocked = queued || isSyncing;
  const inactiveBlocked = !job.isEnabled;
  const summaryRun =
    activeRunLog?.status === 'running' || activeRunLog?.id
      ? activeRunLog
      : runLogs[0];
  const summaryRunning = isSyncing || summaryRun?.status === 'running';
  const currentProgress =
    liveProgress && (!summaryRun?.id || liveProgress.runId === summaryRun.id)
      ? liveProgress
      : null;
  const createdCount = Math.max(
    currentProgress?.createdCount ?? 0,
    summaryRun?.createdCount ?? 0,
  );
  const updatedCount = Math.max(
    currentProgress?.updatedCount ?? 0,
    summaryRun?.updatedCount ?? 0,
  );
  const skippedCount = Math.max(
    currentProgress?.skippedCount ?? 0,
    summaryRun?.skippedCount ?? 0,
  );
  const failedCount = Math.max(
    currentProgress?.failedCount ?? 0,
    summaryRun?.failedCount ?? 0,
  );
  const summaryProcessed = Math.max(
    currentProgress?.recordsAttempted ?? 0,
    (currentProgress?.recordsProcessed ?? 0) +
      (currentProgress?.failedCount ?? 0),
    summaryRun?.status === 'completed' ? (summaryRun.totalFetched ?? 0) : 0,
    createdCount + updatedCount + skippedCount + failedCount,
  );
  const summaryTotal =
    (summaryRun?.status === 'completed' ? summaryRun.totalFetched : null) ??
    currentProgress?.totalRecords ??
    (summaryRun?.triggeredBy === 'limit_sync'
      ? summaryRun.recordLimit
      : summaryRunning && summaryRun?.triggeredBy !== 'sync_all'
        ? summaryRun?.totalFetched
        : undefined);
  const showingSummary = summaryRunning || !!summaryRun?.id;
  const renderProgress = (
    variant: 'default' | 'compact',
    defaultOpen = true,
  ) =>
    showingSummary ? (
      <SyncRunProgress
        variant={variant}
        defaultOpen={defaultOpen}
        runId={summaryRun?.id}
        jobId={job.id}
        status={
          summaryRunning
            ? 'running'
            : (summaryRun?.executionStatus ?? summaryRun?.status)
        }
        totalRecords={summaryTotal}
        processedRecords={summaryProcessed}
        completedBatches={Math.max(
          currentProgress?.page ?? 0,
          summaryRun?.totalPages ?? 0,
        )}
        currentBatch={currentProgress?.currentBatch}
        batchProcessed={currentProgress?.batchProcessed}
        batchTotal={currentProgress?.batchTotal}
        totalBatches={
          summaryRun?.status === 'completed'
            ? summaryRun.totalPages
            : currentProgress?.totalBatches
        }
        createdCount={createdCount}
        updatedCount={updatedCount}
        skippedCount={skippedCount}
        failedCount={failedCount}
        etaSeconds={currentProgress?.etaSeconds}
        startedAt={summaryRun?.startedAt}
        finishedAt={summaryRun?.finishedAt}
        durationMs={summaryRun?.durationMs}
        triggeredBy={summaryRun?.triggeredBy}
        sourceLabel={summaryRun?.sourceObject ?? job.sourceObject}
        destinationLabel={summaryRun?.destObject ?? job.destObject}
        errorMessage={summaryRun?.errorMessage}
        onStop={summaryRunning ? () => void handleStop() : undefined}
        stopping={stopping}
      />
    ) : null;
  const progress = renderProgress('default', true);

  return (
    <div className="space-y-5">
      {!manualDialogOpen && progress}

      <Card size="sm" className="min-w-0 rounded-4xl">
        <CardHeader>
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold">
              Job performance
            </CardTitle>
            <CardDescription className="text-xs leading-tight">
              See how this job is doing and sync fresh data whenever you need
              to.
            </CardDescription>
          </div>
          <CardAction className="flex flex-wrap items-center gap-2">
            {runLogs[0]?.bullmqJobId && queued && !isSyncing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelQueue}
                disabled={cancellingQueue}
                className="text-destructive"
              >
                <X /> {cancellingQueue ? 'Cancelling…' : 'Cancel queue'}
              </Button>
            )}
            {failedQueueJob && !isSyncing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetryQueue}
                disabled={retryingQueue}
              >
                <RotateCcw /> {retryingQueue ? 'Retrying…' : 'Retry'}
              </Button>
            )}
            <Button
              onClick={() => {
                if (inactiveBlocked) {
                  triggerInactiveGuide();
                  return;
                }
                setManualDialogOpen(true);
              }}
              disabled={syncBlocked}
            >
              <Play /> Sync now
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {summaryCards.map((card) => (
              <SyncSummaryCard key={card.label} {...card} />
            ))}
          </div>

          {queued && !isSyncing && (
            <Alert className="py-2.5">
              <Clock />
              <AlertDescription className="space-y-0.5 [&_p:not(:last-child)]:mb-0">
                <p className="text-foreground font-semibold">Run queued</p>
                <p>
                  Cancel the queued run before starting a different manual run.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {manualDialogOpen && (
        <StartSyncModal
          projectId={projectId}
          jobId={job.id}
          job={job}
          hasBaseline={Boolean(
            job.lastSyncedAt ||
              runLogs.some(
                (r) => r.status === 'completed' || r.status === 'success',
              ),
          )}
          pipelineRequired={pipelineRequired}
          pipelineConfigured={pipelineConfigured}
          disabled={syncBlocked}
          onGoToPipeline={() => {
            setManualDialogOpen(false);
            handleTabChange('pipeline');
          }}
          onClose={() => setManualDialogOpen(false)}
          onRunNow={() => void handleRunNow()}
          onLimitSyncStarted={() => void beginTracking()}
          onLimitSyncDone={() => {
            setManualDialogOpen(false);
            void refetch();
          }}
          onSyncAll={(range) => void handleSyncAll(undefined, range)}
          runProgress={
            summaryRunning ? renderProgress('compact', false) : undefined
          }
        />
      )}

      <UpgradeRequiredDialog
        open={upgradeDialog.open}
        onOpenChange={(open) => setUpgradeDialog({ ...upgradeDialog, open })}
        message={upgradeDialog.message}
      />
    </div>
  );
}
