import apiClient from './apiClient';

import type {
  SuperAdminPage,
  SuperAdminInvitationListItem,
  SuperAdminInviteMemberDto,
  SuperAdminMemberListItem,
} from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const paginated = <T>(r: any): SuperAdminPage<T> => ({
  data: r.data.data,
  total: r.data.total,
  page: r.data.page,
  limit: r.data.limit,
});

export interface ListMembersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'editor' | 'org_admin' | 'super_admin';
  isActive?: boolean;
}

export interface ListInvitationsParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'accepted' | 'revoked' | 'expired';
}

export const superAdminMembersApi = {
  listMembers: (
    organisationId: string,
    params: ListMembersParams = {},
  ): Promise<SuperAdminPage<SuperAdminMemberListItem>> =>
    apiClient
      .get(`/super-admin/organisations/${organisationId}/members`, { params })
      .then(paginated<SuperAdminMemberListItem>),

  listInvitations: (
    organisationId: string,
    params: ListInvitationsParams = {},
  ): Promise<SuperAdminPage<SuperAdminInvitationListItem>> =>
    apiClient
      .get(`/super-admin/organisations/${organisationId}/invitations`, {
        params,
      })
      .then(paginated<SuperAdminInvitationListItem>),

  invite: (
    organisationId: string,
    dto: SuperAdminInviteMemberDto,
  ): Promise<SuperAdminInvitationListItem> =>
    apiClient
      .post(`/super-admin/organisations/${organisationId}/invitations`, dto)
      .then(d),

  revokeInvitation: (
    organisationId: string,
    invitationId: string,
  ): Promise<void> =>
    apiClient
      .delete(
        `/super-admin/organisations/${organisationId}/invitations/${invitationId}`,
      )
      .then(d),
};
