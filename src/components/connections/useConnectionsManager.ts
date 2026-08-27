import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import type { ExtConnection, MissingSlot } from './types';

import { connectionsApi } from '@/api/connections';
import { sseClient } from '@/lib/sseClient';
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
  const [connections, setConnections] = useState<ExtConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeConn, setActiveConn] = useState<ExtConnection | null>(null);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [activeEnv, setActiveEnv] = useState(projectActiveEnv ?? 'sandbox');
  const envInitializedRef = useRef(!!projectActiveEnv);

  useEffect(() => {
    if (envInitializedRef.current) return;
    if (!projectActiveEnv) return;
    if (searchParams.get('env')) return;
    setActiveEnv(projectActiveEnv);
    envInitializedRef.current = true;
  }, [projectActiveEnv]);

  const onChangeRef = useRef(onConnectionsChange);
  onChangeRef.current = onConnectionsChange;

  const loadConnections = useCallback(
    async (silent = false) => {
      if (!projectId) return;
      if (!silent) setLoading(true);
      try {
        const conns = await connectionsApi.listProjectConnections(projectId);
        const list = (Array.isArray(conns) ? conns : []) as ExtConnection[];
        setConnections(list);
        onChangeRef.current?.(list);
      } catch {
        if (!silent) toast.error('Failed to load connections');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    if (reloadKey > 0) loadConnections();
  }, [reloadKey]);

  useEffect(() => {
    if (!projectId) return;
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
  }, [projectId, loadConnections]);

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
    const envParam = searchParams.get('env');
    if (envParam === 'production' || envParam === 'sandbox') {
      setActiveEnv(envParam);
    }
    if (connected === 'hubspot') {
      toast.success('HubSpot connected via OAuth');
      loadConnections();
      const next = new URLSearchParams(searchParams);
      next.delete('connected');
      next.delete('env');
      setSearchParams(next, { replace: true });
    } else if (oauthError) {
      toast.error(`HubSpot OAuth failed: ${oauthError}`);
      const next = new URLSearchParams(searchParams);
      next.delete('hubspot_error');
      next.delete('env');
      setSearchParams(next, { replace: true });
    }
  }, []);

  const resetModals = () => {
    setShowMethodModal(false);
    setShowManualModal(false);
    setActiveConn(null);
  };

  const openConnect = (conn: ExtConnection) => {
    setActiveConn(conn);
    setShowMethodModal(true);
  };

  const handleManual = () => {
    setShowMethodModal(false);
    setShowManualModal(true);
  };
  const handleSaved = () => {
    loadConnections();
  };

  const handleOAuth = async () => {
    if (!activeConn) return;
    try {
      const redirectUrl = await connectionsApi.getHubSpotOAuthUrl(
        projectId,
        activeConn.connectionType as 'source' | 'destination',
        (activeConn.environment ?? activeEnv) as 'production' | 'sandbox',
      );
      window.location.href = redirectUrl;
    } catch {
      toast.error('Failed to start HubSpot OAuth');
    }
  };

  const handleRowUpdated = (updated: ExtConnection | null) => {
    if (updated === null) {
      loadConnections();
    } else {
      const next = connections.map((c) =>
        c.id === updated.id ? { ...c, ...updated } : c,
      );
      setConnections(next);
      onChangeRef.current?.(next);
    }
  };

  const envOf = (c: ExtConnection) => c.environment ?? 'production';
  const isReal = (c: ExtConnection) =>
    c.status === 'connected' || c.status === 'error' || c.accountName;
  const inActiveEnv = (c: ExtConnection) => envOf(c) === activeEnv;

  const realConnections = connections.filter(isReal).filter(inActiveEnv);
  const sourceConn = realConnections.find((c) => c.connectionType === 'source');
  const destConn = realConnections.find(
    (c) => c.connectionType === 'destination',
  );

  const missingSlots: MissingSlot[] = [];
  if (sourcePlatformId && !sourceConn)
    missingSlots.push({
      platformId: sourcePlatformId,
      connectionType: 'source',
    });
  if (destPlatformId && !destConn)
    missingSlots.push({
      platformId: destPlatformId,
      connectionType: 'destination',
    });

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
    activeEnv,
    setActiveEnv,
    connections,
    realConnections,
    missingSlots,
    sourceConn,
    destConn,
    envHasAnyConnected,
    envFullyConnected,
    makeSlotConn,
    openConnect,
    handleRowUpdated,
    activeConn,
    showMethodModal,
    showManualModal,
    handleManual,
    handleOAuth,
    handleSaved,
    resetModals,
  };
}
