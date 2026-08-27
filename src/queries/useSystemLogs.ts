import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { systemLogsApi } from '@/api/systemLogs';

export function useSystemLogsQuery(page: number, limit = 20, search = '') {
  return useQuery({
    queryKey: queryKeys.systemLogs.list(page, limit, search),
    queryFn: () => systemLogsApi.listSystemLogs({ page, limit, search }),
    placeholderData: keepPreviousData,
  });
}
