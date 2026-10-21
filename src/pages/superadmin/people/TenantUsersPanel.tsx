import {
  ArrowRight,
  Eye,
  MoreVertical,
  Pencil,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import PeopleDirectory, {
  comparePeople,
  type PeopleSortKey,
  type PersonView,
} from './PeopleDirectory';
import PeopleToolbar from './PeopleToolbar';
import LifecycleConfirmDialog from '../lifecycle/LifecycleConfirmDialog';

import MemberDetailDrawer from '@/components/organisation/MemberDetailDrawer';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import HeadingPair from '@/components/shared/HeadingPair';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { createIdempotencyKey } from '@/lib/idempotency';
import { roleLabel } from '@/lib/permissions';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import {
  useChangeSuperAdminMemberRoleMutation,
  useDeactivateSuperAdminMemberMutation,
  useReactivateSuperAdminMemberMutation,
} from '@/queries/useSuperAdmin';
import { useUsersQuery } from '@/queries/useUsers';
import type { User } from '@/types';

type TenantRole = 'all' | 'editor' | 'org_admin';
type Status = 'all' | 'active' | 'inactive';
type MemberAction =
  | { kind: 'role'; user: User; nextRole: 'editor' | 'org_admin' }
  | { kind: 'deactivate' | 'reactivate'; user: User };

export function tenantUsersForDirectory(users: User[]): User[] {
  return users.filter((user) => user.role !== 'super_admin');
}

function errorMessage(error: unknown) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? 'The request failed. Try again.'
  );
}

export default function TenantUsersPanel() {
  const { currentUser } = useSynkazoAuth();
  const query = useUsersQuery();
  const [search, setSearch] = useState('');
  const [organisation, setOrganisation] = useState('all');
  const [role, setRole] = useState<TenantRole>('all');
  const [status, setStatus] = useState<Status>('all');
  const [memberAction, setMemberAction] = useState<MemberAction | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);

  const actionOrganisationId = memberAction?.user.organisationId ?? '';
  const roleMutation =
    useChangeSuperAdminMemberRoleMutation(actionOrganisationId);
  const deactivateMutation =
    useDeactivateSuperAdminMemberMutation(actionOrganisationId);
  const reactivateMutation =
    useReactivateSuperAdminMemberMutation(actionOrganisationId);
  const actionMutation =
    memberAction?.kind === 'role'
      ? roleMutation
      : memberAction?.kind === 'deactivate'
        ? deactivateMutation
        : reactivateMutation;
  const openAction = (action: MemberAction) => {
    roleMutation.reset();
    deactivateMutation.reset();
    reactivateMutation.reset();
    setMemberAction(action);
  };

  // GET /users currently returns the complete platform array. Filter that
  // complete set before sorting/pagination so totals stay accurate.
  const tenantUsers = useMemo(
    () => tenantUsersForDirectory(query.data ?? []),
    [query.data],
  );
  const organisations = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of tenantUsers) {
      if (u.organisationId) {
        const name =
          u.organisation?.name || `Organisation ${u.organisationId.slice(0, 8)}`;
        map.set(u.organisationId, name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tenantUsers]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tenantUsers.filter(
      (user) =>
        (!needle ||
          user.fullName?.toLowerCase().includes(needle) ||
          user.email.toLowerCase().includes(needle) ||
          user.organisation?.name?.toLowerCase().includes(needle)) &&
        (organisation === 'all' ||
          (organisation === 'unassigned'
            ? !user.organisationId
            : user.organisationId === organisation)) &&
        (role === 'all' || user.role === role) &&
        (status === 'all' ||
          (status === 'active'
            ? user.isActive !== false
            : user.isActive === false)),
    );
  }, [tenantUsers, search, organisation, role, status]);
  const people: PersonView[] = filtered.map((user) => {
    const orgId = user.organisationId;
    const orgName =
      user.organisation?.name ||
      (orgId ? `Organisation ${orgId.slice(0, 8)}` : 'Unassigned');
    const organisationTo = orgId
      ? `/super-admin/organisations/${orgId}/members`
      : undefined;
    return {
      id: user.id,
      name: user.fullName || '',
      email: user.email,
      role: roleLabel(user.role),
      organisation: orgName,
      organisationTo,
      isActive: user.isActive !== false,
      createdAt: user.createdAt ?? null,
      actions: (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${user.email}`}
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDetailUser(user)}>
              <Eye className="size-4" />
              View profile
            </DropdownMenuItem>
            {organisationTo && (
              <DropdownMenuItem asChild>
                <Link to={organisationTo}>
                  <ArrowRight className="size-4" />
                  Open members
                </Link>
              </DropdownMenuItem>
            )}
            {organisationTo && (
              <DropdownMenuItem
                onClick={() =>
                  openAction({
                    kind: 'role',
                    user,
                    nextRole: user.role === 'org_admin' ? 'editor' : 'org_admin',
                  })
                }
              >
                <Pencil className="size-4" />
                {user.role === 'org_admin'
                  ? 'Demote to Editor'
                  : 'Promote to Org Admin'}
              </DropdownMenuItem>
            )}
            {organisationTo && user.role === 'editor' && (
              <DropdownMenuItem onClick={() => setDetailUser(user)}>
                <Pencil className="size-4" />
                Edit permissions
              </DropdownMenuItem>
            )}
            {organisationTo && (
              <DropdownMenuItem
                onClick={() =>
                  openAction({
                    kind: user.isActive === false ? 'reactivate' : 'deactivate',
                    user,
                  })
                }
                disabled={user.id === currentUser?.id}
              >
                {user.isActive === false ? (
                  <UserCheck className="size-4" />
                ) : (
                  <UserX className="size-4" />
                )}
                {user.isActive === false ? 'Reactivate' : 'Deactivate'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    };
  });
  const { sorted, sortKey, direction, toggleSort } = useSort<
    PersonView,
    PeopleSortKey
  >(people, comparePeople);
  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    usePagination(sorted, 10);

  useEffect(() => {
    setPage(1);
  }, [search, organisation, role, status, setPage]);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <HeadingPair
              title="Users"
              subtitle="Find a tenant user and open their organisation workspace."
            />
            <PeopleToolbar
              searchValue={search}
              onSearchChange={setSearch}
              filters={
                <>
                  <Select value={organisation} onValueChange={setOrganisation}>
                    <SelectTrigger
                      className="bg-muted sm:w-56"
                      aria-label="Filter users by organisation"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All organisations</SelectItem>
                      {tenantUsers.some((user) => !user.organisationId) && (
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                      )}
                      {organisations.map(({ id, name }) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={role}
                    onValueChange={(value: TenantRole) => setRole(value)}
                  >
                    <SelectTrigger
                      className="bg-muted sm:w-36"
                      aria-label="Filter users by role"
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
                    value={status}
                    onValueChange={(value: Status) => setStatus(value)}
                  >
                    <SelectTrigger
                      className="bg-muted sm:w-36"
                      aria-label="Filter users by status"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              }
            />
          </div>
          {query.isLoading ? (
            <SkeletonList count={5} />
          ) : query.isError ? (
            <ErrorState
              title="Could not load users"
              onRetry={() => query.refetch()}
            />
          ) : people.length === 0 ? (
            <EmptyState
              icon={Users}
              title={
                tenantUsers.length === 0
                  ? 'No tenant users'
                  : 'No matching users'
              }
              description={
                tenantUsers.length === 0
                  ? 'Tenant users will appear here when an organisation adds them.'
                  : 'Try different filters.'
              }
            />
          ) : (
            <PeopleDirectory
              people={pageItems}
              sortKey={sortKey}
              direction={direction}
              onSort={toggleSort}
              onSelectPerson={(person) => {
                const u = tenantUsers.find((x) => x.id === person.id);
                if (u) setDetailUser(u);
              }}
            />
          )}
        </CardContent>
      </Card>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
      <LifecycleConfirmDialog
        key={memberAction?.kind ?? 'closed'}
        open={memberAction !== null}
        onOpenChange={(open) => {
          if (!open && !actionMutation.isPending) setMemberAction(null);
        }}
        title={
          memberAction?.kind === 'role'
            ? 'Change member role'
            : memberAction?.kind === 'reactivate'
              ? 'Reactivate member'
              : 'Deactivate member'
        }
        description={
          memberAction
            ? `${memberAction.user.email} · ${memberAction.user.organisationId}. Owner and last-active-admin safeguards are enforced by the organisation member API.`
            : ''
        }
        actionLabel={
          memberAction?.kind === 'role'
            ? 'Change role'
            : memberAction?.kind === 'reactivate'
              ? 'Reactivate'
              : 'Deactivate'
        }
        tone={memberAction?.kind === 'deactivate' ? 'danger' : 'warning'}
        organisationName={memberAction?.user.email ?? ''}
        requiresNameConfirm={memberAction?.kind === 'deactivate'}
        minReasonLength={10}
        reasonPlaceholder="Why is this member action needed?"
        isSubmitting={actionMutation.isPending}
        errorMessage={
          actionMutation.isError ? errorMessage(actionMutation.error) : null
        }
        onSubmit={({ reason }) => {
          if (!memberAction || !memberAction.user.organisationId) return;
          const payload = {
            userId: memberAction.user.id,
            idempotencyKey: createIdempotencyKey(),
          };
          const onSuccess = () => {
            showToast.success('Member updated.');
            setMemberAction(null);
          };
          if (memberAction.kind === 'role') {
            roleMutation.mutate(
              {
                ...payload,
                dto: { role: memberAction.nextRole, reason },
              },
              { onSuccess },
            );
          } else if (memberAction.kind === 'deactivate') {
            deactivateMutation.mutate(
              {
                ...payload,
                dto: { reason, confirmEmail: memberAction.user.email },
              },
              { onSuccess },
            );
          } else {
            reactivateMutation.mutate(
              { ...payload, dto: { reason } },
              { onSuccess },
            );
          }
        }}
      />
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
                organisationId: detailUser.organisationId ?? undefined,
                organisationName:
                  detailUser.organisation?.name ||
                  (detailUser.organisationId
                    ? `Organisation ${detailUser.organisationId.slice(0, 8)}…`
                    : 'Unassigned'),
                department: detailUser.department,
                isEmailVerified: detailUser.isEmailVerified,
                lastLoginAt: detailUser.lastLoginAt,
                createdAt: detailUser.createdAt,
                permissions: detailUser.permissions,
              }
            : null
        }
        isSuperAdmin={true}
      />
    </div>
  );
}
