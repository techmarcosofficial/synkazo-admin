import apiClient from './apiClient';

import type {
  SuperAdminPage,
  SuperAdminBillingOverview,
  SuperAdminInvoiceListItem,
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

export interface ListInvoicesParams {
  page?: number;
  limit?: number;
}

// Read-only billing surface for a selected organisation. Zero-write —
// opening a screen must never create or update provider objects (SA-701).
export const superAdminBillingApi = {
  overview: (organisationId: string): Promise<SuperAdminBillingOverview> =>
    apiClient
      .get(`/super-admin/organisations/${organisationId}/billing/overview`)
      .then(d),

  invoices: (
    organisationId: string,
    params: ListInvoicesParams = {},
  ): Promise<SuperAdminPage<SuperAdminInvoiceListItem>> =>
    apiClient
      .get(`/super-admin/organisations/${organisationId}/billing/invoices`, {
        params,
      })
      .then(paginated<SuperAdminInvoiceListItem>),
};
