import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { jobsApi } from '@/api/jobs';
import { syncLogsApi } from '@/api/syncLogs';
import type { Job } from '@/types';

export function useJobsQuery() {
  return useQuery({
    queryKey: queryKeys.jobs.all,
    queryFn: jobsApi.listAllJobs,
  });
}

export function useProjectJobsQuery(projectId: string) {
  return useQuery({
    queryKey: queryKeys.jobs.byProject(projectId),
    queryFn: () => jobsApi.listJobs(projectId),
    enabled: !!projectId,
  });
}

export function useJobQuery(projectId: string, jobId: string) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(projectId, jobId),
    queryFn: () => jobsApi.getJob(projectId, jobId),
    enabled: !!projectId && !!jobId,
  });
}

export function useRunLogsQuery(
  projectId: string,
  jobId: string,
  page: number,
  limit = 20,
) {
  return useQuery({
    queryKey: queryKeys.jobs.runLogs(projectId, jobId, page, limit),
    queryFn: () => syncLogsApi.listRunLogs(projectId, jobId, { page, limit }),
    enabled: !!projectId && !!jobId,
    placeholderData: keepPreviousData,
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
