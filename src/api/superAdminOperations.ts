import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';

import type {
  SuperAdminPage,
  SuperAdminJobDetail,
  SuperAdminJobListItem,
  SuperAdminProjectDetail,
  SuperAdminProjectListItem,
  SuperAdminRunJobDto,
  SuperAdminRunStatus,
} from '@/types';

interface PaginatedEnvelope<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface RunJobResponse {
  success: boolean;
  bullJobId?: string;
  message?: string;
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

export interface ListProjectsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'archived' | 'setup';
  sortBy?: 'name' | 'status' | 'createdAt' | 'lastSyncedAt';
  sortOrder?: 'asc' | 'desc';
}

// Projects, jobs, and manual-run for a selected organisation. Every call
// carries the organisationId in the path — never inferred from
// user.organisationId. Matches synkazo-api's SuperAdminProjectsController
// on the /super-admin/organisations/:organisationId/projects route tree.
export const superAdminOperationsApi = {
  listProjects: (
    organisationId: string,
    params: ListProjectsParams = {},
  ): Promise<SuperAdminPage<SuperAdminProjectListItem>> =>
    apiClient
      .get<PaginatedEnvelope<SuperAdminProjectListItem>>(
        `/super-admin/organisations/${organisationId}/projects`,
        { params },
      )
      .then(paginated<SuperAdminProjectListItem>),

  getProject: (
    organisationId: string,
    projectId: string,
  ): Promise<SuperAdminProjectDetail> =>
    apiClient
      .get<{ data: SuperAdminProjectDetail }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}`,
      )
      .then(d),

  listJobs: (
    organisationId: string,
    projectId: string,
  ): Promise<SuperAdminJobListItem[]> =>
    apiClient
      .get<{ data: SuperAdminJobListItem[] }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs`,
      )
      .then(d),

  getJob: (
    organisationId: string,
    projectId: string,
    jobId: string,
  ): Promise<SuperAdminJobDetail> =>
    apiClient
      .get<{ data: SuperAdminJobDetail }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}`,
      )
      .then(d),

  // Manual run. Never carries a bypass boolean — the API derives
  // enforcementMode from the caller's identity. See SA-BIZ-005.
  runJob: (
    organisationId: string,
    projectId: string,
    jobId: string,
    dto: SuperAdminRunJobDto,
  ): Promise<RunJobResponse> =>
    apiClient
      .post<RunJobResponse>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}/run`,
        dto,
      )
      .then((r) => r.data),

  // Poll status for a Bull job triggered by a super-admin with
  // organisationId=null. Backed by SA-API-006.
  getRunStatus: (
    organisationId: string,
    projectId: string,
    jobId: string,
    bullJobId: string,
  ): Promise<SuperAdminRunStatus> =>
    apiClient
      .get<{ data: SuperAdminRunStatus }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}/runs/${bullJobId}`,
      )
      .then(d),
};
