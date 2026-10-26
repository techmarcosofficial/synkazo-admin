import apiClient from './apiClient';

import type { ProjectAccessGrant } from './invitations';

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

export interface UserProjectAccessRow extends ProjectAccessGrant {
  id: string;
  userId: string;
  projectId: string;
}

export interface UpdateUserPayload extends Partial<User> {
  // Editor-only per-project read/write grants — see UpdateUserDto on the API.
  // Ignored by the server unless the effective role is editor.
  projectAccess?: ProjectAccessGrant[];
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export const usersApi = {
  getMe: (): Promise<User> => apiClient.get('/users/me').then(d),
  updateMe: (data: Partial<User>): Promise<User> =>
    apiClient.patch('/users/me', data).then(d),
  requestEmailChange: (email: string): Promise<void> =>
    apiClient.post('/users/me/email-change', { email }).then(d),
  confirmEmailChange: (code: string): Promise<User> =>
    apiClient.post('/users/me/email-change/verify', { code }).then(d),
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
  getUserProjectAccess: (id: string): Promise<UserProjectAccessRow[]> =>
    apiClient.get(`/users/${id}/project-access`).then(d),
  updateUser: (id: string, data: UpdateUserPayload): Promise<User> =>
    apiClient.patch(`/users/${id}`, data).then(d),
  resetPassword: (
    id: string,
    newPassword?: string,
  ): Promise<ResetPasswordResponse> =>
    apiClient
      .post(`/users/${id}/reset-password`, { newPassword })
      .then((r) => r.data),
  deleteUser: (id: string): Promise<void> =>
    apiClient.delete(`/users/${id}`).then(d),
};
