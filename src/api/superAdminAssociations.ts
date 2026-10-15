import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';
import type {
  AssociationRecord,
  AssociationRuleStats,
  AssociationRunLog,
} from './associations';

import type {
  SuperAdminAssociationRule,
  SuperAdminCreateAssociationRuleDto,
  SuperAdminDeleteAssociationRuleDto,
  SuperAdminPage,
  SuperAdminPendingAssociation,
  SuperAdminUpdateAssociationRuleDto,
} from '@/types';

// GAP-022 — SA-scoped wrapper around the tenant AssociationsService.
// Every mutation carries a mandatory `reason`; delete additionally
// requires the operator to retype the rule name.

interface PaginatedEnvelope<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

const d = <T>({ data }: AxiosResponse<{ data: T }>): T => data.data;

const paginated = <T>({
  data,
}: AxiosResponse<PaginatedEnvelope<T>>): SuperAdminPage<T> => ({
  data: data.data,
  total: data.total,
  page: data.page,
  limit: data.limit,
});

const base = (organisationId: string, projectId: string) =>
  `/super-admin/organisations/${organisationId}/projects/${projectId}/associations`;

export const superAdminAssociationsApi = {
  listRules: (
    organisationId: string,
    projectId: string,
  ): Promise<SuperAdminAssociationRule[]> =>
    apiClient
      .get<{ data: SuperAdminAssociationRule[] }>(
        `${base(organisationId, projectId)}/rules`,
      )
      .then(d),

  getRule: (
    organisationId: string,
    projectId: string,
    ruleId: string,
  ): Promise<SuperAdminAssociationRule> =>
    apiClient
      .get<{ data: SuperAdminAssociationRule }>(
        `${base(organisationId, projectId)}/rules/${ruleId}`,
      )
      .then(d),

  createRule: (
    organisationId: string,
    projectId: string,
    dto: SuperAdminCreateAssociationRuleDto,
  ): Promise<SuperAdminAssociationRule> =>
    apiClient
      .post<{ data: SuperAdminAssociationRule }>(
        `${base(organisationId, projectId)}/rules`,
        dto,
      )
      .then(d),

  updateRule: (
    organisationId: string,
    projectId: string,
    ruleId: string,
    dto: SuperAdminUpdateAssociationRuleDto,
  ): Promise<SuperAdminAssociationRule> =>
    apiClient
      .patch<{ data: SuperAdminAssociationRule }>(
        `${base(organisationId, projectId)}/rules/${ruleId}`,
        dto,
      )
      .then(d),

  deleteRule: (
    organisationId: string,
    projectId: string,
    ruleId: string,
    dto: SuperAdminDeleteAssociationRuleDto,
  ): Promise<{ ruleId: string; deleted: true }> =>
    apiClient
      .delete<{ data: { ruleId: string; deleted: true } }>(
        `${base(organisationId, projectId)}/rules/${ruleId}`,
        { data: dto },
      )
      .then(d),

  listPending: (
    organisationId: string,
    projectId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<SuperAdminPage<SuperAdminPendingAssociation>> =>
    apiClient
      .get<PaginatedEnvelope<SuperAdminPendingAssociation>>(
        `${base(organisationId, projectId)}/pending`,
        { params },
      )
      .then(paginated<SuperAdminPendingAssociation>),

  listRuns: (
    organisationId: string,
    projectId: string,
    params: {
      ruleId?: string;
      page?: number;
      limit?: number;
      status?: string;
      result?: string;
      search?: string;
    } = {},
  ): Promise<SuperAdminPage<AssociationRunLog>> =>
    apiClient
      .get<PaginatedEnvelope<AssociationRunLog>>(
        `${base(organisationId, projectId)}/runs`,
        { params },
      )
      .then(paginated<AssociationRunLog>),

  getRuleStats: (
    organisationId: string,
    projectId: string,
    ruleId: string,
  ): Promise<AssociationRuleStats> =>
    apiClient
      .get<{ data: AssociationRuleStats }>(
        `${base(organisationId, projectId)}/rules/${ruleId}/stats`,
      )
      .then(d),

  getRuleRecords: (
    organisationId: string,
    projectId: string,
    ruleId: string,
    params: {
      page?: number;
      limit?: number;
      status?: 'pending' | 'completed' | 'failed';
      search?: string;
      runId?: string;
    } = {},
  ): Promise<SuperAdminPage<AssociationRecord>> =>
    apiClient
      .get<PaginatedEnvelope<AssociationRecord>>(
        `${base(organisationId, projectId)}/rules/${ruleId}/records`,
        { params },
      )
      .then(paginated<AssociationRecord>),

  getObjects: (
    organisationId: string,
    projectId: string,
  ): Promise<Array<{ sourceObject: string; destObjectType: string }>> =>
    apiClient
      .get<{ data: Array<{ sourceObject: string; destObjectType: string }> }>(
        `${base(organisationId, projectId)}/objects`,
      )
      .then(d),

  getObjectFields: (
    organisationId: string,
    projectId: string,
    sourceObject: string,
  ): Promise<Array<{ field: string; label: string; isArray: boolean }>> =>
    apiClient
      .get<{ data: Array<{ field: string; label: string; isArray: boolean }> }>(
        `${base(organisationId, projectId)}/objects/${encodeURIComponent(sourceObject)}/fields`,
      )
      .then(d),

  getOwnerFields: (
    organisationId: string,
    projectId: string,
  ): Promise<Array<{ field: string; label: string; isArray: boolean }>> =>
    apiClient
      .get<{ data: Array<{ field: string; label: string; isArray: boolean }> }>(
        `${base(organisationId, projectId)}/owner-fields`,
      )
      .then(d),

  getAssociationTypes: (
    organisationId: string,
    projectId: string,
    fromObjectType: string,
    toObjectType: string,
  ): Promise<Array<{ typeId: number; category: string; label: string }>> =>
    apiClient
      .get<{
        data: Array<{ typeId: number; category: string; label: string }>;
      }>(`${base(organisationId, projectId)}/types`, {
        params: { fromObjectType, toObjectType },
      })
      .then(d),

  runRule: (
    organisationId: string,
    projectId: string,
    ruleId: string,
    reason: string,
  ): Promise<{
    id: string;
    status: string;
    succeeded: number;
    failed: number;
    pendingCreated: number;
  }> =>
    apiClient
      .post<{
        data: {
          id: string;
          status: string;
          succeeded: number;
          failed: number;
          pendingCreated: number;
        };
      }>(`${base(organisationId, projectId)}/rules/${ruleId}/run`, { reason })
      .then(d),

  retryFailed: (
    organisationId: string,
    projectId: string,
    ruleId: string,
    reason: string,
  ): Promise<{ queued: true }> =>
    apiClient
      .post<{ data: { queued: true } }>(
        `${base(organisationId, projectId)}/rules/${ruleId}/retry-failed`,
        { reason },
      )
      .then(d),
};
