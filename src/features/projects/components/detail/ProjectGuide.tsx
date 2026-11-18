import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useProjectDetailContext } from './context';

import {
  GuideStepper,
  computeGuideProgress,
  useGuideAutoAdvance,
  useGuideSpot,
  useGuideStore,
  useIsTourProject,
  type GuideProgress,
  type GuideSpot,
  type GuideStepId,
} from '@/features/guide';
import type { JobExt } from '@/features/projects/hooks/useProjectDetail';
import { formatSchedule } from '@/features/projects/utils';
import { useProjectJobsQuery } from '@/queries/useJobs';
import { usePriorityQueueQuery } from '@/queries/usePriorityQueue';

// Finishing a step here moves straight on to the next one. ("Test" finishes
// on the job page, and "Schedule" ends with the completion card.)
const AUTO_ADVANCE_FROM: GuideStepId[] = ['connect', 'job'];

const TAB_STEP: Partial<Record<string, GuideStepId>> = {
  connections: 'connect',
  'sync-rules': 'job',
  scheduler: 'schedule',
};

/**
 * Setup steps on the project page: the step-form header under the tabs, plus
 * a highlight on whatever to click next. The project the first-run tour
 * follows also gets hint cards and auto-next; every other project that isn't
 * fully set up gets the header and a highlight only, in any browser, since
 * progress comes from the server. Fully set-up projects show nothing.
 */
export default function ProjectGuide({ className }: { className?: string }) {
  const { projectId } = useProjectDetailContext();
  const tour = useIsTourProject(projectId);
  return <ProjectGuideActive key={String(tour)} tour={tour} className={className} />;
}

function ProjectGuideActive({
  tour,
  className,
}: {
  tour: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const {
    projectId,
    jobs,
    logs,
    connections,
    hasBothConnections,
    activeTab,
    handleTabChange,
  } = useProjectDetailContext();
  const tourJobId = useGuideStore((s) => s.jobId);
  const setJob = useGuideStore((s) => s.setJob);
  const finish = useGuideStore((s) => s.finish);
  const setAssist = useGuideStore((s) => s.setAssist);
  const queueQuery = usePriorityQueueQuery(projectId);
  const queue = queueQuery.data;
  // The scheduler saves through this list, so it's fresher than the page's jobs.
  const schedulerJobsQuery = useProjectJobsQuery(projectId);
  const schedulerJobs = schedulerJobsQuery.data;
  // Schedule status loads apart from the page; wait for it so a scheduled
  // project doesn't flash "Set a schedule" outside the tour.
  const ready = !queueQuery.isLoading && !schedulerJobsQuery.isLoading;

  // The tour follows the first sync job; if it was deleted, fall back to
  // whatever is left.
  useEffect(() => {
    if (!tour) return;
    if (tourJobId && jobs.some((j) => j.id === tourJobId)) return;
    const fallback = jobs[0]?.id ?? null;
    if (fallback !== tourJobId) setJob(fallback);
  }, [tour, jobs, tourJobId, setJob]);

  const progressFor = useCallback(
    (job: JobExt | null): GuideProgress => {
      const tested = Boolean(
        job &&
          (job.lastSyncedAt ||
            (job.recordsSynced ?? 0) > 0 ||
            logs.some(
              (log) =>
                log.jobId === job.id && log.metadata?.status === 'success',
            )),
      );
      const mapped =
        tested ||
        Boolean(job?.fieldMappings?.some((mapping) => mapping.isMatchField));
      const latest = schedulerJobs?.find((j) => j.id === job?.id);
      const jobScheduled =
        !!job &&
        (job.syncDirection === 'two_way' ||
          formatSchedule(job) !== 'No schedule' ||
          (!!latest &&
            formatSchedule(latest as unknown as typeof job) !== 'No schedule'));
      const queueScheduled =
        queue?.schedulerMode === 'priority' &&
        (queue.queueJobs?.some((q) => q.enabled) ?? false);
      return computeGuideProgress({
        connected: hasBothConnections,
        jobCreated: Boolean(job),
        mapped,
        tested,
        scheduled: jobScheduled || queueScheduled,
      });
    },
    [logs, queue, schedulerJobs, hasBothConnections],
  );

  // Tour: the followed job. Otherwise the job furthest along, so a project
  // with one working sync counts as set up even while a new job is drafted.
  const { job, progress } = useMemo(() => {
    if (tour) {
      const followed = jobs.find((j) => j.id === tourJobId) ?? null;
      return { job: followed, progress: progressFor(followed) };
    }
    let best: { job: JobExt | null; progress: GuideProgress } = {
      job: null,
      progress: progressFor(null),
    };
    for (const candidate of jobs) {
      const p = progressFor(candidate);
      if (!best.job || p.doneCount > best.progress.doneCount) {
        best = { job: candidate, progress: p };
      }
    }
    return best;
  }, [tour, jobs, tourJobId, progressFor]);

  const { current } = progress;
  const viewStep = TAB_STEP[activeTab] ?? null;

  const go = useCallback(
    (step: GuideStepId) => {
      if (step === 'connect') handleTabChange('connections');
      else if (step === 'job') handleTabChange('sync-rules');
      else if (step === 'schedule') handleTabChange('scheduler');
      else if (job) {
        const tab = step === 'map' ? 'field-mapping' : 'run-sync';
        navigate(`/projects/${projectId}/jobs/${job.id}?tab=${tab}`);
      }
    },
    [handleTabChange, navigate, projectId, job],
  );

  const setCurrentStep = useGuideStore((s) => s.setCurrentStep);
  useEffect(() => {
    if (tour) setCurrentStep(current);
  }, [tour, current, setCurrentStep]);

  // Highlight-only help while this page is open and setup is unfinished.
  const assistJobId = job?.id ?? null;
  useEffect(() => {
    if (tour || !current || !ready) return;
    setAssist({ projectId, jobId: assistJobId, step: current });
    return () => setAssist(null);
  }, [tour, current, ready, projectId, assistJobId, setAssist]);

  // Auto-next belongs to the first-run tour only.
  useGuideAutoAdvance({
    enabled: tour,
    current,
    viewStep,
    from: AUTO_ADVANCE_FROM,
    go,
  });

  const sourceConnected = connections.some(
    (c) => c.connectionType === 'source' && c.status === 'connected',
  );

  let spot: GuideSpot | null = null;
  if (current === 'connect') {
    spot =
      activeTab !== 'connections'
        ? {
            id: 'project-tab-connections',
            target: '[data-guide="tab-connections"]',
            title: 'Connect your platforms',
            body: 'Open Connections to link your source platform and HubSpot.',
          }
        : sourceConnected
          ? {
              id: 'connect-destination',
              target: '[data-guide="connect-next"]',
              title: 'Now connect HubSpot',
              body: 'Sign in to HubSpot to authorise it as the destination. Both sides need to be connected before you can sync.',
            }
          : {
              id: 'connect-source',
              target: '[data-guide="connect-next"]',
              title: 'Connect your source platform',
              body: 'Add the credentials for where your records live. We check them right away.',
            };
  } else if (current === 'job') {
    spot =
      activeTab !== 'sync-rules'
        ? {
            id: 'project-tab-sync-rules',
            target: '[data-guide="tab-sync-rules"]',
            title: 'Create your first sync job',
            body: 'Both platforms are connected. Open Sync Flows to choose what to sync.',
          }
        : {
            id: 'create-sync-job',
            target: '[data-guide="create-sync-job"]',
            title: 'Create your first sync job',
            body: 'Choose which records move, for example customers into HubSpot contacts.',
          };
  } else if (current === 'map' || current === 'test') {
    const verb = current === 'map' ? 'map its fields' : 'run a test sync';
    spot =
      activeTab === 'sync-rules' && job
        ? {
            id: `job-action-${current}`,
            target: `[data-guide="job-action-${job.id}"]`,
            title:
              current === 'map' ? 'Open your sync job' : 'Test your sync job',
            body: `Your sync job is ready. Open it to ${verb}.`,
          }
        : {
            id: `project-continue-${current}`,
            target: '[data-guide="guide-next"]',
            title: 'Continue to your sync job',
            body: `Next, open your sync job to ${verb}.`,
          };
  } else if (current === 'schedule') {
    // On the Scheduler tab the scheduler guides itself (see useSchedulerGuide).
    spot =
      activeTab !== 'scheduler'
        ? {
            id: 'project-tab-scheduler',
            target: '[data-guide="tab-scheduler"]',
            title: 'Last step: set a schedule',
            body: 'Your test sync passed. Schedule the job so records keep syncing on their own.',
          }
        : null;
  } else if (tour) {
    spot = {
      id: 'guide-complete',
      title: 'Your first sync is live',
      body: 'Records now sync on schedule. Add more sync jobs or projects any time; you know the way now.',
      action: { label: 'Finish', onClick: finish },
    };
  }
  // Outside the tour, highlight only once assist mode is on (see above).
  const showSpot = tour || (ready && !!current);
  useGuideSpot(
    showSpot && spot && { ...spot, step: spot.step ?? current ?? undefined },
  );

  // Outside the tour, a fully set-up project needs no header.
  if (!tour && (!current || !ready)) return null;

  return (
    <GuideStepper
      title={tour ? 'Getting started' : 'Project setup'}
      progress={progress}
      viewStep={viewStep}
      onGo={go}
      className={className}
    />
  );
}
