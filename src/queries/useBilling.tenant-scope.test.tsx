import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { usePlanQuery } from './useBilling';

const state = vi.hoisted(() => ({
  role: 'super_admin',
  organisationId: null as string | null,
}));
const getPlan = vi.hoisted(() => vi.fn());
vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({ currentUser: { id: 'user', ...state } }),
}));
vi.mock('@/api/billing', () => ({
  billingApi: { getPlan },
  billingAdminApi: {},
}));

function show(enabled?: boolean) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => usePlanQuery({ enabled }), { wrapper });
}

describe('tenant plan request isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.role = 'super_admin';
    state.organisationId = null;
    getPlan.mockResolvedValue({ subscriptionStatus: 'active' });
  });
  afterEach(cleanup);

  it.each([null, 'legacy-org'])(
    'never requests tenant billing for Super Admin, including stored org %s',
    async (org) => {
      state.organisationId = org;
      const { result } = show(true);
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.fetchStatus).toBe('idle');
      expect(getPlan).not.toHaveBeenCalled();
    },
  );

  it('continues loading the authenticated tenant organization plan', async () => {
    state.role = 'org_admin';
    state.organisationId = 'tenant-org';
    const { result } = show();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getPlan).toHaveBeenCalledTimes(1);
  });

  it('does not query before an organization is available or when explicitly disabled', async () => {
    state.role = 'org_admin';
    const first = show();
    await act(async () => {
      await Promise.resolve();
    });
    expect(first.result.current.fetchStatus).toBe('idle');
    first.unmount();
    state.organisationId = 'tenant-org';
    const second = show(false);
    await act(async () => {
      await Promise.resolve();
    });
    expect(second.result.current.fetchStatus).toBe('idle');
    expect(getPlan).not.toHaveBeenCalled();
  });
});
