import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Clock, Mail, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { Invitation } from '@/api/invitations';
import EditPermissionsDialog from '@/components/organisation/EditPermissionsDialog';
import InviteMemberDialog from '@/components/organisation/InviteMemberDialog';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PageHeader from '@/components/shared/PageHeader';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import SortableTableHead from '@/components/shared/SortableTableHead';
import StatusBadge from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
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
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { roleLabel } from '@/lib/permissions';
import { useSBAuth } from '@/lib/syncbridgeAuth';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  useInvitationsQuery,
  useRevokeInvitationMutation,
} from '@/queries/useInvitations';
import { useUpdateUserMutation, useUsersQuery } from '@/queries/useUsers';
import type { User, UserRole } from '@/types';

type InvitationExtended = Invitation & { invitedByEmail?: string };

type StatusFilter = 'all' | Invitation['status'];
type SortKey = 'email' | 'role' | 'invitedBy' | 'sent' | 'status';

function normalizeRole(role: unknown): UserRole {
  return (role as string) === 'admin'
    ? 'super_admin'
    : (role as UserRole) || 'editor';
}

function isInviteExpired(inv: InvitationExtended): boolean {
  return Boolean(
    inv.expiresAt &&
    isPast(new Date(inv.expiresAt)) &&
    inv.status === 'pending',
  );
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
      return ((isInviteExpired(a) ? 'error' : a.status) || '').localeCompare(
        (isInviteExpired(b) ? 'error' : b.status) || '',
      );
  }
}

export default function InvitationsPage() {
  const { currentUser } = useSBAuth();
  const invitationsQuery = useInvitationsQuery();
  const revokeMutation = useRevokeInvitationMutation();
  const usersQuery = useUsersQuery(currentUser?.organisationId);
  const updateUserMutation = useUpdateUserMutation();
  const { confirm } = useConfirmDialog();

  const invitations = (invitationsQuery.data ?? []) as InvitationExtended[];
  const members = usersQuery.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleRevoke = async (invitationId: string) => {
    try {
      await revokeMutation.mutateAsync(invitationId);
      showToast.success('Invitation revoked.');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to revoke invitation');
    }
  };

  // Deactivate rather than hard-delete — mirrors TeamMembersSection in OrganizationPage
  // (same mutation, same confirm copy) so member state stays consistent between the two pages.
  const handleSetActive = (member: User, active: boolean) => {
    confirm({
      variant: active ? 'info' : 'danger',
      title: active
        ? `Reactivate ${member.fullName || member.email}?`
        : `Deactivate ${member.fullName || member.email}?`,
      description: active
        ? 'They will regain access to this organisation.'
        : 'They will lose access to this organisation, and any projects or jobs they created will be paused.',
      confirmLabel: active ? 'Yes, reactivate' : 'Yes, deactivate',
      onConfirm: async () => {
        try {
          await updateUserMutation.mutateAsync({
            id: member.id,
            data: { isActive: active },
          });
          showToast.success(
            active ? 'Member reactivated.' : 'Member deactivated.',
          );
        } catch (err) {
          const e = err as { response?: { data?: { message?: string } } };
          showToast.error(
            e?.response?.data?.message ?? 'Something went wrong.',
          );
        }
      },
    });
  };

  const displayList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invitations.filter((i) => {
      const matchesFilter = filter === 'all' || i.status === filter;
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

  const header = (
    <PageHeader
      backTo={{ label: 'Back to Dashboard', to: '/dashboard' }}
      title="Invitations"
      description="Manage team invitations and pending access requests"
      actions={
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={() => invitationsQuery.refetch()}
            title="Refresh"
          >
            <RefreshCw />
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus /> Send Invitation
          </Button>
        </>
      }
    />
  );

  if (invitationsQuery.isLoading) {
    return (
      <div className="w-full space-y-6">
        {header}
        <Card className="p-0">
          <SkeletonList count={5} />
        </Card>
      </div>
    );
  }

  if (invitationsQuery.isError) {
    return (
      <div className="w-full space-y-6">
        {header}
        <ErrorState onRetry={() => invitationsQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {header}

      <Card>
        <CardContent className="space-y-6">
          <div className="flex justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Manage invitations</h3>
              <p className="text-muted-foreground text-sm">
                Manage team invitations and pending access requests
              </p>
            </div>
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
                  </SelectContent>
                </Select>
              }
            />
          </div>
          {displayList.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No invitations match your filters"
              viewMode="table"
            />
          ) : (
            <div className="overflow-hidden rounded-4xl border">
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
                    return (
                      <TableRow key={inv.id}>
                        <TableCell>
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
                            {inv.status === 'pending' && !isExpired && (
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
                            {inv.status === 'accepted' && member && (
                              <>
                                {normalizeRole(member.role) !==
                                  'super_admin' && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setEditingUser(member)}
                                  >
                                    Edit Permissions
                                  </Button>
                                )}
                                {member.id !== currentUser?.id &&
                                  normalizeRole(member.role) !==
                                    'super_admin' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={
                                        member.isActive === false
                                          ? ''
                                          : 'text-destructive hover:bg-destructive/10'
                                      }
                                      onClick={() =>
                                        handleSetActive(
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
      </Card>

      <InviteMemberDialog open={showForm} onOpenChange={setShowForm} />
      <EditPermissionsDialog
        user={editingUser}
        onClose={() => setEditingUser(null)}
      />
    </div>
  );
}
