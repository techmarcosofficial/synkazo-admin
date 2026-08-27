import apiClient from './apiClient';

import type { SyncRun, SyncLogRecord, PaginatedResponse } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SyncPageLog {
  id: string;
  pageNumber: number;
  recordsFetched: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  fetchDurationMs: number | null;
}

interface ListRecordsParams extends PaginationParams {
  action?: string;
  skipReason?: string;
  failReason?: string;
  search?: string;
  pageNumber?: number;
}

interface OrgSyncLogsParams extends PaginationParams {
  level?: string;
  search?: string;
  since?: string;
}

export const syncLogsApi = {
  listOrgSyncLogs: ({
    page = 1,
    limit = 20,
    level,
    search,
    since,
  }: OrgSyncLogsParams = {}): Promise<PaginatedResponse<SyncRun>> =>
    apiClient
      .get('/sync-logs', { params: { page, limit, level, search, since } })
      .then((r) => r.data),

  listProjectSyncLogs: (
    projectId: string,
    { page = 1, limit = 20, jobId }: PaginationParams & { jobId?: string } = {},
  ): Promise<PaginatedResponse<SyncRun>> =>
    apiClient
      .get(`/projects/${projectId}/sync-logs`, {
        params: { page, limit, jobId },
      })
      .then((r) => r.data),

  getSyncLog: (projectId: string, logId: string): Promise<SyncRun> =>
    apiClient.get(`/projects/${projectId}/sync-logs/${logId}`).then(d),

  listRunLogs: (
    projectId: string,
    jobId: string,
    {
      page = 1,
      limit = 20,
      triggeredBy,
    }: PaginationParams & { triggeredBy?: string } = {},
  ): Promise<PaginatedResponse<SyncRun>> =>
    apiClient
      .get(`/projects/${projectId}/jobs/${jobId}/sync-run-logs`, {
        params: { page, limit, ...(triggeredBy && { triggeredBy }) },
      })
      .then((r) => r.data),

  getRunLog: (
    projectId: string,
    jobId: string,
    runLogId: string,
  ): Promise<SyncRun> =>
    apiClient
      .get(`/projects/${projectId}/jobs/${jobId}/sync-run-logs/${runLogId}`)
      .then((r) => r.data.data),

  listPages: (
    projectId: string,
    jobId: string,
    runLogId: string,
  ): Promise<SyncPageLog[]> =>
    apiClient
      .get(
        `/projects/${projectId}/jobs/${jobId}/sync-run-logs/${runLogId}/pages`,
      )
      .then((r) => r.data.data),

  listRecords: (
    projectId: string,
    jobId: string,
    runLogId: string,
    {
      page = 1,
      limit = 50,
      action,
      skipReason,
      failReason,
      search,
      pageNumber,
    }: ListRecordsParams = {},
  ): Promise<PaginatedResponse<SyncLogRecord>> =>
    apiClient
      .get(
        `/projects/${projectId}/jobs/${jobId}/sync-run-logs/${runLogId}/records`,
        {
          params: {
            page,
            limit,
            ...(action && { action }),
            ...(skipReason && { skipReason }),
            ...(failReason && { failReason }),
            ...(search && { search }),
            ...(pageNumber !== undefined && { pageNumber }),
          },
        },
      )
      .then((r) => r.data),
};
