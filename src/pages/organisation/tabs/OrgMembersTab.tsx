import { Eye, Plus, RefreshCw, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import InviteMemberDialog from '@/components/organisation/InviteMemberDialog';
import MemberDetailDrawer from '@/components/organisation/MemberDetailDrawer';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ManagementCardHeader from '@/components/shared/ManagementCardHeader';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import SortableTableHead from '@/components/shared/SortableTableHead';
import StatusBadge from '@/components/shared/StatusBadge';
import { ActionTooltip } from '@/features/journey';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { useSectionAccess } from '@/lib/sectionAccess';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { cn } from '@/lib/utils';
import { useSetMemberActive } from '@/pages/organisation/hooks/useSetMemberActive';
import {
  compareMembers,
  matchesMemberSearch,
  memberInitials,
  normalizeRole,
  type MemberSortKey,
} from '@/pages/organisation/lib/members';
import { useMyOrgQuery } from '@/queries/useOrganisations';
import { useUsersQuery } from '@/queries/useUsers';
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
  const myOrgQuery = useMyOrgQuery();
  const ownerId = myOrgQuery.data?.ownerId;
  const usersQuery = useUsersQuery(currentUser?.organisationId);
  const members = usersQuery.data ?? [];

  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'org_admin' | 'editor'>('all');
  const { setMemberActive } = useSetMemberActive();

  const filteredMembers = members.filter((m) => {
    const matchesSearch = matchesMemberSearch(m, search);
    const matchesRole =
      roleFilter === 'all' || normalizeRole(m.role) === roleFilter;
    return matchesSearch && matchesRole;
  });

  const { sorted, sortKey, direction, toggleSort } = useSort<
    User,
    MemberSortKey
  >(filteredMembers, compareMembers);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    usePagination(sorted, 10);

  useEffect(() => setPage(1), [search, roleFilter, setPage]);

  return (
    <div className="w-full space-y-6">
      <section className="space-y-3" aria-label="Organization members">
        <ManagementCardHeader
          title="Members"
          subtitle="Manage people who have access to this organization."
          icon={Users}
          count={members.length}
          countLabel={members.length === 1 ? 'member' : 'members'}
          isLoading={usersQuery.isLoading}
        >
          <ManagementToolbar
            directoryLayout
            filterCount={1}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search members…"
            searchLabel="Search members"
            filters={
              <Select
                value={roleFilter}
                onValueChange={(v: 'all' | 'org_admin' | 'editor') =>
                  setRoleFilter(v)
                }
              >
                <SelectTrigger
                  size="sm"
                  className="border-border/80 bg-card hover:border-foreground/25 dark:bg-card w-full min-w-0"
                  aria-label="Filter members by role"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="org_admin">Org Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                </SelectContent>
              </Select>
            }
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => usersQuery.refetch()}
                  aria-label="Refresh members"
                  title="Refresh members"
                >
                  <RefreshCw
                    className={cn(
                      'size-3.5',
                      usersQuery.isFetching && 'animate-spin',
                    )}
                  />
                </Button>
                <ActionTooltip
                  tooltip={
                    !canEdit
                      ? 'Organization Admin role required to invite team members.'
                      : undefined
                  }
                >
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 shrink-0"
                    onClick={() => canEdit && setInviteOpen(true)}
                    disabled={!canEdit}
                  >
                    <Plus className="size-3.5" />
                    Invite Member
                  </Button>
                </ActionTooltip>
              </div>
            }
          />
        </ManagementCardHeader>

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
            action={{
              onClick: () => setInviteOpen(true),
              icon: Plus,
              label: 'Invite Member',
              disabled: !canEdit,
              tooltip: !canEdit
                ? 'Organization Admin role required to invite team members.'
                : undefined,
            }}
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
          <Card size="sm" className="overflow-hidden py-0">
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
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
                    <TableRow
                      key={m.id}
                      className="cursor-pointer"
                      onClick={() => setDetailUser(m)}
                    >
                      <TableCell className="min-w-64">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                              {memberInitials(m)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center font-medium">
                              {m.fullName || '—'}
                              {isCurrent && (
                                <span className="text-muted-foreground ml-1 text-xs">
                                  (You)
                                </span>
                              )}
                              {m.id === ownerId && (
                                <Badge
                                  variant="default"
                                  className="ml-1.5 text-[10px] py-0 px-1.5 bg-primary/90"
                                >
                                  Owner
                                </Badge>
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
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailUser(m)}
                              title="View member profile"
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            {rawRole === 'editor' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setDetailUser(m)}
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
                                disabled={m.id === ownerId}
                                title={
                                  m.id === ownerId
                                    ? 'Cannot deactivate organisation owner'
                                    : undefined
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
          </Card>
        )}

        {filteredMembers.length > 0 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </section>

      {canEdit && (
        <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      )}

      <MemberDetailDrawer
        open={detailUser !== null}
        onOpenChange={(open) => !open && setDetailUser(null)}
        member={
          detailUser
            ? {
                id: detailUser.id,
                email: detailUser.email,
                fullName: detailUser.fullName,
                role: detailUser.role,
                isActive: detailUser.isActive !== false,
                isOwner: detailUser.id === ownerId,
                organisationId: currentUser?.organisationId,
                department: detailUser.department,
                isEmailVerified: detailUser.isEmailVerified,
                lastLoginAt: detailUser.lastLoginAt,
                createdAt: detailUser.createdAt,
                permissions: detailUser.permissions,
              }
            : null
        }
        isSuperAdmin={false}
      />
    </div>
  );
}
