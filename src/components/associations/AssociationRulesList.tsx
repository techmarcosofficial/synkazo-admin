import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Hourglass,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Play,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import CompanyOwnerSection from './CompanyOwnerSection';
import CreateAssociationRuleModal from './CreateAssociationRuleModal';
import EditAssociationRuleModal from './EditAssociationRuleModal';

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
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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

// --- Main Component ---

function AssociationMetrics({
  rules,
  statsByRule,
}: {
  rules: AssociationRule[];
  statsByRule: Record<string, AssociationRuleStats>;
}) {
  const statsLoaded = rules.every((rule) => statsByRule[rule.id] != null);
  const pending = Object.values(statsByRule).reduce(
    (sum, stats) => sum + stats.pending,
    0,
  );
  const failed = Object.values(statsByRule).reduce(
    (sum, stats) => sum + stats.failed,
    0,
  );
  const metrics = [
    { label: 'Total rules', value: rules.length },
    {
      label: 'Enabled',
      value: rules.filter((rule) => rule.isEnabled ?? true).length,
    },
    { label: 'Pending records', value: pending, loading: !statsLoaded },
    { label: 'Failed records', value: failed, loading: !statsLoaded },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="bg-muted/50 rounded-3xl p-4">
          <p className="text-muted-foreground text-xs font-medium">
            {metric.label}
          </p>
          {metric.loading ? (
            <Skeleton className="mt-2 h-7 w-12" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {metric.value}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function RuleCard({
  rule,
  projectId,
  onRefresh,
  onStatsChange,
}: {
  rule: AssociationRule;
  projectId: string;
  onRefresh: () => void;
  onStatsChange: (ruleId: string, stats: AssociationRuleStats) => void;
}) {
  const [stats, setStats] = useState<AssociationRuleStats | null>(null);
  const [expanded, setExpanded] = useState(false);
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
        onStatsChange(rule.id, nextStats);
      })
      .catch(() => {})
      .finally(() => setIsProcessing((prev) => ({ ...prev, stats: false })));
  }, [onStatsChange, projectId, rule.id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const toggleExpand = () => setExpanded((prev) => !prev);

  const invalidateRuleData = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['associations', 'records', projectId, rule.id],
    });
    queryClient.invalidateQueries({
      queryKey: ['associations', 'logs', projectId, rule.id],
    });
  }, [queryClient, projectId, rule.id]);

  const isEnabled = rule.isEnabled ?? true;

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
    <Card className="overflow-hidden py-0 shadow-none">
      <CardContent className="space-y-0 p-0">
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border',
                isEnabled
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-muted-foreground/20 bg-muted text-muted-foreground',
              )}
            >
              <Link2 className="size-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{rule.name}</span>
                <StatusBadge
                  status={isEnabled ? 'active' : 'disabled'}
                  size="sm"
                />
                {latestRun && (
                  <StatusBadge status={latestRun.status} size="sm" />
                )}
              </div>

              <div className="text-muted-foreground mt-2 flex min-w-0 flex-wrap items-center gap-2 font-mono text-[11px] tracking-tight">
                <div className="bg-muted/50 border-border/60 flex min-w-0 items-center rounded border px-1.5 py-0.5">
                  <span>{rule.sourceObject}</span>
                  <span className="mx-0.5 opacity-40">.</span>
                  <span className="text-primary min-w-0 break-all">
                    {rule.sourceMatchField}
                  </span>
                </div>
                <span className="opacity-50">=</span>
                <div className="bg-muted/50 border-border/60 flex min-w-0 items-center rounded border px-1.5 py-0.5">
                  <span>{rule.targetObject}</span>
                  <span className="mx-0.5 opacity-40">.</span>
                  <span className="text-primary min-w-0 break-all">
                    {rule.targetMatchField}
                  </span>
                </div>
                {rule.conditions != null && rule.conditions.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="font-sans text-[10px]"
                    title="This rule only fires when its conditions pass"
                  >
                    {rule.conditions.length} condition
                    {rule.conditions.length > 1 ? 's' : ''} (
                    {rule.conditionLogic ?? 'AND'})
                  </Badge>
                )}
              </div>

              <div
                className="mt-3 flex flex-wrap items-center gap-2"
                aria-label="Rule record totals"
              >
                {stats ? (
                  <>
                    <StatChip
                      count={stats.total}
                      label="total"
                      tone="bg-muted text-muted-foreground"
                    />
                    <StatChip
                      count={stats.resolved}
                      label="associated"
                      tone="bg-success/10 text-success"
                    />
                    <StatChip
                      count={stats.pending}
                      label="pending"
                      tone="bg-warning/10 text-warning"
                    />
                    {stats.failed > 0 && (
                      <StatChip
                        count={stats.failed}
                        label="failed"
                        tone="bg-destructive/10 text-destructive"
                      />
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Loading stats…
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={loadStats}
                  disabled={isProcessing.stats}
                  title="Refresh counts"
                >
                  <RefreshCw
                    className={cn(
                      'size-3.5',
                      isProcessing.stats && 'animate-spin',
                    )}
                  />
                </Button>
              </div>

              <p className="text-muted-foreground mt-2 text-xs">
                {latestRun
                  ? `Last run ${formatTimestamp(latestRun.startedAt)}`
                  : runsQuery.isLoading
                    ? 'Loading latest run…'
                    : 'Not run yet'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              size="sm"
              onClick={requestRun}
              disabled={isProcessing.run || !isEnabled}
            >
              {isProcessing.run ? <Spinner className="size-3" /> : <Play />}
              Run
            </Button>

            {stats != null && stats.failed > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-warning/40 text-warning"
                onClick={handleRetry}
                disabled={isProcessing.retry}
              >
                {isProcessing.retry ? (
                  <Spinner className="size-3" />
                ) : (
                  <RotateCcw />
                )}
                Retry {stats.failed}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditModal(true)}
            >
              <Pencil />
              Edit
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`More actions for ${rule.name}`}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleExpand}
              aria-label={expanded ? 'Hide diagnostics' : 'Show diagnostics'}
              aria-expanded={expanded}
            >
              {expanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
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

        <Collapsible open={expanded}>
          <CollapsibleContent className="bg-muted/20 overflow-hidden border-t px-4 py-4">
            <div className="space-y-6">
              <RecentRunsList projectId={projectId} ruleId={rule.id} />

              <div className="border-t pt-6">
                <RuleRecordsList projectId={projectId} ruleId={rule.id} />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
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
  const [statsByRule, setStatsByRule] = useState<
    Record<string, AssociationRuleStats>
  >({});
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setRefreshing(true);
    setLoadError(null);
    associationsApi
      .listRules(projectId)
      .then((nextRules) => {
        setRules(nextRules);
        setStatsByRule((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([ruleId]) =>
              nextRules.some((rule) => rule.id === ruleId),
            ),
          ),
        );
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

  const handleStatsChange = useCallback(
    (ruleId: string, nextStats: AssociationRuleStats) => {
      setStatsByRule((current) => {
        if (current[ruleId] === nextStats) return current;
        return { ...current, [ruleId]: nextStats };
      });
    },
    [],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-36 rounded-4xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="gap-0 border py-0">
        <CardHeader className="flex items-start justify-between gap-4 px-4 py-3">
          <div>
            <CardTitle className="text-sm font-semibold">
              Associations
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              Create and monitor relationships between synced records.
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={refreshing}
            >
              <RefreshCw className={cn(refreshing && 'animate-spin')} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus />
              New association
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <AssociationMetrics rules={rules} statsByRule={statsByRule} />

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

          {rules.length > 0 && (
            <div className="space-y-3">
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  projectId={projectId}
                  onRefresh={load}
                  onStatsChange={handleStatsChange}
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
