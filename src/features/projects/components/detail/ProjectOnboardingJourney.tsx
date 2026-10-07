import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useProjectDetailContext } from './context';

import SetupJourneyCard, {
  type SetupJourneyStep,
} from '@/features/onboarding/components/SetupJourneyCard';
import { selectProjectOnboardingStage } from '@/features/onboarding';
import {
  clearDraftSyncJob,
  getDraftSyncJob,
  type DraftSyncJob,
} from '@/features/journey/draftSyncJob';

export default function ProjectOnboardingJourney() {
  const navigate = useNavigate();
  const {
    projectId,
    jobs,
    logs,
    hasBothConnections,
    hasJobs,
    activeTab,
    handleTabChange,
    onCreateSyncRule,
  } = useProjectDetailContext();

  const [draftState, setDraftState] = useState<DraftSyncJob | null>(() =>
    getDraftSyncJob(projectId),
  );

  useEffect(() => {
    setDraftState(getDraftSyncJob(projectId));
  }, [projectId]);

  const handleDiscardDraft = () => {
    clearDraftSyncJob(projectId);
    setDraftState(null);
  };

  const stage = selectProjectOnboardingStage({
    hasBothConnections,
    hasJobs,
    jobs,
    runStatuses: logs
      ?.filter((log) => jobs.some((job) => job.id === log.jobId))
      .map((log) => log.metadata?.status),
  });

  const completeOnMount = useRef(stage === 'complete');

  if (stage === 'complete' && completeOnMount.current) return null;

  const isConnecting = stage === 'connect_platforms' || !hasBothConnections;
  const hasDraft = Boolean(draftState);
  const onlyJob = jobs.length === 1 ? jobs[0] : null;
  const mappingReady = Boolean(
    onlyJob?.fieldMappings?.length &&
    onlyJob.fieldMappings.some((mapping) => mapping.isMatchField),
  );
  const goToNextFlowStep = () => {
    if (!onlyJob) {
      handleTabChange('sync-rules');
      return;
    }
    navigate(
      `/projects/${projectId}/jobs/${onlyJob.id}${mappingReady ? '' : '?tab=field-mapping'}`,
    );
  };

  // Draft resolution helpers
  const draftStepNumber = Number(draftState?.step ?? 0) + 1;
  let draftStepName = 'Job Details';
  if (draftState?.step === 1) {
    draftStepName = draftState.config?.sourceObject
      ? 'Object & Status'
      : 'Field Mapping';
  } else if (draftState?.step === 2) {
    draftStepName = 'Field Mapping';
  } else if (draftState?.step === 3) {
    draftStepName = 'Default Values';
  } else if (draftState?.step === 4) {
    draftStepName = 'Schedule & Launch';
  }
  const draftStepLabel = `Step ${draftStepNumber}: ${draftStepName}`;
  const draftFlowName =
    draftState?.config?.name ||
    (draftState?.config?.sourceObject && draftState?.config?.destObject
      ? `${draftState.config.sourceObject} → ${draftState.config.destObject}`
      : 'Sync Flow Draft');

  // Step 1 description & status
  // When both connections are verified, Step 1 is complete.
  // When connections are missing, disconnected, or having verification errors, Step 1 is current (Action needed).
  const step1Status: SetupJourneyStep['status'] = hasBothConnections
    ? 'complete'
    : 'current';
  const step1Desc = hasBothConnections
    ? 'Source and destination are connected and verified.'
    : 'Connect the source and destination for this project.';

  // Step 2 details
  let step2Title = hasJobs
    ? jobs.length === 1
      ? 'First Sync Flow Created'
      : 'Sync Flows Created'
    : 'Create First Sync Flow';
  let step2Desc = hasJobs
    ? jobs.length === 1
      ? '1 sync flow created.'
      : `${jobs.length} sync flows created.`
    : 'Choose what data should move between your platforms.';
  let step2Status: SetupJourneyStep['status'] = 'upcoming';

  if (!hasBothConnections) {
    step2Status = 'upcoming';
  } else if (hasJobs || stage === 'complete' || stage === 'configure_job') {
    step2Status = 'complete';
  } else if (hasDraft) {
    step2Status = 'current';
    step2Desc = `Draft in progress (${draftStepLabel})`;
  } else {
    step2Status = 'current';
  }

  const steps: SetupJourneyStep[] = [
    {
      title: 'Connect Platforms',
      description: step1Desc,
      status: step1Status,
      isCurrentTab: activeTab === 'connections',
      hoverHint:
        activeTab !== 'connections'
          ? 'Go to Connections tab'
          : 'Connect both Source and Destination platforms below',
      guidesFlowAction: activeTab === 'connections' && !hasBothConnections,
      onSelect: () => handleTabChange('connections'),
    },
    {
      title: step2Title,
      description: step2Desc,
      status: step2Status,
      isCurrentTab: activeTab === 'sync-rules',
      hoverHint:
        activeTab !== 'sync-rules'
          ? 'Go to Sync Flows tab'
          : hasDraft
            ? 'Click to resume sync flow configuration'
            : "Click '+ Create sync flow' to configure rules",
      guidesFlowAction:
        activeTab === 'sync-rules' &&
        (stage === 'create_first_job' || hasDraft),
      onSelect: !hasBothConnections
        ? undefined
        : activeTab !== 'sync-rules'
          ? () => handleTabChange('sync-rules')
          : hasDraft || stage === 'create_first_job'
            ? onCreateSyncRule
            : () => handleTabChange('sync-rules'),
    },
    {
      title: 'Configure & Test',
      guidesFlowAction: stage === 'configure_job',
      isCurrentTab: false,
      hoverHint: 'Open sync flow to configure & test',
      description:
        stage === 'complete'
          ? 'A sync flow has completed its first run.'
          : hasJobs
            ? 'Finish setup and run a successful test sync.'
            : 'Available after you create a sync flow.',
      status:
        stage === 'complete'
          ? 'complete'
          : hasBothConnections && hasJobs
            ? 'current'
            : 'upcoming',
      onSelect:
        hasBothConnections && hasJobs && stage !== 'complete'
          ? goToNextFlowStep
          : undefined,
    },
  ];

  // If connections are not ready, connecting platforms is ALWAYS the primary requirement.
  if (!hasBothConnections || isConnecting) {
    return (
      <SetupJourneyCard
        compact
        eyebrow="Project setup"
        title="Connect your source and destination"
        description="Both connections must be verified before you can create or run a sync flow."
        steps={steps}
        actionLabel={
          activeTab === 'connections' ? undefined : 'Connect Platforms'
        }
        onContinue={
          activeTab === 'connections'
            ? undefined
            : () => handleTabChange('connections')
        }
      />
    );
  }

  if (stage === 'complete') {
    return (
      <SetupJourneyCard
        compact
        eyebrow="Project setup"
        title="Project setup complete"
        description="Your first sync flow completed a successful run. Manage other flows in Sync Flows."
        steps={steps}
        actionLabel={
          activeTab === 'sync-rules' ? undefined : 'Go to Sync Flows'
        }
        onContinue={
          activeTab === 'sync-rules'
            ? undefined
            : () => handleTabChange('sync-rules')
        }
      />
    );
  }

  if (stage === 'configure_job') {
    return (
      <SetupJourneyCard
        compact
        eyebrow="Project setup"
        title={
          mappingReady
            ? 'Run your first test sync'
            : 'Configure and test a sync flow'
        }
        description={
          onlyJob
            ? mappingReady
              ? 'Your flow has field mappings. Open it to finish setup and run a test sync.'
              : 'Your flow has been created. Configure its field mappings, then run a test sync.'
            : 'Choose a flow in Sync Flows to finish its setup and run a test sync.'
        }
        steps={steps}
        actionLabel={
          activeTab === 'sync-rules' ? undefined : 'Go to Sync Flows'
        }
        onContinue={
          activeTab === 'sync-rules'
            ? undefined
            : () => handleTabChange('sync-rules')
        }
      />
    );
  }

  // Active configurations (only when hasBothConnections === true):
  if (hasDraft) {
    return (
      <SetupJourneyCard
        compact
        eyebrow="Project setup"
        title="Unfinished sync flow in progress"
        description={`Your configuration for "${draftFlowName}" (${draftStepLabel}) was safely preserved. Continue setup to finish creating your sync flow.`}
        steps={steps}
        actionLabel={
          activeTab === 'sync-rules' ? 'Resume Setup' : 'Go to Sync Flows'
        }
        onContinue={
          activeTab === 'sync-rules'
            ? onCreateSyncRule
            : () => handleTabChange('sync-rules')
        }
        secondaryAction={{
          label: 'Discard',
          onClick: handleDiscardDraft,
        }}
      />
    );
  }

  // Default: stage === 'create_first_job' (Both platforms connected and verified, 0 jobs)
  return (
    <SetupJourneyCard
      compact
      eyebrow="Project setup"
      title="Your connections are ready!"
      description="Both platforms are connected and verified. Next, choose what data you want to sync."
      steps={steps}
      actionLabel={
        activeTab === 'sync-rules' ? undefined : 'Go to Sync Flows'
      }
      onContinue={
        activeTab === 'sync-rules'
          ? undefined
          : () => handleTabChange('sync-rules')
      }
    />
  );
}
