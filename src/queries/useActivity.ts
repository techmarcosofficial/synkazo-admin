import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { activityApi } from '@/api/activity';
import { useSynkazoAuth } from '@/lib/synkazoAuth';

export function useProjectActivityQuery(
  projectId: string,
  page: number,
  limit = 20,
) {
  const { hasPermission } = useSynkazoAuth();
  const canViewLogs = hasPermission('logs.view');
  return useQuery({
    queryKey: queryKeys.activity.list(projectId, page, limit),
    queryFn: () => activityApi.listProjectActivity(projectId, { page, limit }),
    placeholderData: keepPreviousData,
    enabled: !!projectId && canViewLogs,
    select: (result) =>
      canViewLogs ? result : { data: [], total: 0, page, limit },
  });
}
