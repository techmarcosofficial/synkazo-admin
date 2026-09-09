import apiClient from './apiClient';

import type { Project } from '@/types';

export interface ProjectArchiveImpact {
  projectId: string;
  projectName: string;
  canArchive: boolean;
  blockers: {
    queuedSyncs: number;
    runningSyncs: number;
    activePriorityCycles: number;
  };
  affected: {
    jobs: number;
    scheduledJobs: number;
    prioritySchedules: number;
    connections: number;
    runHistory: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

export const projectsApi = {
  listProjects: (): Promise<Project[]> => apiClient.get('/projects').then(d),
  getProject: (id: string): Promise<Project> =>
    apiClient.get(`/projects/${id}`).then(d),
  createProject: (data: Partial<Project>): Promise<Project> =>
    apiClient.post('/projects', data).then(d),
  updateProject: (id: string, data: Partial<Project>): Promise<Project> =>
    apiClient.patch(`/projects/${id}`, data).then(d),
  getArchiveImpact: (id: string): Promise<ProjectArchiveImpact> =>
    apiClient.get(`/projects/${id}/archive-impact`).then(d),
  deleteProject: (
    id: string,
    confirmation: string,
  ): Promise<ProjectArchiveImpact> =>
    apiClient.delete(`/projects/${id}`, { data: { confirmation } }).then(d),
  completeSetup: (id: string): Promise<Project> =>
    apiClient.patch(`/projects/${id}/complete-setup`).then(d),
};
