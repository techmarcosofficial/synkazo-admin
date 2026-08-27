import apiClient from './apiClient';

import type { Project } from '@/types';

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
  deleteProject: (id: string): Promise<void> =>
    apiClient.delete(`/projects/${id}`).then(d),
  completeSetup: (id: string): Promise<Project> =>
    apiClient.patch(`/projects/${id}/complete-setup`).then(d),
};
