import apiClient from './apiClient';

import type { Organisation } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

export const organisationsApi = {
  listOrgs: (): Promise<Organisation[]> =>
    apiClient.get('/organisations').then(d),
  getMyOrg: (): Promise<Organisation> =>
    apiClient.get('/organisations/me').then(d),
  setupOrg: (data: Partial<Organisation>): Promise<Organisation> =>
    apiClient.post('/organisations/setup', data).then(d),
  updateOrg: (id: string, data: Partial<Organisation>): Promise<Organisation> =>
    apiClient.patch(`/organisations/${id}`, data).then(d),
  deleteOrg: (id: string): Promise<void> =>
    apiClient.delete(`/organisations/${id}`).then(d),
};
