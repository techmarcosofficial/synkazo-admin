import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useJobDetailContext } from './context';

import {
  GuideStepper,
  computeGuideProgress,
  useGuideAutoAdvance,
  useGuideSpot,
  useGuideStore,
  useIsTourJob,
  type GuideSpot,
  type GuideStepId,
} from '@/features/guide';
import { selectJobOnboardingState } from '@/features/onboarding';
import type { JobExt } from '@/features/projects/hooks/useProjectDetail';
import { formatSchedule } from '@/features/projects/utils';
import { usePriorityQueueQuery } from '@/queries/usePriorityQueue';

// Finishing a step here moves straight on: a saved mapping opens Run Sync, and
// a passed test heads to the project's scheduler after a moment to read it.
const AUTO_ADVANCE_FROM: GuideStepId[] = ['map', 'test'];
const AUTO_ADVANCE_DELAYS: Partial<Record<GuideStepId, number>> = {
  test: 3000,
};

/**
 * Setup steps on the sync-job page: the same six-step header as the project
 * page, plus highlights for the parts this page owns. The field-mapping and
 * run-sync tabs point at their own controls; this covers everything else.
 * The job the first-run tour follows also gets hint cards and auto-next;
 * any other unfinished job gets the header and highlights only.
 */
export default function JobGuide({ className }: { className?: string }) {
  const { job } = useJobDetailContext();
  const tour = useIsTourJob(job.id);
  return <JobGuideActive key={String(tour)} tour={tour} className={className} />;
}

function JobGuideActive({
  tour,
  className,
}: {
  tour: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const {
    projectId,
    job,
    runLogs,
    jobFieldMappings,
    pipelineRequired,
    pipelineConfigured,
    activeTab,
    handleTabChange,
  } = useJobDetailContext();
  const finish = useGuideStore((s) => s.finish);
  const setAssist = useGuideStore((s) => s.setAssist);
  const queueQuery = usePriorityQueueQuery(projectId);
  const queue = queueQuery.data;
  // Schedule status loads apart from the page; wait for it so a scheduled
  // job doesn't flash "Set a schedule" outside the tour.
  const ready = !queueQuery.isLoading;

  const state = selectJobOnboardingState({
    mappings: jobFieldMappings,
    pipelineRequired,
    pipelineConfigured,
    runLogs,
    lastSyncedAt: job.lastSyncedAt,
  });
  const scheduled =
    job.syncDirection === 'two_way' ||
    formatSchedule(job as unknown as JobExt) !== 'No schedule' ||
    (queue?.schedulerMode === 'priority' &&
      (queue.queueJobs?.some((q) => q.enabled) ?? false));

  const progress = computeGuideProgress({
    connected: true,
    jobCreated: true,
    mapped: state.configurationReady || state.testComplete,
    tested: state.testComplete,
    scheduled,
  });
  const { current } = progress;
  const needsPipeline = state.mappingReady && !state.configurationReady;

  const viewStep: GuideStepId | null =
    activeTab === 'field-mapping' || activeTab === 'pipeline'
      ? 'map'
      : activeTab === 'run-sync'
        ? 'test'
        : null;

  const go = useCallback(
    (step: GuideStepId) => {
      if (step === 'map')
        handleTabChange(needsPipeline ? 'pipeline' : 'field-mapping');
      else if (step === 'test') handleTabChange('run-sync');
      else {
        const tab =
          step === 'connect'
            ? 'connections'
            : step === 'job'
              ? 'sync-rules'
              : 'scheduler';
        navigate(`/projects/${projectId}?tab=${tab}`);
      }
    },
    [handleTabChange, navigate, needsPipeline, projectId],
  );

  const setCurrentStep = useGuideStore((s) => s.setCurrentStep);
  useEffect(() => {
    if (tour) setCurrentStep(current);
  }, [tour, current, setCurrentStep]);

  // Highlight-only help while this page is open and setup is unfinished.
  useEffect(() => {
    if (tour || !current || !ready) return;
    setAssist({ projectId, jobId: job.id, step: current });
    return () => setAssist(null);
  }, [tour, current, ready, projectId, job.id, setAssist]);

  // Auto-next belongs to the first-run tour only.
  useGuideAutoAdvance({
    enabled: tour,
    current,
    viewStep,
    from: AUTO_ADVANCE_FROM,
    go,
    delays: AUTO_ADVANCE_DELAYS,
  });

  let spot: GuideSpot | null = null;
  if (current === 'map') {
    if (needsPipeline) {
      spot =
        activeTab !== 'pipeline'
          ? {
              id: 'job-tab-pipeline',
              target: '[data-guide="tab-pipeline"]',
              title: 'Choose the HubSpot pipeline',
              body: 'This object needs a pipeline and stage before records can sync.',
            }
          : null;
    } else if (activeTab !== 'field-mapping') {
      spot = {
        id: 'job-tab-field-mapping',
        target: '[data-guide="tab-field-mapping"]',
        title: 'Map your fields',
        body: 'Tell Synkazo which source field fills which HubSpot field.',
      };
    }
  } else if (current === 'test') {
    if (activeTab !== 'run-sync') {
      spot = {
        id: 'job-tab-run-sync',
        target: '[data-guide="tab-run-sync"]',
        title: 'Run a test sync',
        body: 'Mapping saved. Send 5 records through it to check everything lands where you expect.',
      };
    }
  } else if (current === 'schedule') {
    spot = {
      id: 'job-to-schedule',
      target: '[data-guide="guide-next"]',
      title: 'Test passed. One step left',
      body: 'Back on the project, set a schedule so this job keeps syncing on its own.',
    };
  } else if (!current && tour) {
    spot = {
      id: 'guide-complete',
      title: 'Your first sync is live',
      body: 'Records now sync on schedule. Add more sync jobs or projects any time; you know the way now.',
      action: { label: 'Finish', onClick: finish },
    };
  }
  // Outside the tour, highlight only once assist mode is on (see above).
  const showSpot = tour || (ready && !!current);
  useGuideSpot(showSpot && spot && { ...spot, step: current ?? undefined });

  // Outside the tour, a fully set-up job needs no header.
  if (!tour && (!current || !ready)) return null;

  return (
    <GuideStepper
      title={tour ? 'Getting started' : 'Job setup'}
      progress={progress}
      viewStep={viewStep}
      onGo={go}
      className={className}
    />
  );
}
