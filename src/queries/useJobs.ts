import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { jobsApi, type ConflictRunResponse } from '@/api/jobs';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { syncLogsApi, type RunLogFilters } from '@/api/syncLogs';
import type {
  Job,
  SyncConflict,
  SyncConflictCode,
  SyncConflictStatus,
} from '@/types';

export function useJobsQuery(options?: { enabled?: boolean }) {
  const { hasPermission } = useSynkazoAuth();
  return useQuery({
    queryKey: queryKeys.jobs.all,
    queryFn: jobsApi.listAllJobs,
    enabled: (options?.enabled ?? true) && hasPermission('job.view'),
    select: (jobs) => (hasPermission('job.view') ? jobs : []),
  });
}

export function useProjectJobsQuery(projectId: string) {
  const { hasPermission } = useSynkazoAuth();
  return useQuery({
    queryKey: queryKeys.jobs.byProject(projectId),
    queryFn: () => jobsApi.listJobs(projectId),
    enabled: !!projectId && hasPermission('job.view'),
    select: (jobs) => (hasPermission('job.view') ? jobs : []),
  });
}

export function useJobQuery(projectId: string, jobId: string) {
  const { hasPermission } = useSynkazoAuth();
  return useQuery({
    queryKey: queryKeys.jobs.detail(projectId, jobId),
    queryFn: () => jobsApi.getJob(projectId, jobId),
    enabled: !!projectId && !!jobId && hasPermission('job.view'),
    select: (job) => (hasPermission('job.view') ? job : undefined),
  });
}

export function useRunLogsQuery(
  projectId: string,
  jobId: string,
  page: number,
  limit = 20,
  enabled = true,
  filters: RunLogFilters = {},
) {
  const { hasPermission } = useSynkazoAuth();
  const canViewLogs = hasPermission('logs.view');
  return useQuery({
    queryKey: queryKeys.jobs.runLogs(projectId, jobId, page, limit, filters),
    queryFn: () =>
      syncLogsApi.listRunLogs(projectId, jobId, { page, limit, ...filters }),
    enabled: enabled && !!projectId && !!jobId && canViewLogs,
    placeholderData: keepPreviousData,
    select: (logs) =>
      canViewLogs ? logs : { data: [], total: 0, page: 1, limit },
  });
}

export interface ConflictFilters {
  status?: SyncConflictStatus;
  errorCode?: SyncConflictCode;
  page: number;
  limit: number;
}

export function useJobConflictsQuery(
  projectId: string,
  jobId: string,
  filters: ConflictFilters,
) {
  const { hasPermission } = useSynkazoAuth();
  return useQuery({
    queryKey: queryKeys.jobs.conflicts(projectId, jobId, filters),
    queryFn: () => jobsApi.listConflictsForReview(projectId, jobId, filters),
    enabled: !!projectId && !!jobId && hasPermission('job.view'),
    placeholderData: keepPreviousData,
  });
}

// Resolve / trigger-parent-sync / retry-record all change what the tab shows.
export function useConflictActionMutation(projectId: string, jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      action,
      conflictId,
    }: {
      action: 'resolve' | 'triggerParentSync' | 'retryRecord';
      conflictId: string;
    }): Promise<SyncConflict | ConflictRunResponse> =>
      action === 'resolve'
        ? jobsApi.resolveConflict(projectId, jobId, conflictId)
        : action === 'triggerParentSync'
          ? jobsApi.triggerConflictParentSync(projectId, jobId, conflictId)
          : jobsApi.retryConflictRecord(projectId, jobId, conflictId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['jobs', 'conflicts', projectId, jobId],
      });
    },
  });
}

export function useUpdateJobMutation(projectId: string, jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Job>) =>
      jobsApi.updateJob(projectId, jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobs.detail(projectId, jobId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobs.byProject(projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
  });
}
