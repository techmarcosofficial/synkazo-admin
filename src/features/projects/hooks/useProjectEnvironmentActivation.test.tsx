import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProjectEnvironmentActivation } from './useProjectEnvironmentActivation';
import { projectDetailQueryKey } from './useProjectDetail';

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
  const queryClient = new QueryClient();
  const hook = renderHook(
    () =>
      useProjectEnvironmentActivation({
        projectId: project.id,
        project: projectValue,
        connections,
        loading: false,
        patchProject,
        refetch,
      }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    },
  );
  return { ...hook, patchProject, refetch, queryClient };
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

  it('clears previous workspace jobs, logs and totals as soon as activation succeeds', async () => {
    const { result, queryClient } = setupHook();
    queryClient.setQueryData(projectDetailQueryKey(project.id), {
      project: { ...project, totalRecordsSynced: 5, totalErrorCount: 1 },
      jobs: [{ id: 'sandbox-job' }],
      connections: sandboxPair,
      logs: [{ id: 'sandbox-log' }],
    });

    await act(() => result.current.handleActivateEnv('production'));

    expect(queryClient.getQueryData(projectDetailQueryKey(project.id))).toMatchObject({
      jobs: [],
      logs: [],
      project: {
        activeEnvironment: 'production',
        totalRecordsSynced: 0,
        totalErrorCount: 0,
      },
    });
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
