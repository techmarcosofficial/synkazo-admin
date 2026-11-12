import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';

import type {
  SuperAdminConnectionEnvironment,
  SuperAdminMigrationDiff,
  SuperAdminMigrationRun,
  SuperAdminMigrationRunItem,
  SuperAdminRunMigrationDto,
} from '@/types';

// GAP-022 — SA env-migration wrapper. Reuses the tenant
// EnvMigrationService; the SA layer only adds operational guards, a
// mandatory reason, and audit rows keyed to the migration run.

const d = <T>({ data }: AxiosResponse<{ data: T }>): T => data.data;

const base = (organisationId: string, projectId: string) =>
  `/super-admin/organisations/${organisationId}/projects/${projectId}/migration`;

export const superAdminMigrationApi = {
  diff: (
    organisationId: string,
    projectId: string,
    from?: SuperAdminConnectionEnvironment,
    to?: SuperAdminConnectionEnvironment,
  ): Promise<SuperAdminMigrationDiff> =>
    apiClient
      .get<{ data: SuperAdminMigrationDiff }>(
        `${base(organisationId, projectId)}/diff`,
        { params: { from, to } },
      )
      .then(d),

  run: (
    organisationId: string,
    projectId: string,
    dto: SuperAdminRunMigrationDto,
  ): Promise<SuperAdminMigrationRun> =>
    apiClient
      .post<{ data: SuperAdminMigrationRun }>(
        `${base(organisationId, projectId)}/run`,
        dto,
      )
      .then(d),

  listRuns: (
    organisationId: string,
    projectId: string,
  ): Promise<SuperAdminMigrationRun[]> =>
    apiClient
      .get<{ data: SuperAdminMigrationRun[] }>(
        `${base(organisationId, projectId)}/runs`,
      )
      .then(d),

  getRunItems: (
    organisationId: string,
    projectId: string,
    runId: string,
  ): Promise<SuperAdminMigrationRunItem[]> =>
    fetchAllRunItems(`${base(organisationId, projectId)}/runs/${runId}/items`),
};

async function fetchAllRunItems(
  path: string,
): Promise<SuperAdminMigrationRunItem[]> {
  const items: SuperAdminMigrationRunItem[] = [];
  for (let page = 1; ; page++) {
    const { data } = await apiClient.get<{
      data: SuperAdminMigrationRunItem[];
      total: number;
    }>(path, { params: { page, limit: 100 } });
    items.push(...data.data);
    if (typeof data.total !== 'number' || items.length >= data.total || data.data.length === 0) return items;
  }
}
