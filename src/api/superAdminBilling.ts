import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';

import type {
  RetryInvoiceDto,
  RetryInvoiceResponse,
  SuperAdminPage,
  SuperAdminBillingOverview,
  SuperAdminInvoiceListItem,
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

export interface ListInvoicesParams {
  page?: number;
  limit?: number;
}

// Read-only billing surface for a selected organisation. Zero-write —
// opening a screen must never create or update provider objects (SA-701).
export const superAdminBillingApi = {
  overview: (organisationId: string): Promise<SuperAdminBillingOverview> =>
    apiClient
      .get<{ data: SuperAdminBillingOverview }>(
        `/super-admin/organisations/${organisationId}/billing/overview`,
      )
      .then(d),

  invoices: (
    organisationId: string,
    params: ListInvoicesParams = {},
  ): Promise<SuperAdminPage<SuperAdminInvoiceListItem>> =>
    apiClient
      .get<PaginatedEnvelope<SuperAdminInvoiceListItem>>(
        `/super-admin/organisations/${organisationId}/billing/invoices`,
        { params },
      )
      .then(paginated<SuperAdminInvoiceListItem>),

  // SA-706 — retry a specific invoice through Stripe. The dry-run
  // command; safe to fire again if the first attempt returned open state.
  retryInvoice: (
    organisationId: string,
    invoiceId: string,
    dto: RetryInvoiceDto,
  ): Promise<RetryInvoiceResponse> =>
    apiClient
      .post<{ data: RetryInvoiceResponse }>(
        `/super-admin/organisations/${organisationId}/billing/invoices/${invoiceId}/retry`,
        dto,
      )
      .then(d),

  // SA-702 / GAP-051 — assign a plan to a selected organisation via the
  // SA-canonical `/billing/plan` route (rather than the legacy
  // /billing/admin/organisations/:id/plan alias). Server writes an
  // audit row and returns the new plan status; response type is kept
  // loose because upstream shape may include Stripe metadata this
  // client never renders (SA-707).
  assignPlan: (
    organisationId: string,
    planId: string,
  ): Promise<{ planId: string; planName?: string }> =>
    apiClient
      .patch<{ data: { planId: string; planName?: string } }>(
        `/super-admin/organisations/${organisationId}/billing/plan`,
        { planId },
      )
      .then(d),
};
