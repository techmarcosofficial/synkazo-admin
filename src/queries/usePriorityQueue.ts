import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import {
  priorityQueueApi,
  type AddQueueJobPayload,
  type UpdateAssociationQueuePayload,
  type UpdateQueueJobPayload,
  type UpdateQueueSchedulePayload,
} from '@/api/priorityQueue';

// Polls faster while a job is actively running so the live status dashboard feels
// real-time, and backs off to a light heartbeat otherwise — same refetchInterval
// pattern as pages/sync/ActiveSyncs.tsx and this file's scheduler.queueStats sibling.
const ACTIVE_CYCLE_STATUSES = new Set([
  'running',
  'awaiting_associations',
  'running_associations',
  'running_company_owner_sync',
]);

export function usePriorityQueueQuery(projectId: string) {
  return useQuery({
    queryKey: queryKeys.priorityQueue.detail(projectId),
    queryFn: () => priorityQueueApi.getConfig(projectId),
    enabled: !!projectId,
    refetchInterval: (query) =>
      query.state.data?.activeCycle &&
      ACTIVE_CYCLE_STATUSES.has(query.state.data.activeCycle.status)
        ? 5_000
        : 20_000,
  });
}

function useInvalidatePriorityQueue(projectId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.priorityQueue.detail(projectId),
    });
}

export function useSetSchedulerModeMutation(projectId: string) {
  const invalidate = useInvalidatePriorityQueue(projectId);
  return useMutation({
    mutationFn: (enabled: boolean) =>
      priorityQueueApi.setMode(projectId, enabled),
    onSuccess: invalidate,
  });
}

export function useUpdateQueueScheduleMutation(projectId: string) {
  const invalidate = useInvalidatePriorityQueue(projectId);
  return useMutation({
    mutationFn: (payload: UpdateQueueSchedulePayload) =>
      priorityQueueApi.updateSchedule(projectId, payload),
    onSuccess: invalidate,
  });
}

export function useAddQueueJobMutation(projectId: string) {
  const invalidate = useInvalidatePriorityQueue(projectId);
  return useMutation({
    mutationFn: (payload: AddQueueJobPayload) =>
      priorityQueueApi.addJob(projectId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateQueueJobMutation(projectId: string) {
  const invalidate = useInvalidatePriorityQueue(projectId);
  return useMutation({
    mutationFn: ({
      queueJobId,
      payload,
    }: {
      queueJobId: string;
      payload: UpdateQueueJobPayload;
    }) => priorityQueueApi.updateJob(projectId, queueJobId, payload),
    onSuccess: invalidate,
  });
}

export function useRemoveQueueJobMutation(projectId: string) {
  const invalidate = useInvalidatePriorityQueue(projectId);
  return useMutation({
    mutationFn: (queueJobId: string) =>
      priorityQueueApi.removeJob(projectId, queueJobId),
    onSuccess: invalidate,
  });
}

export function useReorderQueueJobsMutation(projectId: string) {
  const invalidate = useInvalidatePriorityQueue(projectId);
  return useMutation({
    mutationFn: (updates: Array<{ id: string; position: number }>) =>
      priorityQueueApi.reorder(projectId, updates),
    onSuccess: invalidate,
  });
}

export function useRetryQueueJobMutation(projectId: string) {
  const invalidate = useInvalidatePriorityQueue(projectId);
  return useMutation({
    mutationFn: (queueJobId: string) =>
      priorityQueueApi.retryJob(projectId, queueJobId),
    onSuccess: invalidate,
  });
}

export function usePauseQueueMutation(projectId: string) {
  const invalidate = useInvalidatePriorityQueue(projectId);
  return useMutation({
    mutationFn: () => priorityQueueApi.pauseQueue(projectId),
    onSuccess: invalidate,
  });
}

export function useResumeQueueMutation(projectId: string) {
  const invalidate = useInvalidatePriorityQueue(projectId);
  return useMutation({
    mutationFn: () => priorityQueueApi.resumeQueue(projectId),
    onSuccess: invalidate,
  });
}

export function useAssociationObjectOptionsQuery(projectId: string) {
  return useQuery({
    queryKey: [
      ...queryKeys.priorityQueue.detail(projectId),
      'association-options',
    ],
    queryFn: () => priorityQueueApi.getAssociationObjectOptions(projectId),
    enabled: !!projectId,
  });
}

export function useUpdateAssociationConfigMutation(projectId: string) {
  const invalidate = useInvalidatePriorityQueue(projectId);
  return useMutation({
    mutationFn: (payload: UpdateAssociationQueuePayload) =>
      priorityQueueApi.updateAssociationConfig(projectId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateCompanyOwnerSyncConfigMutation(projectId: string) {
  const invalidate = useInvalidatePriorityQueue(projectId);
  return useMutation({
    mutationFn: (enabled: boolean) =>
      priorityQueueApi.updateCompanyOwnerSyncConfig(projectId, enabled),
    onSuccess: invalidate,
  });
}
