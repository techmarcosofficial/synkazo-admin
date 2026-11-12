import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useProjectDetailContext } from './context';

import {
  GuideStepper,
  computeGuideProgress,
  useGuideAutoAdvance,
  useGuideSpot,
  useGuideStore,
  useIsGuidedProject,
  type GuideSpot,
  type GuideStepId,
} from '@/features/guide';
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
 * First-run setup on the project page: the step-form header under the tabs,
 * plus the ring on whatever to click next. Renders nothing unless this is the
 * project the guide is following.
 */
export default function ProjectGuide({ className }: { className?: string }) {
  const { projectId } = useProjectDetailContext();
  const guided = useIsGuidedProject(projectId);
  if (!guided) return null;
  return <ProjectGuideActive className={className} />;
}

function ProjectGuideActive({ className }: { className?: string }) {
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
  const jobId = useGuideStore((s) => s.jobId);
  const setJob = useGuideStore((s) => s.setJob);
  const finish = useGuideStore((s) => s.finish);
  const queue = usePriorityQueueQuery(projectId).data;
  // The scheduler saves through this list, so it's fresher than the page's jobs.
  const schedulerJobs = useProjectJobsQuery(projectId).data;

  // Follow the first sync job; if it was deleted, fall back to whatever is left.
  useEffect(() => {
    if (jobId && jobs.some((j) => j.id === jobId)) return;
    const fallback = jobs[0]?.id ?? null;
    if (fallback !== jobId) setJob(fallback);
  }, [jobs, jobId, setJob]);

  const job = jobs.find((j) => j.id === jobId) ?? null;

  const flags = useMemo(() => {
    const tested = Boolean(
      job &&
        (job.lastSyncedAt ||
          (job.recordsSynced ?? 0) > 0 ||
          logs.some(
            (log) => log.jobId === job.id && log.metadata?.status === 'success',
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
    return {
      connected: hasBothConnections,
      jobCreated: Boolean(job),
      mapped,
      tested,
      scheduled: jobScheduled || queueScheduled,
    };
  }, [job, logs, queue, schedulerJobs, hasBothConnections]);

  const progress = computeGuideProgress(flags);
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
    setCurrentStep(current);
  }, [current, setCurrentStep]);

  useGuideAutoAdvance({
    enabled: true,
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
  } else {
    spot = {
      id: 'guide-complete',
      title: 'Your first sync is live',
      body: 'Records now sync on schedule. Add more sync jobs or projects any time; you know the way now.',
      action: { label: 'Finish', onClick: finish },
    };
  }
  useGuideSpot(spot && { ...spot, step: spot.step ?? current ?? undefined });

  return (
    <GuideStepper
      progress={progress}
      viewStep={viewStep}
      onGo={go}
      className={className}
    />
  );
}
