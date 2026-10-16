import apiClient from './apiClient';
import type {
  AnalyticsFilters,
  OrganisationAnalyticsFilters,
  OrganisationAnalyticsResponse,
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
  organisations: (params: OrganisationAnalyticsFilters) =>
    apiClient
      .get<{ data: OrganisationAnalyticsResponse }>(
        '/super-admin/platform/analytics/organisations',
        { params },
      )
      .then((response) => response.data.data),
};
