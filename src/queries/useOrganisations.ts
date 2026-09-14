import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { organisationsApi } from '@/api/organisations';
import type { Organisation } from '@/types';

export function useOrgsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.organisations.all,
    queryFn: organisationsApi.listOrgs,
    enabled: options?.enabled,
  });
}

export function useOrgQuery(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.organisations.detail(id),
    queryFn: () => organisationsApi.getOrg(id),
    enabled: Boolean(id) && options?.enabled !== false,
  });
}

export function useMyOrgQuery() {
  return useQuery({
    queryKey: queryKeys.organisations.mine,
    queryFn: organisationsApi.getMyOrg,
  });
}

export function useUpdateOrgMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Organisation> }) =>
      organisationsApi.updateOrg(id, data),
    onSuccess: (_organisation, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organisations.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.organisations.mine });
      queryClient.invalidateQueries({ queryKey: queryKeys.organisations.all });
    },
  });
}

export function useDeleteOrgMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organisationsApi.deleteOrg(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organisations.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.organisations.all });
    },
  });
}

export function useSetupOrgMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Organisation>) =>
      organisationsApi.setupOrg(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organisations.mine });
    },
  });
}
