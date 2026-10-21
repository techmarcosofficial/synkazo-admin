import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import type { ExtConnection } from './types';

import { useConnectionAccess } from './ConnectionAccessContext';
import { sseClient } from '@/lib/sseClient';
import { redirectToOAuth } from '@/lib/oauthRedirect';
import type { Connection, PlatformId } from '@/types';

interface UseConnectionsManagerParams {
  projectId: string;
  sourcePlatformId?: string;
  destPlatformId?: string;
  onConnectionsChange?: ((conns: Connection[]) => void) | null;
  reloadKey?: number;
  /** The project's actually-activated environment — used to select the right env on first load. */
  projectActiveEnv?: string | null;
}

export function useConnectionsManager({
  projectId,
  sourcePlatformId,
  destPlatformId,
  onConnectionsChange = null,
  reloadKey = 0,
  projectActiveEnv = null,
}: UseConnectionsManagerParams) {
  const { api: connectionsApi, audience } = useConnectionAccess();
  const [connections, setConnections] = useState<ExtConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [oauthPending, setOAuthPending] = useState(false);
  const oauthInFlight = useRef(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeConn, setActiveConn] = useState<ExtConnection | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [activeEnv, setActiveEnv] = useState(projectActiveEnv ?? 'sandbox');
  const envInitializedRef = useRef(!!projectActiveEnv);

  useEffect(() => {
    if (envInitializedRef.current) return;
    if (!projectActiveEnv) return;
    if (searchParams.get('env')) return;
    setActiveEnv(projectActiveEnv);
    envInitializedRef.current = true;
  }, [projectActiveEnv, searchParams]);

  useEffect(() => {
    const envParam = searchParams.get('env');
    if (envParam === 'production' || envParam === 'sandbox') {
      setActiveEnv(envParam);
    }
  }, [searchParams]);

  const onChangeRef = useRef(onConnectionsChange);
  onChangeRef.current = onConnectionsChange;

  const initialLoadDoneRef = useRef(false);

  const loadConnections = useCallback(
    async (silent = false) => {
      if (!projectId) return;
      const shouldShowLoading = !silent && !initialLoadDoneRef.current;
      if (shouldShowLoading) setLoading(true);
      try {
        const conns = await connectionsApi.listProjectConnections(projectId);
        const list = (Array.isArray(conns) ? conns : []) as ExtConnection[];
        setConnections(list);
        setLoadError(null);
        onChangeRef.current?.(list);
        initialLoadDoneRef.current = true;
      } catch {
        if (!initialLoadDoneRef.current)
          setLoadError('Could not load project connections. Try again.');
        if (!silent) toast.error('Failed to load connections');
      } finally {
        if (shouldShowLoading) setLoading(false);
      }
    },
    [projectId, connectionsApi],
  );

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    if (reloadKey > 0) loadConnections(true);
  }, [reloadKey, loadConnections]);

  useEffect(() => {
    if (!projectId || audience !== 'tenant') return;
    const handler = (data: unknown) => {
      const d = data as { projectId?: string } | null;
      if (d?.projectId === projectId) loadConnections(true);
    };
    const offUpdated = sseClient.on('connection:updated', handler);
    const offRemoved = sseClient.on('connection:removed', handler);
    return () => {
      offUpdated();
      offRemoved();
    };
  }, [projectId, loadConnections, audience]);

  useEffect(() => {
    if (!projectId) return;
    const interval = setInterval(() => {
      if (!sseClient.isConnected()) loadConnections(true);
    }, 45000);
    return () => clearInterval(interval);
  }, [projectId, loadConnections]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const oauthError = searchParams.get('hubspot_error');
    const rescoped = searchParams.get('rescoped');
    const added = Number(searchParams.get('added') ?? 0);
    const removed = Number(searchParams.get('removed') ?? 0);
    const envParam = searchParams.get('env');
    if (envParam === 'production' || envParam === 'sandbox') {
      setActiveEnv(envParam);
    }
    if (rescoped) {
      if (removed > 0) {
        toast.warning(
          `HubSpot permissions updated. ${removed} permission(s) removed. Some features may now be unavailable.`,
        );
      } else if (added > 0) {
        toast.success(
          `HubSpot permissions updated. ${added} permission(s) added.`,
        );
      } else {
        toast.success('HubSpot permissions reviewed. No changes were made.');
      }
      loadConnections();
      const next = new URLSearchParams(searchParams);
      next.delete('rescoped');
      next.delete('added');
      next.delete('removed');
      next.delete('env');
      setSearchParams(next, { replace: true });
    } else if (connected === 'hubspot') {
      toast.success('HubSpot connected via OAuth');
      resetModals();
      loadConnections(true);
      const next = new URLSearchParams(searchParams);
      next.delete('connected');
      next.delete('env');
      setSearchParams(next, { replace: true });
    } else if (oauthError) {
      if (oauthError === 'access_denied') {
        toast.info(
          'Permission update cancelled. Your existing HubSpot connection is unchanged.',
        );
      } else {
        toast.error(
          oauthError === 'state_expired'
            ? 'HubSpot authorization expired. Start again from this project.'
            : 'Could not complete HubSpot authorization. Try connecting again.',
        );
      }
      resetModals();
      const next = new URLSearchParams(searchParams);
      next.delete('hubspot_error');
      next.delete('env');
      next.delete('reason');
      setSearchParams(next, { replace: true });
    }
  }, []);

  const resetModals = () => {
    setShowManualModal(false);
    setActiveConn(null);
  };

  const openConnect = (conn: ExtConnection) => {
    if (conn.platformId === 'hubspot') {
      void handleOAuth(conn);
      return;
    }
    setActiveConn(conn);
    setShowManualModal(true);
  };

  const handleSaved = () => {
    resetModals();
    loadConnections(true);
  };

  const handleOAuth = async (connection = activeConn) => {
    if (!connection || oauthInFlight.current) return;
    oauthInFlight.current = true;
    setOAuthPending(true);
    try {
      const redirectUrl = connection.id
        ? (await connectionsApi.startHubSpotRescope(connection.id)).redirectUrl
        : await connectionsApi.getHubSpotOAuthUrl(
            projectId,
            connection.connectionType as 'source' | 'destination',
            (connection.environment ?? activeEnv) as 'production' | 'sandbox',
          );
      resetModals();
      redirectToOAuth(redirectUrl);
    } catch {
      toast.error('Failed to start HubSpot OAuth');
      oauthInFlight.current = false;
      setOAuthPending(false);
    }
  };

  const handleRowUpdated = (updated: ExtConnection | null) => {
    if (updated === null) {
      loadConnections(true);
    } else {
      const next = connections.map((c) =>
        c.id === updated.id ? { ...c, ...updated } : c,
      );
      setConnections(next);
      onChangeRef.current?.(next);
    }
  };

  const envOf = (c: ExtConnection) => c.environment ?? 'production';
  // A saved connection can remain disconnected when the verification request
  // fails before the server has a chance to mark it as an error.
  const isReal = (c: ExtConnection) => Boolean(c.id);
  const inActiveEnv = (c: ExtConnection) => envOf(c) === activeEnv;

  const realConnections = connections.filter(isReal).filter(inActiveEnv);
  const sourceConn = realConnections.find((c) => c.connectionType === 'source');
  const destConn = realConnections.find(
    (c) => c.connectionType === 'destination',
  );

  const envHasAnyConnected = (env: string) =>
    connections
      .filter(isReal)
      .some((c) => envOf(c) === env && c.status === 'connected');

  const envFullyConnected = (env: string) => {
    const envConns = connections.filter(
      (c) => isReal(c) && envOf(c) === env && c.status === 'connected',
    );
    const srcOk =
      !sourcePlatformId || envConns.some((c) => c.connectionType === 'source');
    const dstOk =
      !destPlatformId ||
      envConns.some((c) => c.connectionType === 'destination');
    return srcOk && dstOk;
  };

  const makeSlotConn = (
    platformId: string,
    connectionType: 'source' | 'destination',
  ): ExtConnection => ({
    id: '',
    projectId,
    platformId: platformId as PlatformId,
    connectionType,
    environment: activeEnv as 'production' | 'sandbox',
    status: 'disconnected',
    accountName: undefined,
  });

  return {
    loading,
    loadError,
    oauthPending,
    activeEnv,
    setActiveEnv,
    sourceConn,
    destConn,
    envHasAnyConnected,
    envFullyConnected,
    makeSlotConn,
    openConnect,
    handleRowUpdated,
    refreshConnections: () => loadConnections(true),
    activeConn,
    showManualModal,
    handleOAuth,
    handleSaved,
    resetModals,
  };
}
