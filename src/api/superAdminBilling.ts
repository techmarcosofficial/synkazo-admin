import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';
import { createIdempotencyKey } from '@/lib/idempotency';

import type {
  HistoryItem,
  RetryInvoiceDto,
  RetryInvoiceResponse,
  SuperAdminBillingOverview,
  SuperAdminInvoiceDetail,
  SuperAdminInvoiceListItem,
  SuperAdminPage,
  SuperAdminSubscriptionDetail,
  SuperAdminUsageDetail,
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

export interface ListHistoryParams {
  page?: number;
  limit?: number;
  onlyPayments?: boolean;
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

  subscription: (
    organisationId: string,
  ): Promise<SuperAdminSubscriptionDetail | null> =>
    apiClient
      .get<{ data: SuperAdminSubscriptionDetail | null }>(
        `/super-admin/organisations/${organisationId}/billing/subscription`,
      )
      .then(d),

  usage: (organisationId: string): Promise<SuperAdminUsageDetail> =>
    apiClient
      .get<{ data: SuperAdminUsageDetail }>(
        `/super-admin/organisations/${organisationId}/billing/usage`,
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

  invoiceDetail: (
    organisationId: string,
    invoiceId: string,
  ): Promise<SuperAdminInvoiceDetail> =>
    apiClient
      .get<{ data: SuperAdminInvoiceDetail }>(
        `/super-admin/organisations/${organisationId}/billing/invoices/${invoiceId}`,
      )
      .then(d),

  history: (
    organisationId: string,
    params: ListHistoryParams = {},
  ): Promise<SuperAdminPage<HistoryItem>> =>
    apiClient
      .get<PaginatedEnvelope<HistoryItem>>(
        `/super-admin/organisations/${organisationId}/billing/history`,
        { params },
      )
      .then(paginated<HistoryItem>),

  // SA-706 — retry a specific invoice through Stripe. The dry-run
  // command; safe to fire again if the first attempt returned open state.
  retryInvoice: (
    organisationId: string,
    invoiceId: string,
    dto: RetryInvoiceDto,
    idempotencyKey = createIdempotencyKey(),
  ): Promise<RetryInvoiceResponse> =>
    apiClient
      .post<{ data: RetryInvoiceResponse }>(
        `/super-admin/organisations/${organisationId}/billing/invoices/${invoiceId}/retry`,
        dto,
        { headers: { 'Idempotency-Key': idempotencyKey } },
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
    reason: string,
    idempotencyKey = createIdempotencyKey(),
  ): Promise<{ planId: string; planName?: string }> =>
    apiClient
      .patch<{ data: { planId: string; planName?: string } }>(
        `/super-admin/organisations/${organisationId}/billing/plan`,
        { planId, reason },
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .then(d),
};
