import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { auditApi } from '@/api/audit';
import type { AuditLogFilters } from '@/types/audit';

export function useAuditLogsQuery(
  page: number,
  limit = 20,
  filters: AuditLogFilters = {},
) {
  return useQuery({
    queryKey: queryKeys.audit.list(page, limit, filters),
    queryFn: () => auditApi.listAuditLogs({ page, limit, ...filters }),
    placeholderData: keepPreviousData,
  });
}

export function usePlatformAuditLogsQuery(
  page: number,
  limit = 20,
  filters: AuditLogFilters = {},
) {
  return useQuery({
    queryKey: queryKeys.audit.platformList(page, limit, filters),
    queryFn: () => auditApi.listPlatformAuditLogs({ page, limit, ...filters }),
    placeholderData: keepPreviousData,
  });
}
