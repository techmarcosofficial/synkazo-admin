import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { twoWaySyncApi } from '@/api/twoWaySync';

export function useTwoWaySyncIntervalsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.twoWaySync.intervals,
    queryFn: twoWaySyncApi.listIntervals,
    enabled: options?.enabled,
  });
}

export function useSetTwoWaySyncIntervalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      platformId,
      intervalMinutes,
    }: {
      platformId: string;
      intervalMinutes: number;
    }) => twoWaySyncApi.setInterval(platformId, intervalMinutes),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.twoWaySync.intervals,
      });
    },
  });
}

export function useResetTwoWaySyncIntervalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (platformId: string) => twoWaySyncApi.resetInterval(platformId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.twoWaySync.intervals,
      });
    },
  });
}
