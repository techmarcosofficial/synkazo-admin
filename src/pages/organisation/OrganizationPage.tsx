import { Building2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import EditPermissionsDialog from '@/components/organisation/EditPermissionsDialog';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { roleLabel } from '@/lib/permissions';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import { usePlanQuery } from '@/queries/useBilling';
import {
  useMyOrgQuery,
  useUpdateOrgMutation,
} from '@/queries/useOrganisations';
import { useUpdateUserMutation, useUsersQuery } from '@/queries/useUsers';
import type { Organisation, User, UserRole } from '@/types';

const CURRENCIES = ['USD', 'CAD', 'GBP', 'EUR', 'AUD', 'NZD'];

type OrgExtended = Organisation & {
  logoUrl?: string;
  slug?: string;
  settings?: Record<string, string>;
};

function OrgInfoSection() {
  const orgQuery = useMyOrgQuery();
  const updateOrgMutation = useUpdateOrgMutation();
  const org = orgQuery.data as OrgExtended | undefined;
  // org.plan is the legacy enum column — frozen/inert after the FK-based plan cutover (see the
  // dynamic-plan-entitlements plan). The live plan name lives on the billing endpoint instead.
  const { data: planStatus } = usePlanQuery();

  const [form, setForm] = useState({
    name: '',
    description: '',
    logoUrl: '',
    defaultCurrency: 'USD',
  });

  useEffect(() => {
    if (!org) return;
    setForm({
      name: org.name || '',
      description: org.description || '',
      logoUrl: org.logoUrl || '',
      defaultCurrency: org.settings?.defaultCurrency || 'USD',
    });
  }, [
    org?.name,
    org?.description,
    org?.logoUrl,
    org?.settings?.defaultCurrency,
  ]);

  const handleSave = async () => {
    if (!org) return;
    try {
      await updateOrgMutation.mutateAsync({
        id: org.id,
        data: {
          name: form.name,
          description: form.description,
          logoUrl: form.logoUrl,
          settings: {
            ...(org.settings || {}),
            defaultCurrency: form.defaultCurrency,
          },
        } as Partial<OrgExtended>,
      });
      showToast.success('Organisation updated.');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to save changes');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Building2 className="text-muted-foreground size-4 text-xs" />{' '}
          Organisation Information
        </CardTitle>
        <CardDescription>
          Shared settings visible to all team members.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orgQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-40" />
          </div>
        ) : orgQuery.isError ? (
          <ErrorState onRetry={() => orgQuery.refetch()} />
        ) : (
          <FieldGroup className="gap-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="org-name">Organisation Name</FieldLabel>
                <Input
                  id="org-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="org-logo">
                  Logo URL{' '}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </FieldLabel>
                <Input
                  id="org-logo"
                  value={form.logoUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, logoUrl: e.target.value }))
                  }
                  placeholder="https://…"
                />
              </Field>
              <Field>
                <FieldLabel>Default Currency</FieldLabel>
                <Select
                  value={form.defaultCurrency}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, defaultCurrency: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Applied to financial sync objects when no per-job override is
                  set.
                </p>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="org-desc">
                Description{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </FieldLabel>
              <Textarea
                id="org-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                placeholder="What does your organisation use Synkazo for?"
              />
            </Field>
            {org && (
              <div className="text-muted-foreground flex items-center justify-between pt-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-semibold">Plan:</span>
                  <span>{planStatus?.planName ?? 'Free'}</span>
                  {org.name && (
                    <>
                      <span>·</span>
                      <span className="font-mono">{org.name}</span>
                    </>
                  )}
                </div>
                <Button
                  className="w-fit"
                  onClick={handleSave}
                  loading={updateOrgMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            )}
          </FieldGroup>
        )}
      </CardContent>
    </Card>
  );
}

type SortKey = 'name' | 'role' | 'joined';

function normalizeRole(role: unknown): UserRole {
  return (role as string) === 'admin'
    ? 'super_admin'
    : (role as UserRole) || 'editor';
}

function compareMembers(a: User, b: User, key: SortKey) {
  switch (key) {
    case 'name':
      return (a.fullName || a.email || '').localeCompare(
        b.fullName || b.email || '',
      );
    case 'role':
      return roleLabel(normalizeRole(a.role)).localeCompare(
        roleLabel(normalizeRole(b.role)),
      );
    case 'joined':
      return (
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
      );
  }
}

function TeamMembersSection() {
  const { currentUser } = useSynkazoAuth();
  const usersQuery = useUsersQuery(currentUser?.organisationId);
  const members = usersQuery.data ?? [];
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const { confirm } = useConfirmDialog();
  const updateUserMutation = useUpdateUserMutation();

  // Deactivate rather than hard-delete — preserves the member's audit history and lets an
  // admin reverse the decision, and the backend already pauses everything they created
  // (UsersService.update → pauseAllForUser) so nothing keeps running unattended.
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

  const filteredMembers = members.filter((m) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      m.fullName?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    );
  });

  const { sorted, sortKey, direction, toggleSort } = useSort<User, SortKey>(
    filteredMembers,
    compareMembers,
  );

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    usePagination(sorted, 10);

  if (usersQuery.isLoading) {
    return (
      <Card className="p-0">
        <SkeletonList count={4} />
      </Card>
    );
  }

  if (usersQuery.isError) {
    return <ErrorState onRetry={() => usersQuery.refetch()} />;
  }

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="flex justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Manage team members</h3>
            <p className="text-muted-foreground text-sm">
              Everyone with access to this organisation.
            </p>
          </div>
          <ManagementToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search team members…"
          />
        </div>
        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No team members found"
            description="Invited members will appear here once they accept."
            viewMode="table"
          />
        ) : filteredMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No team members match your search"
            viewMode="table"
          />
        ) : (
          <div className="overflow-hidden rounded-4xl border">
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((m) => {
                  const rawRole = normalizeRole(m.role);
                  const initials = m.fullName
                    ? m.fullName
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : m.email?.charAt(0)?.toUpperCase() || '?';
                  const isCurrent = m.id === currentUser?.id;
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {m.fullName || '—'}
                              {isCurrent && (
                                <span className="text-muted-foreground ml-1 text-xs">
                                  (you)
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
                        <Badge variant="secondary" className="capitalize">
                          {roleLabel(rawRole)}
                        </Badge>
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {m.role === 'editor' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingUser(m)}
                            >
                              Edit Permissions
                            </Button>
                          )}
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
                                handleSetActive(m, m.isActive === false)
                              }
                            >
                              {m.isActive === false
                                ? 'Reactivate'
                                : 'Deactivate'}
                            </Button>
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

      <EditPermissionsDialog
        user={editingUser}
        onClose={() => setEditingUser(null)}
      />
    </Card>
  );
}

export default function OrganizationPage() {
  return (
    <div className="animate-fade-in-up space-y-6">
      <PageHeader
        backTo={{ label: 'Back to Dashboard', to: '/dashboard' }}
        title="Organization"
        description="Manage your organisation's information and team members"
      />

      <OrgInfoSection />
      <TeamMembersSection />
    </div>
  );
}
