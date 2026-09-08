import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Clock, Mail, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { Invitation } from '@/api/invitations';
import EditPermissionsDialog from '@/components/organisation/EditPermissionsDialog';
import InviteMemberDialog from '@/components/organisation/InviteMemberDialog';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import SortableTableHead from '@/components/shared/SortableTableHead';
import StatusBadge from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { roleLabel } from '@/lib/permissions';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useSetMemberActive } from '@/pages/organisation/hooks/useSetMemberActive';
import { normalizeRole } from '@/pages/organisation/lib/members';
import {
  useDeleteInvitationMutation,
  useInvitationsQuery,
  useResendInvitationMutation,
  useRevokeInvitationMutation,
} from '@/queries/useInvitations';
import { useUsersQuery } from '@/queries/useUsers';
import { useHeaderStore } from '@/stores/useHeaderStore';
import type { User, UserRole } from '@/types';

type InvitationExtended = Invitation & { invitedByEmail?: string };

type StatusFilter = 'all' | Invitation['status'];
type SortKey = 'email' | 'role' | 'invitedBy' | 'sent' | 'status';

function isInviteExpired(inv: InvitationExtended): boolean {
  return Boolean(
    inv.expiresAt &&
    isPast(new Date(inv.expiresAt)) &&
    inv.status === 'pending',
  );
}

/**
 * The backend never transitions a lapsed invitation to `expired` — expiry is
 * derived from expiresAt at read time. Filtering on the raw status therefore
 * made the "Expired" option match nothing, so both the filter and the sort read
 * this instead.
 */
function effectiveStatus(inv: InvitationExtended): Invitation['status'] {
  return isInviteExpired(inv) ? 'expired' : inv.status;
}

function compareInvitations(
  a: InvitationExtended,
  b: InvitationExtended,
  key: SortKey,
) {
  switch (key) {
    case 'email':
      return (a.email || '').localeCompare(b.email || '');
    case 'role':
      return roleLabel(a.role as UserRole).localeCompare(
        roleLabel(b.role as UserRole),
      );
    case 'invitedBy':
      return (a.invitedByEmail || '').localeCompare(b.invitedByEmail || '');
    case 'sent':
      return (
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
      );
    case 'status':
      return effectiveStatus(a).localeCompare(effectiveStatus(b));
  }
}

/**
 * Access that has been *offered*. Members is access that actually exists — once
 * someone accepts, they belong there and their invitation becomes history.
 */
export default function OrgInvitationsTab() {
  const { currentUser } = useSynkazoAuth();
  const invitationsQuery = useInvitationsQuery();
  const revokeMutation = useRevokeInvitationMutation();
  const resendMutation = useResendInvitationMutation();
  const deleteMutation = useDeleteInvitationMutation();
  // Same query key as the Members tab, so TanStack dedupes rather than
  // refetching. Used only to resolve an accepted invite back to its user.
  const usersQuery = useUsersQuery(currentUser?.organisationId);
  const { setMemberActive } = useSetMemberActive();

  const invitations = (invitationsQuery.data ?? []) as InvitationExtended[];
  const members = usersQuery.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const setActions = useHeaderStore((state) => state.setActions);
  const clearActions = useHeaderStore((state) => state.clearActions);

  useEffect(() => {
    setActions(
      <>
        <Button
          variant="outline"
          size="icon"
          onClick={() => invitationsQuery.refetch()}
          aria-label="Refresh invitations"
        >
          <RefreshCw />
        </Button>
        <Button onClick={() => setShowForm(true)}>
          <Plus /> Send Invitation
        </Button>
      </>,
    );
    return () => clearActions();
  }, [setActions, clearActions]);

  const run = async (
    action: () => Promise<unknown>,
    success: string,
    failure: string,
  ) => {
    try {
      await action();
      showToast.success(success);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast.error(e.response?.data?.message ?? failure);
    }
  };

  const handleRevoke = (id: string) =>
    run(
      () => revokeMutation.mutateAsync(id),
      'Invitation revoked.',
      'Failed to revoke invitation',
    );

  const handleResend = (id: string) =>
    run(
      () => resendMutation.mutateAsync(id),
      'Invitation resent — the previous link no longer works.',
      'Failed to resend invitation',
    );

  const handleDelete = (id: string) =>
    run(
      () => deleteMutation.mutateAsync(id),
      'Invitation deleted.',
      'Failed to delete invitation',
    );

  const displayList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invitations.filter((i) => {
      const matchesFilter = filter === 'all' || effectiveStatus(i) === filter;
      const matchesSearch =
        !q ||
        i.email?.toLowerCase().includes(q) ||
        i.invitedByEmail?.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [invitations, filter, search]);

  const { sorted, sortKey, direction, toggleSort } = useSort<
    InvitationExtended,
    SortKey
  >(displayList, compareInvitations);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    usePagination(sorted, 10);

  useEffect(() => setPage(1), [search, filter, setPage]);

  const clearFilters = () => {
    setSearch('');
    setFilter('all');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Mail className="text-muted-foreground size-4" /> Invitations
        </CardTitle>
        <CardDescription>
          Manage pending and previous invitations to your organization.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ManagementToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search invitations…"
          filters={
            <Select
              value={filter}
              onValueChange={(v: StatusFilter) => setFilter(v)}
            >
              <SelectTrigger className="bg-muted sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {invitationsQuery.isLoading ? (
          <SkeletonList count={5} />
        ) : invitationsQuery.isError ? (
          <ErrorState onRetry={() => invitationsQuery.refetch()} />
        ) : invitations.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No invitations yet"
            description="Invite someone from the Members tab and their invitation will appear here."
            viewMode="table"
            action={{
              onClick: () => setShowForm(true),
              icon: Plus,
              label: 'Send Invitation',
            }}
          />
        ) : displayList.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No invitations match your filters"
            description="Try a different search term or status."
            viewMode="table"
            action={{ onClick: clearFilters, label: 'Clear filters' }}
          />
        ) : (
          <div className="border-border overflow-x-auto rounded-4xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted/50">
                  <SortableTableHead
                    active={sortKey === 'email'}
                    direction={direction}
                    onClick={() => toggleSort('email')}
                  >
                    Invitee
                  </SortableTableHead>
                  <SortableTableHead
                    active={sortKey === 'role'}
                    direction={direction}
                    onClick={() => toggleSort('role')}
                  >
                    Role
                  </SortableTableHead>
                  <SortableTableHead
                    active={sortKey === 'invitedBy'}
                    direction={direction}
                    onClick={() => toggleSort('invitedBy')}
                  >
                    Invited By
                  </SortableTableHead>
                  <SortableTableHead
                    active={sortKey === 'sent'}
                    direction={direction}
                    onClick={() => toggleSort('sent')}
                  >
                    Sent
                  </SortableTableHead>
                  <SortableTableHead
                    active={sortKey === 'status'}
                    direction={direction}
                    onClick={() => toggleSort('status')}
                  >
                    Status
                  </SortableTableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((inv) => {
                  const isExpired = isInviteExpired(inv);
                  const member = members.find((m) => m.email === inv.email);
                  const memberRole = member
                    ? normalizeRole(member.role)
                    : undefined;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="min-w-64">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="text-xs font-bold">
                              {inv.email?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm font-medium">{inv.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {roleLabel(inv.role as UserRole)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {inv.invitedByEmail || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {inv.createdAt
                          ? format(new Date(inv.createdAt), 'MMM d, yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <StatusBadge
                            status={isExpired ? 'error' : inv.status}
                            size="sm"
                          />
                          {inv.status === 'pending' && inv.expiresAt && (
                            <div
                              className={cn(
                                'flex items-center gap-1 text-xs',
                                isExpired
                                  ? 'text-destructive'
                                  : 'text-muted-foreground',
                              )}
                            >
                              <Clock className="size-2.5" />
                              {isExpired
                                ? 'Expired'
                                : `Expires ${formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })}`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {/* Pending: resend or revoke. Expired: resend (a
                              fresh token) or delete the dead row. Revoked:
                              delete only. Accepted has no invite-level action —
                              that person is a member now. */}
                          {inv.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResend(inv.id)}
                                loading={
                                  resendMutation.isPending &&
                                  resendMutation.variables === inv.id
                                }
                              >
                                Resend
                              </Button>
                              {isExpired ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDelete(inv.id)}
                                  loading={
                                    deleteMutation.isPending &&
                                    deleteMutation.variables === inv.id
                                  }
                                >
                                  Delete
                                </Button>
                              ) : (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRevoke(inv.id)}
                                  loading={
                                    revokeMutation.isPending &&
                                    revokeMutation.variables === inv.id
                                  }
                                >
                                  Revoke
                                </Button>
                              )}
                            </>
                          )}
                          {inv.status === 'revoked' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(inv.id)}
                              loading={
                                deleteMutation.isPending &&
                                deleteMutation.variables === inv.id
                              }
                            >
                              Delete
                            </Button>
                          )}
                          {/* An accepted invite is history — the person now lives
                              in Members, so these act on the user, not the invite. */}
                          {inv.status === 'accepted' &&
                            member &&
                            memberRole !== 'super_admin' && (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setEditingUser(member)}
                                >
                                  Edit Permissions
                                </Button>
                                {member.id !== currentUser?.id && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={
                                      member.isActive === false
                                        ? ''
                                        : 'text-destructive hover:bg-destructive/10'
                                    }
                                    onClick={() =>
                                      setMemberActive(
                                        member,
                                        member.isActive === false,
                                      )
                                    }
                                  >
                                    {member.isActive === false
                                      ? 'Reactivate'
                                      : 'Deactivate'}
                                  </Button>
                                )}
                              </>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {displayList.length > 0 && (
        <CardFooter>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardFooter>
      )}

      <InviteMemberDialog open={showForm} onOpenChange={setShowForm} />
      <EditPermissionsDialog
        user={editingUser}
        onClose={() => setEditingUser(null)}
      />
    </Card>
  );
}
