import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { activityApi } from '@/api/activity';

export function useProjectActivityQuery(
  projectId: string,
  page: number,
  limit = 20,
) {
  return useQuery({
    queryKey: queryKeys.activity.list(projectId, page, limit),
    queryFn: () => activityApi.listProjectActivity(projectId, { page, limit }),
    placeholderData: keepPreviousData,
    enabled: !!projectId,
  });
}
