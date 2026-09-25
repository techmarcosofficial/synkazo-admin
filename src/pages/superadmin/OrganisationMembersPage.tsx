import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Send, Trash2, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import InviteMemberDialog from './members/InviteMemberDialog';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
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
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { showToast } from '@/lib/toast';
import {
  useInviteSuperAdminMemberMutation,
  useResendSuperAdminInvitationMutation,
  useRevokeSuperAdminInvitationMutation,
  useSuperAdminInvitationsQuery,
  useSuperAdminMembersQuery,
  useSuperAdminOrganisationQuery,
} from '@/queries/useSuperAdmin';

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
  const { confirm } = useConfirmDialog();

  const membersQuery = useSuperAdminMembersQuery(organisationId ?? '', {
    page: memberPage,
    limit: memberPageSize,
  });
  const invitationsQuery = useSuperAdminInvitationsQuery(
    organisationId ?? '',
    { page: 1, limit: 20 },
  );

  const inviteMutation = useInviteSuperAdminMemberMutation(
    organisationId ?? '',
  );
  const revokeMutation = useRevokeSuperAdminInvitationMutation(
    organisationId ?? '',
  );
  const resendMutation = useResendSuperAdminInvitationMutation(
    organisationId ?? '',
  );

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

  const handleRevoke = (invitationId: string, email: string) => {
    confirm({
      variant: 'danger',
      title: `Revoke invite for ${email}?`,
      description:
        'The signed link stops working immediately. The invitee will not see any error message — the URL just returns "invalid invitation".',
      confirmLabel: 'Revoke invite',
      onConfirm: async () => {
        try {
          await revokeMutation.mutateAsync(invitationId);
          showToast.success('Invite revoked.');
        } catch (err) {
          showToast.error(extractErrorMessage(err));
        }
      },
    });
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
      <div>
        <Link
          to={`/super-admin/organisations/${organisationId}/overview`}
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to organisation
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            title="Members and invitations"
            description={org?.name ?? organisationId}
          />
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
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4" aria-hidden />
          Members
          <Badge variant="outline">{totalMembers}</Badge>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.email}
                    </TableCell>
                    <TableCell>{member.fullName ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabel(member.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      {member.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-900">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-900">
                          Deactivated
                        </Badge>
                      )}
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
          <Badge variant="outline">{pendingInvitations.length}</Badge>
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
                      <Badge variant="outline">
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
    </div>
  );
}
