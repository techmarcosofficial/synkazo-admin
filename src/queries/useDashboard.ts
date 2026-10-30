import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { dashboardApi } from '@/api/dashboard';
import type { DashboardMetricsParams } from '@/api/dashboard';
import { syncLogsApi } from '@/api/syncLogs';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import type { DashboardSummary } from '@/api/dashboard';

export function useDashboardSummaryQuery() {
  const { hasPermission, hasRole } = useSynkazoAuth();
  const canViewJobs = hasRole('org_admin') && hasPermission('job.view');
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: dashboardApi.getSummary,
    enabled: canViewJobs,
    select: (summary) =>
      canViewJobs
        ? summary
        : ({
            totalProjects: 0,
            activeProjects: 0,
            totalJobs: 0,
            enabledJobs: 0,
            totalConnections: 0,
            connectedConnections: 0,
            totalRecordsSynced: 0,
            totalErrors: 0,
            totalRecordsCreated: 0,
            totalRecordsUpdated: 0,
            totalRecordsFailed: 0,
          } satisfies DashboardSummary),
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
  const { hasPermission } = useSynkazoAuth();
  const canViewLogs = hasPermission('logs.view');
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
    enabled: canViewLogs,
    select: (result) =>
      canViewLogs ? result : { data: [], total: 0, page, limit },
  });
}

export function useActiveSyncsQuery() {
  const { hasPermission } = useSynkazoAuth();
  const canViewJobs = hasPermission('job.view');
  return useQuery({
    queryKey: queryKeys.dashboard.activeSyncs,
    queryFn: dashboardApi.getActiveSyncs,
    refetchInterval: 10_000,
    enabled: canViewJobs,
    select: (syncs) => (canViewJobs ? syncs : []),
  });
}

export function useDashboardSyncMetricsQuery(params: DashboardMetricsParams) {
  const { hasPermission, hasRole } = useSynkazoAuth();
  const canViewLogs = hasRole('org_admin') && hasPermission('logs.view');
  return useQuery({
    queryKey: queryKeys.dashboard.syncMetrics(
      params.period,
      params.timezone,
      params.start,
      params.end,
    ),
    queryFn: () => dashboardApi.getSyncMetrics(params),
    placeholderData: keepPreviousData,
    enabled: canViewLogs,
    select: (metrics) =>
      canViewLogs
        ? metrics
        : {
            ...metrics,
            buckets: [],
            summary: {
              recordsProcessed: 0,
              created: 0,
              updated: 0,
              terminalRuns: 0,
              successful: 0,
              partial: 0,
              failed: 0,
              stopped: 0,
              running: 0,
              successRate: null,
            },
            comparison: {
              recordsProcessedChangePct: null,
              successRateChangePoints: null,
            },
          },
  });
}
