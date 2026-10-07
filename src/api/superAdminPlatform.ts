import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';

import type { PlatformOverviewResponse } from '@/types';

const d = <T>({ data }: AxiosResponse<{ data: T }>): T => data.data;

// Cross-org aggregates for the Super Admin overview screen. Zero-fan-out
// — the overview always calls the single endpoint below and never joins
// results from per-org endpoints (SA-303).
export const superAdminPlatformApi = {
  overview: (): Promise<PlatformOverviewResponse> =>
    apiClient
      .get<{ data: PlatformOverviewResponse }>('/super-admin/platform/overview')
      .then(d),
};
