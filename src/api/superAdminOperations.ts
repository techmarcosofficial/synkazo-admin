import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';
import type { ProjectArchiveImpact } from './projects';
import type { PipelineItem } from '@/features/jobs/types';
import type {
  CrossObjectProperty,
  CrossObjectPropertyOption,
} from '@/api/jobs';

import type {
  SuperAdminPage,
  SuperAdminJobDetail,
  SuperAdminJobListItem,
  SuperAdminCreateJobDto,
  SuperAdminDiscoveredObject,
  SuperAdminDiscoveredField,
  SuperAdminFieldMapping,
  SuperAdminFieldMappingInput,
  SuperAdminJobRunListItem,
  SuperAdminProjectConnection,
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

  updateProject: (
    organisationId: string,
    projectId: string,
    dto: { name?: string; description?: string },
  ): Promise<SuperAdminProjectDetail> =>
    apiClient
      .patch<{ data: SuperAdminProjectDetail }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}`,
        dto,
      )
      .then(d),

  getProjectArchiveImpact: (
    organisationId: string,
    projectId: string,
  ): Promise<ProjectArchiveImpact> =>
    apiClient
      .get<{ data: ProjectArchiveImpact }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/archive-impact`,
      )
      .then(d),

  archiveProject: (
    organisationId: string,
    projectId: string,
    confirmation: string,
    reason: string,
  ): Promise<ProjectArchiveImpact> =>
    apiClient
      .delete<{ data: ProjectArchiveImpact }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}`,
        { data: { confirmation, reason } },
      )
      .then(d),

  activateProjectEnvironment: (
    organisationId: string,
    projectId: string,
    dto: { environment: 'sandbox' | 'production'; reason: string },
  ): Promise<{ environment: 'sandbox' | 'production'; message: string }> =>
    apiClient
      .post<{
        data: { environment: 'sandbox' | 'production'; message: string };
      }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/activate-environment`,
        dto,
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

  createJob: (
    organisationId: string,
    projectId: string,
    dto: SuperAdminCreateJobDto,
  ): Promise<SuperAdminJobDetail> =>
    apiClient
      .post<{ data: SuperAdminJobDetail }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs`,
        dto,
      )
      .then(d),

  updateJob: (
    organisationId: string,
    projectId: string,
    jobId: string,
    dto: Partial<SuperAdminCreateJobDto>,
  ): Promise<SuperAdminJobDetail> =>
    apiClient
      .patch<{ data: SuperAdminJobDetail }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}`,
        dto,
      )
      .then(d),

  setJobEnabled: (
    organisationId: string,
    projectId: string,
    jobId: string,
    enabled: boolean,
  ): Promise<SuperAdminJobDetail> =>
    apiClient
      .patch<{ data: SuperAdminJobDetail }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}/enabled`,
        { enabled },
      )
      .then(d),

  setJobSyncEnabled: (
    organisationId: string,
    projectId: string,
    jobId: string,
    enabled: boolean,
  ): Promise<SuperAdminJobDetail> =>
    apiClient
      .patch<{ data: SuperAdminJobDetail }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}/sync-enabled`,
        { enabled },
      )
      .then(d),

  discoverObjects: (
    organisationId: string,
    projectId: string,
    platform: string,
  ): Promise<SuperAdminDiscoveredObject[]> =>
    apiClient
      .get<{ data: SuperAdminDiscoveredObject[] }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/discovery/${platform}/objects`,
      )
      .then(d),

  discoverFields: (
    organisationId: string,
    projectId: string,
    platform: string,
    objectType: string,
  ): Promise<SuperAdminDiscoveredField[]> =>
    apiClient
      .get<{ data: { properties: SuperAdminDiscoveredField[] } }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/discovery/${platform}/${encodeURIComponent(objectType)}/properties`,
      )
      .then((response) => response.data.data.properties),

  discoverPipelines: (
    organisationId: string,
    projectId: string,
    objectType: string,
  ): Promise<PipelineItem[]> =>
    apiClient
      .get<{ data: PipelineItem[] }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/discovery/hubspot/pipelines`,
        { params: { objectType } },
      )
      .then(d),

  discoverStatuses: (
    organisationId: string,
    projectId: string,
  ): Promise<Array<{ id: string; label: string }>> =>
    apiClient
      .get<{ data: Array<{ id: string; label: string }> }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/discovery/servicetitan/project-statuses`,
      )
      .then(d),

  listJobMappings: (
    organisationId: string,
    projectId: string,
    jobId: string,
  ): Promise<SuperAdminFieldMapping[]> =>
    apiClient
      .get<{ data: SuperAdminFieldMapping[] }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}/field-mappings`,
      )
      .then(d),

  getJobFilterSample: (
    organisationId: string,
    projectId: string,
    jobId: string,
  ): Promise<Record<string, unknown> | null> =>
    apiClient
      .get<{ data: Record<string, unknown> | null }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}/filter-sample`,
      )
      .then(d),

  replaceJobMappings: (
    organisationId: string,
    projectId: string,
    jobId: string,
    mappings: SuperAdminFieldMappingInput[],
  ): Promise<SuperAdminFieldMapping[]> =>
    apiClient
      .put<{ data: SuperAdminFieldMapping[] }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}/field-mappings`,
        mappings,
      )
      .then(d),

  getJobCrossObjectOptions: (
    organisationId: string,
    projectId: string,
    jobId: string,
  ): Promise<{ objects: CrossObjectPropertyOption[] }> =>
    apiClient
      .get<{ data: { objects: CrossObjectPropertyOption[] } }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}/cross-object-properties/options`,
      )
      .then(d),

  listJobCrossObjectProperties: (
    organisationId: string,
    projectId: string,
    jobId: string,
  ): Promise<CrossObjectProperty[]> =>
    apiClient
      .get<{ data: CrossObjectProperty[] }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}/cross-object-properties`,
      )
      .then(d),

  createJobCrossObjectProperty: (
    organisationId: string,
    projectId: string,
    jobId: string,
    data: {
      relatedObject: string;
      lookupMode: 'id' | 'name';
      lookupField: string;
      importedProperty: string;
    },
  ): Promise<CrossObjectProperty> =>
    apiClient
      .post<{ data: CrossObjectProperty }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}/cross-object-properties`,
        data,
      )
      .then(d),

  removeJobCrossObjectProperty: (
    organisationId: string,
    projectId: string,
    jobId: string,
    propertyId: string,
  ): Promise<void> =>
    apiClient
      .delete(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}/cross-object-properties/${propertyId}`,
      )
      .then(() => undefined),

  listJobRuns: (
    organisationId: string,
    projectId: string,
    jobId: string,
    page = 1,
    limit = 20,
  ): Promise<SuperAdminPage<SuperAdminJobRunListItem>> =>
    apiClient
      .get<PaginatedEnvelope<SuperAdminJobRunListItem>>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}/sync-logs`,
        { params: { page, limit } },
      )
      .then(paginated<SuperAdminJobRunListItem>),

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

  // GAP-011 — cancel a queued run (SA-611 cross-project + cross-job
  // guard enforced server-side; the admin surface just delegates).
  cancelRun: (
    organisationId: string,
    projectId: string,
    jobId: string,
    bullJobId: string,
  ): Promise<{ bullJobId: string; cancelled: true }> =>
    apiClient
      .post<{ data: { bullJobId: string; cancelled: true } }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}/runs/${bullJobId}/cancel`,
      )
      .then(d),

  // GAP-012 — retry a failed run for the selected organisation.
  retryRun: (
    organisationId: string,
    projectId: string,
    jobId: string,
    bullJobId: string,
  ): Promise<{ bullJobId: string; retried: true }> =>
    apiClient
      .post<{ data: { bullJobId: string; retried: true } }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${jobId}/runs/${bullJobId}/retry`,
      )
      .then(d),

  // CAP-060 / CAP-061 — list masked platform connections for a project.
  listProjectConnections: (
    organisationId: string,
    projectId: string,
  ): Promise<SuperAdminProjectConnection[]> =>
    apiClient
      .get<{ data: SuperAdminProjectConnection[] }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/connections`,
      )
      .then(d),

  // GAP-008 / SA-605 — pause every ACTIVE job on the project.
  holdProject: (
    organisationId: string,
    projectId: string,
    reason?: string,
  ): Promise<{ heldJobs: number }> =>
    apiClient
      .post<{ data: { heldJobs: number } }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/hold`,
        reason ? { reason } : {},
      )
      .then(d),

  resumeProject: (
    organisationId: string,
    projectId: string,
    reason?: string,
  ): Promise<{ resumedJobs: number }> =>
    apiClient
      .post<{ data: { resumedJobs: number } }>(
        `/super-admin/organisations/${organisationId}/projects/${projectId}/resume`,
        reason ? { reason } : {},
      )
      .then(d),
};
