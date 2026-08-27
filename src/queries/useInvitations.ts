import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { invitationsApi, type ProjectAccessGrant } from '@/api/invitations';

export function useInvitationsQuery() {
  return useQuery({
    queryKey: queryKeys.invitations.all,
    queryFn: invitationsApi.listInvitations,
  });
}

export function useCreateInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email: string;
      role: string;
      message?: string;
      projectAccess?: ProjectAccessGrant[];
    }) => invitationsApi.createInvitation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all });
    },
  });
}

export function useRevokeInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invitationsApi.revokeInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all });
    },
  });
}
