import apiClient from './apiClient';

import type { PaginatedResponse } from '@/types';

export interface ActivityLogMetadata {
  triggeredBy?: string;
  status?: 'success' | 'partial' | 'failed' | 'cancelled';
  jobName?: string;
  projectName?: string;
  sourceObject?: string;
  destObject?: string;
  sourcePlatformId?: string;
  destPlatformId?: string;
  recordsFailed?: number;
}

export interface ActivityLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  createdAt?: string;
  jobId?: string | null;
  jobRunId?: string | null;
  recordsProcessed?: number;
  durationMs?: number | null;
  metadata?: ActivityLogMetadata | null;
}

interface ListActivityParams {
  page?: number;
  limit?: number;
  jobId?: string;
}

export const activityApi = {
  listProjectActivity: (
    projectId: string,
    { page = 1, limit = 20, jobId }: ListActivityParams = {},
  ): Promise<PaginatedResponse<ActivityLog>> =>
    apiClient
      .get(`/projects/${projectId}/sync-logs`, {
        params: { page, limit, jobId },
      })
      .then((r) => r.data),
};
