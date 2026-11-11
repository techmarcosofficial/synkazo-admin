import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useProjectDetailContext } from './context';

import { selectProjectOnboardingStage } from '@/features/onboarding';
import type {
  SetupGuide,
  SetupGuideStep,
} from '@/features/onboarding/setupGuide';
import {
  clearDraftSyncJob,
  getDraftSyncJob,
  type DraftSyncJob,
} from '@/features/journey/draftSyncJob';

const DRAFT_STEP_NAMES = [
  'Job Details',
  'Object & Status',
  'Field Mapping',
  'Default Values',
  'Schedule & Launch',
];

function draftLabel(draft: DraftSyncJob) {
  const step = Number(draft.step ?? 0);
  const name =
    step === 1 && !draft.config?.sourceObject
      ? 'Field Mapping'
      : (DRAFT_STEP_NAMES[step] ?? DRAFT_STEP_NAMES[0]);
  const flowName =
    draft.config?.name ||
    (draft.config?.sourceObject && draft.config?.destObject
      ? `${draft.config.sourceObject} → ${draft.config.destObject}`
      : 'Sync flow draft');
  return { flowName, stepLabel: `step ${step + 1}, ${name}` };
}

/**
 * Project setup for the tab-row indicator: connect platforms → create a sync
 * flow → configure & test it. Returns null once the first sync has succeeded.
 */
export function useProjectSetupGuide(): SetupGuide | null {
  const navigate = useNavigate();
  const {
    projectId,
    jobs,
    logs,
    hasBothConnections,
    hasJobs,
    handleTabChange,
    onCreateSyncRule,
  } = useProjectDetailContext();

  const [draft, setDraft] = useState<DraftSyncJob | null>(() =>
    getDraftSyncJob(projectId),
  );
  useEffect(() => {
    setDraft(getDraftSyncJob(projectId));
  }, [projectId]);

  const stage = selectProjectOnboardingStage({
    hasBothConnections,
    hasJobs,
    jobs,
    runStatuses: logs
      ?.filter((log) => jobs.some((job) => job.id === log.jobId))
      .map((log) => log.metadata?.status),
  });

  if (stage === 'complete') return null;

  const flowCreated = hasBothConnections && hasJobs;
  const steps: SetupGuideStep[] = [
    {
      title: 'Connect platforms',
      description: 'Connect and verify the source and destination.',
      status: hasBothConnections ? 'complete' : 'current',
    },
    {
      title: 'Create a sync flow',
      description: 'Choose which records move between the platforms.',
      status: flowCreated
        ? 'complete'
        : hasBothConnections
          ? 'current'
          : 'upcoming',
    },
    {
      title: 'Configure & test',
      description: 'Map the fields, then run a successful test sync.',
      status: flowCreated ? 'current' : 'upcoming',
    },
  ];

  const label = 'Project setup';

  if (!hasBothConnections) {
    return {
      label,
      steps,
      next: {
        title: 'Connect your platforms',
        instruction:
          'Connect and verify both the source and destination on the Connections tab. Sync flows unlock once both are verified.',
        actionLabel: 'Open Connections',
        onGo: () => handleTabChange('connections'),
      },
    };
  }

  if (hasJobs) {
    const onlyJob = jobs.length === 1 ? jobs[0] : null;
    const mappingReady = Boolean(
      onlyJob?.fieldMappings?.some((mapping) => mapping.isMatchField),
    );
    return {
      label,
      steps,
      next: {
        title: 'Configure & test your sync flow',
        instruction: onlyJob
          ? mappingReady
            ? `“${onlyJob.name}” has field mappings. Open it and run a test sync to finish setup.`
            : `“${onlyJob.name}” is created. Open it to map its fields, then run a test sync.`
          : 'Open a sync flow to map its fields, then run a successful test sync.',
        actionLabel: onlyJob ? 'Open sync flow' : 'View sync flows',
        guidesFlowAction: true,
        onGo: onlyJob
          ? () => navigate(`/projects/${projectId}/jobs/${onlyJob.id}`)
          : () => handleTabChange('sync-rules'),
      },
    };
  }

  if (draft) {
    const { flowName, stepLabel } = draftLabel(draft);
    return {
      label,
      steps,
      next: {
        title: 'Finish your sync flow',
        instruction: `Your unfinished sync flow “${flowName}” was saved at ${stepLabel}. Resume it to finish creating the flow.`,
        actionLabel: 'Resume draft',
        onGo: onCreateSyncRule,
      },
      secondaryAction: {
        label: 'Discard draft',
        onClick: () => {
          clearDraftSyncJob(projectId);
          setDraft(null);
        },
      },
    };
  }

  return {
    label,
    steps,
    next: {
      title: 'Create your first sync flow',
      instruction:
        'Both platforms are connected. Create a sync flow to choose which records move between them.',
      actionLabel: 'Create sync flow',
      onGo: onCreateSyncRule,
    },
  };
}
