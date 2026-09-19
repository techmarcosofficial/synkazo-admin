import { formatDistanceToNow } from 'date-fns';
import { CreditCard, ExternalLink } from 'lucide-react';
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
import { useSuperAdminFailedPaymentsQuery } from '@/queries/useSuperAdmin';
import type { SubscriptionStatus } from '@/types';

type StatusFilter = 'all' | 'past_due' | 'unpaid' | 'incomplete';

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All failure states',
  past_due: 'Past due',
  unpaid: 'Unpaid',
  incomplete: 'Incomplete',
};

function toneForStatus(
  status: SubscriptionStatus,
): 'warning' | 'destructive' | 'muted' {
  if (status === 'past_due') return 'warning';
  if (status === 'unpaid') return 'destructive';
  return 'muted';
}

function toneClass(
  tone: 'warning' | 'destructive' | 'muted',
): string {
  if (tone === 'destructive') return 'bg-red-100 text-red-900';
  if (tone === 'warning') return 'bg-amber-100 text-amber-900';
  return 'bg-muted text-muted-foreground';
}

function formatCurrency(amount: number, currency: string | null): string {
  const c = (currency ?? 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: c,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${c}`;
  }
}

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

export default function FailedPaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = (searchParams.get('status') ?? 'all') as StatusFilter;
  const searchQueryParam = searchParams.get('search') ?? '';
  const pageParam = Number(searchParams.get('page') ?? '1') || 1;

  const [searchDraft, setSearchDraft] = useState(searchQueryParam);
  const debouncedSearch = useDebouncedValue(searchDraft, 250);

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

  const [pageSize, setPageSize] = useState(20);

  const query = useSuperAdminFailedPaymentsQuery({
    page: pageParam,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status:
      statusParam === 'all'
        ? undefined
        : (statusParam as 'past_due' | 'unpaid' | 'incomplete'),
    sortOrder: 'desc',
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setStatus = (value: StatusFilter) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === 'all') next.delete('status');
        else next.set('status', value);
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Failed payments"
        description="Organisations whose subscription is currently past-due, unpaid, or incomplete. Sorted by most recently updated first."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <InputGroup className="flex-1">
          <InputGroupAddon>
            <CreditCard className="size-4" aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search name, slug, or owner email…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </InputGroup>
        <Select
          value={statusParam}
          onValueChange={(v) => setStatus(v as StatusFilter)}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(
              Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>
            ).map((key) => (
              <SelectItem key={key} value={key}>
                {STATUS_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          Refresh
        </Button>
      </div>

      {query.isLoading ? (
        <SkeletonList count={5} />
      ) : query.isError ? (
        <ErrorState
          title="Could not load failed payments"
          description={extractErrorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No failing payments"
          description="Every organisation is currently caught up on billing. Nice."
        />
      ) : (
        <div className="bg-card overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount due</TableHead>
                <TableHead>Latest invoice</TableHead>
                <TableHead className="text-right">Days in grace</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.organisationId}>
                  <TableCell>
                    <Link
                      to={`/super-admin/organisations/${row.organisationId}/billing`}
                      className="hover:text-primary flex flex-col"
                    >
                      <span className="font-medium">
                        {row.organisationName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {row.organisationSlug}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-sm">
                    {row.ownerEmail || (
                      <span className="text-muted-foreground italic">
                        No owner
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`rounded-full ${toneClass(toneForStatus(row.subscriptionStatus))}`}
                    >
                      {STATUS_LABELS[
                        row.subscriptionStatus as StatusFilter
                      ] ?? row.subscriptionStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(row.amountDue, row.currency)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.latestFailedInvoiceNumber ?? '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {row.daysInGrace == null ? (
                      '—'
                    ) : (
                      <span
                        className={
                          row.daysInGrace >= 8
                            ? 'text-red-700'
                            : row.daysInGrace >= 3
                              ? 'text-amber-700'
                              : ''
                        }
                      >
                        {row.daysInGrace}d
                        {row.firstFailureAt ? (
                          <span className="text-muted-foreground ml-1 text-xs">
                            ({formatDistanceToNow(new Date(row.firstFailureAt), {
                              addSuffix: true,
                            })})
                          </span>
                        ) : null}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/super-admin/organisations/${row.organisationId}/billing`}
                      aria-label={`Open ${row.organisationName} billing`}
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
