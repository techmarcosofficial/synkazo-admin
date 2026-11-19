import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { trashApi } from '@/api/trash';
import type { ListTrashParams, TrashEntityType } from '@/api/trashTypes';

import { queryKeys } from './queryKeys';

export function useTrashQuery(params: ListTrashParams = {}) {
  return useQuery({
    queryKey: queryKeys.trash.list({ ...params }),
    queryFn: () => trashApi.list(params),
  });
}

export function useRestoreTrashItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id }: { type: TrashEntityType; id: string }) =>
      trashApi.restore(type, id),
    onSuccess: () => {
      // Restored projects/jobs re-appear in their own lists too.
      queryClient.invalidateQueries({ queryKey: queryKeys.trash.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
  });
}
