import { format } from 'date-fns';
import { Building2, ShieldCheck, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

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
import { showToast } from '@/lib/toast';
import {
  useAdminPlansQuery,
  useAssignPlanMutation,
} from '@/queries/useBilling';
import { useDeleteOrgMutation, useOrgsQuery } from '@/queries/useOrganisations';
import { useProjectsQuery } from '@/queries/useProjects';
import { useUsersQuery } from '@/queries/useUsers';
import type { Organisation } from '@/types';

interface OrgWithMeta extends Organisation {
  ownerEmail?: string;
  status?: string;
  membershipPlanId?: string | null;
  projectCount: number;
}

interface AssignPlanDialogProps {
  org: OrgWithMeta | null;
  onOpenChange: (open: boolean) => void;
}

function AssignPlanDialog({ org, onOpenChange }: AssignPlanDialogProps) {
  const plansQuery = useAdminPlansQuery();
  const assignPlanMutation = useAssignPlanMutation();
  const [planId, setPlanId] = useState<string>('');

  const activePlans = (plansQuery.data ?? []).filter((p) => p.isActive);

  return (
    <Dialog
      open={!!org}
      onOpenChange={(open) => {
        if (!open) setPlanId('');
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign plan</DialogTitle>
          <DialogDescription>
            {org?.name} will function exactly per the selected plan's limits and
            features, without going through checkout or being billed.
          </DialogDescription>
        </DialogHeader>
        <Select value={planId} onValueChange={setPlanId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a plan…" />
          </SelectTrigger>
          <SelectContent>
            {activePlans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!planId || assignPlanMutation.isPending}
            onClick={() => {
              if (!org) return;
              assignPlanMutation.mutate(
                { organisationId: org.id, planId },
                {
                  onSuccess: () => {
                    showToast.success(`Plan assigned to ${org.name}.`);
                    onOpenChange(false);
                  },
                  onError: (err) => {
                    const e = err as {
                      response?: { data?: { message?: string } };
                    };
                    showToast.error(
                      e?.response?.data?.message ?? 'Failed to assign plan',
                    );
                  },
                },
              );
            }}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type StatusFilter = 'all' | 'active' | 'inactive';
type SortKey = 'name' | 'owner' | 'projects' | 'status';

function compareOrgs(a: OrgWithMeta, b: OrgWithMeta, key: SortKey) {
  switch (key) {
    case 'name':
      return (a.name || '').localeCompare(b.name || '');
    case 'owner':
      return (a.ownerEmail || '').localeCompare(b.ownerEmail || '');
    case 'projects':
      return a.projectCount - b.projectCount;
    case 'status':
      return Number(a.status !== 'inactive') - Number(b.status !== 'inactive');
  }
}

export default function OrganisationsPage() {
  const orgsQuery = useOrgsQuery();
  const usersQuery = useUsersQuery();
  const projectsQuery = useProjectsQuery();
  const deleteOrgMutation = useDeleteOrgMutation();
  const { confirm } = useConfirmDialog();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [assigningPlanOrg, setAssigningPlanOrg] = useState<OrgWithMeta | null>(
    null,
  );

  const isLoading =
    orgsQuery.isLoading || usersQuery.isLoading || projectsQuery.isLoading;
  const hasNoData =
    (orgsQuery.isError && orgsQuery.data === undefined) ||
    (usersQuery.isError && usersQuery.data === undefined) ||
    (projectsQuery.isError && projectsQuery.data === undefined);

  const users = usersQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const superAdminEmails = new Set(
    users.filter((u) => u.role === 'super_admin').map((u) => u.email),
  );

  const organisations: OrgWithMeta[] = useMemo(
    () =>
      (
        (orgsQuery.data ?? []) as (Organisation & {
          ownerEmail?: string;
          status?: string;
          membershipPlanId?: string | null;
        })[]
      ).map((org) => ({
        ...org,
        projectCount: projects.filter((p) => p.organisationId === org.id)
          .length,
      })),
    [orgsQuery.data, projects],
  );

  const filteredOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return organisations.filter((org) => {
      const matchesSearch =
        !q ||
        org.name?.toLowerCase().includes(q) ||
        org.ownerEmail?.toLowerCase().includes(q);
      const status = org.status || 'active';
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [organisations, search, statusFilter]);

  const { sorted, sortKey, direction, toggleSort } = useSort<
    OrgWithMeta,
    SortKey
  >(filteredOrgs, compareOrgs);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    usePagination(sorted, 10);

  const deleteOrg = (org: OrgWithMeta) => {
    confirm({
      variant: 'danger',
      title: `Delete ${org.name}?`,
      description:
        'This soft-deletes the organisation, deactivates all its users, and pauses all its jobs/association rules.',
      confirmLabel: 'Delete Organisation',
      onConfirm: () =>
        deleteOrgMutation.mutate(org.id, {
          onSuccess: () => showToast.success('Organisation deleted.'),
          onError: (err) => {
            const e = err as { response?: { data?: { message?: string } } };
            showToast.error(
              e?.response?.data?.message ?? 'Failed to delete organisation',
            );
          },
        }),
    });
  };

  const header = (
    <PageHeader
      backTo={{ label: 'Back to Super Admin', to: '/super-admin' }}
      title="Organisations"
      description="View and manage tenant organisations across the platform"
    />
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <Card className="p-0">
          <SkeletonList count={5} />
        </Card>
      </div>
    );
  }

  if (hasNoData) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <ErrorState
          onRetry={() => {
            orgsQuery.refetch();
            usersQuery.refetch();
            projectsQuery.refetch();
          }}
        />
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
              <h3 className="text-2xl font-semibold">Manage organisations</h3>
              <p className="text-muted-foreground text-sm">
                View and manage tenant organisations across the platform
              </p>
            </div>
            <ManagementToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search organisations…"
              filters={
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
              }
            />
          </div>
          {filteredOrgs.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No organisations match your filters"
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
                      Organisation
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'owner'}
                      direction={direction}
                      onClick={() => toggleSort('owner')}
                    >
                      Owner
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'projects'}
                      direction={direction}
                      onClick={() => toggleSort('projects')}
                    >
                      Projects
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
                  {pageItems.map((org) => {
                    const orgOwnedBySuperAdmin = org.ownerEmail
                      ? superAdminEmails.has(org.ownerEmail)
                      : false;
                    return (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 rounded-lg">
                              <AvatarFallback className="bg-primary/10 text-primary rounded-lg text-xs font-bold">
                                {org.name?.charAt(0)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{org.name}</p>
                              <p className="text-muted-foreground text-xs">
                                {org.createdAt
                                  ? format(
                                      new Date(org.createdAt),
                                      'MMM d, yyyy',
                                    )
                                  : '—'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {org.ownerEmail || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {org.projectCount} projects
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={org.status || 'active'}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setAssigningPlanOrg(org)}
                              title="Assign plan"
                            >
                              <ShieldCheck className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-destructive"
                              onClick={() => deleteOrg(org)}
                              disabled={orgOwnedBySuperAdmin}
                              title={
                                orgOwnedBySuperAdmin
                                  ? 'Cannot delete an organisation created by a super admin'
                                  : 'Delete organisation'
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
          )}
        </CardContent>
        <CardFooter>{paginationBar}</CardFooter>
      </Card>
      <AssignPlanDialog
        org={assigningPlanOrg}
        onOpenChange={(open) => {
          if (!open) setAssigningPlanOrg(null);
        }}
      />
    </div>
  );
}
