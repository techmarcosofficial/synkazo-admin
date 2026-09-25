import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';

import type {
  SuperAdminPage,
  SuperAdminInvitationListItem,
  SuperAdminInviteMemberDto,
  SuperAdminMemberListItem,
} from '@/types';

interface PaginatedEnvelope<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

const d = <T>({ data }: AxiosResponse<{ data: T }>): T => data.data;

const paginated = <T>({
  data,
}: AxiosResponse<PaginatedEnvelope<T>>): SuperAdminPage<T> => ({
  data: data.data,
  total: data.total,
  page: data.page,
  limit: data.limit,
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
      .get<PaginatedEnvelope<SuperAdminMemberListItem>>(
        `/super-admin/organisations/${organisationId}/members`,
        { params },
      )
      .then(paginated<SuperAdminMemberListItem>),

  listInvitations: (
    organisationId: string,
    params: ListInvitationsParams = {},
  ): Promise<SuperAdminPage<SuperAdminInvitationListItem>> =>
    apiClient
      .get<PaginatedEnvelope<SuperAdminInvitationListItem>>(
        `/super-admin/organisations/${organisationId}/invitations`,
        { params },
      )
      .then(paginated<SuperAdminInvitationListItem>),

  invite: (
    organisationId: string,
    dto: SuperAdminInviteMemberDto,
  ): Promise<SuperAdminInvitationListItem> =>
    apiClient
      .post<{ data: SuperAdminInvitationListItem }>(
        `/super-admin/organisations/${organisationId}/invitations`,
        dto,
      )
      .then(d),

  revokeInvitation: (
    organisationId: string,
    invitationId: string,
  ): Promise<void> =>
    apiClient
      .delete<{ data: void }>(
        `/super-admin/organisations/${organisationId}/invitations/${invitationId}`,
      )
      .then(d),
};
