import { Plus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

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
import { useSectionAccess } from '@/lib/sectionAccess';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { useSetMemberActive } from '@/pages/organisation/hooks/useSetMemberActive';
import {
  compareMembers,
  matchesMemberSearch,
  memberInitials,
  normalizeRole,
  type MemberSortKey,
} from '@/pages/organisation/lib/members';
import { useUsersQuery } from '@/queries/useUsers';
import { useHeaderStore } from '@/stores/useHeaderStore';
import type { User } from '@/types';

/**
 * Who has access to this organisation.
 *
 * This is also where invitations are *sent* — the Invitations tab exists to
 * track what happened to them afterwards. An editor gets a read-only directory:
 * name, role and status, with no Actions column and no invite affordance.
 */
export default function OrgMembersTab() {
  const { currentUser } = useSynkazoAuth();
  const { canEdit } = useSectionAccess();
  const usersQuery = useUsersQuery(currentUser?.organisationId);
  const members = usersQuery.data ?? [];

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { setMemberActive } = useSetMemberActive();

  const setActions = useHeaderStore((state) => state.setActions);
  const clearActions = useHeaderStore((state) => state.clearActions);

  useEffect(() => {
    if (canEdit) {
      setActions(
        <Button onClick={() => setInviteOpen(true)}>
          <Plus /> Invite Member
        </Button>,
      );
    } else {
      clearActions();
    }
    return () => clearActions();
  }, [canEdit, setActions, clearActions]);

  const filteredMembers = members.filter((m) => matchesMemberSearch(m, search));

  const { sorted, sortKey, direction, toggleSort } = useSort<
    User,
    MemberSortKey
  >(filteredMembers, compareMembers);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    usePagination(sorted, 10);

  useEffect(() => setPage(1), [search, setPage]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Users className="text-muted-foreground size-4" /> Members
        </CardTitle>
        <CardDescription>
          Manage people who have access to this organization.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ManagementToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search members…"
        />

        {usersQuery.isLoading ? (
          <SkeletonList count={4} />
        ) : usersQuery.isError ? (
          <ErrorState onRetry={() => usersQuery.refetch()} />
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Invited people appear here once they accept."
            viewMode="table"
            action={
              canEdit
                ? {
                    onClick: () => setInviteOpen(true),
                    icon: Plus,
                    label: 'Invite Member',
                  }
                : undefined
            }
          />
        ) : filteredMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members match your search"
            description="Try a different name or email."
            viewMode="table"
            action={{ onClick: () => setSearch(''), label: 'Clear search' }}
          />
        ) : (
          <div className="border-border overflow-x-auto rounded-4xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted/50">
                  <SortableTableHead
                    active={sortKey === 'name'}
                    direction={direction}
                    onClick={() => toggleSort('name')}
                  >
                    Member
                  </SortableTableHead>
                  <SortableTableHead
                    active={sortKey === 'role'}
                    direction={direction}
                    onClick={() => toggleSort('role')}
                  >
                    Role
                  </SortableTableHead>
                  <TableHead>Status</TableHead>
                  <SortableTableHead
                    active={sortKey === 'joined'}
                    direction={direction}
                    onClick={() => toggleSort('joined')}
                  >
                    Joined
                  </SortableTableHead>
                  {canEdit && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((m) => {
                  const rawRole = normalizeRole(m.role);
                  const isCurrent = m.id === currentUser?.id;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="min-w-64">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                              {memberInitials(m)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {m.fullName || '—'}
                              {isCurrent && (
                                <span className="text-muted-foreground ml-1 text-xs">
                                  (You)
                                </span>
                              )}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {m.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{roleLabel(rawRole)}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={m.isActive === false ? 'inactive' : 'active'}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {m.createdAt
                          ? new Date(m.createdAt).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {rawRole === 'editor' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setEditingUser(m)}
                              >
                                Edit Permissions
                              </Button>
                            )}
                            {/* Deactivating yourself would lock you out mid-session,
                                and a super_admin is never deactivated from here. */}
                            {!isCurrent && rawRole !== 'super_admin' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className={
                                  m.isActive === false
                                    ? ''
                                    : 'text-destructive hover:bg-destructive/10'
                                }
                                onClick={() =>
                                  setMemberActive(m, m.isActive === false)
                                }
                              >
                                {m.isActive === false
                                  ? 'Reactivate'
                                  : 'Deactivate'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {filteredMembers.length > 0 && (
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

      {canEdit && (
        <>
          <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
          <EditPermissionsDialog
            user={editingUser}
            onClose={() => setEditingUser(null)}
          />
        </>
      )}
    </Card>
  );
}
