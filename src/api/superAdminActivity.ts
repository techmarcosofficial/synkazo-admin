import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';

import type { SuperAdminPage, SuperAdminActivityEntry } from '@/types';

interface PaginatedEnvelope<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

const paginated = <T>({
  data,
}: AxiosResponse<PaginatedEnvelope<T>>): SuperAdminPage<T> => ({
  data: data.data,
  total: data.total,
  page: data.page,
  limit: data.limit,
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
      .get<PaginatedEnvelope<SuperAdminActivityEntry>>(
        `/super-admin/organisations/${organisationId}/activity`,
        { params },
      )
      .then(paginated<SuperAdminActivityEntry>),
};
