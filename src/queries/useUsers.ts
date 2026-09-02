import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import type { UpdateUserPayload } from '@/api/users';
import { usersApi } from '@/api/users';
import type { User } from '@/types';

/**
 * Lists platform users. Pass `organisationId` from any page meant to show one org's team
 * (e.g. the Organisation tab) — without it, a super_admin caller gets every user on the
 * platform (see UsersController.findAll), which is correct for platform-wide admin tooling
 * but was being used by mistake for org-scoped member lists (item 42).
 */
export function useUsersQuery(organisationId?: string) {
  return useQuery({
    queryKey: organisationId
      ? [...queryKeys.users.all, organisationId]
      : queryKeys.users.all,
    queryFn: () => usersApi.listUsers(organisationId),
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPayload }) =>
      usersApi.updateUser(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.projectAccess(id),
      });
    },
  });
}

export function useUserProjectAccessQuery(
  userId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.users.projectAccess(userId ?? ''),
    queryFn: () => usersApi.getUserProjectAccess(userId!),
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useUpdateMeMutation() {
  return useMutation({
    mutationFn: (data: Partial<User>) => usersApi.updateMe(data),
  });
}

export function useMyOwnershipSummaryQuery() {
  return useQuery({
    queryKey: queryKeys.users.ownershipSummary,
    queryFn: usersApi.getMyOwnershipSummary,
    enabled: false,
  });
}

export function useDeleteMeMutation() {
  return useMutation({
    mutationFn: () => usersApi.deleteMe(),
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}
