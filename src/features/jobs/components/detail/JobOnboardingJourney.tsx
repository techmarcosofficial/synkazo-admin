import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useJobDetailContext } from './context';

import SetupJourneyCard, {
  type SetupJourneyStep,
} from '@/features/onboarding/components/SetupJourneyCard';
import { selectJobOnboardingState } from '@/features/onboarding';
import type { Project, ProjectEnvironment } from '@/types';

export default function JobOnboardingJourney() {
  const navigate = useNavigate();
  const {
    projectId,
    job,
    project,
    runLogs,
    jobFieldMappings,
    pipelineRequired,
    pipelineConfigured,
    isProductionReady,
    activeTab,
    handleTabChange,
    handleToggle,
    toggling,
  } = useJobDetailContext();
  const state = selectJobOnboardingState({
    mappings: jobFieldMappings,
    pipelineRequired,
    pipelineConfigured,
    runLogs,
    lastSyncedAt: job.lastSyncedAt,
  });
  const completeOnMount = useRef(state.stage === 'complete');
  const activeEnvironment =
    (project as (Project & { activeEnvironment?: ProjectEnvironment }) | null)
      ?.activeEnvironment ?? project?.active_environment;
  const isSandbox = activeEnvironment === 'sandbox';

  // Flow setup guidance lives on the Overview tab only.
  if (activeTab !== 'overview') return null;
  if (state.stage === 'complete' && completeOnMount.current) {
    return null;
  }

  const isJobActive = Boolean(job.isEnabled);

  // Opens the Run Sync tab, like "Sync now". When "Sync now" can't be used
  // right now (no permission, a run already queued), points at it instead:
  // scrolls it to the middle, focuses it and flashes it twice.
  const highlightSyncRunButton = () => {
    const syncBtn =
      document.querySelector<HTMLButtonElement>('#sync-now-button');
    if (!syncBtn) return;
    if (!syncBtn.disabled) {
      handleTabChange('run-sync');
      return;
    }
    syncBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    syncBtn.focus({ preventScroll: true });
    syncBtn.removeAttribute('data-attention-flash');
    // Re-trigger the flash on repeated clicks.
    void syncBtn.offsetWidth;
    syncBtn.setAttribute('data-attention-flash', 'true');
    window.setTimeout(
      () => syncBtn.removeAttribute('data-attention-flash'),
      1400,
    );
  };

  const stepStatus = (
    complete: boolean,
    stage: typeof state.stage,
  ): SetupJourneyStep['status'] =>
    complete ? 'complete' : state.stage === stage ? 'current' : 'upcoming';

  // Rendered on the Overview tab only, showing just the next unfinished step.
  const steps: SetupJourneyStep[] = [
    {
      title: 'Field Mapping',
      description: 'Match source fields to their destination fields.',
      status: stepStatus(state.mappingReady, 'field_mapping'),
      hoverHint: 'Go to the Field Mapping tab',
      onSelect: () => handleTabChange('field-mapping'),
    },
    ...(pipelineRequired
      ? [
          {
            title: 'Configure Pipeline',
            description:
              'Choose the destination pipeline required by this job.',
            status: stepStatus(state.configurationReady, 'configure'),
            hoverHint: 'Go to the Pipeline tab',
            onSelect: () => handleTabChange('pipeline'),
          },
        ]
      : []),
    {
      title: isSandbox ? 'Test & Review' : 'Run & Review',
      description: isSandbox
        ? 'Run a limited sync in Sandbox and review the result before automating it.'
        : 'Run a limited sync and review the result before automating it.',
      status: stepStatus(state.testComplete, 'test'),
      guidesFlowAction: state.stage === 'test',
      hoverHint: 'Open Run Sync to test records',
      onSelect: highlightSyncRunButton,
    },
    {
      title: 'Automate (optional)',
      description:
        'Configure an automated schedule on Overview if this job should run automatically.',
      status: 'upcoming',
      optional: true,
      hoverHint: 'Configure an automated sync schedule',
    },
  ];

  const requiredSteps = steps.filter((step) => !step.optional);

  if (state.stage === 'complete') {
    if (isSandbox) {
      if (!isProductionReady) {
        return (
          <SetupJourneyCard
            compact
            currentStepOnly
            eyebrow="Sandbox test complete"
            title="Ready to go live? Connect your Production platforms"
            description={`“${job.name}” verified cleanly in Sandbox without errors. To begin syncing live customer data, connect your live production platforms. Your field mappings and configurations will carry over seamlessly.`}
            steps={requiredSteps}
            actionLabel="Connect Production Platforms"
            onContinue={() =>
              navigate(`/projects/${projectId}?tab=connections&env=production`)
            }
            secondaryAction={{
              label: 'View Overview',
              onClick: () => navigate(`/projects/${projectId}?tab=overview`),
            }}
          />
        );
      }

      return (
        <SetupJourneyCard
          compact
          currentStepOnly
          eyebrow="Sandbox test complete"
          title="Ready to activate live Production sync?"
          description={`“${job.name}” verified cleanly in Sandbox and your live Production connections are connected. Switch to Production in Environment Settings to begin syncing live data without re-mapping from scratch.`}
          steps={requiredSteps}
          actionLabel="Promote to Production"
          onContinue={() =>
            navigate(`/projects/${projectId}?tab=settings&section=environments`)
          }
          secondaryAction={{
            label: 'View Overview',
            onClick: () => navigate(`/projects/${projectId}?tab=overview`),
          }}
        />
      );
    }

    return null;
  }

  const nextStep =
    state.stage === 'field_mapping'
      ? 'Map source and destination fields on the Field Mapping tab, then choose at least one Match Field.'
      : state.stage === 'configure'
        ? 'Choose the destination pipeline on the Pipeline tab.'
        : isJobActive
          ? isSandbox
            ? 'The flow is active. Run a limited sync in Sandbox with “Sync now” below and review the result.'
            : 'The flow is active. Run a limited sync with “Sync now” below and review the result.'
          : isSandbox
            ? 'Field mapping is configured. Run a test sync in Sandbox with “Sync now” below to check records move cleanly.'
            : 'Field mapping is configured. Run a sync with “Sync now” below to check records move cleanly.';

  return (
    <SetupJourneyCard
      compact
      currentStepOnly
      eyebrow="Flow setup"
      title="Set up your flow"
      description={[
        'Finish these steps to start syncing:',
        `1. Field Mapping: match source fields to destination fields and choose a Match Field.`,
        ...(pipelineRequired
          ? ['2. Configure Pipeline: choose the destination pipeline.']
          : []),
        `${pipelineRequired ? 3 : 2}. ${isSandbox ? 'Test & Review' : 'Run & Review'}: run a limited sync and review the result.`,
        `${pipelineRequired ? 4 : 3}. Automate (optional): set a schedule if the flow should run automatically.`,
        '',
        `Next: ${nextStep}`,
      ].join('\n')}
      steps={steps}
    />
  );
}
