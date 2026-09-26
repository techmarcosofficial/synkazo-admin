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
    setManualDialogOpen,
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

  if (state.stage === 'complete' && completeOnMount.current) {
    return null;
  }

  const isJobActive = Boolean(job.isEnabled);

  const handleOpenTestSync = () => {
    if (activeTab !== 'overview') {
      handleTabChange('overview');
    }
    setManualDialogOpen(true);
  };

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
    ...(pipelineRequired
      ? [
          {
            title: 'Configure Pipeline',
            description: 'Choose the destination pipeline required by this job.',
            status: stepStatus(state.configurationReady, 'configure'),
            onSelect: () => handleTabChange('pipeline'),
          },
        ]
      : []),
    {
      title: 'Test & Review',
      description:
        'Run the job once and review the result before automating it.',
      status: stepStatus(state.testComplete, 'test'),
      onSelect: () => {
        if (!isJobActive) {
          void handleToggle();
        } else {
          handleOpenTestSync();
        }
      },
    },
    {
      title: 'Automate (optional)',
      description: 'Add a schedule later if this job should run automatically.',
      status: 'upcoming',
      optional: true,
      onSelect: () => handleTabChange('schedule'),
    },
  ];

  const activeEnvironment =
    (project as (Project & { activeEnvironment?: ProjectEnvironment }) | null)
      ?.activeEnvironment ?? project?.active_environment;
  const isSandbox = activeEnvironment === 'sandbox';

  if (state.stage === 'complete') {
    if (isSandbox) {
      if (!isProductionReady) {
        return (
          <SetupJourneyCard
            eyebrow="Sandbox test complete"
            title="Ready to go live? Connect your Production platforms"
            description={`“${job.name}” verified cleanly in Sandbox without errors. To begin syncing live customer data, connect your live production platforms. Your field mappings and configurations will carry over seamlessly.`}
            steps={steps}
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
          eyebrow="Sandbox test complete"
          title="Ready to activate live Production sync?"
          description={`“${job.name}” verified cleanly in Sandbox and your live Production connections are connected. Switch to Production in Environment Settings to begin syncing live data without re-mapping from scratch.`}
          steps={steps}
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
          eyebrow: 'Job setup',
          title: 'Map the fields for this sync job',
          description:
            'Map source and destination fields, then choose at least one Match Field.',
        }
      : state.stage === 'configure'
        ? {
            eyebrow: 'Job setup',
            title: 'Finish the required sync configuration',
            description:
              'Choose the destination pipeline required before testing.',
          }
        : isJobActive
          ? {
              eyebrow: 'Job active',
              title: 'Job is active — Ready for test sync',
              description:
                'This job is now active. Run your first test sync to verify records move cleanly between platforms.',
            }
          : {
              eyebrow: 'Job setup',
              title: 'Activate your sync job',
              description:
                'Field mapping is complete. Activate this job to enable synchronization and test data transfer.',
            };

  let actionLabel: string | undefined;
  let onContinue: (() => void) | undefined;

  if (state.stage === 'test') {
    if (!isJobActive) {
      actionLabel = toggling ? 'Activating…' : 'Activate Job';
      onContinue = () => void handleToggle();
    } else {
      actionLabel = 'Run Test Sync';
      onContinue = handleOpenTestSync;
    }
  } else if (state.stage === 'field_mapping') {
    if (activeTab !== 'field-mapping') {
      actionLabel = 'Go to Field Mapping';
      onContinue = () => handleTabChange('field-mapping');
    }
  } else if (state.stage === 'configure') {
    if (activeTab !== 'pipeline') {
      actionLabel = 'Configure Pipeline';
      onContinue = () => handleTabChange('pipeline');
    }
  }

  return (
    <SetupJourneyCard
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      steps={steps}
      actionLabel={actionLabel}
      onContinue={onContinue}
    />
  );
}
