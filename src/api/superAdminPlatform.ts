import apiClient from './apiClient';

import type { PlatformOverviewResponse } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

// Cross-org aggregates for the Super Admin overview screen. Zero-fan-out
// — the overview always calls the single endpoint below and never joins
// results from per-org endpoints (SA-303).
export const superAdminPlatformApi = {
  overview: (): Promise<PlatformOverviewResponse> =>
    apiClient.get('/super-admin/platform/overview').then(d),
};
