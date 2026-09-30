import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useConnectionsManager } from './useConnectionsManager';
import { connectionsApi } from '@/api/connections';

vi.mock('@/api/connections', () => ({
  connectionsApi: {
    listProjectConnections: vi.fn(),
    getHubSpotOAuthUrl: vi.fn(),
  },
}));

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
    expect(result.current.showMethodModal).toBe(false);
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

    // Open connect for HubSpot destination
    const slotConn = result.current.makeSlotConn('hubspot', 'destination');
    act(() => {
      result.current.openConnect(slotConn);
    });

    expect(result.current.showManualModal).toBe(true);
    expect(result.current.activeConn?.platformId).toBe('hubspot');

    // Reset modals
    act(() => {
      result.current.resetModals();
    });

    expect(result.current.showManualModal).toBe(false);
    expect(result.current.activeConn).toBeNull();
  });
});
