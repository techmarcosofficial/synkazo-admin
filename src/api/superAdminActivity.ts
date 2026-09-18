import apiClient from './apiClient';

import type { SuperAdminPage, SuperAdminActivityEntry } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const paginated = <T>(r: any): SuperAdminPage<T> => ({
  data: r.data.data,
  total: r.data.total,
  page: r.data.page,
  limit: r.data.limit,
});

export interface ListActivityParams {
  page?: number;
  limit?: number;
  action?: string;
  severity?: 'INFO' | 'WARNING' | 'ERROR';
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const superAdminActivityApi = {
  list: (
    organisationId: string,
    params: ListActivityParams = {},
  ): Promise<SuperAdminPage<SuperAdminActivityEntry>> =>
    apiClient
      .get(`/super-admin/organisations/${organisationId}/activity`, {
        params,
      })
      .then(paginated<SuperAdminActivityEntry>),
};
