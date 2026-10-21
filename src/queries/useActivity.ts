import { useQuery } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { activityApi } from '@/api/activity';

export function useProjectActivityQuery(
  projectId: string,
  workspaceId: string | null,
  page: number,
  limit = 20,
) {
  return useQuery({
    queryKey: queryKeys.activity.list(projectId, workspaceId, page, limit),
    queryFn: () => activityApi.listProjectActivity(projectId, { page, limit }),
    enabled: !!projectId && !!workspaceId,
  });
}
