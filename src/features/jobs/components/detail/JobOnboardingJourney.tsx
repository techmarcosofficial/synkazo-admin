import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useJobDetailContext } from './context';

import SetupJourneyCard, {
  type SetupJourneyStep,
} from '@/features/onboarding/components/SetupJourneyCard';
import {
  selectContextualSetupAction,
  selectJobOnboardingState,
} from '@/features/onboarding';

export default function JobOnboardingJourney() {
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
  const state = selectJobOnboardingState({
    mappings: jobFieldMappings,
    pipelineRequired,
    pipelineConfigured,
    runLogs,
    lastSyncedAt: job.lastSyncedAt,
  });
  const completeOnMount = useRef(state.stage === 'complete');

  if (state.stage === 'complete' && completeOnMount.current) {
    return null;
  }

  const stepStatus = (
    complete: boolean,
    stage: typeof state.stage,
  ): SetupJourneyStep['status'] =>
    complete ? 'complete' : state.stage === stage ? 'current' : 'upcoming';

  const steps: SetupJourneyStep[] = [
    {
      title: 'Field Mapping',
      description: 'Match source fields to their destination fields.',
      status: stepStatus(state.mappingReady, 'field_mapping'),
      onSelect: () => handleTabChange('field-mapping'),
    },
    {
      title: 'Configure',
      description: pipelineRequired
        ? 'Choose the destination pipeline required by this job.'
        : 'Required sync settings are ready.',
      status: stepStatus(state.configurationReady, 'configure'),
      onSelect: pipelineRequired
        ? () => handleTabChange('pipeline')
        : undefined,
    },
    {
      title: 'Test & Review',
      description:
        'Run the job once and review the result before automating it.',
      status: stepStatus(state.testComplete, 'test'),
      onSelect: () => handleTabChange('overview'),
    },
    {
      title: 'Automate (optional)',
      description: 'Add a schedule later if this job should run automatically.',
      status: 'upcoming',
      optional: true,
      onSelect: () =>
        navigate(
          `/projects/${projectId}/jobs/${job.id}?tab=settings&section=schedule`,
        ),
    },
  ];

  if (state.stage === 'complete') {
    return (
      <SetupJourneyCard
        eyebrow="Job setup complete"
        title="Your sync job is ready"
        description={`“${job.name}” has valid mapping and configuration, and its first test completed successfully.`}
        steps={steps}
        actionLabel="Go to project overview"
        onContinue={() => navigate(`/projects/${projectId}?tab=overview`)}
      />
    );
  }

  const content =
    state.stage === 'field_mapping'
      ? {
          title: 'Map the fields for this sync job',
          description:
            'Map source and destination fields, then choose at least one Match Field.',
        }
      : state.stage === 'configure'
        ? {
            title: 'Finish the required sync configuration',
            description:
              'Choose the destination pipeline required before testing.',
          }
        : {
            title: 'Test and review your sync job',
            description:
              'Run the job once and review the result before automating it.',
          };

  const targetTab =
    state.stage === 'field_mapping'
      ? 'field-mapping'
      : state.stage === 'configure'
        ? 'pipeline'
        : 'overview';
  const previousTab =
    state.stage === 'configure'
      ? 'field-mapping'
      : state.stage === 'test'
        ? pipelineRequired
          ? 'pipeline'
          : 'field-mapping'
        : null;
  const action = selectContextualSetupAction({
    activePage: activeTab,
    targetPage: targetTab,
    previousPage: previousTab,
  });

  return (
    <SetupJourneyCard
      eyebrow="Job setup"
      title={content.title}
      description={content.description}
      steps={steps}
      actionLabel={
        action === 'none'
          ? undefined
          : action === 'next'
            ? 'Next'
            : 'Continue setup'
      }
      onContinue={
        action === 'none' ? undefined : () => handleTabChange(targetTab)
      }
    />
  );
}
