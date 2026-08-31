import apiClient from './apiClient';

import type { PaginatedResponse } from '@/types';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'is_empty'
  | 'is_not_empty'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte';

export interface ConditionNormalization {
  trim?: boolean;
  lowercase?: boolean;
  removeWhitespace?: boolean;
}

export interface AssociationCondition {
  field: string;
  operator: ConditionOperator;
  value?: string | number | boolean | string[] | null;
  normalization?: ConditionNormalization;
}

export type ConditionLogic = 'AND' | 'OR';

export interface AssociationRule {
  id: string;
  projectId: string;
  name?: string;
  sourceObject: string;
  sourceMatchField: string;
  targetObject: string;
  targetMatchField: string;
  associationType?: string;
  assocTypeId?: number;
  assocCategory?: string;
  assocLabel?: string | null;
  cardinality?: string;
  destSourceObjectType?: string;
  destTargetObjectType?: string;
  hsAssociationTypeId?: string | number;
  hsSourceObjectType?: string;
  hsTargetObjectType?: string;
  isEnabled?: boolean;
  conditions?: AssociationCondition[] | null;
  conditionLogic?: ConditionLogic;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyOwnerMapping {
  id: string;
  projectId: string;
  sourcePlatformId: string;
  sourceObject: string;
  sourceProperty: string;
  targetHubspotProperty: string;
  isEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssociationRuleStats {
  total: number;
  resolved: number;
  pending: number;
  failed: number;
}

export type AssociationRecordStatus = 'pending' | 'completed' | 'failed';

export interface AssociationRecord {
  id: string;
  associationRuleId: string;
  sourceId: string;
  sourceHsId: string | null;
  targetMatchValue: string;
  targetId: string | null;
  targetHsId: string | null;
  status: AssociationRecordStatus;
  retryCount: number;
  lastAttemptedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface AssociationRunResult {
  succeeded: number;
  pendingCreated: number;
  failed: number;
}

export interface AssociationRunLog {
  id: string;
  status: string;
  startedAt: string;
  triggeredBy: string;
  succeeded: number;
  failed: number;
  pendingCreated: number;
  errorMessage?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;
const base = (projectId: string) => `/projects/${projectId}/associations`;

export const associationsApi = {
  listRules: (projectId: string): Promise<AssociationRule[]> =>
    apiClient.get(`${base(projectId)}/rules`).then(d),

  createRule: (
    projectId: string,
    data: Partial<AssociationRule>,
  ): Promise<AssociationRule> =>
    apiClient.post(`${base(projectId)}/rules`, data).then(d),

  updateRule: (
    projectId: string,
    ruleId: string,
    data: Partial<AssociationRule>,
  ): Promise<AssociationRule> =>
    apiClient.patch(`${base(projectId)}/rules/${ruleId}`, data).then(d),

  deleteRule: (projectId: string, ruleId: string): Promise<void> =>
    apiClient.delete(`${base(projectId)}/rules/${ruleId}`).then(d),

  getRuleStats: (
    projectId: string,
    ruleId: string,
  ): Promise<AssociationRuleStats> =>
    apiClient.get(`${base(projectId)}/rules/${ruleId}/stats`).then(d),

  getRunLogs: (
    projectId: string,
    ruleId: string,
  ): Promise<PaginatedResponse<AssociationRunLog>> =>
    apiClient
      .get(`${base(projectId)}/rules/${ruleId}/logs`)
      .then((r) => r.data),

  getRuleRecords: (
    projectId: string,
    ruleId: string,
    params: {
      status?: AssociationRecordStatus | 'all';
      page?: number;
      limit?: number;
      search?: string;
    } = {},
  ): Promise<PaginatedResponse<AssociationRecord>> =>
    apiClient
      .get(`${base(projectId)}/rules/${ruleId}/records`, {
        params: {
          status:
            params.status && params.status !== 'all'
              ? params.status
              : undefined,
          page: params.page,
          limit: params.limit,
          search: params.search || undefined,
        },
      })
      .then((r) => r.data),

  runRule: (projectId: string, ruleId: string): Promise<AssociationRunResult> =>
    apiClient.post(`${base(projectId)}/rules/${ruleId}/run`).then(d),

  retryFailed: (
    projectId: string,
    ruleId: string,
  ): Promise<AssociationRunResult> =>
    apiClient.post(`${base(projectId)}/rules/${ruleId}/retry-failed`).then(d),

  getProjectObjects: (projectId: string): Promise<string[]> =>
    apiClient.get(`${base(projectId)}/objects`).then(d),

  getObjectFields: (
    projectId: string,
    sourceObject: string,
  ): Promise<string[]> =>
    apiClient.get(`${base(projectId)}/objects/${sourceObject}/fields`).then(d),

  getAssociationTypes: (
    projectId: string,
    fromObjectType: string,
    toObjectType: string,
  ): Promise<unknown[]> =>
    apiClient
      .get(`${base(projectId)}/types`, {
        params: { fromObjectType, toObjectType },
      })
      .then(d),

  getSampleRecord: (
    projectId: string,
    sourceObject: string,
  ): Promise<Record<string, unknown>> =>
    apiClient
      .get(
        `${base(projectId)}/objects/${encodeURIComponent(sourceObject)}/sample`,
      )
      .then(d),

  /** Distinct real values seen for one field, from records this project has
   *  already synced — used to auto-suggest Map Values rules. */
  getFieldValueSamples: (
    projectId: string,
    sourceObject: string,
    field: string,
    limit = 50,
  ): Promise<string[]> =>
    apiClient
      .get(
        `${base(projectId)}/objects/${encodeURIComponent(sourceObject)}/field-samples`,
        { params: { field, limit } },
      )
      .then(d),

  // Dataforma company-owner mapping config — {sourceProperty -> targetHubspotProperty}
  // rows, isolated from ServiceTitan's CAM-matching flow below.
  listCompanyOwnerMappings: (
    projectId: string,
  ): Promise<CompanyOwnerMapping[]> =>
    apiClient.get(`${base(projectId)}/company-owner-mappings`).then(d),

  createCompanyOwnerMapping: (
    projectId: string,
    data: { sourceProperty: string; targetHubspotProperty: string },
  ): Promise<CompanyOwnerMapping> =>
    apiClient.post(`${base(projectId)}/company-owner-mappings`, data).then(d),

  updateCompanyOwnerMapping: (
    projectId: string,
    mappingId: string,
    data: Partial<{
      sourceProperty: string;
      targetHubspotProperty: string;
      isEnabled: boolean;
    }>,
  ): Promise<CompanyOwnerMapping> =>
    apiClient
      .patch(`${base(projectId)}/company-owner-mappings/${mappingId}`, data)
      .then(d),

  deleteCompanyOwnerMapping: (
    projectId: string,
    mappingId: string,
  ): Promise<void> =>
    apiClient
      .delete(`${base(projectId)}/company-owner-mappings/${mappingId}`)
      .then(d),

  runAllCompanyOwners: (
    projectId: string,
    config: Record<string, unknown> = {},
  ): Promise<CompanyOwnerStats> =>
    apiClient.post(`${base(projectId)}/company-owners/run-all`, config).then(d),

  getCompanyOwnerLogs: (
    projectId: string,
    limit = 20,
  ): Promise<CompanyOwnerRunLog[]> =>
    apiClient
      .get(`${base(projectId)}/company-owners/logs`, { params: { limit } })
      .then(d),

  getCompanyOwnerResults: (
    projectId: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      runId?: string;
    } = {},
  ): Promise<CompanyOwnerResultsPage> =>
    apiClient
      .get(`${base(projectId)}/company-owners/results`, { params })
      .then(d),
};

export type CompanyOwnerResultStatus = 'success' | 'skipped' | 'failed';

export interface CompanyOwnerResultRow {
  hsId: string;
  camValue: string | null;
  resolvedEmails: string[];
  assignedHsOwnerId: string | null;
  companyName: string | null;
  ownerName: string | null;
  associatedAt: string | null;
  result: CompanyOwnerResultStatus;
  reason?: string;
}

export interface CompanyOwnerResultsPage {
  items: CompanyOwnerResultRow[];
  total: number;
  page: number;
  limit: number;
  runId: string | null;
  runStartedAt: string | null;
  runStatus: 'completed' | 'partial' | 'failed' | null;
}

export type CompanyOwnerRunStatus = 'completed' | 'partial' | 'failed';

export interface CompanyOwnerRunLog {
  id: string;
  status: CompanyOwnerRunStatus;
  startedAt: string;
  completedAt?: string;
  triggeredBy?: string;
  hsTotalCount?: number;
  hsSuccessCount?: number;
  hsFailedCount?: number;
  hsSkippedCount?: number;
}

export interface CompanyOwnerStats {
  hubspot?: {
    total?: number;
    success?: number;
    failed?: number;
    skipped?: number;
  };
}
