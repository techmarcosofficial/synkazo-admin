import {
  CalendarClock,
  Clock,
  Database,
  History,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

import { useJobDetailContext } from '../context';
import JobSummaryMetric from '../JobSummaryMetric';

import UpgradeRequiredDialog from '@/components/shared/UpgradeRequiredDialog';
import HeadingPair from '@/components/shared/HeadingPair';
import SyncRunProgress from '@/components/sync/SyncRunProgress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import JobScheduleModal from '@/features/jobs/components/schedule/JobScheduleModal';
import {
  capitalizeFirst,
  formatScheduledAt,
  getNextRunCardState,
  hasScheduleDefinition,
} from '@/features/jobs/lib/jobScheduleSettings';
import { formatSchedule } from '@/features/jobs/utils';
import { selectJobOnboardingState } from '@/features/onboarding';
import { deriveSyncJobSummary } from '@/features/projects/lib/syncJobSummary';
import { useManualSyncAvailability } from '@/features/jobs/hooks/useManualSyncAvailability';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { BROWSER_TIMEZONE } from '@/lib/timezones';
import { usePriorityQueueQuery } from '@/queries/usePriorityQueue';
import type { Project, ProjectEnvironment } from '@/types';

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
    scheduleToggling,
    handleScheduleToggle,
  } = useJobDetailContext();

  const [searchParams, setSearchParams] = useSearchParams();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const { hasPermission } = useSynkazoAuth();
  const canRunJob = hasPermission('job.run');
  const canEditJob = hasPermission('job.edit');

  useEffect(() => {
    if (
      searchParams.get('openSchedule') === 'true' ||
      searchParams.get('section') === 'schedule'
    ) {
      setScheduleModalOpen(canEditJob);
      const next = new URLSearchParams(searchParams);
      next.delete('openSchedule');
      next.delete('section');
      setSearchParams(next, { replace: true });
    }
  }, [canEditJob, searchParams, setSearchParams]);

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
      icon: Database,
    },
    {
      label: 'Last run',
      value: performance.lastSyncAt
        ? formatDistanceToNow(new Date(performance.lastSyncAt), {
            addSuffix: true,
          })
        : 'Never',
      icon: History,
    },
    {
      label: 'Next run',
      value: nextRunCard.value,
      icon: Play,
    },
    {
      label: 'Schedule',
      value: scheduleConfigured
        ? capitalizeFirst(scheduleSummary)
        : 'Not configured',
      icon: CalendarClock,
    },
  ];
  const { canActivate, onboarding, hasRunHistory, canStartSync, syncBlocked } =
    useManualSyncAvailability();
  const showFullOverview = hasRunHistory || onboarding.configurationReady;
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
        dismissible
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
        onStop={
          summaryRunning && canRunJob ? () => void handleStop() : undefined
        }
        onViewHistory={() =>
          handleTabChange('settings', {
            searchParams: {
              section: 'sync-history',
              runId: summaryRun?.id,
            },
          })
        }
        onViewRun={(targetRunId) => {
          const runIdToView = targetRunId || summaryRun?.id;
          handleTabChange('settings', {
            searchParams: { section: 'sync-history', runId: runIdToView },
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
      {showFullOverview ? (
        <div className="min-w-0 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <HeadingPair
              level="h2"
              visualLevel="section"
              title="Sync overview"
              subtitle="Monitor sync activity and trigger fresh data syncs whenever you need to."
              subtitleInTooltip
            />
            <div className="flex flex-wrap items-center gap-2">
              {runLogs[0]?.bullmqJobId && queued && !isSyncing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelQueue}
                  disabled={!canRunJob || cancellingQueue}
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
                  disabled={!canRunJob || retryingQueue}
                >
                  <RotateCcw /> {retryingQueue ? 'Retrying…' : 'Retry'}
                </Button>
              )}
              {canEditJob && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScheduleModalOpen(true)}
                >
                  <CalendarClock /> Schedule
                </Button>
              )}
              <Button
                id="sync-now-button"
                size="sm"
                data-flow-next-action={
                  !hasRunHistory && canStartSync ? 'true' : undefined
                }
                data-attention={
                  !hasRunHistory && canStartSync ? 'true' : undefined
                }
                className="bg-(--brand-orange) font-medium text-white shadow-xs hover:bg-(--brand-orange)/90"
                onClick={() => handleTabChange('run-sync')}
                disabled={!canRunJob || syncBlocked}
              >
                <Play /> Sync now
              </Button>
            </div>
          </div>

          <div className="space-y-5">
            {/* Sync progress — appears right after header on sync */}
            {progress}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {summaryCards.map((card) => (
                <JobSummaryMetric key={card.label} {...card} />
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
          </div>
        </div>
      ) : (
        <section className="min-w-0 space-y-5 py-8" aria-label="Sync overview">
          {progress}
          <div className="mx-auto max-w-xl space-y-2 text-center">
            <h2 className="font-heading text-foreground text-lg font-semibold">
              {overviewMessage.title}
            </h2>
            <p className="text-muted-foreground text-sm">
              {overviewMessage.description}
            </p>
          </div>
          {canRunJob && queued && !isSyncing && runLogs[0]?.bullmqJobId && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelQueue}
                disabled={!canRunJob || cancellingQueue}
              >
                <X /> {cancellingQueue ? 'Cancelling…' : 'Cancel queue'}
              </Button>
            </div>
          )}
          {canRunJob && failedQueueJob && !isSyncing && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryQueue}
                disabled={!canRunJob || retryingQueue}
              >
                <RotateCcw /> {retryingQueue ? 'Retrying…' : 'Retry queued run'}
              </Button>
            </div>
          )}
        </section>
      )}

      {scheduleModalOpen && canEditJob && (
        <JobScheduleModal
          projectId={projectId}
          jobId={job.id}
          job={job}
          open={scheduleModalOpen}
          onOpenChange={setScheduleModalOpen}
          onSaved={refetch}
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
