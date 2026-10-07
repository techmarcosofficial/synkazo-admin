import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';

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
};
