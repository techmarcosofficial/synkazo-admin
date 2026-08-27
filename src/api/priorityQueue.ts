import apiClient from './apiClient';

import type {
  PriorityQueueConfig,
  Project,
  ProjectQueue,
  QueueJob,
} from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;
const p = (projectId: string) => `/projects/${projectId}/priority-queue`;

export interface AddQueueJobPayload {
  jobId: string;
  executionWindowMinutes: number;
  enabled?: boolean;
  overrideSyncConfig?: Record<string, unknown>;
}

export interface UpdateQueueJobPayload {
  executionWindowMinutes?: number;
  enabled?: boolean;
  overrideSyncConfig?: Record<string, unknown> | null;
}

export const priorityQueueApi = {
  getConfig: (projectId: string): Promise<PriorityQueueConfig> =>
    apiClient.get(p(projectId)).then(d),

  setMode: (projectId: string, enabled: boolean): Promise<Project> =>
    apiClient.patch(`${p(projectId)}/mode`, { enabled }).then(d),

  updateSchedule: (
    projectId: string,
    startTime: string,
    timezone: string,
  ): Promise<ProjectQueue> =>
    apiClient
      .patch(`${p(projectId)}/schedule`, { startTime, timezone })
      .then(d),

  addJob: (projectId: string, payload: AddQueueJobPayload): Promise<QueueJob> =>
    apiClient.post(`${p(projectId)}/jobs`, payload).then(d),

  updateJob: (
    projectId: string,
    queueJobId: string,
    payload: UpdateQueueJobPayload,
  ): Promise<QueueJob> =>
    apiClient.patch(`${p(projectId)}/jobs/${queueJobId}`, payload).then(d),

  removeJob: (projectId: string, queueJobId: string): Promise<void> =>
    apiClient.delete(`${p(projectId)}/jobs/${queueJobId}`).then(d),

  reorder: (
    projectId: string,
    updates: Array<{ id: string; position: number }>,
  ): Promise<void> =>
    apiClient.patch(`${p(projectId)}/jobs/reorder`, { updates }).then(d),

  retryJob: (projectId: string, queueJobId: string): Promise<QueueJob> =>
    apiClient.post(`${p(projectId)}/jobs/${queueJobId}/retry`).then(d),

  pauseQueue: (projectId: string): Promise<ProjectQueue> =>
    apiClient.post(`${p(projectId)}/pause`).then(d),

  resumeQueue: (projectId: string): Promise<ProjectQueue> =>
    apiClient.post(`${p(projectId)}/resume`).then(d),
};
