import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Building2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import ProvisionOrganisationDialog from './organisations/ProvisionOrganisationDialog';
import OrganisationDirectoryCard, {
  ORG_STATUS_LABELS,
  OrganisationStatusBadge,
  SUBSCRIPTION_LABELS,
  SubscriptionStatusBadge,
} from './organisations/OrganisationDirectoryCard';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import HeadingPair from '@/components/shared/HeadingPair';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PageHeader from '@/components/shared/PageHeader';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonCardGrid from '@/components/shared/skeletons/SkeletonCardGrid';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import SortableTableHead from '@/components/shared/SortableTableHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useViewMode } from '@/hooks/useViewMode';
import { showToast } from '@/lib/toast';
import {
  useProvisionSuperAdminOrganisationMutation,
  useSuperAdminOrganisationsQuery,
} from '@/queries/useSuperAdmin';
import type { OrgStatus, SubscriptionStatus } from '@/types';

type SortBy = 'name' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const CARD_SORT_OPTIONS: {
  value: string;
  label: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
}[] = [
  {
    value: 'createdAt-desc',
    label: 'Newest',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  {
    value: 'createdAt-asc',
    label: 'Oldest',
    sortBy: 'createdAt',
    sortOrder: 'asc',
  },
  { value: 'name-asc', label: 'Name: A–Z', sortBy: 'name', sortOrder: 'asc' },
  { value: 'name-desc', label: 'Name: Z–A', sortBy: 'name', sortOrder: 'desc' },
];

/** Platform-owned directory using the tenant Projects page's card/list pattern. */
export default function OrganisationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useViewMode('platform-organisations', 'card');
  const [pageSize, setPageSize] = useState(10);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const provisionMutation = useProvisionSuperAdminOrganisationMutation();

  const rawStatus = searchParams.get('status') ?? 'all';
  const status: OrgStatus | 'all' = Object.prototype.hasOwnProperty.call(
    ORG_STATUS_LABELS,
    rawStatus,
  )
    ? (rawStatus as OrgStatus | 'all')
    : 'all';
  const rawSubscription = searchParams.get('subscriptionStatus') ?? 'all';
  const subscriptionStatus: SubscriptionStatus | 'all' =
    Object.prototype.hasOwnProperty.call(SUBSCRIPTION_LABELS, rawSubscription)
      ? (rawSubscription as SubscriptionStatus | 'all')
      : 'all';
  const search = searchParams.get('search') ?? '';
  const debouncedSearch = useDebouncedValue(search, 250);
  const rawPage = Number(searchParams.get('page'));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const sortBy: SortBy =
    searchParams.get('sortBy') === 'name' ? 'name' : 'createdAt';
  const sortOrder: SortOrder =
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  const query = useSuperAdminOrganisationsQuery({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    subscriptionStatus:
      subscriptionStatus === 'all' ? undefined : subscriptionStatus,
    sortBy,
    sortOrder,
  });
  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasActiveFilters =
    search.length > 0 || status !== 'all' || subscriptionStatus !== 'all';

  const setParam = (key: string, value: string, replace = false) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === 'all') next.delete(key);
        else next.set(key, value);
        next.delete('page');
        return next;
      },
      { replace },
    );
  };

  const clearFilters = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['search', 'status', 'subscriptionStatus', 'page']) {
        next.delete(key);
      }
      return next;
    });
  };

  const setPage = (nextPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextPage <= 1) next.delete('page');
      else next.set('page', String(nextPage));
      return next;
    });
  };

  const setSort = (nextSortBy: SortBy, nextSortOrder: SortOrder) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextSortBy === 'createdAt' && nextSortOrder === 'desc') {
        next.delete('sortBy');
        next.delete('sortOrder');
      } else {
        next.set('sortBy', nextSortBy);
        next.set('sortOrder', nextSortOrder);
      }
      next.delete('page');
      return next;
    });
  };

  const toggleSort = (key: SortBy) => {
    setSort(key, sortBy === key && sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const provisionButton = (
    <Button onClick={() => setProvisionOpen(true)}>
      <Plus className="size-4" aria-hidden />
      Provision organisation
    </Button>
  );

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Organisations"
        description={
          query.isLoading
            ? 'Find and manage customer organisations.'
            : `${total} organisation${total !== 1 ? 's' : ''} · review status, billing, and workspaces`
        }
        actions={provisionButton}
      />

      <Card>
        <CardContent className="space-y-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <HeadingPair
              title="Manage organisations"
              subtitle="Find by name, slug, or owner; open an operator workspace."
            />
            <ManagementToolbar
              searchValue={search}
              onSearchChange={(value) => setParam('search', value, true)}
              searchPlaceholder="Search organisations…"
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              filters={
                <>
                  <Select
                    value={status}
                    onValueChange={(value: OrgStatus | 'all') =>
                      setParam('status', value)
                    }
                  >
                    <SelectTrigger
                      className="bg-muted sm:w-40"
                      aria-label="Filter organisations by status"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.keys(ORG_STATUS_LABELS) as Array<
                          keyof typeof ORG_STATUS_LABELS
                        >
                      ).map((key) => (
                        <SelectItem key={key} value={key}>
                          {ORG_STATUS_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={subscriptionStatus}
                    onValueChange={(value: SubscriptionStatus | 'all') =>
                      setParam('subscriptionStatus', value)
                    }
                  >
                    <SelectTrigger
                      className="bg-muted sm:w-40"
                      aria-label="Filter organisations by billing status"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.keys(SUBSCRIPTION_LABELS) as Array<
                          keyof typeof SUBSCRIPTION_LABELS
                        >
                      ).map((key) => (
                        <SelectItem key={key} value={key}>
                          {SUBSCRIPTION_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {viewMode === 'card' && (
                    <Select
                      value={`${sortBy}-${sortOrder}`}
                      onValueChange={(value) => {
                        const option = CARD_SORT_OPTIONS.find(
                          (candidate) => candidate.value === value,
                        );
                        if (option) setSort(option.sortBy, option.sortOrder);
                      }}
                    >
                      <SelectTrigger
                        className="bg-muted sm:w-44"
                        aria-label="Sort organisations"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CARD_SORT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              }
            />
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}

          {query.isLoading ? (
            viewMode === 'table' ? (
              <Card className="overflow-hidden py-0">
                <SkeletonTable rows={6} columns={8} />
              </Card>
            ) : (
              <SkeletonCardGrid count={6} />
            )
          ) : query.isError ? (
            <ErrorState
              title="Could not load organisations"
              description={
                (query.error as Error)?.message ??
                'The Super Admin organisations endpoint returned an error.'
              }
              onRetry={() => query.refetch()}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={
                hasActiveFilters
                  ? 'No organisations match your filters'
                  : 'No organisations yet'
              }
              description={
                hasActiveFilters
                  ? 'Try clearing filters or searching for something else.'
                  : 'Customer organisations will appear here when provisioned.'
              }
              action={
                hasActiveFilters
                  ? { label: 'Clear filters', onClick: clearFilters }
                  : {
                      label: 'Provision organisation',
                      onClick: () => setProvisionOpen(true),
                    }
              }
            />
          ) : viewMode === 'table' ? (
            <div className="border-border overflow-x-auto rounded-3xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted/50">
                    <SortableTableHead
                      active={sortBy === 'name'}
                      direction={sortOrder}
                      onClick={() => toggleSort('name')}
                    >
                      Organisation
                    </SortableTableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Projects</TableHead>
                    <SortableTableHead
                      active={sortBy === 'createdAt'}
                      direction={sortOrder}
                      onClick={() => toggleSort('createdAt')}
                    >
                      Created
                    </SortableTableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const to = `/super-admin/organisations/${row.id}/overview`;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="min-w-64">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-xl">
                              <Building2 className="size-4" aria-hidden />
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={to}
                                className="hover:text-primary focus-visible:ring-ring block truncate rounded-sm text-sm font-medium transition-colors outline-none focus-visible:ring-2"
                              >
                                {row.name}
                              </Link>
                              <p className="text-muted-foreground truncate text-xs">
                                {row.slug}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-56 truncate text-sm">
                          {row.owner?.email ?? 'Not assigned'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.plan.name}
                        </TableCell>
                        <TableCell>
                          <OrganisationStatusBadge status={row.status} />
                        </TableCell>
                        <TableCell>
                          <SubscriptionStatusBadge
                            status={row.subscriptionStatus}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right text-sm tabular-nums">
                          {row.memberCount}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right text-sm tabular-nums">
                          {row.projectCount}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {formatDistanceToNow(new Date(row.createdAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            to={to}
                            className="text-primary focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm text-sm font-medium outline-none hover:underline focus-visible:ring-2"
                          >
                            View
                            <ArrowRight className="size-3.5" aria-hidden />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!query.isLoading &&
        !query.isError &&
        rows.length > 0 &&
        viewMode === 'card' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <OrganisationDirectoryCard key={row.id} organisation={row} />
            ))}
          </div>
        )}

      {!query.isLoading && !query.isError && total > 0 && (
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
          pageSizeLabel="Organisations per page"
        />
      )}

      <ProvisionOrganisationDialog
        open={provisionOpen}
        onOpenChange={setProvisionOpen}
        isSubmitting={provisionMutation.isPending}
        errorMessage={
          provisionMutation.isError
            ? ((
                provisionMutation.error as {
                  response?: { data?: { message?: string } };
                }
              ).response?.data?.message ?? 'The request failed. Try again.')
            : null
        }
        onSubmit={(values) => {
          provisionMutation.mutate(values, {
            onSuccess: (data) => {
              if (data.reused) {
                showToast.info(
                  `Organisation already existed — opening ${data.slug}.`,
                );
              } else if (data.invitationSent) {
                showToast.success(
                  'Provisioned. Owner invitation sent to the supplied email.',
                );
              } else {
                showToast.success(
                  'Provisioned. Invite an owner from the Members page when ready.',
                );
              }
              setProvisionOpen(false);
              navigate(
                `/super-admin/organisations/${data.organisationId}/overview`,
              );
            },
          });
        }}
      />
    </div>
  );
}
