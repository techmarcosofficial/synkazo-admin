import apiClient from './apiClient';

import type { User } from '@/types';

export const membersApi = {
  list: (projectId: string): Promise<User[]> =>
    apiClient
      .get(`/projects/${projectId}/members`)
      .then((r) => r.data?.data ?? r.data),

  add: (projectId: string, userId: string): Promise<unknown> =>
    apiClient
      .post(`/projects/${projectId}/members`, { userId })
      .then((r) => r.data),

  remove: (projectId: string, userId: string): Promise<unknown> =>
    apiClient
      .delete(`/projects/${projectId}/members/${userId}`)
      .then((r) => r.data),
};
