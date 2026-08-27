import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { ExtJob, ExtSyncRun, ScheduleTogglePayload } from './useJobDetail';

import { jobsApi } from '@/api/jobs';
import { notificationsApi } from '@/api/notificationsApi';
import { syncLogsApi } from '@/api/syncLogs';
import { sseClient } from '@/lib/sseClient';
import { showToast } from '@/lib/toast';
import type { Job } from '@/types';

interface LiveProgress {
  jobId?: string | number;
  totalRecords?: number;
  recordsProcessed?: number;
  etaSeconds?: number;
  ratePerSec?: number;
}

interface UseJobRunStateInput {
  projectId: string;
  jobId: string;
  job: ExtJob | null;
  runLogs: ExtSyncRun[];
  patchJob: (patch: Partial<ExtJob>) => void;
  refetch: () => void | Promise<void>;
}

// Owns everything about "is this job currently syncing": the live SSE
// progress feed, polling the active run log to completion, and the
// run/stop/toggle/queue action handlers. Extracted out of the page component
// (mirrors how Projects splits non-trivial orchestration into hooks like
// useProjectEnvironmentActivation) so JobDetailPage/JobHeader only compose.
export function useJobRunState({
  projectId,
  jobId,
  job,
  runLogs,
  patchJob,
  refetch,
}: UseJobRunStateInput) {
  const [activeRunLog, setActiveRunLog] = useState<Partial<ExtSyncRun> | null>(
    null,
  );
  const [running, setRunning] = useState(false);
  const [fullResyncing, setFullResyncing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [scheduleToggling, setScheduleToggling] = useState(false);
  const [cancellingQueue, setCancellingQueue] = useState(false);
  const [retryingQueue, setRetryingQueue] = useState(false);
  const [liveProgress, setLiveProgress] = useState<LiveProgress | null>(null);
  const [upgradeDialog, setUpgradeDialog] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (data: unknown) => {
      const d = data as LiveProgress;
      if (String(d.jobId) === String(jobId)) setLiveProgress(d);
    };
    sseClient.on('sync:progress', handler);
    return () => {
      sseClient.off?.('sync:progress', handler);
    };
  }, [jobId]);

  const pollActiveRun = useCallback(
    async (runLogId: string) => {
      try {
        const updated = await syncLogsApi.getRunLog(projectId, jobId, runLogId);
        setActiveRunLog(updated as ExtSyncRun);
        if (updated && updated.status === 'running') {
          pollRef.current = setTimeout(() => pollActiveRun(runLogId), 2000);
        } else {
          await refetch();
        }
      } catch {
        /* ignore */
      }
    },
    [projectId, jobId, refetch],
  );

  // Reacts to the initial load and every subsequent refetch — starts (or
  // continues) polling a currently-running run.
  useEffect(() => {
    const latestRun = runLogs[0];
    if (latestRun && latestRun.status === 'running') {
      setActiveRunLog(latestRun);
      if (!pollRef.current)
        pollRef.current = setTimeout(() => pollActiveRun(latestRun.id), 2000);
    } else {
      setActiveRunLog((prev) => (prev?.id == null ? null : prev));
    }
  }, [runLogs]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const startPollingLatestRun = useCallback(async () => {
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 600));
        const res = await syncLogsApi.listRunLogs(projectId, jobId, {
          limit: 1,
        });
        const latest = (res.data || [])[0] as ExtSyncRun | undefined;
        if (latest && latest.status === 'running') {
          setActiveRunLog(latest);
          pollRef.current = setTimeout(() => pollActiveRun(latest.id), 2000);
          return;
        }
      } catch {
        /* ignore */
      }
    }
    await refetch();
  }, [projectId, jobId, pollActiveRun, refetch]);

  // Shared "a run was just triggered elsewhere" step — used after Run Now /
  // Full Resync trigger the API call, and by LimitSyncModal's onDone (which
  // triggers its own run API call before handing control back here).
  const beginTracking = useCallback(async () => {
    setActiveRunLog({
      id: undefined,
      status: 'running',
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      totalFetched: 0,
    });
    await refetch();
    await startPollingLatestRun();
  }, [refetch, startPollingLatestRun]);

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const resp = (await jobsApi.runJob(projectId, jobId)) as {
        alreadyRunning?: boolean;
      } | null;
      if (resp?.alreadyRunning) {
        toast.error(
          'A sync is already in progress. Stop it first or wait for it to finish.',
        );
        return;
      }
      await beginTracking();
      showToast.success('Sync triggered! Job will run shortly.');
    } catch (err) {
      const e = err as {
        response?: { data?: { message?: string; code?: string } };
      };
      if (e?.response?.data?.code === 'PLAN_LIMIT_RECORDS') {
        setUpgradeDialog({
          open: true,
          message:
            e.response!.data!.message ??
            "You've reached your plan's monthly record sync limit.",
        });
      } else {
        toast.error(
          e?.response?.data?.message ??
            'Failed to start sync. Please try again.',
        );
      }
    }
    setRunning(false);
  };

  const handleSyncAll = async (
    onStarted?: () => void,
    range?: { startDate?: string; endDate?: string },
  ) => {
    setFullResyncing(true);
    try {
      // A syncAllPage left over from an interrupted previous Sync All means resume from
      // there instead of restarting at page 1 (item 36) — the same button just picks up
      // where it left off, mirroring how the incremental "Run" button already resumes from
      // job.checkpointPage without a separate control. Only reuse the job's persisted range
      // when actually resuming (syncAllPage set) — otherwise a fresh trigger with no explicit
      // range must not silently inherit a stale range left over from a completed prior run.
      const isResume = job?.syncAllPage != null;
      const resp = (await jobsApi.runJob(projectId, jobId, {
        full: true,
        startPage: job?.syncAllPage ?? undefined,
        startDate:
          range?.startDate ??
          (isResume ? (job?.syncAllRangeStart ?? undefined) : undefined),
        endDate:
          range?.endDate ??
          (isResume ? (job?.syncAllRangeEnd ?? undefined) : undefined),
      })) as {
        alreadyRunning?: boolean;
      } | null;
      if (resp?.alreadyRunning) {
        toast.error(
          'A sync is already in progress. Stop it first or wait for it to finish.',
        );
        return;
      }
      onStarted?.();
      await beginTracking();
    } catch (err) {
      const e = err as {
        response?: { data?: { message?: string; code?: string } };
      };
      if (e?.response?.data?.code === 'PLAN_LIMIT_RECORDS') {
        setUpgradeDialog({
          open: true,
          message:
            e.response!.data!.message ??
            "You've reached your plan's monthly record sync limit.",
        });
      } else {
        toast.error(
          e?.response?.data?.message ??
            'Failed to start full resync. Please try again.',
        );
      }
    }
    setFullResyncing(false);
  };

  const handleScheduleToggle = async (payload?: ScheduleTogglePayload) => {
    setScheduleToggling(true);
    try {
      let updated: Job;
      if (
        job!.scheduleState === 'paused' ||
        job!.scheduleState === 'paused_limit_reached'
      ) {
        updated = await jobsApi.resumeSchedule(
          projectId,
          jobId,
          payload?.resumeMode,
        );
        showToast.success(
          payload?.resumeMode === 'start_now'
            ? 'Schedule resumed from now — missed changes were skipped.'
            : 'Schedule resumed — catching up on missed changes.',
        );
      } else if (job!.syncEnabled) {
        updated = await jobsApi.pauseSchedule(projectId, jobId);
        showToast.success('Schedule paused. Runs will not fire until resumed.');
      } else {
        updated = await jobsApi.setSyncEnabled(
          projectId,
          jobId,
          true,
          payload?.initialSyncPeriod,
          payload?.customSince,
        );
        showToast.success(
          'Schedule started — sync will run per configured interval.',
        );
      }
      patchJob(updated as ExtJob);
    } catch {
      showToast.error('Something went wrong. Please try again.');
    }
    setScheduleToggling(false);
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await jobsApi.stopJob(projectId, jobId);
      if (pollRef.current) {
        clearTimeout(pollRef.current);
        pollRef.current = null;
      }
      await new Promise((resolve) => {
        const check = async () => {
          try {
            const updated = (await jobsApi.getJob(projectId, jobId)) as ExtJob;
            if (!updated.isRunning || updated.status !== 'active') {
              resolve(updated);
              return;
            }
          } catch {
            resolve(null);
            return;
          }
          pollRef.current = setTimeout(check, 1500);
        };
        check();
      });
      setActiveRunLog(null);
      await refetch();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message ??
          'Failed to stop the sync run. Please try again.',
      );
    }
    setStopping(false);
  };

  const handleCancelQueue = async () => {
    const bullJobId = runLogs[0]?.bullmqJobId;
    if (!bullJobId) return;
    setCancellingQueue(true);
    try {
      await notificationsApi.removeQueueJob(bullJobId);
      toast.success('Removed from queue');
      await refetch();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Cancel failed');
    } finally {
      setCancellingQueue(false);
    }
  };

  const handleRetryQueue = async () => {
    const bullJobId = runLogs[0]?.bullmqJobId;
    if (!bullJobId) return;
    setRetryingQueue(true);
    try {
      await notificationsApi.retryQueueJob(bullJobId);
      toast.success('Job re-queued');
      await refetch();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Retry failed');
    } finally {
      setRetryingQueue(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const updated = (await jobsApi.toggleJob(projectId, jobId)) as ExtJob;
      patchJob(updated);
      showToast.success(updated.isEnabled ? 'Job resumed.' : 'Job paused.');
    } catch {
      showToast.error('Something went wrong. Please try again.');
    }
    setToggling(false);
  };

  const isSyncing =
    running ||
    fullResyncing ||
    stopping ||
    activeRunLog?.status === 'running' ||
    runLogs[0]?.status === 'running';

  return {
    activeRunLog,
    liveProgress,
    upgradeDialog,
    setUpgradeDialog,
    running,
    fullResyncing,
    stopping,
    toggling,
    scheduleToggling,
    cancellingQueue,
    retryingQueue,
    isSyncing,
    beginTracking,
    handleRunNow,
    handleSyncAll,
    handleScheduleToggle,
    handleStop,
    handleCancelQueue,
    handleRetryQueue,
    handleToggle,
  };
}
