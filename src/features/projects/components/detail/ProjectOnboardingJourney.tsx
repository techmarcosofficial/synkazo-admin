import { useEffect, useState } from 'react';

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

const SETUP_TITLE = 'Set up your project';

function setupInstructions(nextStep: string) {
  return [
    'Finish these 3 steps to start syncing:',
    '1. Connect Platforms: connect and verify your source and destination on the Connections tab.',
    '2. Create a sync flow: on the Sync Flows tab, choose which records move between the platforms.',
    '3. Configure & Test: map the fields, then run a successful test sync.',
    '',
    `Next: ${nextStep}`,
  ].join('\n');
}

export default function ProjectOnboardingJourney() {
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

  // Setup guidance lives on the Overview tab only, and only until the project is 100% set up.
  if (activeTab !== 'overview' || stage === 'complete') return null;

  const isConnecting = stage === 'connect_platforms' || !hasBothConnections;
  const hasDraft = Boolean(draftState);
  const onlyJob = jobs.length === 1 ? jobs[0] : null;
  const mappingReady = Boolean(
    onlyJob?.fieldMappings?.length &&
    onlyJob.fieldMappings.some((mapping) => mapping.isMatchField),
  );

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
  } else if (hasJobs || stage === 'configure_job') {
    step2Status = 'complete';
  } else if (hasDraft) {
    step2Status = 'current';
    step2Desc = `Draft in progress (${draftStepLabel})`;
  } else {
    step2Status = 'current';
  }

  // Only the first unfinished step is shown (currentStepOnly), always on the Overview tab.
  const steps: SetupJourneyStep[] = [
    {
      title: 'Connect Platforms',
      description: step1Desc,
      status: step1Status,
      hoverHint: 'Go to the Connections tab',
      onSelect: () => handleTabChange('connections'),
    },
    {
      title: step2Title,
      description: step2Desc,
      status: step2Status,
      hoverHint: hasDraft
        ? 'Resume your unfinished sync flow'
        : 'Create your first sync flow',
      onSelect: !hasBothConnections
        ? undefined
        : hasDraft || stage === 'create_first_job'
          ? onCreateSyncRule
          : () => handleTabChange('sync-rules'),
    },
    {
      title: 'Configure & Test',
      guidesFlowAction: stage === 'configure_job',
      hoverHint: 'Go to Sync Flows to configure, test and activate',
      description: hasJobs
        ? 'Finish setup and run a successful test sync.'
        : 'Available after you create a sync flow.',
      status: hasBothConnections && hasJobs ? 'current' : 'upcoming',
      // Flows are configured, tested and activated from the Sync Flows tab.
      onSelect:
        hasBothConnections && hasJobs
          ? () => handleTabChange('sync-rules')
          : undefined,
    },
  ];

  // If connections are not ready, connecting platforms is ALWAYS the primary requirement.
  if (!hasBothConnections || isConnecting) {
    return (
      <SetupJourneyCard
        compact
        currentStepOnly
        eyebrow="Project setup"
        title={SETUP_TITLE}
        description={setupInstructions(
          'Connect and verify both platforms on the Connections tab. You can\'t create or run a sync flow until both are verified.',
        )}
        steps={steps}
      />
    );
  }

  if (stage === 'configure_job') {
    return (
      <SetupJourneyCard
        compact
        currentStepOnly
        eyebrow="Project setup"
        title={SETUP_TITLE}
        description={setupInstructions(
          onlyJob
            ? mappingReady
              ? 'Your flow has field mappings. Open it to finish setup and run a test sync.'
              : 'Your flow has been created. Configure its field mappings, then run a test sync.'
            : 'Choose a flow in Sync Flows to finish its setup and run a test sync.',
        )}
        steps={steps}
      />
    );
  }

  // Active configurations (only when hasBothConnections === true):
  if (hasDraft) {
    return (
      <SetupJourneyCard
        compact
        currentStepOnly
        eyebrow="Project setup"
        title={SETUP_TITLE}
        description={setupInstructions(
          `Your unfinished sync flow "${draftFlowName}" (${draftStepLabel}) was saved. Resume it to finish creating the flow.`,
        )}
        steps={steps}
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
      currentStepOnly
      eyebrow="Project setup"
      title={SETUP_TITLE}
      description={setupInstructions(
        'Both platforms are connected and verified. Create a sync flow on the Sync Flows tab to choose what data you want to sync.',
      )}
      steps={steps}
    />
  );
}
