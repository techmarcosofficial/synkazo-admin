import type { ConsolidatedMapping, ExtSyncRun } from '@/features/jobs/hooks';

export type ContextualSetupAction = 'none' | 'continue' | 'next';

export function selectContextualSetupAction(input: {
  activePage: string;
  targetPage: string;
  previousPage?: string | null;
}): ContextualSetupAction {
  if (input.activePage === input.targetPage) return 'none';
  if (input.activePage === input.previousPage) return 'next';
  return 'continue';
}

export type ProjectOnboardingStage =
  'connect_platforms' | 'create_first_job' | 'complete';

export function selectProjectOnboardingStage(input: {
  hasBothConnections: boolean;
  hasJobs: boolean;
}): ProjectOnboardingStage {
  // A job can only be created after connections were ready. Its existence is
  // therefore the durable, data-backed completion signal for this project;
  // a later connection outage should be handled operationally, not restart
  // first-time onboarding.
  if (input.hasJobs) return 'complete';
  if (input.hasBothConnections) return 'create_first_job';
  return 'connect_platforms';
}

export type JobOnboardingStage =
  'field_mapping' | 'configure' | 'test' | 'complete';

export interface JobOnboardingState {
  stage: JobOnboardingStage;
  mappingReady: boolean;
  configurationReady: boolean;
  testComplete: boolean;
}

export function selectJobOnboardingState(input: {
  mappings: ConsolidatedMapping[];
  pipelineRequired: boolean;
  pipelineConfigured: boolean;
  runLogs: ExtSyncRun[];
  lastSyncedAt?: string | null;
}): JobOnboardingState {
  const mappingReady =
    input.mappings.length > 0 &&
    input.mappings.some((mapping) => Boolean(mapping.matchDestKey));
  const configurationReady =
    mappingReady && (!input.pipelineRequired || input.pipelineConfigured);
  // A successful historical run remains the completion signal even if a
  // mapping or connection later needs repair. Those are operational issues,
  // not reasons to restart first-time onboarding.
  const testComplete =
    Boolean(input.lastSyncedAt) ||
    input.runLogs.some(
      (run) => run.status === 'success' || run.status === 'completed',
    );

  let stage: JobOnboardingStage = 'test';
  if (testComplete) stage = 'complete';
  else if (!mappingReady) stage = 'field_mapping';
  else if (!configurationReady) stage = 'configure';

  return {
    stage,
    mappingReady,
    configurationReady,
    testComplete,
  };
}
