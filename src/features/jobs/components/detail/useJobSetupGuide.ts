import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useJobDetailContext } from './context';

import { selectJobOnboardingState } from '@/features/onboarding';
import type {
  SetupGuide,
  SetupGuideNext,
  SetupGuideStep,
} from '@/features/onboarding/setupGuide';
import type { Project, ProjectEnvironment } from '@/types';

/**
 * Flow setup for the tab-row indicator: field mapping → pipeline (when the
 * destination needs one) → test run. A Sandbox flow that has just passed its
 * test also gets a "Go live" next step. Returns null once setup is done.
 */
export function useJobSetupGuide(): SetupGuide | null {
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
    handleTabChange,
  } = useJobDetailContext();
  const state = selectJobOnboardingState({
    mappings: jobFieldMappings,
    pipelineRequired,
    pipelineConfigured,
    runLogs,
    lastSyncedAt: job.lastSyncedAt,
  });
  // A flow that was already set up when the page opened shows nothing; the
  // Sandbox "Go live" prompt only follows a test finished during this visit.
  const completeOnMount = useRef(state.stage === 'complete');

  const activeEnvironment =
    (project as (Project & { activeEnvironment?: ProjectEnvironment }) | null)
      ?.activeEnvironment ?? project?.active_environment;
  const isSandbox = activeEnvironment === 'sandbox';
  const isComplete = state.stage === 'complete';

  if (isComplete && (completeOnMount.current || !isSandbox)) return null;

  const status = (
    complete: boolean,
    stage: typeof state.stage,
  ): SetupGuideStep['status'] =>
    complete ? 'complete' : state.stage === stage ? 'current' : 'upcoming';

  const testTitle = isSandbox ? 'Test & review' : 'Run & review';
  const steps: SetupGuideStep[] = [
    {
      title: 'Map fields',
      description: 'Match source fields to destination fields.',
      status: status(state.mappingReady, 'field_mapping'),
    },
    ...(pipelineRequired
      ? [
          {
            title: 'Choose pipeline',
            description: 'Pick the destination pipeline this flow needs.',
            status: status(state.configurationReady, 'configure'),
          },
        ]
      : []),
    {
      title: testTitle,
      description: 'Run a limited sync and review the result.',
      status: status(state.testComplete, 'test'),
    },
    isComplete
      ? {
          title: 'Go live',
          description: 'Move this flow to Production.',
          status: 'current' as const,
          optional: true,
        }
      : {
          title: 'Automate',
          description: 'Set a schedule if the flow should run on its own.',
          status: 'upcoming' as const,
          optional: true,
        },
  ];

  let next: SetupGuideNext;
  if (isComplete) {
    next = isProductionReady
      ? {
          title: 'Promote to Production',
          instruction: `“${job.name}” passed its Sandbox test and your Production platforms are connected. Switch to Production in Environment settings; your field mappings carry over.`,
          actionLabel: 'Open Environment settings',
          onGo: () =>
            navigate(
              `/projects/${projectId}?tab=settings&section=environments`,
            ),
        }
      : {
          title: 'Connect Production platforms',
          instruction: `“${job.name}” passed its Sandbox test. Connect your live Production platforms to start syncing real data; your field mappings carry over.`,
          actionLabel: 'Connect Production',
          onGo: () =>
            navigate(`/projects/${projectId}?tab=connections&env=production`),
        };
  } else if (state.stage === 'field_mapping') {
    next = {
      title: 'Map your fields',
      instruction:
        'On the Field Mapping tab, match source fields to destination fields and mark at least one as the identifier, so existing records are updated instead of duplicated.',
      actionLabel: 'Map fields',
      onGo: () => handleTabChange('field-mapping'),
    };
  } else if (state.stage === 'configure') {
    next = {
      title: 'Choose the destination pipeline',
      instruction:
        'This destination needs a pipeline. Pick one on the Pipeline tab before running a sync.',
      actionLabel: 'Choose pipeline',
      onGo: () => handleTabChange('pipeline'),
    };
  } else {
    next = {
      title: isSandbox ? 'Run a test sync' : 'Run your first sync',
      instruction: isSandbox
        ? 'Run a limited sync in Sandbox from the Run Sync tab and check the records moved cleanly.'
        : 'Run a limited sync from the Run Sync tab and check the records moved cleanly.',
      actionLabel: isSandbox ? 'Run test sync' : 'Run sync',
      onGo: () => handleTabChange('run-sync'),
    };
  }

  return { label: 'Flow setup', steps, next };
}
