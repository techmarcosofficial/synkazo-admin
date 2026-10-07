import {
  CalendarClock,
  Clock,
  Database,
  History,
  Play,
  RotateCcw,
  Timer,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

import { useJobDetailContext } from '../context';

import StatusBadge from '@/components/shared/StatusBadge';
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
import JobScheduleModal from '@/features/jobs/components/schedule/JobScheduleModal';
import ScheduleEnableToggle from '@/features/jobs/components/schedule/ScheduleEnableToggle';
import {
  capitalizeFirst,
  formatScheduledAt,
  getNextRunCardState,
  hasScheduleDefinition,
} from '@/features/jobs/lib/jobScheduleSettings';
import { formatSchedule } from '@/features/jobs/utils';
import { selectJobOnboardingState } from '@/features/onboarding';
import {
  deriveSyncJobSummary,
  formatDurationMs,
} from '@/features/projects/lib/syncJobSummary';
import { BROWSER_TIMEZONE } from '@/lib/timezones';
import { usePriorityQueueQuery } from '@/queries/usePriorityQueue';
import type { Project, ProjectEnvironment } from '@/types';

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
    <div className="bg-secondary/40 border-border/60 min-w-0 space-y-2 rounded-2xl border p-4 transition-colors">
      <span className="bg-background text-muted-foreground border-border/40 flex size-8 items-center justify-center rounded-xl border">
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-foreground text-base leading-tight font-bold tracking-tight tabular-nums">
          {value}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs font-medium">
          {label}
        </p>
        <p className="text-muted-foreground/80 mt-0.5 text-[11px] leading-tight font-normal">
          {description}
        </p>
      </div>
    </div>
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
    handleTabChange,
    manualDialogOpen,
    setManualDialogOpen,
    scheduleToggling,
    handleScheduleToggle,
  } = useJobDetailContext();

  const [searchParams, setSearchParams] = useSearchParams();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  useEffect(() => {
    if (
      searchParams.get('openSchedule') === 'true' ||
      searchParams.get('section') === 'schedule'
    ) {
      setScheduleModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('openSchedule');
      next.delete('section');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
  const activeEnvironment =
    (project as (Project & { activeEnvironment?: ProjectEnvironment }) | null)
      ?.activeEnvironment ?? project?.active_environment;
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
      label: 'Total records synced',
      value: (job.recordsSynced ?? 0).toLocaleString(),
      description: 'Across all executions',
      icon: Database,
    },
    {
      label: 'Last run',
      value: performance.lastSyncAt
        ? formatDistanceToNow(new Date(performance.lastSyncAt), {
            addSuffix: true,
          })
        : 'Never',
      description: performance.lastSyncAt
        ? 'Previous sync execution'
        : 'No runs recorded yet',
      icon: History,
    },
    {
      label: 'Next run',
      value: nextRunCard.value,
      description: nextRunCard.description,
      icon: Play,
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
  ];
  const canActivate =
    project?.status === 'active' &&
    hasConnection &&
    jobFieldMappings.length > 0 &&
    jobFieldMappings.some((mapping) => mapping.matchDestKey);

  const onboarding = selectJobOnboardingState({
    mappings: jobFieldMappings,
    pipelineRequired,
    pipelineConfigured,
    runLogs,
    lastSyncedAt: job.lastSyncedAt,
  });
  const hasRunHistory = onboarding.testComplete;
  const canStartSync =
    canActivate &&
    onboarding.configurationReady &&
    (job.isEnabled || !hasRunHistory);

  const syncBlocked = queued || isSyncing || !canStartSync;
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
        onViewHistory={() =>
          handleTabChange('run-history', {
            searchParams: summaryRun?.id ? { runId: summaryRun.id } : undefined,
          })
        }
        onViewRun={(targetRunId) => {
          const runIdToView = targetRunId || summaryRun?.id;
          handleTabChange('run-history', {
            searchParams: runIdToView ? { runId: runIdToView } : undefined,
          });
        }}
        stopping={stopping}
      />
    ) : null;
  const progress = renderProgress(
    'default',
    Boolean(summaryRunning || activeRunLog),
  );
  const overviewMessage = queued
    ? {
        title: 'Your first run is queued',
        description: 'This overview will show results once the run finishes.',
      }
    : summaryRunning
      ? {
          title: 'Your first sync is in progress',
          description: 'This overview will show results once the run finishes.',
        }
      : runLogs.length > 0
        ? {
            title: 'No completed sync yet',
            description:
              'Review the previous attempt in Run History. After a run completes, you’ll see records synced, run timing, and upcoming activity here.',
          }
        : {
            title: 'Your sync overview starts after the first run',
            description:
              'Follow the setup steps above to prepare this job and run its first sync. Once it finishes, you’ll see records synced, run timing, and upcoming activity here.',
          };

  return (
    <div className="space-y-5">
      {hasRunHistory ? (
        <Card size="sm" className="min-w-0 rounded-4xl">
          <CardHeader visualLevel="section">
            <div className="space-y-0.5">
              <CardTitle>Sync overview</CardTitle>
              <CardDescription>
                Monitor sync activity and trigger fresh data syncs whenever you
                need to.
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
                variant="outline"
                size="sm"
                onClick={() => setScheduleModalOpen(true)}
              >
                <CalendarClock /> Schedule
              </Button>
              <Button
                size="sm"
                onClick={() => setManualDialogOpen(true)}
                disabled={syncBlocked}
              >
                <Play /> Sync now
              </Button>
            </CardAction>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Sync progress — appears right after header on sync */}
            {!manualDialogOpen && progress}

            {/* Embedded Automated Schedule Card */}
            <div className="bg-secondary/30 border-border/70 flex flex-col gap-3 rounded-2xl border p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="bg-background text-muted-foreground border-border/50 flex size-8 shrink-0 items-center justify-center rounded-xl border">
                  <CalendarClock className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-foreground text-sm font-semibold">
                      Automated Schedule
                    </h4>
                    <StatusBadge
                      status={schedulePaused ? 'paused' : 'active'}
                      label={schedulePaused ? 'Paused' : 'Active'}
                    />
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {scheduleConfigured
                      ? `Runs ${capitalizeFirst(scheduleSummary)} (${effectiveTimezone})`
                      : 'No automated schedule configured.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!priorityModeActive && !isTwoWay && (
                  <ScheduleEnableToggle
                    projectId={projectId}
                    jobId={job.id}
                    job={job}
                    scheduleToggling={scheduleToggling}
                    pipelineRequired={pipelineRequired}
                    pipelineConfigured={pipelineConfigured}
                    onGoToPipeline={() => handleTabChange('pipeline')}
                    onScheduleToggle={handleScheduleToggle}
                    className="w-auto"
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScheduleModalOpen(true)}
                >
                  <CalendarClock className="size-3.5" />
                  Configure schedule
                </Button>
              </div>
            </div>

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
                    Cancel the queued run before starting a different manual
                    run.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <section className="min-w-0 space-y-5 py-8" aria-label="Sync overview">
          {!manualDialogOpen && progress}
          <div className="mx-auto max-w-xl space-y-2 text-center">
            <h2 className="font-heading text-foreground text-lg font-semibold">
              {overviewMessage.title}
            </h2>
            <p className="text-muted-foreground text-sm">
              {overviewMessage.description}
            </p>
          </div>
          {queued && !isSyncing && runLogs[0]?.bullmqJobId && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelQueue}
                disabled={cancellingQueue}
              >
                <X /> {cancellingQueue ? 'Cancelling…' : 'Cancel queue'}
              </Button>
            </div>
          )}
          {failedQueueJob && !isSyncing && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryQueue}
                disabled={retryingQueue}
              >
                <RotateCcw /> {retryingQueue ? 'Retrying…' : 'Retry queued run'}
              </Button>
            </div>
          )}
        </section>
      )}

      {manualDialogOpen && (
        <StartSyncModal
          projectId={projectId}
          jobId={job.id}
          job={job}
          environment={activeEnvironment}
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
          onRunNow={() => {
            setManualDialogOpen(false);
            void handleRunNow();
          }}
          onLimitSyncStarted={() => {
            void beginTracking();
          }}
          onLimitSyncDone={() => {
            void refetch();
          }}
          onSyncAll={(range) => {
            void handleSyncAll(undefined, range);
          }}
        />
      )}

      <JobScheduleModal
        projectId={projectId}
        jobId={job.id}
        job={job}
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        onSaved={refetch}
      />

      <UpgradeRequiredDialog
        open={upgradeDialog.open}
        onOpenChange={(open) => setUpgradeDialog({ ...upgradeDialog, open })}
        message={upgradeDialog.message}
      />
    </div>
  );
}
