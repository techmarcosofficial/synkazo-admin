import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { dashboardApi } from '@/api/dashboard';
import { syncLogsApi } from '@/api/syncLogs';

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: dashboardApi.getSummary,
  });
}

interface OrgSyncLogsOptions {
  page?: number;
  level?: string;
  search?: string;
  since?: string;
}

export function useOrgSyncLogsQuery(
  limit = 12,
  { page = 1, level, search, since }: OrgSyncLogsOptions = {},
) {
  return useQuery({
    queryKey: [
      'dashboard',
      'syncLogs',
      limit,
      page,
      level,
      search,
      since,
    ] as const,
    queryFn: () =>
      syncLogsApi.listOrgSyncLogs({ page, limit, level, search, since }),
    placeholderData: keepPreviousData,
  });
}

export function useActiveSyncsQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.activeSyncs,
    queryFn: dashboardApi.getActiveSyncs,
    refetchInterval: 10_000,
  });
}
