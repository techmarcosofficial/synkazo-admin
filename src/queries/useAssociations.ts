import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import {
  associationsApi,
  type AssociationRecord,
  type AssociationRecordStatus,
  type AssociationRunLog,
} from '@/api/associations';
import { superAdminAssociationsApi } from '@/api/superAdminAssociations';
import type { PaginatedResponse } from '@/types';

export function useAssociationRecordsQuery(
  projectId: string,
  ruleId: string,
  params: {
    page: number;
    limit: number;
    status: 'all' | AssociationRecordStatus;
    search: string;
  },
  organisationId?: string,
) {
  const { page, limit, status, search } = params;
  return useQuery({
    queryKey: organisationId
      ? [
          'associations',
          'records',
          organisationId,
          projectId,
          ruleId,
          page,
          limit,
          status,
          search,
        ]
      : queryKeys.associations.records(
          projectId,
          ruleId,
          page,
          limit,
          status,
          search,
        ),
    queryFn: async (): Promise<PaginatedResponse<AssociationRecord>> => {
      if (organisationId) {
        const res = await superAdminAssociationsApi.getRuleRecords(
          organisationId,
          projectId,
          ruleId,
          {
            status: status === 'all' ? undefined : status,
            page,
            limit,
            search,
          },
        );
        return {
          success: true,
          data: res.data,
          total: res.total,
          page: res.page,
          limit: res.limit,
        };
      }
      return associationsApi.getRuleRecords(projectId, ruleId, {
        status,
        page,
        limit,
        search,
      });
    },
    placeholderData: keepPreviousData,
    enabled: !!projectId && !!ruleId,
  });
}

export function useAssociationRunLogsQuery(
  projectId: string,
  ruleId: string,
  organisationId?: string,
) {
  return useQuery({
    queryKey: organisationId
      ? ['associations', 'logs', organisationId, projectId, ruleId]
      : queryKeys.associations.logs(projectId, ruleId),
    queryFn: async (): Promise<PaginatedResponse<AssociationRunLog>> => {
      if (organisationId) {
        const res = await superAdminAssociationsApi.listRuns(
          organisationId,
          projectId,
          {
            ruleId,
            limit: 10,
          },
        );
        return {
          success: true,
          data: res.data,
          total: res.total,
          page: res.page,
          limit: res.limit,
        };
      }
      return associationsApi.getRunLogs(projectId, ruleId);
    },
    enabled: !!projectId && !!ruleId,
  });
}
