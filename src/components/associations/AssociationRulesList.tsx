import { useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Hourglass,
  Link2,
  Pencil,
  Plus,
  Play,
  RefreshCw,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
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
import ListStack from '@/components/shared/list/ListStack';
import PaginationBar from '@/components/shared/PaginationBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useHeaderPrimaryAction } from '@/hooks/useHeaderPrimaryAction';
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
    <div className="border-border/60 bg-background/80 grid grid-cols-1 items-center gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto] md:gap-4">
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
              className="border-border/60 bg-background/80 grid grid-cols-1 items-start gap-3 rounded-lg border p-3 text-xs md:grid-cols-[1fr_auto] md:items-center md:gap-4"
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

function RuleCard({
  rule,
  projectId,
  onRefresh,
}: {
  rule: AssociationRule;
  projectId: string;
  onRefresh: () => void;
}) {
  const [stats, setStats] = useState<AssociationRuleStats | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const queryClient = useQueryClient();

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
      .then(setStats)
      .catch(() => {})
      .finally(() => setIsProcessing((prev) => ({ ...prev, stats: false })));
  }, [projectId, rule.id]);

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
      toast.error((e?.response?.data?.message as string) ?? 'Run failed');
    } finally {
      setIsProcessing((prev) => ({ ...prev, run: false }));
    }
  };

  const handleRetry = async () => {
    setIsProcessing((prev) => ({ ...prev, retry: true }));
    try {
      await associationsApi.retryFailed(projectId, rule.id);
      toast.success('Failed associations queued for retry');
      loadStats();
      invalidateRuleData();
    } catch (err) {
      const e = err as ApiError;
      toast.error((e?.response?.data?.message as string) ?? 'Retry failed');
    } finally {
      setIsProcessing((prev) => ({ ...prev, retry: false }));
    }
  };

  const handleToggle = async () => {
    setIsProcessing((prev) => ({ ...prev, toggle: true }));
    try {
      await associationsApi.updateRule(projectId, rule.id, {
        isEnabled: !isEnabled,
      } as Partial<BaseAssociationRule>);
      toast.success(isEnabled ? 'Rule disabled' : 'Rule enabled');
      onRefresh();
    } catch {
      toast.error('Failed to toggle rule');
    } finally {
      setIsProcessing((prev) => ({ ...prev, toggle: false }));
    }
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
          await associationsApi.deleteRule(projectId, rule.id);
          toast.success('Rule deleted');
          onRefresh();
        } catch {
          toast.error('Failed to delete rule');
          throw new Error('Failed to delete rule');
        } finally {
          setIsProcessing((prev) => ({ ...prev, delete: false }));
        }
      },
    });
  };

  return (
    <Card className="border-border/60 bg-card/70 relative isolate overflow-hidden rounded-xl py-0 shadow-sm backdrop-blur-sm">
      <CardContent className="space-y-0 p-0">
        <div className="flex items-start justify-between p-4">
          <div className="flex flex-1 items-start gap-3">
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

            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{rule.name}</span>
                  {!isEnabled && <Badge variant="secondary">Disabled</Badge>}
                </div>

                {/* Actions moved to Header Level for better hierarchy */}
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8"
                    onClick={handleRun}
                    disabled={isProcessing.run || !isEnabled}
                  >
                    {isProcessing.run ? (
                      <Spinner className="mr-2 size-3" />
                    ) : (
                      <Play className="mr-2 size-3" />
                    )}
                    Run
                  </Button>

                  {stats != null && stats.failed > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-warning/40 text-warning h-8"
                      onClick={handleRetry}
                      disabled={isProcessing.retry}
                    >
                      {isProcessing.retry ? (
                        <Spinner className="mr-2 size-3" />
                      ) : (
                        <RotateCcw className="mr-2 size-3" />
                      )}
                      Retry {stats.failed}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setShowEditModal(true)}
                    title="Edit Rule"
                  >
                    <Pencil className="size-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={handleToggle}
                    disabled={isProcessing.toggle}
                    title={isEnabled ? 'Disable Rule' : 'Enable Rule'}
                  >
                    {isEnabled ? (
                      <ToggleRight className="size-4" />
                    ) : (
                      <ToggleLeft className="size-4" />
                    )}
                  </Button>

                  <Button variant="ghost" size="icon-sm" onClick={toggleExpand}>
                    {expanded ? <ChevronUp /> : <ChevronDown />}
                  </Button>
                </div>
              </div>

              {/* Enhanced Rule Mapping Readability */}
              <div className="text-muted-foreground mt-1.5 flex items-center font-mono text-[11px] tracking-tight">
                <div className="bg-background border-border/60 flex items-center rounded border px-1.5 py-0.5">
                  <span>{rule.sourceObject}</span>
                  <span className="mx-0.5 opacity-40">.</span>
                  <span className="text-primary">{rule.sourceMatchField}</span>
                </div>
                <span className="mx-2 opacity-50">=</span>
                <div className="bg-background border-border/60 flex items-center rounded border px-1.5 py-0.5">
                  <span>{rule.targetObject}</span>
                  <span className="mx-0.5 opacity-40">.</span>
                  <span className="text-primary">{rule.targetMatchField}</span>
                </div>
                {rule.conditions != null && rule.conditions.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 font-sans text-[10px]"
                    title="This rule only fires when its conditions pass"
                  >
                    {rule.conditions.length} condition
                    {rule.conditions.length > 1 ? 's' : ''} (
                    {rule.conditionLogic ?? 'AND'})
                  </Badge>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
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
            </div>
          </div>
        </div>

        <Collapsible open={expanded}>
          <CollapsibleContent className="bg-background/90 overflow-hidden rounded-b-xl border-t px-4 py-4">
            <div className="space-y-6">
              <RecentRunsList projectId={projectId} ruleId={rule.id} />

              <div className="border-t pt-6">
                <RuleRecordsList projectId={projectId} ruleId={rule.id} />
              </div>

              {/* Dangerous actions moved to the bottom of the expanded section */}
              <div className="flex justify-end border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDelete}
                  disabled={isProcessing.delete}
                >
                  <Trash2 className="mr-2 size-4" /> Delete Rule
                </Button>
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
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    associationsApi
      .listRules(projectId)
      .then(setRules)
      .catch(() => toast.error('Failed to load association rules'))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useHeaderPrimaryAction({
    label: 'New Association',
    icon: Plus,
    onClick: () => setShowCreate(true),
  });

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Spinner className="text-primary size-6" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showCompanyOwnerSection && (
        <CompanyOwnerSection
          projectId={projectId}
          sourcePlatform={ownerSourcePlatform ?? 'servicetitan'}
        />
      )}

      <div>
        <h3 className="text-sm font-semibold">Association Rules</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Link HubSpot objects created by different sync jobs. Associations run
          automatically after each job completes.
        </p>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No association rules yet"
          description="Association rules link HubSpot objects synced by different jobs — e.g. Contacts to Companies, or custom objects."
          action={{
            label: 'Create First Rule',
            onClick: () => setShowCreate(true),
            icon: Plus,
          }}
        />
      ) : (
        <ListStack>
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              projectId={projectId}
              onRefresh={load}
            />
          ))}
        </ListStack>
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
