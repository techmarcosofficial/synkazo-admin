import apiClient from './apiClient';

import type { Rule } from '@/lib/ruleEngine';
import type {
  Job,
  FieldMapping,
  PipelineStatus,
  SchedulerJob,
  SyncConflict,
  DataCheckupResult,
  RuleMatchScoreResult,
  SyncRun,
  SyncEstimate,
} from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;
const p = (projectId: string) => `/projects/${projectId}/jobs`;

interface RunOptions {
  full?: boolean;
  /** Resume an interrupted Sync All from this page instead of restarting at page 1 — see
   *  Job.syncAllPage. Only meaningful together with `full: true`. */
  startPage?: number;
  /** Date-bounded Sync All (one-way jobs only) — only meaningful together with `full: true`.
   *  ISO date strings. See Job.syncAllRangeStart/syncAllRangeEnd. */
  startDate?: string;
  endDate?: string;
}
interface LimitSyncOptions {
  limit?: number;
  startPage?: number;
  batchSize?: number;
}
interface PriorityUpdate {
  id: string;
  priority: number;
}

export const jobsApi = {
  listAllJobs: (): Promise<Job[]> => apiClient.get('/jobs').then(d),

  listJobs: (projectId: string): Promise<Job[]> =>
    apiClient.get(p(projectId)).then(d),
  getJob: (projectId: string, jobId: string): Promise<Job> =>
    apiClient.get(`${p(projectId)}/${jobId}`).then(d),
  createJob: (projectId: string, data: Partial<Job>): Promise<Job> =>
    apiClient.post(p(projectId), data).then(d),
  updateJob: (
    projectId: string,
    jobId: string,
    data: Partial<Job>,
  ): Promise<Job> => apiClient.patch(`${p(projectId)}/${jobId}`, data).then(d),
  toggleJob: (projectId: string, jobId: string): Promise<Job> =>
    apiClient.patch(`${p(projectId)}/${jobId}/toggle`).then(d),
  deleteJob: (projectId: string, jobId: string): Promise<void> =>
    apiClient.delete(`${p(projectId)}/${jobId}`).then(d),

  runJob: (
    projectId: string,
    jobId: string,
    { full = false, startPage, startDate, endDate }: RunOptions = {},
  ): Promise<unknown> =>
    apiClient
      .post(
        `/projects/${projectId}/jobs/${jobId}/run${full ? '?full=true' : ''}`,
        startPage || startDate || endDate
          ? { startPage, startDate, endDate }
          : undefined,
      )
      .then((r) => r.data),

  getEstimate: (
    projectId: string,
    jobId: string,
    { full = false, startDate, endDate }: RunOptions = {},
  ): Promise<SyncEstimate> =>
    apiClient
      .get(`/projects/${projectId}/jobs/${jobId}/estimate`, {
        params: {
          ...(full && { full: true }),
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
        },
      })
      .then((r) => r.data),

  limitSync: (
    projectId: string,
    jobId: string,
    { limit, startPage = 1, batchSize = 100 }: LimitSyncOptions = {},
  ): Promise<unknown> =>
    apiClient
      .post(
        `/projects/${projectId}/jobs/${jobId}/run?limit=${limit}&startPage=${startPage}&batchSize=${batchSize}`,
      )
      .then((r) => r.data),

  stopJob: (projectId: string, jobId: string): Promise<void> =>
    apiClient
      .post(`/projects/${projectId}/jobs/${jobId}/stop`, undefined, {
        _suppressGlobalError: true,
      } as any)
      .then(d),

  // Read-only source vs destination comparison (Data Checkup). Never writes/syncs.
  dataCheckup: (projectId: string, jobId: string): Promise<DataCheckupResult> =>
    apiClient.post(`/projects/${projectId}/jobs/${jobId}/data-checkup`).then(d),

  // Read-only: applies a candidate rule pipeline to real synced source values and
  // compares against real destination values for one field pair. Never writes/syncs.
  ruleMatchScore: (
    projectId: string,
    jobId: string,
    body: { sourceField: string; destField: string; rules: Rule[] },
  ): Promise<RuleMatchScoreResult> =>
    apiClient
      .post(`/projects/${projectId}/jobs/${jobId}/rule-match-score`, body)
      .then(d),

  setSyncEnabled: (
    projectId: string,
    jobId: string,
    enabled: boolean,
    initialSyncPeriod?: 'now' | '24h' | '7d' | '30d' | 'custom',
    customSince?: string,
  ): Promise<Job> =>
    apiClient
      .patch(`/projects/${projectId}/jobs/${jobId}/sync-toggle`, {
        enabled,
        initialSyncPeriod,
        customSince,
      })
      .then(d),

  pauseSchedule: (projectId: string, jobId: string): Promise<Job> =>
    apiClient.patch(`${p(projectId)}/${jobId}/pause-schedule`).then(d),
  resumeSchedule: (
    projectId: string,
    jobId: string,
    resumeMode?: 'sync_missed' | 'start_now',
  ): Promise<Job> =>
    apiClient
      .patch(`${p(projectId)}/${jobId}/resume-schedule`, { resumeMode })
      .then(d),

  getPipelineStatus: (
    projectId: string,
    jobId: string,
  ): Promise<PipelineStatus> =>
    apiClient.get(`${p(projectId)}/${jobId}/pipeline-status`).then(d),
  getConflicts: (projectId: string, jobId: string): Promise<SyncConflict[]> =>
    apiClient.get(`${p(projectId)}/${jobId}/conflicts`).then(d),
  provisionDefaultPipeline: (
    projectId: string,
    jobId: string,
  ): Promise<{
    id: string;
    label: string;
    stages: Array<{ id: string; label: string }>;
  }> =>
    apiClient
      .post(`${p(projectId)}/${jobId}/pipeline/provision-default`)
      .then(d),

  getSourceStatuses: (projectId: string, jobId: string): Promise<string[]> =>
    apiClient.get(`${p(projectId)}/${jobId}/source-statuses`).then(d),

  getSchedulerView: (projectId: string): Promise<SchedulerJob[]> =>
    apiClient.get(`${p(projectId)}/scheduler`).then(d),
  updatePriorities: (
    projectId: string,
    updates: PriorityUpdate[],
  ): Promise<unknown> =>
    apiClient
      .patch(`${p(projectId)}/priorities`, { updates })
      .then((r) => r.data),
  getSchedulerHealth: (): Promise<unknown> =>
    apiClient.get('/jobs/scheduler-health').then(d),

  pauseAllJobs: (projectId: string): Promise<void> =>
    apiClient.patch(`${p(projectId)}/pause-all`).then(d),
  resumeAllJobs: (projectId: string): Promise<void> =>
    apiClient.patch(`${p(projectId)}/resume-all`).then(d),
  resetAllCheckpoints: (projectId: string): Promise<void> =>
    apiClient.post(`${p(projectId)}/reset-checkpoints`).then(d),
  clearAllIdMappings: (projectId: string): Promise<void> =>
    apiClient.delete(`${p(projectId)}/id-mappings`).then(d),

  resetJobCheckpoint: (projectId: string, jobId: string): Promise<void> =>
    apiClient.post(`${p(projectId)}/${jobId}/reset-checkpoint`).then(d),
  clearJobIdMappings: (
    projectId: string,
    jobId: string,
  ): Promise<{ deleted: number }> =>
    apiClient.delete(`${p(projectId)}/${jobId}/id-mappings`).then(d),

  listFieldMappings: (
    projectId: string,
    jobId: string,
  ): Promise<FieldMapping[]> =>
    apiClient.get(`${p(projectId)}/${jobId}/field-mappings`).then(d),
  replaceFieldMappings: (
    projectId: string,
    jobId: string,
    mappings: FieldMapping[],
  ): Promise<FieldMapping[]> =>
    apiClient.put(`${p(projectId)}/${jobId}/field-mappings`, mappings).then(d),
  addFieldMapping: (
    projectId: string,
    jobId: string,
    data: Partial<FieldMapping>,
  ): Promise<FieldMapping> =>
    apiClient.post(`${p(projectId)}/${jobId}/field-mappings`, data).then(d),
  updateFieldMapping: (
    projectId: string,
    jobId: string,
    mappingId: string,
    data: Partial<FieldMapping>,
  ): Promise<FieldMapping> =>
    apiClient
      .patch(`${p(projectId)}/${jobId}/field-mappings/${mappingId}`, data)
      .then(d),
  deleteFieldMapping: (
    projectId: string,
    jobId: string,
    mappingId: string,
  ): Promise<void> =>
    apiClient
      .delete(`${p(projectId)}/${jobId}/field-mappings/${mappingId}`)
      .then(d),

  // Re-export SyncRun so callers have access from a single import
  _types: {} as { SyncRun: SyncRun },
};
