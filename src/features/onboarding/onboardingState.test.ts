import { describe, expect, it } from 'vitest';

import { selectOnboardingState } from './onboardingState';

import type { Connection, Job, Project } from '@/types';

const project = (id: string, createdAt: string): Project =>
  ({
    id,
    name: id,
    organisationId: 'org-1',
    sourcePlatformId: 'servicetitan',
    destPlatformId: 'hubspot',
    status: 'active',
    createdAt,
  }) as Project;

const connection = (
  projectId: string,
  connectionType: Connection['connectionType'],
  status: Connection['status'] = 'connected',
): Connection =>
  ({
    id: `${projectId}-${connectionType}`,
    projectId,
    platformId: connectionType === 'source' ? 'servicetitan' : 'hubspot',
    connectionType,
    status,
  }) as Connection;

const job = (projectId: string): Job =>
  ({
    id: `${projectId}-job`,
    projectId,
    name: 'First job',
    sourceObject: 'contacts',
    destObject: 'contacts',
    status: 'idle',
  }) as Job;

describe('selectOnboardingState', () => {
  it('starts with project creation when no projects exist', () => {
    expect(
      selectOnboardingState({ projects: [], jobs: [], connections: [] }),
    ).toEqual({
      stage: 'create_project',
    });
  });

  it('guides the newest incomplete project to connections', () => {
    const projects = [
      project('old', '2026-01-01'),
      project('new', '2026-02-01'),
    ];
    expect(
      selectOnboardingState({ projects, jobs: [], connections: [] }),
    ).toEqual({
      stage: 'connect_platforms',
      targetProjectId: 'new',
      connectionState: 'missing',
    });
  });

  it('distinguishes an unverified connection from a missing one', () => {
    const p = project('p1', '2026-01-01');
    expect(
      selectOnboardingState({
        projects: [p],
        jobs: [],
        connections: [connection('p1', 'source', 'pending')],
      }),
    ).toMatchObject({
      stage: 'connect_platforms',
      connectionState: 'verification_required',
    });
  });

  it('asks for the first job after a project has both connections ready', () => {
    const p = project('p1', '2026-01-01');
    expect(
      selectOnboardingState({
        projects: [p],
        jobs: [],
        connections: [
          connection('p1', 'source'),
          connection('p1', 'destination'),
        ],
      }),
    ).toEqual({ stage: 'create_first_job', targetProjectId: 'p1' });
  });

  it('completes organisation onboarding after any usable project', () => {
    const usable = project('usable', '2026-01-01');
    const incomplete = project('incomplete', '2026-03-01');
    expect(
      selectOnboardingState({
        projects: [incomplete, usable],
        jobs: [job('usable')],
        connections: [
          connection('usable', 'source'),
          connection('usable', 'destination'),
        ],
      }),
    ).toEqual({ stage: 'complete' });
  });
});
