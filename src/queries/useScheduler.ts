import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { jobsApi } from '@/api/jobs';
import { notificationsApi } from '@/api/notificationsApi';

export function useSchedulerHealthQuery() {
  return useQuery({
    queryKey: queryKeys.scheduler.health,
    queryFn: jobsApi.getSchedulerHealth,
    refetchInterval: 15_000,
  });
}

export function useQueueStatsQuery() {
  return useQuery({
    queryKey: queryKeys.scheduler.queueStats,
    queryFn: notificationsApi.getQueueStats,
    refetchInterval: 15_000,
  });
}

function useInvalidateScheduler() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.health });
    queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.queueStats });
  };
}

export function usePauseScheduleMutation() {
  const invalidate = useInvalidateScheduler();
  return useMutation({
    mutationFn: ({ projectId, jobId }: { projectId: string; jobId: string }) =>
      jobsApi.pauseSchedule(projectId, jobId),
    onSuccess: invalidate,
  });
}

export function useResumeScheduleMutation() {
  const invalidate = useInvalidateScheduler();
  return useMutation({
    mutationFn: ({ projectId, jobId }: { projectId: string; jobId: string }) =>
      jobsApi.resumeSchedule(projectId, jobId),
    onSuccess: invalidate,
  });
}

export function useCancelQueueJobMutation() {
  const invalidate = useInvalidateScheduler();
  return useMutation({
    mutationFn: (bullmqJobId: string) =>
      notificationsApi.removeQueueJob(bullmqJobId),
    onSuccess: invalidate,
  });
}
