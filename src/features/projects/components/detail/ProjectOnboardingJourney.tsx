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
  const {
    projectId,
    jobs,
    hasBothConnections,
    hasJobs,
    activeTab,
    handleTabChange,
    onCreateSyncRule,
  } = useProjectDetailContext();

  const navigate = useNavigate();

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
  });

  const completeOnMount = useRef(stage === 'complete');

  if (stage === 'complete' && completeOnMount.current) return null;

  const isConnecting = stage === 'connect_platforms' || !hasBothConnections;
  const hasDraft = Boolean(draftState);

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
  let step2Title = hasJobs ? 'Configure Sync Flow' : 'Create First Sync Flow';
  let step2Desc = hasJobs
    ? 'Complete field mapping and schedule activation.'
    : 'Choose what data should move between your platforms.';
  let step2Status: SetupJourneyStep['status'] = 'upcoming';

  if (!hasBothConnections) {
    step2Status = 'upcoming';
  } else if (stage === 'complete') {
    step2Status = 'complete';
    step2Desc = 'Sync flow created and configured.';
  } else if (hasDraft) {
    step2Status = 'current';
    step2Desc = `Draft in progress (${draftStepLabel})`;
  } else if (stage === 'configure_job') {
    step2Status = 'current';
    step2Title = 'Configure Sync Flow';
    step2Desc = 'Complete field mapping and schedule activation.';
  } else {
    step2Status = 'current';
  }

  const steps: SetupJourneyStep[] = [
    {
      title: 'Connect Platforms',
      description: step1Desc,
      status: step1Status,
      onSelect: () => handleTabChange('connections'),
    },
    {
      title: step2Title,
      description: step2Desc,
      status: step2Status,
      onSelect:
        !hasBothConnections
          ? undefined
          : hasDraft || stage === 'create_first_job'
            ? onCreateSyncRule
            : stage === 'configure_job'
              ? () => {
                  const targetJob = jobs[0];
                  if (targetJob) {
                    navigate(
                      `/projects/${projectId}/jobs/${targetJob.id}?tab=field-mapping`,
                    );
                  } else {
                    handleTabChange('sync-rules');
                  }
                }
              : undefined,
    },
  ];

  // If connections are not ready, connecting platforms is ALWAYS the primary requirement.
  if (!hasBothConnections || isConnecting) {
    return (
      <SetupJourneyCard
        eyebrow="Project setup"
        title="Connect your source and destination"
        description="Both connections must be verified before you can create or run a sync flow."
        steps={steps}
        actionLabel={activeTab === 'connections' ? undefined : 'Connect Platforms'}
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
        eyebrow="Project setup complete"
        title="Your project is ready"
        description="Both platforms are connected and your first sync flow has been configured."
        steps={steps}
        actionLabel="Go to project overview"
        onContinue={() => handleTabChange('overview')}
      />
    );
  }

  // Active configurations (only when hasBothConnections === true):
  if (hasDraft) {
    return (
      <SetupJourneyCard
        eyebrow="Project setup"
        title="Unfinished sync flow in progress"
        description={`Your configuration for "${draftFlowName}" (${draftStepLabel}) was safely preserved. Continue setup to finish creating your sync flow.`}
        steps={steps}
        actionLabel={activeTab === 'sync-rules' ? undefined : 'Resume Setup'}
        onContinue={activeTab === 'sync-rules' ? undefined : onCreateSyncRule}
        secondaryAction={{
          label: 'Discard',
          onClick: handleDiscardDraft,
        }}
      />
    );
  }

  if (stage === 'configure_job') {
    const targetJob = jobs[0];
    const isDraftJob = targetJob?.status === 'draft';
    return (
      <SetupJourneyCard
        eyebrow="Project setup"
        title={
          isDraftJob
            ? 'Complete sync flow configuration'
            : 'Activate your sync flow'
        }
        description={
          isDraftJob
            ? 'Field mapping and configuration for your sync flow are not finished yet.'
            : 'Your sync flow is created. Turn on scheduling or run a test to start synchronizing records.'
        }
        steps={steps}
        actionLabel={
          activeTab === 'sync-rules'
            ? undefined
            : isDraftJob
              ? 'Continue Setup'
              : 'Activate Flow'
        }
        onContinue={
          activeTab === 'sync-rules'
            ? undefined
            : () => {
                if (targetJob) {
                  navigate(
                    `/projects/${projectId}/jobs/${targetJob.id}?tab=field-mapping`,
                  );
                } else {
                  handleTabChange('sync-rules');
                }
              }
        }
      />
    );
  }

  // Default: stage === 'create_first_job' (Both platforms connected and verified, 0 jobs)
  return (
    <SetupJourneyCard
      eyebrow="Project setup"
      title="Your connections are ready!"
      description="Both platforms are connected and verified. Next, choose what data you want to sync."
      steps={steps}
      actionLabel={activeTab === 'sync-rules' ? undefined : 'Create First Sync Flow'}
      onContinue={activeTab === 'sync-rules' ? undefined : onCreateSyncRule}
    />
  );
}
