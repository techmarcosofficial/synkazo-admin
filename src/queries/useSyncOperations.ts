import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { syncOperationsApi } from '@/api/syncOperations';
import type { MonitorFilters, MonitorRunPage } from '@/types/syncOperations';

export function useMonitorVisibility() {
  const [visible, setVisible] = useState(
    () => document.visibilityState !== 'hidden',
  );
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}

export function useSyncOperations(
  filters: MonitorFilters,
  recent: boolean,
  visible: boolean,
) {
  return useQuery({
    queryKey: ['superAdmin', 'syncOperations', recent, filters],
    queryFn: ({ signal }) =>
      syncOperationsApi.snapshot(filters, recent, signal),
    enabled: visible,
    staleTime: recent ? 15000 : 5000,
    refetchInterval: (query) =>
      visible
        ? Math.min(
            30000,
            (recent ? 15000 : 5000) *
              2 ** Math.min(query.state.fetchFailureCount, 2),
          ) + Math.floor(Math.random() * 500)
        : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function useSyncOperationRun(id: string | null, visible: boolean) {
  const client = useQueryClient();
  const [connected, setConnected] = useState(false);
  const key = ['superAdmin', 'syncOperationRun', id];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => syncOperationsApi.detail(id!, signal),
    enabled: !!id && visible,
    staleTime: 5000,
    retry: 1,
    refetchInterval: (query) =>
      visible && !connected && query.state.data?.data[0]?.status === 'running'
        ? 15000
        : false,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    setConnected(false);
    if (!id || !visible) return;
    let disposed = false;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const connect = async () => {
      controller = new AbortController();
      let terminal = false;
      try {
        // Use the normal client for auth refresh and a reconnect snapshot first.
        const snapshot = await client.fetchQuery({
          queryKey: ['superAdmin', 'syncOperationRun', id],
          queryFn: ({ signal }) => syncOperationsApi.detail(id, signal),
          staleTime: 5000,
        });
        if (disposed) return;
        client.setQueryData(['superAdmin', 'syncOperationRun', id], snapshot);
        if (
          snapshot.data[0]?.status !== 'running' &&
          !snapshot.data[0]?.executionObserved
        )
          return;
        await syncOperationsApi.stream(
          id,
          controller.signal,
          (data: MonitorRunPage) => {
            if (disposed) return;
            failures = 0;
            setConnected(true);
            terminal =
              data.data[0]?.status !== 'running' &&
              !data.data[0]?.executionObserved;
            client.setQueryData(['superAdmin', 'syncOperationRun', id], data);
          },
        );
      } catch {
        failures++;
      }
      if (disposed) return;
      setConnected(false);
      if (!terminal)
        timer = setTimeout(
          () => void connect(),
          Math.min(30000, 1000 * 2 ** Math.min(failures, 5)) +
            Math.random() * 500,
        );
    };
    void connect();
    return () => {
      disposed = true;
      controller?.abort();
      if (timer) clearTimeout(timer);
    };
  }, [id, visible, client]);
  return { ...query, connected };
}
