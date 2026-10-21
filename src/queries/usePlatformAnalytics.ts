import { useQuery } from '@tanstack/react-query';
import { platformAnalyticsApi } from '@/api/platformAnalytics';
import type { AnalyticsFilters } from '@/types/platformAnalytics';

export function usePlatformAnalytics(
  filters: AnalyticsFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: ['superAdmin', 'platform', 'analytics', 'v1', filters],
    queryFn: () => platformAnalyticsApi.overview(filters),
    enabled,
    staleTime: 300000,
    refetchInterval: 300000,
  });
}
