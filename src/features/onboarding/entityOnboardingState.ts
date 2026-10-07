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
  'connect_platforms' | 'create_first_job' | 'configure_job' | 'complete';

export interface ProjectOnboardingStageJob {
  status?: string;
  syncEnabled?: boolean;
  isEnabled?: boolean;
  lastSyncedAt?: string | null;
  recordsSynced?: number;
}

export function selectProjectOnboardingStage(input: {
  hasBothConnections: boolean;
  hasJobs: boolean;
  jobs?: ProjectOnboardingStageJob[];
  runStatuses?: Array<string | undefined>;
}): ProjectOnboardingStage {
  // Recent activity distinguishes a clean run from a partial one. Older
  // projects without retained run activity can still use the job watermark.
  const loggedRuns = input.runStatuses?.filter(Boolean) ?? [];
  const hasCompletedRun =
    loggedRuns.length > 0
      ? loggedRuns.includes('success')
      : (input.jobs?.some(
          (job) => Boolean(job.lastSyncedAt) || (job.recordsSynced ?? 0) > 0,
        ) ?? false);

  if (!input.hasBothConnections) {
    return hasCompletedRun ? 'complete' : 'connect_platforms';
  }

  if (hasCompletedRun) return 'complete';

  return input.hasJobs || Boolean(input.jobs?.length)
    ? 'configure_job'
    : 'create_first_job';
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
