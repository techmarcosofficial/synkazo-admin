import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { jobsApi } from '@/api/jobs';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { syncLogsApi, type RunLogFilters } from '@/api/syncLogs';
import type { Job } from '@/types';

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
