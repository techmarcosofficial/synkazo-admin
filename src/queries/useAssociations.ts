import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import {
  associationsApi,
  type AssociationRecordStatus,
} from '@/api/associations';

export function useAssociationRecordsQuery(
  projectId: string,
  ruleId: string,
  params: {
    page: number;
    limit: number;
    status: 'all' | AssociationRecordStatus;
    search: string;
  },
) {
  const { page, limit, status, search } = params;
  return useQuery({
    queryKey: queryKeys.associations.records(
      projectId,
      ruleId,
      page,
      limit,
      status,
      search,
    ),
    queryFn: () =>
      associationsApi.getRuleRecords(projectId, ruleId, {
        status,
        page,
        limit,
        search,
      }),
    placeholderData: keepPreviousData,
    enabled: !!projectId && !!ruleId,
  });
}

export function useAssociationRunLogsQuery(projectId: string, ruleId: string) {
  return useQuery({
    queryKey: queryKeys.associations.logs(projectId, ruleId),
    queryFn: () => associationsApi.getRunLogs(projectId, ruleId),
    enabled: !!projectId && !!ruleId,
  });
}
