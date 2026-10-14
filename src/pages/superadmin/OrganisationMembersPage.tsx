import { formatDistanceToNow } from 'date-fns';
import { Eye, Send, Trash2, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import MemberDetailDrawer from '@/components/organisation/MemberDetailDrawer';
import InviteMemberDialog from './members/InviteMemberDialog';
import LifecycleConfirmDialog from './lifecycle/LifecycleConfirmDialog';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createIdempotencyKey } from '@/lib/idempotency';
import { showToast } from '@/lib/toast';
import {
  useChangeSuperAdminMemberRoleMutation,
  useDeactivateSuperAdminMemberMutation,
  useInviteSuperAdminMemberMutation,
  useReactivateSuperAdminMemberMutation,
  useResendSuperAdminInvitationMutation,
  useRevokeSuperAdminInvitationMutation,
  useSuperAdminInvitationsQuery,
  useSuperAdminMembersQuery,
  useSuperAdminOrganisationQuery,
  useTransferOrganisationOwnershipMutation,
} from '@/queries/useSuperAdmin';
import type { SuperAdminMemberListItem } from '@/types';

// SA-500 / SA-501 — members list + invitation list/create/revoke. No
// role edits here (SA-502 needs a scoped backend contract that does not
// exist yet); no owner demotion (SA-503 lives server-side). Invite
// tokens never surface — this page only ever displays statuses.

function roleLabel(role: string): string {
  if (role === 'super_admin') return 'Super admin';
  if (role === 'org_admin') return 'Org admin';
  if (role === 'editor') return 'Editor';
  return role;
}

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

export default function OrganisationMembersPage() {
  const { organisationId } = useParams<{ organisationId: string }>();
  const orgQuery = useSuperAdminOrganisationQuery(organisationId);

  const [memberPage, setMemberPage] = useState(1);
  const [memberPageSize, setMemberPageSize] = useState(10);
  const [inviteOpen, setInviteOpen] = useState(false);

  const membersQuery = useSuperAdminMembersQuery(organisationId ?? '', {
    page: memberPage,
    limit: memberPageSize,
  });
  const invitationsQuery = useSuperAdminInvitationsQuery(organisationId ?? '', {
    page: 1,
    limit: 20,
  });

  const inviteMutation = useInviteSuperAdminMemberMutation(
    organisationId ?? '',
  );
  const revokeMutation = useRevokeSuperAdminInvitationMutation(
    organisationId ?? '',
  );
  const resendMutation = useResendSuperAdminInvitationMutation(
    organisationId ?? '',
  );
  const deactivateMemberMutation = useDeactivateSuperAdminMemberMutation(
    organisationId ?? '',
  );
  const reactivateMemberMutation = useReactivateSuperAdminMemberMutation(
    organisationId ?? '',
  );
  const changeRoleMutation = useChangeSuperAdminMemberRoleMutation(
    organisationId ?? '',
  );
  const transferOwnershipMutation = useTransferOrganisationOwnershipMutation(
    organisationId ?? '',
  );

  const [deactivateMember, setDeactivateMember] =
    useState<SuperAdminMemberListItem | null>(null);
  const [reactivateMember, setReactivateMember] =
    useState<SuperAdminMemberListItem | null>(null);
  const [roleTarget, setRoleTarget] = useState<{
    member: SuperAdminMemberListItem;
    nextRole: 'org_admin' | 'editor';
  } | null>(null);
  const [ownershipTarget, setOwnershipTarget] =
    useState<SuperAdminMemberListItem | null>(null);
  const [detailMember, setDetailMember] =
    useState<SuperAdminMemberListItem | null>(null);

  if (!organisationId) {
    return (
      <EmptyState
        icon={Users}
        title="Missing organisation id"
        description="This route requires an organisation identifier in the URL."
      />
    );
  }

  const members = membersQuery.data?.data ?? [];
  const totalMembers = membersQuery.data?.total ?? 0;
  const invitations = invitationsQuery.data?.data ?? [];
  const pendingInvitations = invitations.filter((i) => i.status === 'pending');

  const org = orgQuery.data;
  const orgIsOperational =
    org?.status === 'active' || org?.status === 'pending';

  const openInvite = () => setInviteOpen(true);

  const [revokeTarget, setRevokeTarget] = useState<{
    invitationId: string;
    email: string;
  } | null>(null);

  const handleRevoke = (invitationId: string, email: string) => {
    setRevokeTarget({ invitationId, email });
  };

  // GAP-006 — resend a pending invite with a fresh token and 7-day expiry.
  // The server does the token rotation + email re-send; the invitee's
  // previous link stops working once the token is rotated.
  const handleResend = async (invitationId: string, email: string) => {
    try {
      await resendMutation.mutateAsync(invitationId);
      showToast.success(`Invite resent to ${email}.`);
    } catch (err) {
      showToast.error(extractErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4" aria-hidden />
            Members
            <Badge variant="secondary">{totalMembers}</Badge>
          </h2>
          <Button
            onClick={openInvite}
            disabled={!orgIsOperational}
            title={
              orgIsOperational
                ? undefined
                : 'Invitations are disabled while the organisation is not operational.'
            }
          >
            <UserPlus className="size-4" aria-hidden />
            Invite member
          </Button>
        </div>

        {membersQuery.isLoading ? (
          <SkeletonList count={4} />
        ) : membersQuery.isError ? (
          <ErrorState
            title="Could not load members"
            description={extractErrorMessage(membersQuery.error)}
            onRetry={() => membersQuery.refetch()}
          />
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Invite one to seed the organisation."
          />
        ) : (
          <div className="bg-card overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-48 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer"
                    onClick={() => setDetailMember(member)}
                  >
                    <TableCell className="font-medium">
                      {member.email}
                      {member.isOwner ? (
                        <Badge
                          variant="secondary"
                          className="ml-1 px-1.5 py-0 text-[10px] font-medium"
                        >
                          Owner
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{member.fullName ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {roleLabel(member.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={member.isActive ? 'active' : 'inactive'}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {member.lastLoginAt
                        ? formatDistanceToNow(new Date(member.lastLoginAt), {
                            addSuffix: true,
                          })
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(member.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell
                      className="space-x-1 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetailMember(member)}
                        title="View member profile"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      {member.role !== 'super_admin' && !member.isOwner ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setRoleTarget({
                              member,
                              nextRole:
                                member.role === 'org_admin'
                                  ? 'editor'
                                  : 'org_admin',
                            })
                          }
                        >
                          {member.role === 'org_admin' ? 'Demote' : 'Promote'}
                        </Button>
                      ) : null}
                      {!member.isOwner &&
                      member.role === 'org_admin' &&
                      member.isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOwnershipTarget(member)}
                        >
                          Make owner
                        </Button>
                      ) : null}
                      {member.role !== 'super_admin' && !member.isOwner ? (
                        member.isActive ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setDeactivateMember(member)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReactivateMember(member)}
                          >
                            Reactivate
                          </Button>
                        )
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <PaginationBar
          page={memberPage}
          totalPages={Math.max(1, Math.ceil(totalMembers / memberPageSize))}
          total={totalMembers}
          pageSize={memberPageSize}
          onPageChange={setMemberPage}
          onPageSizeChange={(size) => {
            setMemberPageSize(size);
            setMemberPage(1);
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          Pending invitations
          <Badge variant="secondary">{pendingInvitations.length}</Badge>
        </div>

        {invitationsQuery.isLoading ? (
          <SkeletonList count={2} />
        ) : invitationsQuery.isError ? (
          <ErrorState
            title="Could not load invitations"
            description={extractErrorMessage(invitationsQuery.error)}
            onRetry={() => invitationsQuery.refetch()}
          />
        ) : pendingInvitations.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No pending invitations"
            description="Send a fresh invite when you want to add a member."
          />
        ) : (
          <div className="bg-card overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">
                      {invitation.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {roleLabel(invitation.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(invitation.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {invitation.expiresAt
                        ? formatDistanceToNow(new Date(invitation.expiresAt), {
                            addSuffix: true,
                          })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleResend(invitation.id, invitation.email)
                          }
                          disabled={resendMutation.isPending}
                          aria-label={`Resend invite to ${invitation.email}`}
                          title="Resend invite (fresh token + 7-day expiry)"
                        >
                          <Send className="size-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRevoke(invitation.id, invitation.email)
                          }
                          aria-label={`Revoke invite for ${invitation.email}`}
                        >
                          <Trash2
                            className="text-destructive size-4"
                            aria-hidden
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        isSubmitting={inviteMutation.isPending}
        errorMessage={
          inviteMutation.isError
            ? extractErrorMessage(inviteMutation.error)
            : null
        }
        onSubmit={(values) => {
          inviteMutation.mutate(values, {
            onSuccess: () => {
              showToast.success(`Invite sent to ${values.email}.`);
              setInviteOpen(false);
            },
          });
        }}
      />

      <LifecycleConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(o) => (o ? undefined : setRevokeTarget(null))}
        title="Revoke invitation"
        description={
          revokeTarget
            ? `The signed link for ${revokeTarget.email} stops working immediately. Type the email + a reason to confirm.`
            : 'Revoke invitation'
        }
        actionLabel="Revoke invite"
        tone="danger"
        organisationName={revokeTarget?.email ?? ''}
        requiresNameConfirm={true}
        minReasonLength={10}
        reasonPlaceholder="Why is this invitation being revoked?"
        isSubmitting={revokeMutation.isPending}
        errorMessage={
          revokeMutation.isError
            ? extractErrorMessage(revokeMutation.error)
            : null
        }
        onSubmit={({ reason }) => {
          if (!revokeTarget) return;
          revokeMutation.mutate(
            {
              invitationId: revokeTarget.invitationId,
              dto: { reason, confirmEmail: revokeTarget.email },
            },
            {
              onSuccess: () => {
                showToast.success('Invite revoked.');
                setRevokeTarget(null);
              },
            },
          );
        }}
      />

      <LifecycleConfirmDialog
        open={deactivateMember !== null}
        onOpenChange={(o) => (o ? undefined : setDeactivateMember(null))}
        title="Deactivate member"
        description={
          deactivateMember
            ? `Blocks ${deactivateMember.email} from signing in. Owner + last-active-admin are protected server-side.`
            : ''
        }
        actionLabel="Deactivate"
        tone="danger"
        organisationName={deactivateMember?.email ?? ''}
        requiresNameConfirm={true}
        minReasonLength={10}
        reasonPlaceholder="Why is this member being deactivated?"
        isSubmitting={deactivateMemberMutation.isPending}
        errorMessage={
          deactivateMemberMutation.isError
            ? extractErrorMessage(deactivateMemberMutation.error)
            : null
        }
        onSubmit={({ reason }) => {
          if (!deactivateMember) return;
          deactivateMemberMutation.mutate(
            {
              userId: deactivateMember.id,
              dto: { reason, confirmEmail: deactivateMember.email },
              idempotencyKey: createIdempotencyKey(),
            },
            {
              onSuccess: () => {
                showToast.success('Member deactivated.');
                setDeactivateMember(null);
              },
            },
          );
        }}
      />

      <LifecycleConfirmDialog
        open={reactivateMember !== null}
        onOpenChange={(o) => (o ? undefined : setReactivateMember(null))}
        title="Reactivate member"
        description={
          reactivateMember
            ? `Restores sign-in for ${reactivateMember.email}.`
            : ''
        }
        actionLabel="Reactivate"
        tone="warning"
        organisationName=""
        requiresNameConfirm={false}
        minReasonLength={10}
        reasonPlaceholder="Why is this member being reactivated?"
        isSubmitting={reactivateMemberMutation.isPending}
        errorMessage={
          reactivateMemberMutation.isError
            ? extractErrorMessage(reactivateMemberMutation.error)
            : null
        }
        onSubmit={({ reason }) => {
          if (!reactivateMember) return;
          reactivateMemberMutation.mutate(
            {
              userId: reactivateMember.id,
              dto: { reason },
              idempotencyKey: createIdempotencyKey(),
            },
            {
              onSuccess: () => {
                showToast.success('Member reactivated.');
                setReactivateMember(null);
              },
            },
          );
        }}
      />

      <LifecycleConfirmDialog
        open={roleTarget !== null}
        onOpenChange={(o) => (o ? undefined : setRoleTarget(null))}
        title={
          roleTarget?.nextRole === 'org_admin'
            ? 'Promote to org admin'
            : 'Demote to editor'
        }
        description={
          roleTarget
            ? `${roleTarget.member.email} will become ${
                roleTarget.nextRole === 'org_admin'
                  ? 'an org admin'
                  : 'an editor'
              }. Owner demotion and last-admin demotion are blocked server-side.`
            : ''
        }
        actionLabel={
          roleTarget?.nextRole === 'org_admin' ? 'Promote' : 'Demote'
        }
        tone="warning"
        organisationName=""
        requiresNameConfirm={false}
        minReasonLength={10}
        reasonPlaceholder="Why is this role change being made?"
        isSubmitting={changeRoleMutation.isPending}
        errorMessage={
          changeRoleMutation.isError
            ? extractErrorMessage(changeRoleMutation.error)
            : null
        }
        onSubmit={({ reason }) => {
          if (!roleTarget) return;
          changeRoleMutation.mutate(
            {
              userId: roleTarget.member.id,
              dto: { role: roleTarget.nextRole, reason },
              idempotencyKey: createIdempotencyKey(),
            },
            {
              onSuccess: () => {
                showToast.success('Member role changed.');
                setRoleTarget(null);
              },
            },
          );
        }}
      />

      <LifecycleConfirmDialog
        open={ownershipTarget !== null}
        onOpenChange={(o) => (o ? undefined : setOwnershipTarget(null))}
        title="Transfer organisation ownership"
        description={
          ownershipTarget && orgQuery.data
            ? `Moves ownership of ${orgQuery.data.name} to ${ownershipTarget.email}. The target is promoted to org_admin if needed.`
            : ''
        }
        actionLabel="Transfer"
        tone="danger"
        organisationName={orgQuery.data?.name ?? ''}
        requiresNameConfirm={true}
        minReasonLength={10}
        reasonPlaceholder="Why is ownership being transferred?"
        isSubmitting={transferOwnershipMutation.isPending}
        errorMessage={
          transferOwnershipMutation.isError
            ? extractErrorMessage(transferOwnershipMutation.error)
            : null
        }
        onSubmit={({ reason }) => {
          if (!ownershipTarget) return;
          transferOwnershipMutation.mutate(
            {
              dto: {
                newOwnerUserId: ownershipTarget.id,
                reason,
                confirmName: orgQuery.data?.name ?? '',
              },
              idempotencyKey: createIdempotencyKey(),
            },
            {
              onSuccess: () => {
                showToast.success('Ownership transferred.');
                setOwnershipTarget(null);
              },
            },
          );
        }}
      />

      <MemberDetailDrawer
        open={detailMember !== null}
        onOpenChange={(o) => (!o ? setDetailMember(null) : undefined)}
        member={
          detailMember
            ? {
                id: detailMember.id,
                email: detailMember.email,
                fullName: detailMember.fullName,
                role: detailMember.role,
                isActive: detailMember.isActive,
                isOwner: detailMember.isOwner,
                organisationId,
                organisationName: org?.name ?? organisationId,
                department: detailMember.department,
                isEmailVerified: detailMember.isEmailVerified,
                lastLoginAt: detailMember.lastLoginAt,
                createdAt: detailMember.createdAt,
                permissions: detailMember.permissions,
              }
            : null
        }
        isSuperAdmin={true}
        onTransferOwnership={(m) => setOwnershipTarget(detailMember)}
      />
    </div>
  );
}
