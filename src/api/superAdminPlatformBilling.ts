import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';

import type { FailedPaymentRow, SubscriptionStatus, SuperAdminPage } from '@/types';

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
      .get<PaginatedEnvelope<FailedPaymentRow>>(
        '/super-admin/billing/failed-payments',
        { params },
      )
      .then(paginated<FailedPaymentRow>),
};
