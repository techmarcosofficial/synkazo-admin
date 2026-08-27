import apiClient from './apiClient';

import type { PaginatedResponse } from '@/types';
import type { SystemLog } from '@/types/systemLog';

interface SystemLogParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const systemLogsApi = {
  listSystemLogs: ({
    page = 1,
    limit = 20,
    search,
  }: SystemLogParams = {}): Promise<PaginatedResponse<SystemLog>> =>
    apiClient
      .get('/system-logs', { params: { page, limit, search } })
      .then((r) => r.data),
};
