import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronRight,
  Hourglass,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
  ChevronDown,
  CalendarClock,
  LucideIcon,
  CircleAlert,
  Clock3,
  Layers3,
  ArrowRight,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import CompanyOwnerSection from './CompanyOwnerSection';
import CreateAssociationRuleModal from './CreateAssociationRuleModal';
import EditAssociationRuleModal from './EditAssociationRuleModal';
import AssociationRunsList, {
  type AssociationResultFilter,
  type AssociationRunFilters,
} from './AssociationRunsList';

import {
  associationsApi,
  type AssociationRecordStatus,
  type AssociationRule as BaseAssociationRule,
  type AssociationRuleStats,
  type AssociationRunResult,
} from '@/api/associations';
import EmptyState from '@/components/shared/EmptyState';
import ListRow from '@/components/shared/list/ListRow';
import PaginationBar from '@/components/shared/PaginationBar';
import StatusBadge from '@/components/shared/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { cn } from '@/lib/utils';
import {
  useAssociationRecordsQuery,
  useAssociationRunLogsQuery,
} from '@/queries/useAssociations';
import type { ApiError } from '@/types';

interface AssociationRule extends BaseAssociationRule {
  name?: string;
}

const RECORD_PAGE_SIZE_OPTIONS = [10, 25, 50];

const RECORD_FILTER_OPTIONS: Array<{
  label: string;
  value: 'all' | AssociationRecordStatus;
}> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Associated', value: 'completed' },
  { label: 'Failed', value: 'failed' },
];

function StatChip({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: string;
}) {
  if (!count && count !== 0) return null;
  return (
    <Badge className={cn(tone, 'rounded-full')}>
      {count} {label}
    </Badge>
  );
}

function associationObjectLabel(value: string): string {
  const normalized = value.replace(/[_-]/g, ' ').trim();
  const singular = normalized.endsWith('ies')
    ? `${normalized.slice(0, -3)}y`
    : normalized.endsWith('s') && !normalized.endsWith('ss')
      ? normalized.slice(0, -1)
      : normalized;
  return singular.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function OutcomeStat({
  value,
  label,
  dotClassName,
}: {
  value: number;
  label: string;
  dotClassName: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className={cn('size-1.5 shrink-0 rounded-full', dotClassName)} />
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </div>
      <span className="text-muted-foreground pl-3 text-[11px]">{label}</span>
    </div>
  );
}

// --- Sub-components to keep RuleCard clean ---

function formatTimestamp(isoString: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(isoString));
}

export function RecentRunsList({
  projectId,
  ruleId,
}: {
  projectId: string;
  ruleId: string;
}) {
  const query = useAssociationRunLogsQuery(projectId, ruleId);
  const logs = query.data?.data ?? [];
  const total = query.data?.total ?? 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
          Recent Runs
        </p>
        {total > 0 && (
          <p className="text-muted-foreground text-xs">
            Showing {logs.length} of {total} run{total !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {query.isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No runs yet — click Run Now to start.
        </p>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => (
            <ListRow key={log.id} className="gap-3 px-0 py-2 text-xs">
              <span
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  log.status === 'completed'
                    ? 'bg-success'
                    : log.status === 'failed'
                      ? 'bg-destructive'
                      : 'bg-warning',
                )}
              />
              <span className="text-muted-foreground w-[160px] shrink-0 font-mono">
                {formatTimestamp(log.startedAt)}
              </span>
              <span className="text-muted-foreground w-[100px] shrink-0 capitalize">
                {log.triggeredBy.replace('_', ' ')}
              </span>

              <div className="ml-auto flex gap-4">
                <span className="text-success inline-flex w-10 items-center gap-1">
                  <Check className="size-3" />
                  {log.succeeded}
                </span>
                <span className="text-destructive inline-flex w-10 items-center gap-1">
                  {log.failed > 0 && (
                    <>
                      <X className="size-3" />
                      {log.failed}
                    </>
                  )}
                </span>
                <span className="text-warning inline-flex w-10 items-center gap-1">
                  {log.pendingCreated > 0 && (
                    <>
                      <Hourglass className="size-3" />
                      {log.pendingCreated}
                    </>
                  )}
                </span>
              </div>

              {log.errorMessage && (
                <span
                  className="text-destructive ml-2 max-w-xs truncate"
                  title={log.errorMessage}
                >
                  {log.errorMessage}
                </span>
              )}
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordRowSkeleton() {
  return (
    <div className="border-border/60 bg-background/80 grid grid-cols-1 items-center gap-3 rounded-4xl border p-3 md:grid-cols-[1fr_auto] md:gap-4">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-24 justify-self-start rounded-full md:justify-self-end" />
    </div>
  );
}

export function RuleRecordsList({
  projectId,
  ruleId,
}: {
  projectId: string;
  ruleId: string;
}) {
  const [recordFilter, setRecordFilter] = useState<
    'all' | AssociationRecordStatus
  >('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const query = useAssociationRecordsQuery(projectId, ruleId, {
    page,
    limit: pageSize,
    status: recordFilter,
    search,
  });

  const records = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activeFilterLabel =
    RECORD_FILTER_OPTIONS.find((o) => o.value === recordFilter)?.label ?? 'All';

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
            Records
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {total} record{total !== 1 ? 's' : ''} · Filter: {activeFilterLabel}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search records…"
            className="h-8 w-full text-sm sm:w-48"
          />
          <div className="flex flex-wrap gap-2">
            {RECORD_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setRecordFilter(option.value);
                  setPage(1);
                }}
                className={cn(
                  'rounded-full border px-3 py-1 text-[11px] font-medium transition-colors',
                  recordFilter === option.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/80 bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
            <RecordRowSkeleton key={i} />
          ))}
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No records in this filter"
          description={
            search || recordFilter !== 'all'
              ? 'Try clearing the search or switching filters.'
              : 'Records appear here once this rule has run.'
          }
        />
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <div
              key={record.id}
              className="border-border/60 bg-background/80 grid grid-cols-1 items-start gap-3 rounded-4xl border p-3 text-xs md:grid-cols-[1fr_auto] md:items-center md:gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-foreground bg-muted/50 border-border/50 max-w-[220px] truncate rounded border px-2 py-0.5 font-medium"
                    title={record.sourceId}
                  >
                    {record.sourceId}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span
                    className="text-primary bg-primary/5 border-primary/20 max-w-[220px] truncate rounded border px-2 py-0.5 font-medium"
                    title={record.targetMatchValue}
                  >
                    {record.targetMatchValue}
                  </span>
                </div>
                <div className="text-muted-foreground mt-2 font-mono text-[10px]">
                  source HS: {record.sourceHsId ?? 'n/a'}
                </div>
                {record.errorMessage && (
                  <p
                    className="text-destructive mt-1.5 max-w-full break-words"
                    title={record.errorMessage}
                  >
                    {record.errorMessage}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-start md:justify-end">
                <Badge
                  className={cn(
                    record.status === 'completed'
                      ? 'bg-success/10 text-success'
                      : record.status === 'pending'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-destructive/10 text-destructive',
                    'w-24 shrink-0 justify-center rounded-full',
                  )}
                >
                  {record.status === 'completed'
                    ? 'Associated'
                    : record.status === 'pending'
                      ? 'Pending'
                      : 'Failed'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
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
          pageSizeOptions={RECORD_PAGE_SIZE_OPTIONS}
          disabled={query.isFetching}
        />
      </div>
    </div>
  );
}

function RuleCard({
  rule,
  projectId,
  onRefresh,
  runFilters,
  expanded,
  onExpandedChange,
}: {
  rule: AssociationRule;
  projectId: string;
  onRefresh: () => void;
  runFilters: AssociationRunFilters;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const [stats, setStats] = useState<AssociationRuleStats | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const runsQuery = useAssociationRunLogsQuery(projectId, rule.id);
  const latestRun = runsQuery.data?.data?.[0];

  // Consolidating loading states for actions
  const [isProcessing, setIsProcessing] = useState({
    stats: false,
    run: false,
    retry: false,
    toggle: false,
    delete: false,
  });

  const { confirm } = useConfirmDialog();

  const loadStats = useCallback(() => {
    setIsProcessing((prev) => ({ ...prev, stats: true }));
    associationsApi
      .getRuleStats(projectId, rule.id)
      .then((nextStats) => {
        setStats(nextStats);
      })
      .catch(() => {})
      .finally(() => setIsProcessing((prev) => ({ ...prev, stats: false })));
  }, [projectId, rule.id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const invalidateRuleData = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['associations', 'records', projectId, rule.id],
    });
    queryClient.invalidateQueries({
      queryKey: ['associations', 'logs', projectId, rule.id],
    });
    queryClient.invalidateQueries({
      queryKey: ['associations', 'project-runs', projectId],
    });
  }, [queryClient, projectId, rule.id]);

  const isEnabled = rule.isEnabled ?? true;
  const associationName = `${associationObjectLabel(rule.sourceObject)} → ${associationObjectLabel(rule.targetObject)}`;
  const associationType =
    rule.assocLabel ||
    rule.cardinality?.replace(/_/g, ' ') ||
    'Primary association';
  const latestStatus = latestRun
    ? latestRun.status === 'completed' &&
      (latestRun.failed > 0 || latestRun.pendingCreated > 0)
      ? 'partial'
      : latestRun.status
    : null;
  const latestProcessed = latestRun
    ? (latestRun.totalAttempted ??
      latestRun.succeeded + latestRun.pendingCreated + latestRun.failed)
    : (stats?.total ?? 0);
  const latestAssociated = latestRun?.succeeded ?? stats?.resolved ?? 0;
  const latestPending = latestRun?.pendingCreated ?? stats?.pending ?? 0;
  const latestFailed = latestRun?.failed ?? stats?.failed ?? 0;

  const handleRun = async () => {
    setActionError(null);
    setIsProcessing((prev) => ({ ...prev, run: true }));
    try {
      const result: AssociationRunResult = await associationsApi.runRule(
        projectId,
        rule.id,
      );
      const parts = [];
      if (result?.succeeded > 0) parts.push(`${result.succeeded} linked`);
      if (result?.pendingCreated > 0)
        parts.push(`${result.pendingCreated} pending`);
      if (result?.failed > 0) parts.push(`${result.failed} failed`);
      toast.success(
        `"${rule.name}": ${parts.length ? parts.join(', ') : 'complete'}`,
      );

      loadStats();
      invalidateRuleData();
    } catch (err) {
      const e = err as ApiError;
      const message =
        (e?.response?.data?.message as string) ?? 'Failed to run this rule.';
      setActionError(message);
      toast.error(message);
    } finally {
      setIsProcessing((prev) => ({ ...prev, run: false }));
    }
  };

  const handleRetry = async () => {
    setActionError(null);
    setIsProcessing((prev) => ({ ...prev, retry: true }));
    try {
      await associationsApi.retryFailed(projectId, rule.id);
      toast.success('Failed associations queued for retry');
      loadStats();
      invalidateRuleData();
    } catch (err) {
      const e = err as ApiError;
      const message =
        (e?.response?.data?.message as string) ??
        'Failed associations could not be queued.';
      setActionError(message);
      toast.error(message);
    } finally {
      setIsProcessing((prev) => ({ ...prev, retry: false }));
    }
  };

  const handleToggle = async () => {
    setActionError(null);
    setIsProcessing((prev) => ({ ...prev, toggle: true }));
    try {
      await associationsApi.updateRule(projectId, rule.id, {
        isEnabled: !isEnabled,
      } as Partial<BaseAssociationRule>);
      toast.success(isEnabled ? 'Rule disabled' : 'Rule enabled');
      onRefresh();
    } catch (err) {
      const e = err as ApiError;
      const message =
        (e?.response?.data?.message as string) ??
        `Failed to ${isEnabled ? 'disable' : 'enable'} this rule.`;
      setActionError(message);
      toast.error(message);
    } finally {
      setIsProcessing((prev) => ({ ...prev, toggle: false }));
    }
  };

  const requestRun = () => {
    confirm({
      title: `Run “${rule.name}” now?`,
      description:
        'The rule will evaluate synced records and create matching HubSpot associations. Unmatched records may be added to the pending queue.',
      confirmLabel: 'Run rule',
      onConfirm: handleRun,
    });
  };

  const requestToggle = () => {
    if (!isEnabled) {
      void handleToggle();
      return;
    }

    confirm({
      title: `Disable “${rule.name}”?`,
      description:
        'Existing associations will remain, but this rule will no longer run automatically after sync jobs.',
      confirmLabel: 'Disable rule',
      onConfirm: handleToggle,
    });
  };

  const handleDelete = () => {
    confirm({
      variant: 'danger',
      title: 'Delete association rule?',
      description: `"${rule.name}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setIsProcessing((prev) => ({ ...prev, delete: true }));
        try {
          setActionError(null);
          await associationsApi.deleteRule(projectId, rule.id);
          toast.success('Rule deleted');
          onRefresh();
        } catch (err) {
          const e = err as ApiError;
          const message =
            (e?.response?.data?.message as string) ??
            'Failed to delete this rule.';
          setActionError(message);
          toast.error(message);
          throw new Error(message);
        } finally {
          setIsProcessing((prev) => ({ ...prev, delete: false }));
        }
      },
    });
  };

  return (
    <Collapsible open={expanded} onOpenChange={onExpandedChange}>
      <Card className="overflow-hidden py-0 shadow-none">
        <CardContent className="space-y-0 p-0">
          <div className="hover:bg-muted/20 flex flex-col transition-colors sm:flex-row sm:items-center">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={cn(
                  'group grid w-full min-w-0',
                  'grid-cols-[minmax(0,1fr)_auto]',
                  'items-center gap-x-3 gap-y-3',
                  'p-3 text-left sm:p-4',

                  // Four-column desktop layout.
                  'xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.64fr)_32px]',

                  'transition-colors duration-150',
                  'hover:bg-muted/30',
                  'focus-visible:outline-none',
                  'focus-visible:ring-ring focus-visible:ring-2',
                  'focus-visible:ring-inset',
                )}
                aria-expanded={expanded}
                aria-label={`${expanded ? 'Collapse' : 'Expand'} ${associationName}`}
              >
                {/* ===================================
        1. ASSOCIATION IDENTITY
       =================================== */}

                <div className="col-start-1 row-start-1 flex min-w-0 items-start gap-2.5">
                  {/* Neutral icon — no colored square */}

                  <span
                    className={cn(
                      'bg-muted/60 text-muted-foreground',
                      'flex size-8 shrink-0 items-center',
                      'justify-center rounded-full',
                      'group-hover:text-foreground',
                    )}
                  >
                    <Link2 aria-hidden="true" className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Name + status */}

                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-foreground min-w-0 text-sm leading-5 font-semibold break-words">
                        {associationName}
                      </span>

                      <StatusBadge
                        status={isEnabled ? 'active' : 'disabled'}
                        size="sm"
                      />
                    </div>

                    {/* Association type + conditions */}

                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="capitalize">{associationType}</span>

                      {rule.conditions != null &&
                        rule.conditions.length > 0 && (
                          <>
                            <span aria-hidden="true" className="text-border">
                              |
                            </span>

                            <span className="inline-flex items-center gap-1">
                              {rule.conditions.length} condition
                              {rule.conditions.length !== 1 && 's'}
                            </span>
                          </>
                        )}
                    </div>

                    {/* Actual field relationship */}

                    <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px]">
                      <span className="min-w-0 font-mono break-all">
                        {rule.sourceObject}.{rule.sourceMatchField}
                      </span>

                      <ArrowRight
                        aria-hidden="true"
                        className="size-3 shrink-0"
                      />

                      <span className="min-w-0 font-mono break-all">
                        {rule.targetObject}.{rule.targetMatchField}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ===================================
        2. LATEST RUN OUTCOMES
       =================================== */}

                <div
                  className={cn(
                    'col-span-2 row-start-2 min-w-0',

                    // Mobile: separate metrics using
                    // subtle horizontal dividers.
                    'border-border/60 border-y py-2.5',

                    // Desktop: metrics sit between
                    // association and latest run.
                    'xl:col-span-1 xl:col-start-2 xl:row-start-1',
                    'xl:border-x xl:border-y-0 xl:px-4 xl:py-0',
                  )}
                >
                  <p className="text-muted-foreground mb-2 text-[11px] font-medium xl:sr-only">
                    Latest run outcomes
                  </p>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4 sm:gap-x-4 xl:gap-x-2">
                    <AssociationMetric
                      label="Processed"
                      value={latestRun ? latestProcessed : '—'}
                      icon={Layers3}
                    />

                    <AssociationMetric
                      label="Associated"
                      value={latestRun ? latestAssociated : '—'}
                      icon={Link2}
                      iconClassName="text-success"
                    />

                    <AssociationMetric
                      label="Pending"
                      value={latestRun ? latestPending : '—'}
                      icon={Clock3}
                      iconClassName="text-warning"
                    />

                    <AssociationMetric
                      label="Failed"
                      value={latestRun ? latestFailed : '—'}
                      icon={CircleAlert}
                      iconClassName="text-destructive"
                    />
                  </div>
                </div>

                {/* ===================================
        3. LATEST RUN STATUS
       =================================== */}

                <div
                  className={cn(
                    'col-span-2 row-start-3 min-w-0',

                    'flex flex-wrap items-center justify-between gap-2',

                    'xl:col-span-1 xl:col-start-3 xl:row-start-1',
                    'xl:block',
                  )}
                >
                  <span className="text-muted-foreground text-[11px] font-medium">
                    Latest run
                  </span>

                  {latestRun && latestStatus ? (
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 xl:mt-1.5">
                      <StatusBadge status={latestStatus} size="sm" />

                      <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1 text-[11px]">
                        <CalendarClock
                          aria-hidden="true"
                          className="size-3 shrink-0"
                        />

                        <span className="min-w-0 break-words">
                          {formatTimestamp(latestRun.startedAt)}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs xl:mt-1.5 xl:block">
                      {runsQuery.isLoading ? 'Loading…' : 'No runs yet'}
                    </span>
                  )}
                </div>

                {/* ===================================
        4. EXPAND / COLLAPSE
       =================================== */}

                <span
                  className={cn(
                    'col-start-2 row-start-1',

                    'flex size-8 shrink-0 items-center justify-center',
                    'border-border/60 rounded-full border',
                    'bg-muted/40 text-muted-foreground',

                    'transition-colors duration-150',
                    'group-hover:bg-muted',
                    'group-hover:text-foreground',

                    'xl:col-start-4 xl:row-start-1',
                  )}
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      'size-4 transition-transform duration-200',
                      expanded && 'rotate-180',
                    )}
                  />
                </span>
              </button>
            </CollapsibleTrigger>

            <div className="flex shrink-0 items-center justify-end gap-1.5 border-t px-3 py-2 sm:border-t-0 sm:pr-4 sm:pl-0">
              <Button
                variant="outline"
                size="sm"
                onClick={requestRun}
                disabled={isProcessing.run || !isEnabled}
              >
                {isProcessing.run ? <Spinner className="size-3" /> : <Play />}
                Run now
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`More actions for ${rule.name}`}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setShowEditModal(true)}>
                    <Pencil />
                    Edit association
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={loadStats}>
                    <RefreshCw />
                    Refresh counts
                  </DropdownMenuItem>
                  {stats != null && stats.failed > 0 && (
                    <DropdownMenuItem
                      onSelect={() => void handleRetry()}
                      disabled={isProcessing.retry}
                    >
                      <RotateCcw />
                      Retry {stats.failed} failed
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onSelect={requestToggle}
                    disabled={isProcessing.toggle}
                  >
                    {isEnabled ? 'Disable rule' : 'Enable rule'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={handleDelete}
                    disabled={isProcessing.delete}
                  >
                    <Trash2 />
                    Delete rule
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {actionError && (
            <div className="px-4 pb-4">
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            </div>
          )}

          <CollapsibleContent className="bg-muted/20 overflow-hidden border-t p-3 sm:p-4">
            <AssociationRunsList
              projectId={projectId}
              ruleId={rule.id}
              filters={runFilters}
              showToolbar={false}
            />
          </CollapsibleContent>
        </CardContent>
        {showEditModal && (
          <EditAssociationRuleModal
            projectId={projectId}
            rule={rule}
            onSaved={onRefresh}
            onClose={() => setShowEditModal(false)}
          />
        )}
      </Card>
    </Collapsible>
  );
}

type AssociationMetricProps = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconClassName?: string;
};
function AssociationMetric({
  label,
  value,
  icon: Icon,
  iconClassName = 'text-muted-foreground',
}: AssociationMetricProps) {
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 size-3.5 shrink-0', iconClassName)}
      />

      <div className="min-w-0">
        <p className="text-foreground text-sm font-semibold tabular-nums">
          {value}
        </p>

        <p className="text-muted-foreground text-[11px] leading-4">{label}</p>
      </div>
    </div>
  );
}

export default function AssociationRulesList({
  projectId,
  showCompanyOwnerSection = true,
  ownerSourcePlatform = 'servicetitan',
}: {
  projectId: string;
  showCompanyOwnerSection?: boolean;
  ownerSourcePlatform?: 'servicetitan' | 'dataforma' | null;
}) {
  const [rules, setRules] = useState<AssociationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [runSearch, setRunSearch] = useState('');
  const [runResult, setRunResult] = useState<AssociationResultFilter>('all');
  const [runDays, setRunDays] = useState('all');

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setRunSearch(searchInput.trim()),
      300,
    );
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const runFilters = useMemo<AssociationRunFilters>(
    () => ({
      search: runSearch,
      status: 'all',
      result: runResult,
      days: runDays,
    }),
    [runDays, runResult, runSearch],
  );

  const hasRunFilters =
    Boolean(runSearch) || runResult !== 'all' || runDays !== 'all';
  const matchingRunsQuery = useQuery({
    queryKey: ['associations', 'matching-runs', projectId, runFilters],
    queryFn: () =>
      associationsApi.getProjectRuns(projectId, {
        result: runResult === 'all' ? undefined : runResult,
        days: runDays === 'all' ? undefined : Number(runDays),
        search: runSearch || undefined,
        page: 1,
        limit: 100,
      }),
    enabled: hasRunFilters,
    placeholderData: keepPreviousData,
  });
  const visibleRules = useMemo(() => {
    if (!hasRunFilters || matchingRunsQuery.isError) return rules;
    const matchingRuleIds = new Set(
      (matchingRunsQuery.data?.data ?? []).map(
        (run) => run.associationRuleId ?? run.associationRule?.id,
      ),
    );
    const normalizedSearch = runSearch.toLowerCase();
    return rules.filter((rule) => {
      const associationText =
        `${rule.name ?? ''} ${rule.sourceObject} ${rule.sourceMatchField} ${rule.targetObject} ${rule.targetMatchField}`.toLowerCase();
      return (
        matchingRuleIds.has(rule.id) ||
        (normalizedSearch.length > 0 &&
          associationText.includes(normalizedSearch))
      );
    });
  }, [
    hasRunFilters,
    matchingRunsQuery.data?.data,
    matchingRunsQuery.isError,
    rules,
    runSearch,
  ]);

  const load = useCallback(() => {
    setRefreshing(true);
    setLoadError(null);
    associationsApi
      .listRules(projectId)
      .then((nextRules) => {
        setRules(nextRules);
      })
      .catch((err: ApiError) => {
        const message =
          (err?.response?.data?.message as string) ??
          'Association rules could not be loaded.';
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-4xl" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="gap-0 border py-0">
        <CardHeader className="border-b px-4 py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold">
                Associations
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                Create associations, review their runs, and trace every record.
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              <div className="relative w-full sm:w-72">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search associations, runs, record IDs…"
                  className="pl-9"
                  aria-label="Search associations and runs"
                />
              </div>
              <Select
                value={runResult}
                onValueChange={(value) =>
                  setRunResult(value as AssociationResultFilter)
                }
              >
                <SelectTrigger className="w-32" aria-label="Run result">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All results</SelectItem>
                  <SelectItem value="associated">Associated</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={runDays} onValueChange={setRunDays}>
                <SelectTrigger className="w-32" aria-label="Run date range">
                  <CalendarDays className="size-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={load}
                disabled={refreshing}
                aria-label="Refresh associations"
                title="Refresh associations"
              >
                <RefreshCw className={cn(refreshing && 'animate-spin')} />
              </Button>
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus />
                New association
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {loadError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>{loadError}</span>
                <Button variant="outline" size="sm" onClick={load}>
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {visibleRules.length > 0 && (
            <div className="space-y-3">
              {visibleRules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  projectId={projectId}
                  onRefresh={load}
                  runFilters={runFilters}
                  expanded={expandedRuleId === rule.id}
                  onExpandedChange={(expanded) =>
                    setExpandedRuleId(expanded ? rule.id : null)
                  }
                />
              ))}
            </div>
          )}

          {rules.length === 0 && (
            <EmptyState
              icon={Link2}
              title="No association rules yet"
              description="Association rules link HubSpot objects synced by different jobs — e.g. Contacts to Companies, or custom objects."
              action={{
                label: 'Create first association',
                onClick: () => setShowCreate(true),
                icon: Plus,
              }}
            />
          )}

          {rules.length > 0 && visibleRules.length === 0 && (
            <EmptyState
              icon={Search}
              title="No associations match these filters"
              description="Try a different search or clear the run filters to see all associations."
            />
          )}
        </CardContent>
      </Card>

      {showCompanyOwnerSection && (
        <CompanyOwnerSection
          projectId={projectId}
          sourcePlatform={ownerSourcePlatform ?? 'servicetitan'}
        />
      )}

      {showCreate && (
        <CreateAssociationRuleModal
          projectId={projectId}
          onCreated={load}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
