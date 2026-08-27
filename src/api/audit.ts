import apiClient from './apiClient';

import type { PaginatedResponse } from '@/types';
import type { AuditLog, AuditLogFilters } from '@/types/audit';

interface AuditParams extends AuditLogFilters {
  page?: number;
  limit?: number;
}

export const auditApi = {
  listAuditLogs: ({
    page = 1,
    limit = 20,
    ...filters
  }: AuditParams = {}): Promise<PaginatedResponse<AuditLog>> =>
    apiClient
      .get('/audit-logs', { params: { page, limit, ...filters } })
      .then((r) => r.data),

  listPlatformAuditLogs: ({
    page = 1,
    limit = 20,
    ...filters
  }: AuditParams = {}): Promise<PaginatedResponse<AuditLog>> =>
    apiClient
      .get('/audit-logs/platform', { params: { page, limit, ...filters } })
      .then((r) => r.data),
};
