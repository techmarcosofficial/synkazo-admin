import { useEffect } from 'react';

import { sseClient } from '@/lib/sseClient';

const POLL_FALLBACK_MS = 45000;

// Keeps the ProjectDetail composite query fresh: refetches on the SSE events
// that mean project/connection data changed server-side, and falls back to
// polling only while the SSE connection itself is down.
export function useProjectDetailLiveSync(
  projectId: string | undefined,
  refetch: () => void,
) {
  useEffect(() => {
    if (!projectId) return;
    const handler = (data: unknown) => {
      if ((data as { projectId?: string })?.projectId === projectId) refetch();
    };
    const offProject = sseClient.on('project:updated', handler);
    const offConn = sseClient.on('connection:updated', handler);
    const offConnRemoved = sseClient.on('connection:removed', handler);
    return () => {
      offProject();
      offConn();
      offConnRemoved();
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const interval = setInterval(() => {
      if (!sseClient.isConnected()) refetch();
    }, POLL_FALLBACK_MS);
    return () => clearInterval(interval);
  }, [projectId]);
}
