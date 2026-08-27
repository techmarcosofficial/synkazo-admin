import apiClient from './apiClient';

import type { User } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

export interface OwnershipSummary {
  projectsCount: number;
  jobsCount: number;
  totalRecordsSynced: number;
  runningJobsCount: number;
  scheduledJobsCount: number;
}

export const usersApi = {
  getMe: (): Promise<User> => apiClient.get('/users/me').then(d),
  updateMe: (data: Partial<User>): Promise<User> =>
    apiClient.patch('/users/me', data).then(d),
  getMyOwnershipSummary: (): Promise<OwnershipSummary> =>
    apiClient.get('/users/me/ownership-summary').then(d),
  deleteMe: (): Promise<void> => apiClient.delete('/users/me').then(d),
  listUsers: (organisationId?: string): Promise<User[]> =>
    apiClient
      .get('/users', {
        params: organisationId ? { organisationId } : undefined,
      })
      .then(d),
  getUser: (id: string): Promise<User> => apiClient.get(`/users/${id}`).then(d),
  updateUser: (id: string, data: Partial<User>): Promise<User> =>
    apiClient.patch(`/users/${id}`, data).then(d),
  deleteUser: (id: string): Promise<void> =>
    apiClient.delete(`/users/${id}`).then(d),
};
