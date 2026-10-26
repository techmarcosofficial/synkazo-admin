import { formatDistanceToNow } from 'date-fns';
import {
  Eye,
  Mail,
  MoreVertical,
  Pencil,
  RefreshCw,
  Send,
  Shield,
  Trash2,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import LifecycleConfirmDialog from './lifecycle/LifecycleConfirmDialog';

import MemberDetailDrawer from '@/components/organisation/MemberDetailDrawer';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ManagementCardHeader from '@/components/shared/ManagementCardHeader';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import StatusBadge from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createIdempotencyKey } from '@/lib/idempotency';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  useChangeSuperAdminMemberRoleMutation,
  useDeactivateSuperAdminMemberMutation,
  useReactivateSuperAdminMemberMutation,
  useResendSuperAdminInvitationMutation,
  useRevokeSuperAdminInvitationMutation,
  useSuperAdminInvitationsQuery,
  useSuperAdminMembersQuery,
  useSuperAdminOrganisationQuery,
  useTransferOrganisationOwnershipMutation,
} from '@/queries/useSuperAdmin';
import type { SuperAdminMemberListItem } from '@/types';

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
  const { currentUser } = useSynkazoAuth();
  const orgQuery = useSuperAdminOrganisationQuery(organisationId);

  const [memberPage, setMemberPage] = useState(1);
  const [memberPageSize, setMemberPageSize] = useState(10);
  const [invitePage, setInvitePage] = useState(1);
  const [invitePageSize, setInvitePageSize] = useState(10);

  // Filters for Members & Invitations
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'org_admin' | 'editor'>(
    'all',
  );
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive' | 'invitations'
  >('all');

  const isViewingInvitations = statusFilter === 'invitations';

  const membersQuery = useSuperAdminMembersQuery(organisationId ?? '', {
    page: memberPage,
    limit: memberPageSize,
    search: !isViewingInvitations ? search.trim() || undefined : undefined,
    role: !isViewingInvitations && roleFilter !== 'all' ? roleFilter : undefined,
    isActive:
      statusFilter === 'active'
        ? true
        : statusFilter === 'inactive'
          ? false
          : undefined,
  });

  const invitationsQuery = useSuperAdminInvitationsQuery(organisationId ?? '', {
    page: 1,
    limit: 100,
  });

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

  // Reset page when search or filters change
  useEffect(() => {
    setMemberPage(1);
    setInvitePage(1);
  }, [search, roleFilter, statusFilter]);

  const members = membersQuery.data?.data ?? [];
  const totalMembers = membersQuery.data?.total ?? 0;
  const invitations = invitationsQuery.data?.data ?? [];
  const pendingInvitations = useMemo(
    () => invitations.filter((i) => i.status === 'pending'),
    [invitations],
  );

  const filteredInvitations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pendingInvitations.filter((inv) => {
      const matchesSearch = !q || inv.email?.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || inv.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [pendingInvitations, search, roleFilter]);

  const inviteTotalPages = Math.max(
    1,
    Math.ceil(filteredInvitations.length / invitePageSize),
  );
  const invitePageItems = useMemo(
    () =>
      filteredInvitations.slice(
        (invitePage - 1) * invitePageSize,
        invitePage * invitePageSize,
      ),
    [filteredInvitations, invitePage, invitePageSize],
  );

  const org = orgQuery.data;

  const [revokeTarget, setRevokeTarget] = useState<{
    invitationId: string;
    email: string;
  } | null>(null);

  const handleRevoke = (invitationId: string, email: string) => {
    setRevokeTarget({ invitationId, email });
  };

  const handleResend = async (invitationId: string, email: string) => {
    try {
      await resendMutation.mutateAsync(invitationId);
      showToast.success(`Invite resent to ${email}.`);
    } catch (err) {
      showToast.error(extractErrorMessage(err));
    }
  };

  if (!organisationId) {
    return (
      <EmptyState
        icon={Users}
        title="Missing organisation id"
        description="This route requires an organisation identifier in the URL."
      />
    );
  }

  const totalCount = isViewingInvitations
    ? filteredInvitations.length
    : totalMembers;
  const countLabel = isViewingInvitations
    ? totalCount === 1
      ? 'invitation'
      : 'invitations'
    : totalCount === 1
      ? 'member'
      : 'members';
  const isLoading = isViewingInvitations
    ? invitationsQuery.isLoading
    : membersQuery.isLoading;

  return (
    <div className="flex flex-col gap-6">
      {/* SECTION 1: Members Section */}
      <section className="space-y-3" aria-label="Organisation members">
        <ManagementCardHeader
          title="Members"
          subtitle={
            isViewingInvitations
              ? 'Review pending invitations sent to this organisation.'
              : 'Manage members, roles, and project access for this organisation.'
          }
          icon={isViewingInvitations ? Mail : Users}
          count={totalCount}
          countLabel={countLabel}
          isLoading={isLoading}
        >
          <ManagementToolbar
            directoryLayout
            filterCount={2}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={
              isViewingInvitations ? 'Search invitations…' : 'Search members…'
            }
            searchLabel={
              isViewingInvitations ? 'Search invitations' : 'Search members'
            }
            filters={
              <>
                <Select
                  value={roleFilter}
                  onValueChange={(v: 'all' | 'org_admin' | 'editor') =>
                    setRoleFilter(v)
                  }
                >
                  <SelectTrigger
                    size="sm"
                    className="border-border/80 bg-card hover:border-foreground/25 dark:bg-card w-full min-w-0"
                    aria-label="Filter by role"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="org_admin">Org Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(v: 'all' | 'active' | 'inactive' | 'invitations') =>
                    setStatusFilter(v)
                  }
                >
                  <SelectTrigger
                    size="sm"
                    className="border-border/80 bg-card hover:border-foreground/25 dark:bg-card w-full min-w-0"
                    aria-label="Filter by status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All members</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="invitations">
                      Invitations {pendingInvitations.length > 0 ? `(${pendingInvitations.length})` : ''}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
            action={
              <Button
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => {
                  membersQuery.refetch();
                  invitationsQuery.refetch();
                }}
                aria-label="Refresh directory"
                title="Refresh directory"
              >
                <RefreshCw
                  className={cn(
                    'size-3.5',
                    (membersQuery.isFetching || invitationsQuery.isFetching) &&
                      'animate-spin',
                  )}
                />
              </Button>
            }
          />
        </ManagementCardHeader>

        {isViewingInvitations ? (
          invitationsQuery.isLoading ? (
            <SkeletonList count={4} />
          ) : invitationsQuery.isError ? (
            <ErrorState
              title="Could not load invitations"
              description={extractErrorMessage(invitationsQuery.error)}
              onRetry={() => invitationsQuery.refetch()}
            />
          ) : filteredInvitations.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No pending invitations"
              description={
                search || roleFilter !== 'all'
                  ? 'No pending invitations match your filters.'
                  : 'There are no pending invitations for this organisation.'
              }
            />
          ) : (
            <Card size="sm" className="overflow-hidden py-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitePageItems.map((invitation) => (
                      <TableRow key={invitation.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium text-xs">
                          {invitation.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {roleLabel(invitation.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status="pending" size="sm" />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(invitation.createdAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
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
                              className="size-8 p-0"
                              onClick={() =>
                                handleResend(invitation.id, invitation.email)
                              }
                              disabled={resendMutation.isPending}
                              aria-label={`Resend invite to ${invitation.email}`}
                              title="Resend invite (fresh token + 7-day expiry)"
                            >
                              <Send className="size-3.5" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0"
                              onClick={() =>
                                handleRevoke(invitation.id, invitation.email)
                              }
                              aria-label={`Revoke invite for ${invitation.email}`}
                              title="Revoke invitation"
                            >
                              <Trash2
                                className="text-destructive size-3.5"
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
            </Card>
          )
        ) : membersQuery.isLoading ? (
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
            title="No members found"
            description={
              search || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'Try clearing your search or status filters.'
                : 'No members in this organisation.'
            }
          />
        ) : (
          <Card size="sm" className="overflow-hidden py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[300px]">Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-14 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const initials = (member.fullName || member.email)
                      .trim()
                      .slice(0, 2)
                      .toUpperCase();
                    const isCurrent = member.id === currentUser?.id;

                    return (
                      <TableRow
                        key={member.id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => setDetailMember(member)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 shrink-0">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-foreground text-xs truncate">
                                  {member.fullName || '—'}
                                </span>
                                {isCurrent && (
                                  <span className="text-muted-foreground text-[10px]">
                                    (You)
                                  </span>
                                )}
                                {member.isOwner && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] py-0 px-1.5 font-medium"
                                  >
                                    Owner
                                  </Badge>
                                )}
                              </div>
                              <span className="text-muted-foreground text-[11px] truncate block">
                                {member.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {roleLabel(member.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={member.isActive ? 'active' : 'inactive'}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {member.lastLoginAt
                            ? formatDistanceToNow(new Date(member.lastLoginAt), {
                                addSuffix: true,
                              })
                            : 'Never'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {member.createdAt
                            ? formatDistanceToNow(new Date(member.createdAt), {
                                addSuffix: true,
                              })
                            : '—'}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${member.email}`}
                              >
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => setDetailMember(member)}
                              >
                                <Eye className="size-4" />
                                View details
                              </DropdownMenuItem>
                              {member.role !== 'super_admin' && !member.isOwner && (
                                <DropdownMenuItem
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
                                  <Pencil className="size-4" />
                                  {member.role === 'org_admin'
                                    ? 'Demote to Editor'
                                    : 'Promote to Org Admin'}
                                </DropdownMenuItem>
                              )}
                              {!member.isOwner &&
                                member.role === 'org_admin' &&
                                member.isActive && (
                                  <DropdownMenuItem
                                    onClick={() => setOwnershipTarget(member)}
                                  >
                                    <Shield className="size-4" />
                                    Make owner
                                  </DropdownMenuItem>
                                )}
                              {member.role !== 'super_admin' && !member.isOwner && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    member.isActive
                                      ? setDeactivateMember(member)
                                      : setReactivateMember(member)
                                  }
                                  className={
                                    member.isActive
                                      ? 'text-destructive'
                                      : undefined
                                  }
                                >
                                  {member.isActive ? (
                                    <>
                                      <UserX className="size-4" />
                                      Deactivate member
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="size-4" />
                                      Reactivate member
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {isViewingInvitations
          ? filteredInvitations.length > 0 && (
              <PaginationBar
                page={invitePage}
                totalPages={inviteTotalPages}
                total={filteredInvitations.length}
                pageSize={invitePageSize}
                onPageChange={setInvitePage}
                onPageSizeChange={(size) => {
                  setInvitePageSize(size);
                  setInvitePage(1);
                }}
              />
            )
          : totalMembers > 0 && (
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
            )}
      </section>

      {/* DIALOGS & DRAWERS */}
      <LifecycleConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(o) => (o ? undefined : setRevokeTarget(null))}
        title="Revoke invitation"
        description={
          revokeTarget
            ? `Revoke the invitation for ${revokeTarget.email}.`
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
            ? `Deactivate member ${deactivateMember.email}.`
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
            ? `Restore sign-in for ${reactivateMember.email}.`
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
            ? `Change role for ${roleTarget.member.email} to ${
                roleTarget.nextRole === 'org_admin'
                  ? 'org admin'
                  : 'editor'
              }.`
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
            ? `Transfer ownership of ${orgQuery.data.name} to ${ownershipTarget.email}.`
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
