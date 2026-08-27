import { useQuery } from '@tanstack/react-query';

import { platformsApi } from '@/api/platforms';

export function usePlatformsQuery() {
  return useQuery({
    queryKey: ['platforms'] as const,
    queryFn: platformsApi.list,
  });
}
