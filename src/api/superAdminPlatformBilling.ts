import apiClient from './apiClient';

import type { FailedPaymentRow, SubscriptionStatus, SuperAdminPage } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const paginated = <T>(r: any): SuperAdminPage<T> => ({
  data: r.data.data,
  total: r.data.total,
  page: r.data.page,
  limit: r.data.limit,
});

export interface ListFailedPaymentsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: Extract<
    SubscriptionStatus,
    'past_due' | 'unpaid' | 'incomplete'
  >;
  sortOrder?: 'asc' | 'desc';
}

export const superAdminPlatformBillingApi = {
  listFailedPayments: (
    params: ListFailedPaymentsParams = {},
  ): Promise<SuperAdminPage<FailedPaymentRow>> =>
    apiClient
      .get('/super-admin/billing/failed-payments', { params })
      .then(paginated<FailedPaymentRow>),
};
