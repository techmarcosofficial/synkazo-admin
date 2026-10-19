import apiClient from './apiClient';
import type {
  AnalyticsFilters,
  PlatformAnalyticsResponse,
} from '@/types/platformAnalytics';

export const platformAnalyticsApi = {
  overview: (params: AnalyticsFilters) =>
    apiClient
      .get<{ data: PlatformAnalyticsResponse }>(
        '/super-admin/platform/analytics',
        { params },
      )
      .then((response) => response.data.data),
};
