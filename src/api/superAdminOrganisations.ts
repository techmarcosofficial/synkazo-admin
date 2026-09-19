import apiClient from './apiClient';

import type {
  ProvisionOrganisationDto,
  ProvisionOrganisationResponse,
  SuperAdminPage,
  SuperAdminOrganisationDetail,
  SuperAdminOrganisationListItem,
  SuperAdminUpdateOrganisationDto,
} from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const paginated = <T>(r: any): SuperAdminPage<T> => ({
  data: r.data.data,
  total: r.data.total,
  page: r.data.page,
  limit: r.data.limit,
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
      .get('/super-admin/organisations', { params })
      .then(paginated<SuperAdminOrganisationListItem>),

  get: (organisationId: string): Promise<SuperAdminOrganisationDetail> =>
    apiClient.get(`/super-admin/organisations/${organisationId}`).then(d),

  update: (
    organisationId: string,
    dto: SuperAdminUpdateOrganisationDto,
  ): Promise<SuperAdminOrganisationDetail> =>
    apiClient
      .patch(`/super-admin/organisations/${organisationId}`, dto)
      .then(d),

  // SA-401..404 — provision a new organisation via the Super Admin
  // dedicated contract. Idempotent on slug — repeated calls with the
  // same slug return the pre-existing record.
  provision: (
    dto: ProvisionOrganisationDto,
  ): Promise<ProvisionOrganisationResponse> =>
    apiClient.post('/super-admin/organisations', dto).then(d),
};
