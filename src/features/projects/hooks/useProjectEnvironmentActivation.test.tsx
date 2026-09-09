import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProjectEnvironmentActivation } from './useProjectEnvironmentActivation';

import { connectionsApi } from '@/api/connections';
import type { ConnectionExt, ProjectExt } from '@/features/projects/hooks';

vi.mock('@/api/connections', async () => {
  const actual =
    await vi.importActual<typeof import('@/api/connections')>(
      '@/api/connections',
    );
  return {
    ...actual,
    connectionsApi: {
      ...actual.connectionsApi,
      activateEnvironment: vi.fn(),
    },
  };
});

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-1'),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const activateEnvironment = vi.mocked(connectionsApi.activateEnvironment);

const project: ProjectExt = {
  id: 'project-1',
  organisationId: 'org-1',
  name: 'Environment project',
  sourcePlatformId: 'servicetitan',
  destPlatformId: 'hubspot',
  status: 'active',
  activeEnvironment: 'sandbox',
  environmentActivatedAt: '2026-01-01T00:00:00.000Z',
};

function connection(
  id: string,
  environment: 'sandbox' | 'production',
  connectionType: 'source' | 'destination',
): ConnectionExt {
  return {
    id,
    projectId: project.id,
    platformId: connectionType === 'source' ? 'servicetitan' : 'hubspot',
    connectionType,
    environment,
    status: 'connected',
  };
}

const sandboxPair = [
  connection('sandbox-source', 'sandbox', 'source'),
  connection('sandbox-destination', 'sandbox', 'destination'),
];

function setupHook(
  projectValue: ProjectExt = project,
  connections: ConnectionExt[] = sandboxPair,
) {
  const patchProject = vi.fn();
  const refetch = vi.fn();
  const hook = renderHook(() =>
    useProjectEnvironmentActivation({
      projectId: project.id,
      project: projectValue,
      connections,
      loading: false,
      patchProject,
      refetch,
    }),
  );
  return { ...hook, patchProject, refetch };
}

beforeEach(() => {
  vi.clearAllMocks();
  activateEnvironment.mockResolvedValue({});
});

describe('useProjectEnvironmentActivation', () => {
  it('uses the persisted activated environment as the read-only current state', async () => {
    const { result } = setupHook();

    await waitFor(() =>
      expect(result.current.projectActiveEnv).toBe('sandbox'),
    );
    expect(activateEnvironment).not.toHaveBeenCalled();
  });

  it('updates project context after a verified manual activation', async () => {
    const { result, patchProject, refetch } = setupHook();

    await act(() => result.current.handleActivateEnv('production'));

    expect(activateEnvironment).toHaveBeenCalledWith('project-1', 'production');
    expect(result.current.projectActiveEnv).toBe('production');
    expect(patchProject).toHaveBeenCalledWith(
      expect.objectContaining({ activeEnvironment: 'production' }),
    );
    expect(refetch).toHaveBeenCalled();
  });

  it('keeps activation API failures visible and retryable', async () => {
    activateEnvironment.mockRejectedValue({
      response: { data: { message: 'Production source is not verified.' } },
    });
    const { result } = setupHook();

    await act(async () => {
      await expect(
        result.current.handleActivateEnv('production'),
      ).rejects.toBeTruthy();
    });

    expect(result.current.activationError).toBe(
      'Production source is not verified.',
    );
    act(() => result.current.clearActivationError());
    expect(result.current.activationError).toBeNull();
  });

  it('auto-activates the first complete environment for a new project', async () => {
    const unactivatedProject = {
      ...project,
      activeEnvironment: 'production' as const,
      environmentActivatedAt: null,
    };
    const { result } = setupHook(unactivatedProject);

    await waitFor(() =>
      expect(activateEnvironment).toHaveBeenCalledWith('project-1', 'sandbox'),
    );
    await waitFor(() =>
      expect(result.current.projectActiveEnv).toBe('sandbox'),
    );
  });
});
