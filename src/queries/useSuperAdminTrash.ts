import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { superAdminTrashApi } from '@/api/superAdminTrash';
import type { ListTrashParams, TrashEntityType } from '@/api/trashTypes';

import { queryKeys } from './queryKeys';

function invalidateTrash(queryClient: ReturnType<typeof useQueryClient>) {
  // A restore/delete/org-delete shifts trash + org lists + platform totals.
  queryClient.invalidateQueries({ queryKey: queryKeys.superAdmin.trash.all });
  queryClient.invalidateQueries({ queryKey: ['superAdmin', 'organisations'] });
  queryClient.invalidateQueries({
    queryKey: queryKeys.superAdmin.platform.overview,
  });
}

export function useSuperAdminTrashQuery(params: ListTrashParams = {}) {
  return useQuery({
    queryKey: queryKeys.superAdmin.trash.list({ ...params }),
    queryFn: () => superAdminTrashApi.list(params),
  });
}

export function useRestoreTrashMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id }: { type: TrashEntityType; id: string }) =>
      superAdminTrashApi.restore(type, id),
    onSuccess: () => invalidateTrash(queryClient),
  });
}

export function usePermanentDeleteTrashMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      type,
      id,
      reason,
    }: {
      type: TrashEntityType;
      id: string;
      reason?: string;
    }) => superAdminTrashApi.permanentDelete(type, id, reason),
    onSuccess: () => invalidateTrash(queryClient),
  });
}

export function useOrganisationDeleteImpactQuery(
  organisationId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.superAdmin.trash.deleteImpact(
      organisationId ?? 'none',
    ),
    queryFn: () =>
      superAdminTrashApi.organisationDeleteImpact(organisationId!),
    enabled: !!organisationId && enabled,
  });
}

export function useDeleteOrganisationMutation(organisationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { confirmName: string; reason?: string }) =>
      superAdminTrashApi.deleteOrganisation(organisationId, body),
    onSuccess: () => invalidateTrash(queryClient),
  });
}
