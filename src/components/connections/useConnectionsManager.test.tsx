import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useConnectionsManager } from './useConnectionsManager';
import { connectionsApi } from '@/api/connections';
import { redirectToOAuth } from '@/lib/oauthRedirect';

vi.mock('@/api/connections', () => ({
  connectionsApi: {
    listProjectConnections: vi.fn(),
    getHubSpotOAuthUrl: vi.fn(),
    startHubSpotRescope: vi.fn(),
  },
}));

vi.mock('@/lib/oauthRedirect', () => ({ redirectToOAuth: vi.fn() }));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('useConnectionsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={['/projects/p1?tab=connections']}>
      {children}
    </MemoryRouter>
  );

  it('loads connections on initial mount and toggles loading off', async () => {
    vi.mocked(connectionsApi.listProjectConnections).mockResolvedValue([
      {
        id: 'conn-1',
        projectId: 'p1',
        platformId: 'servicetitan',
        connectionType: 'source',
        status: 'connected',
        environment: 'production',
      },
    ] as any);

    const { result } = renderHook(
      () =>
        useConnectionsManager({
          projectId: 'p1',
          sourcePlatformId: 'servicetitan',
          destPlatformId: 'hubspot',
          projectActiveEnv: 'production',
        }),
      { wrapper },
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sourceConn?.platformId).toBe('servicetitan');
  });

  it('keeps loading false during subsequent background reloads (reloadKey or handleSaved)', async () => {
    vi.mocked(connectionsApi.listProjectConnections).mockResolvedValue([
      {
        id: 'conn-1',
        projectId: 'p1',
        platformId: 'servicetitan',
        connectionType: 'source',
        status: 'connected',
        environment: 'production',
      },
    ] as any);

    let reloadKey = 0;
    const { result, rerender } = renderHook(
      (props) =>
        useConnectionsManager({
          projectId: 'p1',
          sourcePlatformId: 'servicetitan',
          destPlatformId: 'hubspot',
          reloadKey: props.reloadKey,
        }),
      {
        wrapper,
        initialProps: { reloadKey: 0 },
      },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate auto-activation triggering a reloadKey bump
    reloadKey = 1;
    rerender({ reloadKey });

    // Loading should NEVER flip back to true and cause UI flash/unmount
    expect(result.current.loading).toBe(false);

    // Call handleSaved (which happens after Done in modal)
    act(() => {
      result.current.handleSaved();
    });

    // Loading should still remain false
    expect(result.current.loading).toBe(false);
    expect(result.current.showManualModal).toBe(false);
    expect(result.current.activeConn).toBeNull();
  });

  it('manages modal opening and cleanly resets all modal states', async () => {
    vi.mocked(connectionsApi.listProjectConnections).mockResolvedValue([]);

    const { result } = renderHook(
      () =>
        useConnectionsManager({
          projectId: 'p1',
          sourcePlatformId: 'servicetitan',
          destPlatformId: 'hubspot',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Credential-based platforms retain their form; HubSpot bypasses it.
    const slotConn = result.current.makeSlotConn('servicetitan', 'source');
    act(() => {
      result.current.openConnect(slotConn);
    });

    expect(result.current.showManualModal).toBe(true);
    expect(result.current.activeConn?.platformId).toBe('servicetitan');

    // Reset modals
    act(() => {
      result.current.resetModals();
    });

    expect(result.current.showManualModal).toBe(false);
    expect(result.current.activeConn).toBeNull();
  });

  it('starts HubSpot OAuth immediately, preserves environment and prevents duplicate requests', async () => {
    vi.mocked(connectionsApi.listProjectConnections).mockResolvedValue([]);
    let finish!: (url: string) => void;
    vi.mocked(connectionsApi.getHubSpotOAuthUrl).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderHook(
      () =>
        useConnectionsManager({
          projectId: 'p1',
          projectActiveEnv: 'production',
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      const slot = result.current.makeSlotConn('hubspot', 'destination');
      result.current.openConnect(slot);
      result.current.openConnect(slot);
    });
    expect(connectionsApi.getHubSpotOAuthUrl).toHaveBeenCalledExactlyOnceWith(
      'p1',
      'destination',
      'production',
    );
    expect(result.current.showManualModal).toBe(false);
    expect(result.current.oauthPending).toBe(true);
    await act(async () => finish('https://app.hubspot.com/oauth/authorize'));
    expect(redirectToOAuth).toHaveBeenCalledWith(
      'https://app.hubspot.com/oauth/authorize',
    );
  });

  it('reconnects an existing HubSpot connection using rescope instead of a credential form', async () => {
    vi.mocked(connectionsApi.listProjectConnections).mockResolvedValue([]);
    vi.mocked(connectionsApi.startHubSpotRescope).mockResolvedValue({
      redirectUrl: 'https://app.hubspot.com/reconnect',
    });
    const { result } = renderHook(
      () => useConnectionsManager({ projectId: 'p1' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() =>
      result.current.openConnect({
        ...result.current.makeSlotConn('hubspot', 'destination'),
        id: 'existing-manual-or-oauth',
      }),
    );
    await waitFor(() =>
      expect(redirectToOAuth).toHaveBeenCalledWith(
        'https://app.hubspot.com/reconnect',
      ),
    );
    expect(connectionsApi.startHubSpotRescope).toHaveBeenCalledWith(
      'existing-manual-or-oauth',
    );
    expect(result.current.showManualModal).toBe(false);
  });

  it('allows OAuth retry if the start request fails', async () => {
    vi.mocked(connectionsApi.listProjectConnections).mockResolvedValue([]);
    vi.mocked(connectionsApi.getHubSpotOAuthUrl)
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValue('https://app.hubspot.com/retry');
    const { result } = renderHook(
      () => useConnectionsManager({ projectId: 'p1' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() =>
      result.current.openConnect(
        result.current.makeSlotConn('hubspot', 'destination'),
      ),
    );
    await waitFor(() => expect(result.current.oauthPending).toBe(false));
    act(() =>
      result.current.openConnect(
        result.current.makeSlotConn('hubspot', 'destination'),
      ),
    );
    await waitFor(() =>
      expect(redirectToOAuth).toHaveBeenCalledWith(
        'https://app.hubspot.com/retry',
      ),
    );
  });
});
