import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';
import {
  sanitizeQueueSchedulePayload,
  type AddQueueJobPayload,
  type UpdateAssociationQueuePayload,
  type UpdateQueueJobPayload,
  type UpdateQueueSchedulePayload,
} from './priorityQueue';
import type {
  AssociationQueueItem,
  AssociationRuleOption,
  PriorityQueueJobDisplay,
  ProjectQueue,
} from '@/types/priorityQueue';
import type { SchedulerMode } from '@/types/project';

export interface SuperAdminPriorityQueueConfig {
  schedulerMode: SchedulerMode;
  queue: ProjectQueue | null;
  queueJobs: PriorityQueueJobDisplay[];
  associationQueueItems: AssociationQueueItem[];
  displayStatus: string;
  activeCycle: {
    id: string;
    status: string;
    currentIteration: number;
    cycleStartAt: string;
    associationsStatus: string;
    associationsDelayUntil: string | null;
  } | null;
  currentQueueJob: PriorityQueueJobDisplay | null;
  currentExecution: {
    id: string;
    status: string;
    startedAt: string;
    executionWindowSec: number;
    recordsProcessed: number;
  } | null;
  nextQueueJob: PriorityQueueJobDisplay | null;
}

const data = <T>({ data: envelope }: AxiosResponse<{ data: T }>): T =>
  envelope.data;
const base = (organisationId: string, projectId: string) =>
  `/super-admin/organisations/${organisationId}/projects/${projectId}/priority-queue`;

export const superAdminPriorityQueueApi = {
  getConfig: (
    organisationId: string,
    projectId: string,
  ): Promise<SuperAdminPriorityQueueConfig> =>
    apiClient
      .get<{ data: SuperAdminPriorityQueueConfig }>(
        base(organisationId, projectId),
      )
      .then(data),
  getAssociationRuleOptions: (
    organisationId: string,
    projectId: string,
  ): Promise<AssociationRuleOption[]> =>
    apiClient
      .get<{ data: AssociationRuleOption[] }>(
        `${base(organisationId, projectId)}/association-rule-options`,
      )
      .then(data),
  setMode: (
    organisationId: string,
    projectId: string,
    enabled: boolean,
    reason: string,
  ): Promise<{ schedulerMode: SchedulerMode }> =>
    apiClient
      .patch<{ data: { schedulerMode: SchedulerMode } }>(
        `${base(organisationId, projectId)}/mode`,
        { enabled, reason },
      )
      .then(data),
  pauseIndividualSchedules: (
    organisationId: string,
    projectId: string,
    reason: string,
  ): Promise<{ affected: number }> =>
    apiClient
      .patch<{ data: { affected: number } }>(
        `${base(organisationId, projectId)}/individual-schedules/pause-all`,
        { reason },
      )
      .then(data),
  resumeIndividualSchedules: (
    organisationId: string,
    projectId: string,
    reason: string,
  ): Promise<{ affected: number }> =>
    apiClient
      .patch<{ data: { affected: number } }>(
        `${base(organisationId, projectId)}/individual-schedules/resume-all`,
        { reason },
      )
      .then(data),
  changeIndividualSchedule: (
    organisationId: string,
    projectId: string,
    jobId: string,
    resume: boolean,
    reason: string,
  ): Promise<{ jobId: string; scheduleState: string; syncEnabled: boolean }> =>
    apiClient
      .patch<{
        data: { jobId: string; scheduleState: string; syncEnabled: boolean };
      }>(
        `${base(organisationId, projectId)}/individual-schedules/${jobId}/${resume ? 'resume' : 'pause'}`,
        { reason },
      )
      .then(data),
  updateSchedule: (
    organisationId: string,
    projectId: string,
    input: UpdateQueueSchedulePayload,
    reason: string,
  ): Promise<ProjectQueue> =>
    apiClient
      .patch<{ data: ProjectQueue }>(
        `${base(organisationId, projectId)}/schedule`,
        { ...sanitizeQueueSchedulePayload(input), reason },
      )
      .then(data),
  addJob: (
    organisationId: string,
    projectId: string,
    input: AddQueueJobPayload,
    reason: string,
  ): Promise<PriorityQueueJobDisplay> =>
    apiClient
      .post<{ data: PriorityQueueJobDisplay }>(
        `${base(organisationId, projectId)}/jobs`,
        { ...input, reason },
      )
      .then(data),
  updateJob: (
    organisationId: string,
    projectId: string,
    queueJobId: string,
    input: UpdateQueueJobPayload,
    reason: string,
  ): Promise<PriorityQueueJobDisplay> =>
    apiClient
      .patch<{ data: PriorityQueueJobDisplay }>(
        `${base(organisationId, projectId)}/jobs/${queueJobId}`,
        { ...input, reason },
      )
      .then(data),
  removeJob: (
    organisationId: string,
    projectId: string,
    queueJobId: string,
    reason: string,
  ): Promise<{ removed: true }> =>
    apiClient
      .delete<{ data: { removed: true } }>(
        `${base(organisationId, projectId)}/jobs/${queueJobId}`,
        { data: { reason } },
      )
      .then(data),
  reorder: (
    organisationId: string,
    projectId: string,
    updates: Array<{ id: string; position: number }>,
    reason: string,
  ): Promise<{ updated: true }> =>
    apiClient
      .patch<{ data: { updated: true } }>(
        `${base(organisationId, projectId)}/jobs/reorder`,
        { updates, reason },
      )
      .then(data),
  retryJob: (
    organisationId: string,
    projectId: string,
    queueJobId: string,
    reason: string,
  ): Promise<PriorityQueueJobDisplay> =>
    apiClient
      .post<{ data: PriorityQueueJobDisplay }>(
        `${base(organisationId, projectId)}/jobs/${queueJobId}/retry`,
        { reason },
      )
      .then(data),
  pause: (
    organisationId: string,
    projectId: string,
    reason: string,
  ): Promise<ProjectQueue> =>
    apiClient
      .post<{ data: ProjectQueue }>(
        `${base(organisationId, projectId)}/pause`,
        { reason },
      )
      .then(data),
  resume: (
    organisationId: string,
    projectId: string,
    reason: string,
  ): Promise<ProjectQueue> =>
    apiClient
      .post<{ data: ProjectQueue }>(
        `${base(organisationId, projectId)}/resume`,
        { reason },
      )
      .then(data),
  clearAndRestart: (
    organisationId: string,
    projectId: string,
    reason: string,
  ): Promise<{ queue: ProjectQueue; queueJobs: PriorityQueueJobDisplay[] }> =>
    apiClient
      .post<{
        data: { queue: ProjectQueue; queueJobs: PriorityQueueJobDisplay[] };
      }>(`${base(organisationId, projectId)}/clear-restart`, { reason })
      .then(data),
  updateAssociations: (
    organisationId: string,
    projectId: string,
    input: UpdateAssociationQueuePayload,
    reason: string,
  ): Promise<{ queue: ProjectQueue; items: AssociationQueueItem[] }> =>
    apiClient
      .patch<{ data: { queue: ProjectQueue; items: AssociationQueueItem[] } }>(
        `${base(organisationId, projectId)}/associations`,
        { ...input, reason },
      )
      .then(data),
};
