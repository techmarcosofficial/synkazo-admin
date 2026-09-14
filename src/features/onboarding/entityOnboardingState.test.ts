import { describe, expect, it } from 'vitest';

import {
  selectContextualSetupAction,
  selectJobOnboardingState,
  selectProjectOnboardingStage,
} from './entityOnboardingState';

import type { ConsolidatedMapping, ExtSyncRun } from '@/features/jobs/hooks';

const mapping = (matchDestKey?: string): ConsolidatedMapping =>
  ({
    sourceField: 'email',
    destField: 'email',
    matchDestKey,
  }) as ConsolidatedMapping;

const run = (status: ExtSyncRun['status']): ExtSyncRun =>
  ({ id: 'run-1', jobId: 'job-1', status }) as ExtSyncRun;

describe('selectContextualSetupAction', () => {
  it('hides the CTA when the active page owns the required action', () => {
    expect(
      selectContextualSetupAction({
        activePage: 'connections',
        targetPage: 'connections',
      }),
    ).toBe('none');
  });

  it('shows Next when advancing from the completed previous step', () => {
    expect(
      selectContextualSetupAction({
        activePage: 'connections',
        targetPage: 'sync-rules',
        previousPage: 'connections',
      }),
    ).toBe('next');
  });

  it('shows Continue setup when entering or resuming elsewhere', () => {
    expect(
      selectContextualSetupAction({
        activePage: 'overview',
        targetPage: 'connections',
      }),
    ).toBe('continue');
  });
});

describe('selectProjectOnboardingStage', () => {
  it('keeps connection setup current until both connections are ready', () => {
    expect(
      selectProjectOnboardingStage({
        hasBothConnections: false,
        hasJobs: false,
      }),
    ).toBe('connect_platforms');
  });

  it('moves to job creation only after both connections are ready', () => {
    expect(
      selectProjectOnboardingStage({
        hasBothConnections: true,
        hasJobs: false,
      }),
    ).toBe('create_first_job');
  });

  it('completes per-project onboarding after the first job exists', () => {
    expect(
      selectProjectOnboardingStage({
        hasBothConnections: true,
        hasJobs: true,
      }),
    ).toBe('complete');
  });

  it('does not restart completed project onboarding after a connection outage', () => {
    expect(
      selectProjectOnboardingStage({
        hasBothConnections: false,
        hasJobs: true,
      }),
    ).toBe('complete');
  });
});

describe('selectJobOnboardingState', () => {
  it('requires both a mapping and a match field', () => {
    expect(
      selectJobOnboardingState({
        mappings: [mapping()],
        pipelineRequired: false,
        pipelineConfigured: true,
        runLogs: [],
      }).stage,
    ).toBe('field_mapping');
  });

  it('requires pipeline configuration only for jobs that need it', () => {
    expect(
      selectJobOnboardingState({
        mappings: [mapping('email')],
        pipelineRequired: true,
        pipelineConfigured: false,
        runLogs: [],
      }).stage,
    ).toBe('configure');
  });

  it('moves a configured job to testing', () => {
    expect(
      selectJobOnboardingState({
        mappings: [mapping('email')],
        pipelineRequired: false,
        pipelineConfigured: true,
        runLogs: [],
      }).stage,
    ).toBe('test');
  });

  it('completes after a successful run without requiring automation', () => {
    expect(
      selectJobOnboardingState({
        mappings: [mapping('email')],
        pipelineRequired: false,
        pipelineConfigured: true,
        runLogs: [run('completed')],
      }).stage,
    ).toBe('complete');
  });

  it('does not restart completed job onboarding when setup later needs repair', () => {
    expect(
      selectJobOnboardingState({
        mappings: [],
        pipelineRequired: true,
        pipelineConfigured: false,
        runLogs: [],
        lastSyncedAt: '2026-09-12T09:00:00.000Z',
      }).stage,
    ).toBe('complete');
  });
});
