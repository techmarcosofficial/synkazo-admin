import {
  CalendarClock,
  Clock,
  Database,
  History,
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
import StatusBadge from '@/components/shared/StatusBadge';
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
import type { ExtSyncRun } from '@/features/jobs/hooks';
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

function formatRunTime(value?: string) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function triggerLabel(value?: string) {
  if (!value) return 'Manual';
  const labels: Record<string, string> = {
    manual: 'Manual',
    sync_all: 'All records',
    limit_sync: 'Limited run',
    cron: 'Automatic schedule',
    resume: 'Resumed',
    webhook: 'Webhook',
    api: 'API',
  };
  return (
    labels[value] ??
    value
      .split('_')
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(' ')
  );
}

function processedRecords(run: ExtSyncRun) {
  return (
    run.recordsProcessed ??
    (run.createdCount ?? 0) +
      (run.updatedCount ?? 0) +
      (run.skippedCount ?? 0) +
      (run.failedCount ?? 0)
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
  } = useJobDetailContext();
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  // Ref to the existing "Job is inactive" inline alert — used to scroll it into
  // view and briefly ring-highlight it when the user clicks Sync now while the
  // job is inactive, guiding them to the blocker without a toast or modal.
  const inactiveAlertRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlighted, setHighlighted] = useState(false);
  const highlightInactiveAlert = useCallback(() => {
    const el = inactiveAlertRef.current;
    if (!el) return;
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    el.focus({ preventScroll: true });
    const { top, bottom } = el.getBoundingClientRect();
    if (top < 0 || bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    setHighlighted(true);
    highlightTimerRef.current = setTimeout(() => {
      setHighlighted(false);
      highlightTimerRef.current = null;
    }, 1800);
  }, []);
  useEffect(
    () => () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    },
    [],
  );

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
  const summaryProcessed =
    (summaryRunning ? liveProgress?.recordsProcessed : undefined) ??
    summaryRun?.recordsProcessed ??
    summaryRun?.totalFetched ??
    (summaryRun?.createdCount ?? 0) +
      (summaryRun?.updatedCount ?? 0) +
      (summaryRun?.skippedCount ?? 0) +
      (summaryRun?.failedCount ?? 0);
  const summaryTotal =
    (summaryRunning ? liveProgress?.totalRecords : undefined) ??
    summaryRun?.totalFetched ??
    summaryRun?.recordsProcessed ??
    summaryProcessed;
  const showingSummary = summaryRunning || !!summaryRun?.id;
  const renderProgress = (variant: 'default' | 'compact') =>
    showingSummary ? (
      <SyncRunProgress
        variant={variant}
        runId={summaryRun?.id}
        jobId={job.id}
        status={
          summaryRunning
            ? 'running'
            : (summaryRun?.executionStatus ?? summaryRun?.status)
        }
        totalRecords={summaryTotal}
        processedRecords={summaryProcessed}
        createdCount={summaryRun?.createdCount}
        updatedCount={summaryRun?.updatedCount}
        skippedCount={summaryRun?.skippedCount}
        failedCount={summaryRun?.failedCount}
        etaSeconds={summaryRunning ? liveProgress?.etaSeconds : undefined}
        ratePerSec={summaryRunning ? liveProgress?.ratePerSec : undefined}
        startedAt={summaryRun?.startedAt}
        finishedAt={summaryRun?.finishedAt}
        durationMs={summaryRun?.durationMs}
        triggeredBy={summaryRun?.triggeredBy}
        sourceLabel={summaryRun?.sourceObject ?? job.sourceObject}
        destinationLabel={summaryRun?.destObject ?? job.destObject}
        sourceStatus={hasConnection ? 'Connected' : 'Unavailable'}
        errorMessage={summaryRun?.errorMessage}
        onStop={summaryRunning ? () => void handleStop() : undefined}
        stopping={stopping}
      />
    ) : null;
  const progress = renderProgress('default');
  const recentRuns = runLogs.slice(0, 5);

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
                  highlightInactiveAlert();
                  return;
                }
                setManualDialogOpen(true);
              }}
              disabled={syncBlocked}
              aria-controls={
                inactiveBlocked ? 'job-inactive-notification' : undefined
              }
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

          {!job.isEnabled && !isSyncing && (
            <Alert
              id="job-inactive-notification"
              ref={inactiveAlertRef}
              tabIndex={-1}
              className={`py-2.5 transition-shadow duration-300 outline-none ${
                highlighted
                  ? 'ring-primary ring-offset-background ring-2 ring-offset-2'
                  : ''
              }`}
            >
              <Info />
              <AlertDescription className="space-y-0.5 [&_p:not(:last-child)]:mb-0">
                <p className="text-foreground font-semibold">Job is inactive</p>
                <p>
                  {canActivate ? (
                    <>
                      <Button
                        variant="link"
                        size="xs"
                        className="h-auto p-0"
                        onClick={() => void handleToggle()}
                        disabled={toggling}
                      >
                        {toggling ? 'Activating…' : 'Activate job'}
                      </Button>{' '}
                      before starting a manual run.
                    </>
                  ) : (
                    'Complete the required setup before activating this job and starting a manual run.'
                  )}
                </p>
              </AlertDescription>
            </Alert>
          )}

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

      <Card size="sm" className="min-w-0 rounded-4xl">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
              <History className="size-4.5" aria-hidden="true" />
            </span>
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-semibold">
                Recent activity
              </CardTitle>
              <CardDescription className="text-xs leading-tight">
                The five most recent runs for this job.
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Button
              variant="link"
              size="sm"
              onClick={() => handleTabChange('run-history')}
            >
              View all
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {recentRuns.length === 0 ? (
            <div className="text-muted-foreground rounded-3xl border border-dashed px-4 py-8 text-center text-sm">
              No runs yet. Start a manual sync to see activity here.
            </div>
          ) : (
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-3xl border px-4 py-3"
                >
                  <StatusBadge
                    status={run.executionStatus ?? run.status}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {triggerLabel(run.triggeredBy)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatRunTime(run.startedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {processedRecords(run).toLocaleString()}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      records processed
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {manualDialogOpen && (
        <StartSyncModal
          projectId={projectId}
          jobId={job.id}
          job={job}
          hasBaseline={!!job.lastSyncedAt}
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
          onLimitSyncDone={() => void refetch()}
          onSyncAll={(range) => void handleSyncAll(undefined, range)}
          runProgress={renderProgress('compact')}
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
