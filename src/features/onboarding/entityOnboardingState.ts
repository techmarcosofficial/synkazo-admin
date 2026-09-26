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
  | 'connect_platforms'
  | 'create_first_job'
  | 'configure_job'
  | 'complete';

export interface ProjectOnboardingStageJob {
  status?: string;
  syncEnabled?: boolean;
  isEnabled?: boolean;
  lastSyncedAt?: string | null;
  recordsSynced?: number;
  cronExpression?: string | null;
  intervalMinutes?: number | null;
  scheduleTimes?: string[] | null;
}

export function selectProjectOnboardingStage(input: {
  hasBothConnections: boolean;
  hasJobs: boolean;
  jobs?: ProjectOnboardingStageJob[];
}): ProjectOnboardingStage {
  if (!input.hasBothConnections) {
    const hasPastSyncedJob =
      input.jobs?.some(
        (j) =>
          Boolean(j.lastSyncedAt) ||
          (j.recordsSynced != null && j.recordsSynced > 0),
      ) ?? false;

    if (hasPastSyncedJob || (!input.jobs && input.hasJobs)) {
      return 'complete';
    }

    return 'connect_platforms';
  }

  if (input.jobs && input.jobs.length > 0) {
    const hasActiveOrCompletedJob = input.jobs.some((j) => {
      if (j.status === 'draft') return false;
      const hasSynced =
        Boolean(j.lastSyncedAt) ||
        (j.recordsSynced != null && j.recordsSynced > 0);
      const isConfiguredAndActive =
        (j.status === 'active' || j.syncEnabled || j.isEnabled) &&
        (Boolean(j.cronExpression) ||
          Boolean(j.intervalMinutes) ||
          Boolean(j.scheduleTimes?.length) ||
          j.syncEnabled ||
          j.isEnabled);
      return hasSynced || isConfiguredAndActive;
    });

    if (hasActiveOrCompletedJob) return 'complete';
    return 'configure_job';
  }

  // Backward-compatible fallback when jobs list is not provided
  if (input.hasJobs) return 'complete';
  return 'create_first_job';
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
