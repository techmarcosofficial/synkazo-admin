import { AlertCircle, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { jobsApi } from '@/api/jobs';
import IndividualScheduleRow from '@/components/jobs/scheduler/IndividualScheduleRow';
import {
  canPauseIndividualSchedule,
  canResumeIndividualSchedule,
} from '@/components/jobs/scheduler/individualScheduleActions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import JobScheduleModal from '@/features/jobs/components/schedule/JobScheduleModal';
import {
  buildScheduleUpdatePayload,
  hasScheduleDefinition,
} from '@/features/jobs/lib/jobScheduleSettings';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { showToast } from '@/lib/toast';
import type { SchedulerJob } from '@/types';

export type IndividualScheduleDraft = ReturnType<
  typeof buildScheduleUpdatePayload
>;

function scheduleActive(job: SchedulerJob): boolean {
  return (
    job.syncDirection !== 'two_way' &&
    !!job.isEnabled &&
    hasScheduleDefinition(job) &&
    !!job.syncEnabled &&
    job.scheduleState !== 'paused' &&
    job.scheduleState !== 'paused_limit_reached'
  );
}

function schedulePaused(job: SchedulerJob): boolean {
  return (
    job.syncDirection !== 'two_way' &&
    !!job.isEnabled &&
    hasScheduleDefinition(job) &&
    job.scheduleState === 'paused'
  );
}

export default function IndividualSchedulerList({
  projectId,
  refreshKey = 0,
  scheduleDrafts = {},
  onStageSchedule,
}: {
  projectId: string;
  refreshKey?: number;
  scheduleDrafts?: Record<string, IndividualScheduleDraft>;
  onStageSchedule?: (jobId: string, draft: IndividualScheduleDraft) => void;
}) {
  const { confirm } = useConfirmDialog();
  const [jobs, setJobs] = useState<SchedulerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configuringJobId, setConfiguringJobId] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const result = await jobsApi.getSchedulerView(projectId);
      setJobs(result);
      setError(null);
    } catch {
      setError('Job schedules could not be loaded. Try again.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const run = async (action: 'pause' | 'resume', jobId?: string) => {
    setBusy(jobId ?? action);
    try {
      if (jobId) {
        if (action === 'pause') await jobsApi.pauseSchedule(projectId, jobId);
        else {
          const job = jobs.find((item) => item.id === jobId);
          if (job && !job.syncEnabled && !schedulePaused(job))
            await jobsApi.setSyncEnabled(projectId, jobId, true);
          else {
            await jobsApi.resumeSchedule(projectId, jobId);
            if (job && !job.syncEnabled)
              await jobsApi.setSyncEnabled(projectId, jobId, true);
          }
        }
      } else if (action === 'pause') await jobsApi.pauseAllJobs(projectId);
      else await jobsApi.resumeAllJobs(projectId);
      await load();
      showToast.success(
        action === 'pause' ? 'Schedule paused.' : 'Schedule resumed.',
      );
    } catch {
      showToast.error('Schedule could not be updated.');
    } finally {
      setBusy(null);
    }
  };

  const requestBulk = (action: 'pause' | 'resume') => {
    confirm({
      variant: action === 'pause' ? 'warning' : 'info',
      title:
        action === 'pause'
          ? 'Pause active schedules?'
          : 'Resume paused schedules?',
      description:
        action === 'pause'
          ? 'Scheduled runs will stop until the schedules are resumed.'
          : 'Paused jobs will continue on their saved individual schedules.',
      confirmLabel: action === 'pause' ? 'Pause schedules' : 'Resume schedules',
      onConfirm: () => run(action),
    });
  };

  if (loading)
    return (
      <div className="flex h-32 items-center justify-center">
        <Spinner />
      </div>
    );
  if (error && jobs.length === 0)
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertDescription className="flex items-center justify-between gap-2">
          {error}
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );

  const pausable = jobs.filter(canPauseIndividualSchedule).length;
  const resumable = jobs.filter(canResumeIndividualSchedule).length;
  const configuringJob = jobs.find((job) => job.id === configuringJobId);
  const configuringDraft = configuringJobId
    ? scheduleDrafts[configuringJobId]
    : undefined;
  return (
    <div className="space-y-3">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Project job schedules</h3>
          <p className="text-muted-foreground text-xs">
            Review each cadence and next run. Configure a job to change its
            schedule.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null || pausable === 0}
            onClick={() => requestBulk('pause')}
          >
            {busy === 'pause' ? <Spinner /> : <Pause />} Pause all
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null || resumable === 0}
            onClick={() => requestBulk('resume')}
          >
            {busy === 'resume' ? <Spinner /> : <Play />} Resume all
          </Button>
        </div>
      </div>
      {jobs.length > 0 && pausable === 0 && resumable === 0 && (
        <p className="text-muted-foreground text-xs">
          No schedules can be paused or resumed. These actions need an enabled
          one-way job with a configured schedule.
        </p>
      )}
      {jobs.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border p-5 text-sm">
          No scheduled jobs in this project.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          {jobs.map((job) => {
            const draft = scheduleDrafts[job.id];
            return (
              <IndividualScheduleRow
                key={job.id}
                job={draft ? { ...job, ...draft } : job}
                pendingSchedule={!!draft}
                href={`/projects/${projectId}/jobs/${job.id}?tab=settings&section=schedule`}
                busy={busy !== null}
                onConfigure={() => setConfiguringJobId(job.id)}
                onToggle={
                  draft
                    ? undefined
                    : () =>
                        void run(
                          scheduleActive(job) ? 'pause' : 'resume',
                          job.id,
                        )
                }
              />
            );
          })}
        </div>
      )}
      {configuringJob && (
        <JobScheduleModal
          projectId={projectId}
          jobId={configuringJob.id}
          job={
            configuringDraft
              ? { ...configuringJob, ...configuringDraft }
              : configuringJob
          }
          open
          onOpenChange={(open) => !open && setConfiguringJobId(null)}
          onSaved={onStageSchedule ? undefined : () => void load()}
          saveSchedule={
            onStageSchedule
              ? async (payload) => onStageSchedule(configuringJob.id, payload)
              : undefined
          }
          skipPriorityQueue
          stageOnly={!!onStageSchedule}
        />
      )}
    </div>
  );
}
