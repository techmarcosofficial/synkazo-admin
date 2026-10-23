import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUpdateSuperAdminProjectMutation } from './useSuperAdmin';
import { queryKeys } from './queryKeys';

const patch = vi.hoisted(() => vi.fn());
vi.mock('@/api/apiClient', () => ({ default: { patch } }));

afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());

describe('Super Admin project status request and cache scope', () => {
  function setup() {
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const projectKey = queryKeys.superAdmin.operations.project(
      'org-1',
      'proj-1',
    );
    const listKey = queryKeys.superAdmin.operations.projects('org-1', 1, 20);
    const activityKey = ['superAdmin', 'org-1', 'activity'];
    const otherOrgKey = queryKeys.superAdmin.operations.project(
      'org-2',
      'proj-2',
    );
    for (const key of [projectKey, listKey, activityKey, otherOrgKey]) {
      client.setQueryData(key, { status: 'active' });
    }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const hook = renderHook(
      () => useUpdateSuperAdminProjectMutation('org-1', 'proj-1'),
      { wrapper },
    );
    return { ...hook, client, projectKey, listKey, activityKey, otherOrgKey };
  }

  it('patches the scoped route and refreshes affected org caches without touching another org', async () => {
    const state = setup();
    const updated = { id: 'proj-1', status: 'paused' };
    patch.mockResolvedValue({ data: { success: true, data: updated } });

    await act(async () => {
      await expect(
        state.result.current.mutateAsync({ status: 'paused' }),
      ).resolves.toEqual(updated);
    });

    expect(patch).toHaveBeenCalledExactlyOnceWith(
      '/super-admin/organisations/org-1/projects/proj-1',
      { status: 'paused' },
    );
    for (const key of [state.projectKey, state.listKey, state.activityKey]) {
      expect(state.client.getQueryState(key)?.isInvalidated).toBe(true);
    }
    expect(state.client.getQueryState(state.otherOrgKey)?.isInvalidated).toBe(
      false,
    );
  });

  it('preserves cached project status when the server rejects the update', async () => {
    const state = setup();
    patch.mockRejectedValue(new Error('Project not found'));

    await act(async () => {
      await expect(
        state.result.current.mutateAsync({ status: 'paused' }),
      ).rejects.toThrow('Project not found');
    });

    expect(state.client.getQueryData(state.projectKey)).toEqual({
      status: 'active',
    });
    expect(state.client.getQueryState(state.projectKey)?.isInvalidated).toBe(
      false,
    );
  });
});
