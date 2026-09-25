import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';

import type {
  ProvisionOrganisationDto,
  ProvisionOrganisationResponse,
  SuperAdminPage,
  SuperAdminOrganisationDetail,
  SuperAdminOrganisationListItem,
  SuperAdminUpdateOrganisationDto,
} from '@/types';

interface PaginatedEnvelope<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
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

export interface ListSuperAdminOrganisationsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  subscriptionStatus?: string;
  plan?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export const superAdminOrganisationsApi = {
  list: (
    params: ListSuperAdminOrganisationsParams = {},
  ): Promise<SuperAdminPage<SuperAdminOrganisationListItem>> =>
    apiClient
      .get<PaginatedEnvelope<SuperAdminOrganisationListItem>>(
        '/super-admin/organisations',
        { params },
      )
      .then(paginated<SuperAdminOrganisationListItem>),

  get: (organisationId: string): Promise<SuperAdminOrganisationDetail> =>
    apiClient
      .get<{ data: SuperAdminOrganisationDetail }>(
        `/super-admin/organisations/${organisationId}`,
      )
      .then(d),

  update: (
    organisationId: string,
    dto: SuperAdminUpdateOrganisationDto,
  ): Promise<SuperAdminOrganisationDetail> =>
    apiClient
      .patch<{ data: SuperAdminOrganisationDetail }>(
        `/super-admin/organisations/${organisationId}`,
        dto,
      )
      .then(d),

  // SA-401..404 — provision a new organisation via the Super Admin
  // dedicated contract. Idempotent on slug — repeated calls with the
  // same slug return the pre-existing record.
  provision: (
    dto: ProvisionOrganisationDto,
  ): Promise<ProvisionOrganisationResponse> =>
    apiClient
      .post<{ data: ProvisionOrganisationResponse }>(
        '/super-admin/organisations',
        dto,
      )
      .then(d),
};
