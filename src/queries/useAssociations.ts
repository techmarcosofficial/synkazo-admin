import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
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

export function useCompanyOwnerLogsQuery(projectId: string, limit = 50) {
  return useQuery({
    queryKey: queryKeys.associations.companyOwnerLogs(projectId),
    queryFn: () => associationsApi.getCompanyOwnerLogs(projectId, limit),
    enabled: !!projectId,
  });
}

export function useCompanyOwnerResultsQuery(
  projectId: string,
  params: {
    runId: string | null;
    page: number;
    limit: number;
    status: string;
    search: string;
  },
) {
  const { runId, page, limit, status, search } = params;
  return useQuery({
    queryKey: queryKeys.associations.companyOwnerResults(
      projectId,
      runId,
      page,
      limit,
      status,
      search,
    ),
    queryFn: () =>
      associationsApi.getCompanyOwnerResults(projectId, {
        runId: runId ?? undefined,
        page,
        limit,
        status: status === 'all' ? undefined : status,
        search: search || undefined,
      }),
    enabled: !!projectId && !!runId,
    placeholderData: keepPreviousData,
  });
}

export function useRunAllCompanyOwnersMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Record<string, unknown> = {}) =>
      associationsApi.runAllCompanyOwners(projectId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.associations.companyOwnerLogs(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: ['associations', 'companyOwnerResults', projectId],
      });
    },
  });
}
