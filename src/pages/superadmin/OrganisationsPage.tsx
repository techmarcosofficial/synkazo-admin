import { formatDistanceToNow } from 'date-fns';
import { Building2, ExternalLink } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
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
import { useSuperAdminOrganisationsQuery } from '@/queries/useSuperAdmin';
import type { OrgStatus, SubscriptionStatus } from '@/types';

// SA-400 Phase 4 organisation directory. Server-side pagination, search,
// and status/subscription filters, driven by URL params so the Overview
// deep-links (?status=suspended, ?subscriptionStatus=past_due) land the
// operator on the pre-filtered view — no manual re-filter step.

const STATUS_LABELS: Record<OrgStatus | 'all', string> = {
  all: 'All statuses',
  active: 'Active',
  suspended: 'Suspended',
  pending: 'Pending',
  archived: 'Archived',
};

const SUBSCRIPTION_LABELS: Record<SubscriptionStatus | 'all', string> = {
  all: 'All billing',
  none: 'No subscription',
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Cancelled',
  incomplete: 'Incomplete',
  unpaid: 'Unpaid',
  paused: 'Paused',
  pending_cancel: 'Cancelling',
};

function toneForOrgStatus(status: OrgStatus): 'default' | 'warning' | 'muted' {
  if (status === 'suspended') return 'warning';
  if (status === 'pending' || status === 'archived') return 'muted';
  return 'default';
}

function toneForSubscription(
  status: SubscriptionStatus,
): 'default' | 'warning' | 'muted' | 'destructive' {
  if (status === 'past_due' || status === 'unpaid') return 'destructive';
  if (status === 'trialing' || status === 'pending_cancel') return 'warning';
  if (status === 'active') return 'default';
  return 'muted';
}

function ToneBadge({
  tone,
  children,
}: {
  tone: 'default' | 'warning' | 'muted' | 'destructive';
  children: React.ReactNode;
}) {
  const classes =
    tone === 'destructive'
      ? 'bg-red-100 text-red-900'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-900'
        : tone === 'muted'
          ? 'bg-muted text-muted-foreground'
          : 'bg-emerald-100 text-emerald-900';
  return <Badge className={`rounded-full ${classes}`}>{children}</Badge>;
}

export default function OrganisationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = (searchParams.get('status') ?? 'all') as
    | OrgStatus
    | 'all';
  const subscriptionParam = (searchParams.get('subscriptionStatus') ??
    'all') as SubscriptionStatus | 'all';
  const searchInput = searchParams.get('search') ?? '';
  const pageParam = Number(searchParams.get('page') ?? '1') || 1;

  const [searchDraft, setSearchDraft] = useState(searchInput);
  const debouncedSearch = useDebouncedValue(searchDraft, 250);

  // Push the debounced value back into the URL so the query param stays
  // canonical (deep-linkable + refresh-safe) rather than living in a
  // separate piece of local state that the URL doesn't know about.
  useMemo(() => {
    if (debouncedSearch === (searchParams.get('search') ?? '')) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedSearch) next.set('search', debouncedSearch);
        else next.delete('search');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, searchParams, setSearchParams]);

  const [pageSize, setPageSize] = useState(10);

  const query = useSuperAdminOrganisationsQuery({
    page: pageParam,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: statusParam !== 'all' ? statusParam : undefined,
    subscriptionStatus:
      subscriptionParam !== 'all' ? subscriptionParam : undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setParam = (key: string, value: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === null || value === 'all') next.delete(key);
        else next.set(key, value);
        next.delete('page');
        return next;
      },
      { replace: false },
    );
  };

  const setPage = (page: number) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (page <= 1) next.delete('page');
        else next.set('page', String(page));
        return next;
      },
      { replace: false },
    );
  };

  const hasActiveFilters =
    statusParam !== 'all' ||
    subscriptionParam !== 'all' ||
    !!debouncedSearch;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Organisations"
        description="Every customer organisation on the platform. Use filters to narrow, or click a row to open the operator overview."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <InputGroup className="flex-1">
          <InputGroupAddon>
            <Building2 className="size-4" aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search name, slug, or owner email…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </InputGroup>

        <Select
          value={statusParam}
          onValueChange={(v) => setParam('status', v)}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {STATUS_LABELS[key]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        <Select
          value={subscriptionParam}
          onValueChange={(v) => setParam('subscriptionStatus', v)}
        >
          <SelectTrigger className="sm:w-44">
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

        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchParams(new URLSearchParams())}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {query.isLoading ? (
        <SkeletonList count={5} />
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
          title="No organisations match your filters"
          description={
            hasActiveFilters
              ? 'Try clearing filters or searching for something else.'
              : 'No customer organisations exist yet.'
          }
        />
      ) : (
        <div className="bg-card overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead className="text-right">Projects</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      to={`/super-admin/organisations/${row.id}/overview`}
                      className="hover:text-primary flex flex-col"
                    >
                      <span className="font-medium">{row.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {row.slug}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-sm">
                    {row.owner?.email || (
                      <span className="text-muted-foreground italic">
                        No owner
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ToneBadge tone={toneForOrgStatus(row.status)}>
                      {STATUS_LABELS[row.status] ?? row.status}
                    </ToneBadge>
                  </TableCell>
                  <TableCell>
                    <ToneBadge tone={toneForSubscription(row.subscriptionStatus)}>
                      {SUBSCRIPTION_LABELS[row.subscriptionStatus] ??
                        row.subscriptionStatus}
                    </ToneBadge>
                  </TableCell>
                  <TableCell className="text-sm">{row.plan.name}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {row.memberCount}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {row.projectCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(row.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/super-admin/organisations/${row.id}/overview`}
                      aria-label={`Open ${row.name}`}
                    >
                      <ExternalLink className="text-muted-foreground size-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationBar
        page={pageParam}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
