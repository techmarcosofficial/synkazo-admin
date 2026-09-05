import { describe, expect, it } from 'vitest';

import { deriveProjectSetupState } from './projectSetupState';

import type { ConnectionExt, ProjectExt } from '@/features/projects/hooks';

const project = { id: 'project-1', setupCompletedAt: null } as ProjectExt;

function connection(
  connectionType: 'source' | 'destination',
  environment: 'sandbox' | 'production' = 'production',
): ConnectionExt {
  return {
    id: `${environment}-${connectionType}`,
    projectId: project.id,
    platformId: connectionType === 'source' ? 'servicetitan' : 'hubspot',
    connectionType,
    environment,
    status: 'connected',
  } as ConnectionExt;
}

describe('deriveProjectSetupState', () => {
  it('derives setup progress entirely from refreshed project data', () => {
    expect(deriveProjectSetupState({ project, connections: [] })).toBe('Draft');

    expect(
      deriveProjectSetupState({
        project,
        connections: [connection('source')],
      }),
    ).toBe('NeedsConnections');

    expect(
      deriveProjectSetupState({
        project,
        connections: [
          connection('source', 'production'),
          connection('destination', 'sandbox'),
        ],
      }),
    ).toBe('NeedsConnections');

    expect(
      deriveProjectSetupState({
        project,
        connections: [connection('source'), connection('destination')],
      }),
    ).toBe('CreatingSyncRule');

    expect(
      deriveProjectSetupState({
        project: { ...project, setupCompletedAt: '2026-09-05T10:00:00.000Z' },
        connections: [],
      }),
    ).toBe('Live');
  });
});
