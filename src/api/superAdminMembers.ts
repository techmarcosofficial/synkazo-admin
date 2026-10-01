import type { AxiosResponse } from 'axios';

import apiClient from './apiClient';

import type {
  SuperAdminChangeMemberRoleDto,
  SuperAdminDeactivateMemberDto,
  SuperAdminPage,
  SuperAdminInvitationListItem,
  SuperAdminInviteMemberDto,
  SuperAdminMemberListItem,
  SuperAdminReactivateMemberDto,
  SuperAdminRevokeInvitationDto,
  SuperAdminTransferOwnershipDto,
} from '@/types';

const withKey = (idempotencyKey?: string) =>
  idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined;

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
    dto: SuperAdminRevokeInvitationDto,
  ): Promise<void> =>
    apiClient
      .delete<{ data: void }>(
        `/super-admin/organisations/${organisationId}/invitations/${invitationId}`,
        { data: dto },
      )
      .then(d),

  // GAP-006 — resend a pending invitation. Rotates the token + extends
  // expiry + re-sends the email server-side; the returned DTO carries
  // no token, matching the SA-501 rule.
  resendInvitation: (
    organisationId: string,
    invitationId: string,
  ): Promise<SuperAdminInvitationListItem> =>
    apiClient
      .post<{ data: SuperAdminInvitationListItem }>(
        `/super-admin/organisations/${organisationId}/invitations/${invitationId}/resend`,
      )
      .then(d),

  // GAP-003 / CAP-051 — deactivate a member.
  deactivateMember: (
    organisationId: string,
    userId: string,
    dto: SuperAdminDeactivateMemberDto,
    idempotencyKey?: string,
  ): Promise<SuperAdminMemberListItem> =>
    apiClient
      .post<{ data: SuperAdminMemberListItem }>(
        `/super-admin/organisations/${organisationId}/members/${userId}/deactivate`,
        dto,
        withKey(idempotencyKey),
      )
      .then(d),

  // GAP-004 / CAP-052 — reactivate.
  reactivateMember: (
    organisationId: string,
    userId: string,
    dto: SuperAdminReactivateMemberDto,
    idempotencyKey?: string,
  ): Promise<SuperAdminMemberListItem> =>
    apiClient
      .post<{ data: SuperAdminMemberListItem }>(
        `/super-admin/organisations/${organisationId}/members/${userId}/reactivate`,
        dto,
        withKey(idempotencyKey),
      )
      .then(d),

  // GAP-005 / CAP-053 — change role.
  changeMemberRole: (
    organisationId: string,
    userId: string,
    dto: SuperAdminChangeMemberRoleDto,
    idempotencyKey?: string,
  ): Promise<SuperAdminMemberListItem> =>
    apiClient
      .patch<{ data: SuperAdminMemberListItem }>(
        `/super-admin/organisations/${organisationId}/members/${userId}/role`,
        dto,
        withKey(idempotencyKey),
      )
      .then(d),

  // CAP-016 — transfer organisation ownership.
  transferOwnership: (
    organisationId: string,
    dto: SuperAdminTransferOwnershipDto,
    idempotencyKey?: string,
  ): Promise<{ organisationId: string; ownerId: string; ownerEmail: string }> =>
    apiClient
      .post<{
        data: { organisationId: string; ownerId: string; ownerEmail: string };
      }>(
        `/super-admin/organisations/${organisationId}/members/transfer-ownership`,
        dto,
        withKey(idempotencyKey),
      )
      .then(d),
};
