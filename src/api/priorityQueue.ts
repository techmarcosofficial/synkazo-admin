import apiClient from './apiClient';

import type {
  AssociationQueueItem,
  AssociationRuleOption,
  PriorityQueueConfig,
  Project,
  ProjectQueue,
  QueueJob,
  QueueJobBaselineMode,
  QueueScheduleMode,
} from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;
const p = (projectId: string) => `/projects/${projectId}/priority-queue`;

export interface AddQueueJobPayload {
  jobId: string;
  executionWindowMinutes: number;
  enabled?: boolean;
  overrideSyncConfig?: Record<string, unknown>;
  baselineMode?: QueueJobBaselineMode | null;
  /** Local "YYYY-MM-DDTHH:mm" — required when baselineMode === 'custom'. */
  baselineCustomAt?: string;
  baselineTimezone?: string;
}

export interface UpdateQueueJobPayload {
  executionWindowMinutes?: number;
  enabled?: boolean;
  overrideSyncConfig?: Record<string, unknown> | null;
  baselineMode?: QueueJobBaselineMode | null;
  baselineCustomAt?: string;
  baselineTimezone?: string;
}

export interface UpdateQueueSchedulePayload {
  scheduleMode: QueueScheduleMode;
  scheduleTimes?: string[];
  intervalMinutes?: number;
  scheduleDays?: number[];
  /** Local "YYYY-MM-DDTHH:mm" — required when scheduleMode === 'one_time'. */
  oneTimeAt?: string;
  timezone: string;
}

export interface AssociationQueueItemPayload {
  associationRuleId: string;
  position: number;
  enabled: boolean;
}

export interface UpdateAssociationQueuePayload {
  enabled: boolean;
  delayMinutes: number;
  items: AssociationQueueItemPayload[];
}

export const priorityQueueApi = {
  getConfig: (projectId: string): Promise<PriorityQueueConfig> =>
    apiClient.get(p(projectId)).then(d),

  setMode: (projectId: string, enabled: boolean): Promise<Project> =>
    apiClient.patch(`${p(projectId)}/mode`, { enabled }).then(d),

  updateSchedule: (
    projectId: string,
    payload: UpdateQueueSchedulePayload,
  ): Promise<ProjectQueue> =>
    apiClient.patch(`${p(projectId)}/schedule`, payload).then(d),

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

  clearAndRestart: (
    projectId: string,
  ): Promise<{ queue: ProjectQueue; queueJobs: QueueJob[] }> =>
    apiClient.post(`${p(projectId)}/clear-restart`).then(d),

  getAssociationRuleOptions: (
    projectId: string,
  ): Promise<AssociationRuleOption[]> =>
    apiClient.get(`${p(projectId)}/association-rule-options`).then(d),

  updateAssociationConfig: (
    projectId: string,
    payload: UpdateAssociationQueuePayload,
  ): Promise<{ queue: ProjectQueue; items: AssociationQueueItem[] }> =>
    apiClient.patch(`${p(projectId)}/associations`, payload).then(d),

  updateCompanyOwnerSyncConfig: (
    projectId: string,
    enabled: boolean,
  ): Promise<ProjectQueue> =>
    apiClient.patch(`${p(projectId)}/company-owner-sync`, { enabled }).then(d),
};
