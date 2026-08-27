import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { connectionsApi } from '@/api/connections';
import type { ObjectTier } from '@/types';

export interface ObjectItem {
  id: string;
  label: string;
  module?: string;
  group?: string;
  isCustom?: boolean;
  /** Plan tier, annotated by the discovery endpoint. Absent on locally-added drafts. */
  tier?: ObjectTier;
}

export function useConnectionsQuery() {
  return useQuery({
    queryKey: queryKeys.connections.all,
    queryFn: connectionsApi.listAllConnections,
  });
}

export function useProjectConnectionsQuery(projectId: string) {
  return useQuery({
    queryKey: ['connections', 'project', projectId] as const,
    queryFn: () => connectionsApi.listProjectConnections(projectId),
    enabled: !!projectId,
  });
}

export function useWebhookEventsQuery(
  projectId: string,
  connId: string | undefined,
  page: number,
  limit = 20,
) {
  return useQuery({
    queryKey: queryKeys.connections.webhookEvents(
      projectId,
      connId ?? '',
      page,
      limit,
    ),
    queryFn: () =>
      connectionsApi.listWebhookEvents(projectId, connId as string, {
        page,
        limit,
      }),
    enabled: !!projectId && !!connId,
    placeholderData: keepPreviousData,
  });
}

function objectsByPlatformKey(projectId: string, platformIds: string[]) {
  return [
    'connections',
    'objectsByPlatform',
    projectId,
    platformIds.slice().sort().join(','),
  ] as const;
}

export function useObjectsByPlatformQuery(
  projectId: string,
  platformIds: string[],
) {
  return useQuery({
    queryKey: objectsByPlatformKey(projectId, platformIds),
    queryFn: async () => {
      const entries = await Promise.all(
        platformIds.map((pid) =>
          connectionsApi
            .getObjects(projectId, pid)
            .catch(() => [])
            .then((objs) => [pid, objs] as const),
        ),
      );
      return Object.fromEntries(entries) as Record<string, ObjectItem[]>;
    },
    enabled: !!projectId && platformIds.length > 0,
  });
}

// Optimistically appends a locally-created custom object to the cached
// objects-by-platform map (used right after CustomObjectModal creates one),
// without waiting on a full refetch.
export function useAddCustomObjectToCache(
  projectId: string,
  platformIds: string[],
) {
  const queryClient = useQueryClient();
  return (platformId: string, obj: ObjectItem) => {
    queryClient.setQueryData<Record<string, ObjectItem[]>>(
      objectsByPlatformKey(projectId, platformIds),
      (prev) => ({
        ...prev,
        [platformId]: [...(prev?.[platformId] ?? []), obj],
      }),
    );
  };
}
