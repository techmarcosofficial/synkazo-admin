import { formatDistanceToNow } from 'date-fns';
import {
  MoreVertical,
  Pencil,
  SquarePen,
  Trash2,
  UserCheck,
  Users as UsersIcon,
  UserX,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
import { useViewMode } from '@/hooks/useViewMode';
import { roleLabel } from '@/lib/permissions';
import { showToast } from '@/lib/toast';
import {
  useDeleteUserMutation,
  useUpdateUserMutation,
  useUsersQuery,
} from '@/queries/useUsers';
import type { User, UserRole } from '@/types';

interface UserWithMeta extends User {
  isActive?: boolean;
}

type RoleFilter = 'all' | UserRole;
type StatusFilter = 'all' | 'active' | 'inactive';
type SortKey = 'name' | 'email' | 'role' | 'status';

function compareUsers(a: UserWithMeta, b: UserWithMeta, key: SortKey) {
  switch (key) {
    case 'name':
      return (a.fullName || a.email || '').localeCompare(
        b.fullName || b.email || '',
      );
    case 'email':
      return (a.email || '').localeCompare(b.email || '');
    case 'role':
      return roleLabel(a.role).localeCompare(roleLabel(b.role));
    case 'status':
      return Number(a.isActive !== false) - Number(b.isActive !== false);
  }
}

interface EditUserDialogProps {
  user: UserWithMeta | null;
  onOpenChange: (open: boolean) => void;
  onSave: (userId: string, data: { role: UserRole; isActive: boolean }) => void;
}

function EditUserDialog({ user, onOpenChange, onSave }: EditUserDialogProps) {
  const [role, setRole] = useState<UserRole>('editor');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (user) {
      setRole(user.role || 'editor');
      setIsActive(user.isActive !== false);
    }
  }, [user]);

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>{user?.fullName || user?.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
              disabled={isSuperAdmin}
            >
              <SelectTrigger
                className="w-full"
                title={
                  isSuperAdmin
                    ? "A super admin's role cannot be changed"
                    : undefined
                }
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="org_admin">Org Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="edit-user-active">Active</Label>
            <Switch
              id="edit-user-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isSuperAdmin}
              title={
                isSuperAdmin ? 'A super admin cannot be deactivated' : undefined
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isSuperAdmin}
            onClick={() => {
              if (user) onSave(user.id, { role, isActive });
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UserCardProps {
  user: UserWithMeta;
  onEdit: (user: UserWithMeta) => void;
  onToggleActive: (user: UserWithMeta) => void;
  onDelete: (user: UserWithMeta) => void;
}

function UserCard({ user, onEdit, onToggleActive, onDelete }: UserCardProps) {
  const isSuperAdmin = user.role === 'super_admin';
  const isActive = user.isActive !== false;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between">
          <StatusBadge status={isActive ? 'active' : 'inactive'} size="sm" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-2 size-8">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(user)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isSuperAdmin}
                onClick={() => onToggleActive(user)}
              >
                {isActive ? (
                  <>
                    <UserX /> Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck /> Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isSuperAdmin}
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(user)}
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
              {user.fullName?.charAt(0)?.toUpperCase() ||
                user.email?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {user.fullName || '—'}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {user.email}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-between border-t">
        <span className="text-muted-foreground text-xs">
          {user.createdAt
            ? `Joined ${formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}`
            : '—'}
        </span>
        <Badge variant="secondary">{roleLabel(user.role)}</Badge>
      </CardFooter>
    </Card>
  );
}

export default function UsersPage() {
  const usersQuery = useUsersQuery();
  const updateUserMutation = useUpdateUserMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const { confirm } = useConfirmDialog();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useViewMode('users');
  const [editingUser, setEditingUser] = useState<UserWithMeta | null>(null);

  const users = (usersQuery.data ?? []) as UserWithMeta[];

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const isActive = u.isActive !== false;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? isActive : !isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const { sorted, sortKey, direction, toggleSort } = useSort<
    UserWithMeta,
    SortKey
  >(filteredUsers, compareUsers);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    usePagination(sorted, 10);

  const saveUser = (
    userId: string,
    data: { role: UserRole; isActive: boolean },
  ) => {
    updateUserMutation.mutate(
      { id: userId, data },
      {
        onSuccess: () => showToast.success('User updated.'),
        onError: (err) => {
          const e = err as { response?: { data?: { message?: string } } };
          showToast.error(
            e?.response?.data?.message ?? 'Failed to update user',
          );
        },
      },
    );
  };

  const toggleUserActive = (u: UserWithMeta) => {
    const nextActive = u.isActive === false;
    updateUserMutation.mutate(
      { id: u.id, data: { isActive: nextActive } },
      {
        onSuccess: () =>
          showToast.success(
            nextActive ? 'User reactivated.' : 'User deactivated.',
          ),
        onError: (err) => {
          const e = err as { response?: { data?: { message?: string } } };
          showToast.error(
            e?.response?.data?.message ?? 'Failed to update user',
          );
        },
      },
    );
  };

  const deleteUser = (u: UserWithMeta) => {
    confirm({
      variant: 'danger',
      title: `Delete ${u.fullName || u.email}?`,
      description:
        'This soft-deletes the user, pauses their jobs/associations, and blocks them from logging in.',
      confirmLabel: 'Delete User',
      onConfirm: () =>
        deleteUserMutation.mutate(u.id, {
          onSuccess: () => showToast.success('User deleted.'),
          onError: (err) => {
            const e = err as { response?: { data?: { message?: string } } };
            showToast.error(
              e?.response?.data?.message ?? 'Failed to delete user',
            );
          },
        }),
    });
  };

  const header = (
    <PageHeader
      backTo={{ label: 'Back to Super Admin', to: '/super-admin' }}
      title="Users"
      description="Manage platform-wide user accounts and roles"
    />
  );

  if (usersQuery.isLoading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <Card className="p-0">
          <SkeletonList count={5} />
        </Card>
      </div>
    );
  }

  if (usersQuery.isError && usersQuery.data === undefined) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <ErrorState onRetry={() => usersQuery.refetch()} />
      </div>
    );
  }

  const paginationBar = (
    <PaginationBar
      page={page}
      totalPages={totalPages}
      total={total}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  );

  return (
    <div className="animate-fade-in-up space-y-6">
      {header}
      <Card>
        <CardContent className="space-y-6">
          <div className="flex justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">Manage your users</h3>
              <p className="text-muted-foreground text-sm">
                Manage platform-wide user accounts and roles
              </p>
            </div>
            <ManagementToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search users…"
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              filters={
                <>
                  <Select
                    value={roleFilter}
                    onValueChange={(v: RoleFilter) => setRoleFilter(v)}
                  >
                    <SelectTrigger className="bg-muted sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="org_admin">Org Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusFilter}
                    onValueChange={(v: StatusFilter) => setStatusFilter(v)}
                  >
                    <SelectTrigger className="bg-muted sm:w-36">
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
          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No users match your filters"
              viewMode={viewMode}
            />
          ) : (
            viewMode === 'table' && (
              <>
                <div className="users-here overflow-hidden rounded-4xl border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted hover:bg-muted/50">
                        <SortableTableHead
                          active={sortKey === 'name'}
                          direction={direction}
                          onClick={() => toggleSort('name')}
                        >
                          User
                        </SortableTableHead>
                        <SortableTableHead
                          active={sortKey === 'email'}
                          direction={direction}
                          onClick={() => toggleSort('email')}
                        >
                          Email
                        </SortableTableHead>
                        <SortableTableHead
                          active={sortKey === 'role'}
                          direction={direction}
                          onClick={() => toggleSort('role')}
                        >
                          Role
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
                      {pageItems.map((u) => {
                        const isSuperAdmin = u.role === 'super_admin';
                        const isActive = u.isActive !== false;
                        return (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="size-8">
                                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                                    {u.fullName?.charAt(0)?.toUpperCase() ||
                                      u.email?.charAt(0)?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-sm font-medium">
                                  {u.fullName || '—'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {u.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {roleLabel(u.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                status={isActive ? 'active' : 'inactive'}
                                size="sm"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => setEditingUser(u)}
                                  title="Edit user"
                                >
                                  <SquarePen className="size-4" />
                                </Button>
                                <Switch
                                  size="sm"
                                  checked={isActive}
                                  onCheckedChange={() => toggleUserActive(u)}
                                  disabled={isSuperAdmin}
                                  title={
                                    isSuperAdmin
                                      ? 'A super admin cannot be deactivated'
                                      : isActive
                                        ? 'Deactivate user'
                                        : 'Activate user'
                                  }
                                />
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className="text-destructive"
                                  onClick={() => deleteUser(u)}
                                  disabled={isSuperAdmin}
                                  title={
                                    isSuperAdmin
                                      ? 'Super admins cannot be deleted'
                                      : 'Delete user'
                                  }
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )
          )}
        </CardContent>
      </Card>
      {filteredUsers.length !== 0 && viewMode === 'card' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              onEdit={setEditingUser}
              onToggleActive={toggleUserActive}
              onDelete={deleteUser}
            />
          ))}
        </div>
      )}
      <div>{paginationBar}</div>
      <EditUserDialog
        user={editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSave={saveUser}
      />
    </div>
  );
}
