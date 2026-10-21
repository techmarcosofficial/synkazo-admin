import apiClient from './apiClient';

export interface JobCopyCandidate {
  jobId: string;
  name: string;
  sourceObject: string;
  destObject: string;
  mappingCount: number;
  dependsOnJobId: string | null;
  status:
    | 'ready'
    | 'connection_unverified'
    | 'custom_object_manual'
    | 'missing_target_object'
    | 'missing_target_field'
    | 'existing_target_job'
    | 'manual_review'
    | 'discovery_failed';
  reason: string | null;
}

export interface JobCopyPreview {
  fromWorkspaceId: string;
  toWorkspaceId: string;
  jobs: JobCopyCandidate[];
  legacyUnassignedJobs: number;
  savedJobs: number;
  maxJobs: number;
}

export const jobCopiesApi = {
  preview: (
    projectId: string,
    fromWorkspaceId: string,
    toWorkspaceId: string,
  ): Promise<JobCopyPreview> =>
    apiClient.get(`/projects/${projectId}/job-copies/preview`, {
      params: { fromWorkspaceId, toWorkspaceId },
    }).then((response) => response.data.data),

  copy: (
    projectId: string,
    body: { fromWorkspaceId: string; toWorkspaceId: string; jobIds: string[] },
  ): Promise<{ copied: Array<{ sourceJobId: string; targetJobId: string }> }> =>
    apiClient.post(`/projects/${projectId}/job-copies`, body)
      .then((response) => response.data.data),
};
