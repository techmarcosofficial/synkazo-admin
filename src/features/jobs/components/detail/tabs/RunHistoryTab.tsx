import { format } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  Clock,
  Edit2,
  Filter,
  Plus,
  RefreshCw,
  RotateCcw,
  SkipForward,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useJobDetailContext } from '../context';

import { jobsApi } from '@/api/jobs';
import { syncLogsApi, type SyncPageLog } from '@/api/syncLogs';
import { PlatformPair } from '@/components/platform';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ListStack from '@/components/shared/list/ListStack';
import PaginationBar from '@/components/shared/PaginationBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { ExtSyncRun } from '@/features/jobs/hooks';
import { cn } from '@/lib/utils';
import { useRunLogsQuery } from '@/queries/useJobs';
import type { SyncLogRecord } from '@/types';

const ACTION_FILTER_OPTIONS = ['created', 'updated', 'skipped', 'failed'];
const SKIP_REASON_OPTIONS = [
  'no_change',
  'missing_required_field',
  'duplicate',
  'filter_excluded',
  'no_id_match',
  'manually_excluded',
];
const FAIL_REASON_OPTIONS = [
  'api_error',
  'rate_limited',
  'transform_error',
  'validation_error',
  'auth_error',
  'network_error',
  'unknown',
];

function enumLabel(value: string): string {
  return value
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

const RUN_STATUS_CONFIG: Record<
  string,
  { dot: string; label: string; pulse?: boolean }
> = {
  running: { dot: 'bg-info', label: 'Running', pulse: true },
  completed: { dot: 'bg-success', label: 'Completed' },
  partial: { dot: 'bg-warning', label: 'Incomplete' },
  failed: { dot: 'bg-destructive', label: 'Failed' },
};

const ACTION_CONFIG = {
  created: { className: 'text-success', icon: Plus, label: 'Created' },
  updated: { className: 'text-info', icon: Edit2, label: 'Updated' },
  skipped: {
    className: 'text-muted-foreground',
    icon: SkipForward,
    label: 'Skipped',
  },
  failed: { className: 'text-destructive', icon: XCircle, label: 'Failed' },
};

const STAT_TONE = {
  success: 'bg-success/10 text-success',
  info: 'bg-info/10 text-info',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
} as const;

function StatChip({
  icon: Icon,
  tone = 'muted',
  children,
}: {
  icon?: LucideIcon;
  tone?: keyof typeof STAT_TONE;
  children: React.ReactNode;
}) {
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 border-transparent font-normal', STAT_TONE[tone])}
    >
      {Icon && <Icon className="size-3" />}
      {children}
    </Badge>
  );
}

function ExpandChevron({
  open,
  loading,
  bordered,
}: {
  open: boolean;
  loading?: boolean;
  bordered?: boolean;
}) {
  if (loading)
    return (
      <RefreshCw className="text-muted-foreground size-3 shrink-0 animate-spin" />
    );
  return (
    <div
      className={cn(
        'text-muted-foreground group-hover:text-foreground flex w-4 shrink-0 items-center justify-center transition-colors',
        bordered &&
          'border-border/60 bg-muted/50 group-hover:border-border size-6 w-6 rounded-full border',
      )}
    >
      <ChevronRight
        className={cn(
          bordered ? 'size-3.5' : 'size-2.5',
          'transition-transform duration-200',
          open && 'rotate-90',
        )}
      />
    </div>
  );
}

function LiveProgressBar({
  runLog,
  liveProgress,
}: {
  runLog: Partial<ExtSyncRun> | null;
  liveProgress: {
    totalRecords?: number;
    recordsProcessed?: number;
    etaSeconds?: number;
    ratePerSec?: number;
  } | null;
}) {
  if (!runLog) return null;
  const {
    totalFetched,
    createdCount = 0,
    updatedCount = 0,
    skippedCount = 0,
    failedCount = 0,
    status,
  } = runLog;
  const processed = createdCount + updatedCount + skippedCount + failedCount;

  const totalRecs = liveProgress?.totalRecords ?? totalFetched ?? 0;
  const liveProcessed = liveProgress?.recordsProcessed ?? processed;
  const pct =
    totalRecs > 0
      ? Math.min(100, Math.round((liveProcessed / totalRecs) * 100))
      : 0;
  const isRunning = status === 'running';
  const indeterminate = isRunning && totalRecs === 0;

  const etaSec = liveProgress?.etaSeconds;
  const ratePerSec = liveProgress?.ratePerSec;
  const etaLabel =
    etaSec != null
      ? etaSec > 3600
        ? `${Math.round(etaSec / 3600)}h ${Math.round((etaSec % 3600) / 60)}m`
        : etaSec > 60
          ? `${Math.round(etaSec / 60)}m ${etaSec % 60}s`
          : `${etaSec}s`
      : null;

  return (
    <Card className="border-info/30 mb-4">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-info size-2 animate-pulse rounded-full" />
            <span className="text-sm font-medium">Sync in progress…</span>
            {ratePerSec != null && (
              <span className="text-muted-foreground text-xs">
                {ratePerSec} rec/s
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {etaLabel && (
              <span className="text-muted-foreground text-xs">
                ETA: {etaLabel}
              </span>
            )}
            <span className="text-muted-foreground font-mono text-xs">
              {liveProcessed} / {totalRecs || '?'} records
            </span>
          </div>
        </div>
        <div className="bg-border mb-3 h-1.5 overflow-hidden rounded-full">
          <div
            className={cn(
              'bg-info h-full rounded-full transition-all duration-500',
              indeterminate && 'animate-pulse',
            )}
            style={{ width: `${indeterminate ? 100 : pct}%` }}
          />
        </div>
        {!indeterminate && (
          <div className="mb-1 flex h-1.5 items-center gap-1.5">
            <div
              className="bg-success h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round((createdCount / Math.max(liveProcessed, 1)) * 100)}%`,
              }}
            />
            <div
              className="bg-info h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round((updatedCount / Math.max(liveProcessed, 1)) * 100)}%`,
              }}
            />
          </div>
        )}
        <div className="flex gap-4 text-xs">
          <span className="text-success">+{createdCount} created</span>
          <span className="text-info inline-flex items-center">
            <ArrowUp className="size-3" />
            {updatedCount} updated
          </span>
          <span className="text-muted-foreground">–{skippedCount} skipped</span>
          {failedCount > 0 && (
            <span className="text-destructive inline-flex items-center">
              <X className="size-3" />
              {failedCount} failed
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const PAGES_PER_VIEW = 25;

function PageRow({
  pg,
  projectId,
  jobId,
  runId,
}: {
  pg: SyncPageLog;
  projectId: string;
  jobId: string;
  runId: string;
}) {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<SyncLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recordPage, setRecordPage] = useState(1);
  const RECS_PER_PAGE = 50;

  const handleOpenChange = async (next: boolean) => {
    if (next && records.length === 0) {
      setLoading(true);
      try {
        const res = await syncLogsApi.listRecords(projectId, jobId, runId, {
          pageNumber: pg.pageNumber,
          limit: RECS_PER_PAGE,
          page: 1,
        });
        setRecords(res.data || []);
        setTotal(res.total || 0);
        setRecordPage(1);
      } catch {
        /* ignore */
      }
      setLoading(false);
    }
    setOpen(next);
  };

  const loadPage = async (p: number) => {
    setLoading(true);
    try {
      const res = await syncLogsApi.listRecords(projectId, jobId, runId, {
        pageNumber: pg.pageNumber,
        limit: RECS_PER_PAGE,
        page: p,
      });
      setRecords(res.data || []);
      setRecordPage(p);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const totalPages = Math.ceil(total / RECS_PER_PAGE);
  const hasFailed = pg.failedCount > 0;

  return (
    <Collapsible
      open={open}
      onOpenChange={handleOpenChange}
      className={cn(
        'bg-card overflow-hidden rounded-lg border',
        hasFailed && 'border-destructive/30',
      )}
    >
      <CollapsibleTrigger
        className={cn(
          'group hover:bg-muted/60 flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
          hasFailed && 'bg-destructive/5',
        )}
      >
        <ExpandChevron open={open} loading={loading} />
        <span className="text-muted-foreground w-16 shrink-0 font-mono text-xs">
          Page {pg.pageNumber}
        </span>
        <span className="text-xs">{pg.recordsFetched} fetched</span>
        <div className="ml-3 flex items-center gap-3">
          <span className="text-success text-xs">+{pg.createdCount}</span>
          <span className="text-info inline-flex items-center text-xs">
            <ArrowUp className="size-3" />
            {pg.updatedCount}
          </span>
          <span className="text-muted-foreground text-xs">
            –{pg.skippedCount}
          </span>
          {hasFailed && (
            <span className="text-destructive inline-flex items-center text-xs font-semibold">
              <X className="size-3" />
              {pg.failedCount}
            </span>
          )}
        </div>
        {!!pg.fetchDurationMs && pg.fetchDurationMs > 0 && (
          <span className="text-muted-foreground ml-auto shrink-0 text-xs">
            {pg.fetchDurationMs}ms
          </span>
        )}
      </CollapsibleTrigger>

      <CollapsibleContent className="bg-muted/20 border-t">
        {records.length === 0 && !loading ? (
          <div className="text-muted-foreground py-2 pr-4 pl-9 text-xs">
            No record logs for this page.
          </div>
        ) : (
          <>
            {records.map((rec, i) => {
              const ac =
                ACTION_CONFIG[rec.action as keyof typeof ACTION_CONFIG] ||
                ACTION_CONFIG.created;
              const Icon = ac.icon;
              return (
                <div
                  key={rec.id}
                  className={cn(
                    'flex items-center gap-3 py-2 pr-4 pl-9 text-xs',
                    i > 0 && 'border-border/60 border-t',
                  )}
                >
                  <Icon className={cn('size-2.5 shrink-0', ac.className)} />
                  <span
                    className="w-28 shrink-0 truncate font-mono"
                    title={rec.sourceRecordId}
                  >
                    {rec.sourceRecordId}
                  </span>
                  <span className="text-muted-foreground flex min-w-0 flex-1 items-center gap-1 truncate">
                    {rec.skipReasonDetail ||
                      rec.failReasonDetail ||
                      (rec.destRecordId ? (
                        <>
                          <ArrowRight className="size-3 shrink-0" />{' '}
                          {rec.destRecordId}
                        </>
                      ) : (
                        '—'
                      ))}
                  </span>
                </div>
              );
            })}
            {totalPages > 1 && (
              <div className="border-border/60 flex items-center justify-between border-t px-4 py-2">
                <span className="text-muted-foreground text-xs">
                  {(recordPage - 1) * RECS_PER_PAGE + 1}–
                  {Math.min(recordPage * RECS_PER_PAGE, total)} of {total}{' '}
                  records
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={recordPage <= 1}
                    onClick={() => loadPage(recordPage - 1)}
                  >
                    <ArrowLeft /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={recordPage >= totalPages}
                    onClick={() => loadPage(recordPage + 1)}
                  >
                    Next <ArrowRight />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

const ALL_FILTER_VALUE = '__all__';
const RECORD_FILTERS_PER_PAGE = 50;

interface RecordFilters {
  action?: string;
  skipReason?: string;
  failReason?: string;
  search?: string;
  pageNumber?: string;
}

function hasActiveFilters(f: RecordFilters): boolean {
  return !!(
    f.action ||
    f.skipReason ||
    f.failReason ||
    f.search ||
    f.pageNumber
  );
}

/** Filters records across every page of a run, not just the one page currently expanded —
 *  mirrors every filter the backend's records endpoint already supports (action, skip/fail
 *  reason, free-text search, and an exact page number), which had no UI before this. */
function RecordFilterBar({
  filters,
  onChange,
  onClear,
}: {
  filters: RecordFilters;
  onChange: (next: RecordFilters) => void;
  onClear: () => void;
}) {
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '');

  // Debounce free-text search so it doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchDraft !== (filters.search ?? '')) {
        onChange({ ...filters, search: searchDraft || undefined });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchDraft]);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
      <Filter className="text-muted-foreground size-3.5 shrink-0" />

      <Select
        value={filters.action ?? ALL_FILTER_VALUE}
        onValueChange={(v) =>
          onChange({
            ...filters,
            action: v === ALL_FILTER_VALUE ? undefined : v,
          })
        }
      >
        <SelectTrigger size="sm" className="h-8 w-32">
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value={ALL_FILTER_VALUE}>All actions</SelectItem>
          {ACTION_FILTER_OPTIONS.map((a) => (
            <SelectItem key={a} value={a}>
              {enumLabel(a)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.skipReason ?? ALL_FILTER_VALUE}
        onValueChange={(v) =>
          onChange({
            ...filters,
            skipReason: v === ALL_FILTER_VALUE ? undefined : v,
          })
        }
      >
        <SelectTrigger size="sm" className="h-8 w-40">
          <SelectValue placeholder="Skip reason" />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value={ALL_FILTER_VALUE}>Any skip reason</SelectItem>
          {SKIP_REASON_OPTIONS.map((r) => (
            <SelectItem key={r} value={r}>
              {enumLabel(r)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.failReason ?? ALL_FILTER_VALUE}
        onValueChange={(v) =>
          onChange({
            ...filters,
            failReason: v === ALL_FILTER_VALUE ? undefined : v,
          })
        }
      >
        <SelectTrigger size="sm" className="h-8 w-40">
          <SelectValue placeholder="Fail reason" />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value={ALL_FILTER_VALUE}>Any fail reason</SelectItem>
          {FAIL_REASON_OPTIONS.map((r) => (
            <SelectItem key={r} value={r}>
              {enumLabel(r)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={searchDraft}
        onChange={(e) => setSearchDraft(e.target.value)}
        placeholder="Search source/destination ID…"
        className="h-8 w-52"
      />

      <Input
        type="number"
        min={1}
        value={filters.pageNumber ?? ''}
        onChange={(e) =>
          onChange({ ...filters, pageNumber: e.target.value || undefined })
        }
        placeholder="Page #"
        className="h-8 w-20"
      />

      {hasActiveFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => {
            setSearchDraft('');
            onClear();
          }}
        >
          <X /> Clear filters
        </Button>
      )}
    </div>
  );
}

function FilteredRecordsList({
  projectId,
  jobId,
  runId,
  filters,
}: {
  projectId: string;
  jobId: string;
  runId: string;
  filters: RecordFilters;
}) {
  const [records, setRecords] = useState<SyncLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [
    filters.action,
    filters.skipReason,
    filters.failReason,
    filters.search,
    filters.pageNumber,
  ]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    syncLogsApi
      .listRecords(projectId, jobId, runId, {
        page,
        limit: RECORD_FILTERS_PER_PAGE,
        action: filters.action,
        skipReason: filters.skipReason,
        failReason: filters.failReason,
        search: filters.search,
        pageNumber: filters.pageNumber ? Number(filters.pageNumber) : undefined,
      })
      .then((res) => {
        if (cancelled) return;
        setRecords(res.data || []);
        setTotal(res.total || 0);
      })
      .catch(() => {
        if (!cancelled) {
          setRecords([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    projectId,
    jobId,
    runId,
    page,
    filters.action,
    filters.skipReason,
    filters.failReason,
    filters.search,
    filters.pageNumber,
  ]);

  const totalPages = Math.ceil(total / RECORD_FILTERS_PER_PAGE);

  if (loading && records.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 px-5 py-4 text-xs">
        <RefreshCw className="size-3 animate-spin" /> Loading records…
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-muted-foreground px-5 py-4 text-sm">
        No records match these filters.
      </div>
    );
  }

  return (
    <div className="px-5 py-3">
      <p className="text-muted-foreground mb-2 text-xs">
        {total} matching record{total !== 1 ? 's' : ''}
      </p>
      <div className="overflow-hidden rounded-lg border">
        {records.map((rec, i) => {
          const ac =
            ACTION_CONFIG[rec.action as keyof typeof ACTION_CONFIG] ||
            ACTION_CONFIG.created;
          const Icon = ac.icon;
          return (
            <div
              key={rec.id}
              className={cn(
                'bg-card flex items-center gap-3 py-2 pr-4 pl-4 text-xs',
                i > 0 && 'border-border/60 border-t',
              )}
            >
              <Icon className={cn('size-2.5 shrink-0', ac.className)} />
              <span className="text-muted-foreground w-14 shrink-0 font-mono">
                p{rec.pageNumber ?? '—'}
              </span>
              <span
                className="w-28 shrink-0 truncate font-mono"
                title={rec.sourceRecordId}
              >
                {rec.sourceRecordId}
              </span>
              <span className="text-muted-foreground flex min-w-0 flex-1 items-center gap-1 truncate">
                {rec.skipReasonDetail ||
                  rec.failReasonDetail ||
                  (rec.destRecordId ? (
                    <>
                      <ArrowRight className="size-3 shrink-0" />{' '}
                      {rec.destRecordId}
                    </>
                  ) : (
                    '—'
                  ))}
              </span>
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ArrowLeft /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ArrowRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RunLogRow({
  run,
  projectId,
  jobId,
  onRefresh,
}: {
  run: ExtSyncRun;
  projectId: string;
  jobId: string;
  onRefresh?: () => void | Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pages, setPages] = useState<SyncPageLog[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [stoppingRun, setStoppingRun] = useState(false);
  const [pageCursor, setPageCursor] = useState(0);
  const [recordFilters, setRecordFilters] = useState<RecordFilters>({});

  const cfg =
    RUN_STATUS_CONFIG[run.status as keyof typeof RUN_STATUS_CONFIG] ||
    RUN_STATUS_CONFIG.completed;
  const durationSec = run.durationMs
    ? (run.durationMs / 1000).toFixed(1)
    : null;

  const handleStopRun = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setStoppingRun(true);
    try {
      await jobsApi.stopJob(projectId, jobId);
      await new Promise((resolve) => {
        const check = async () => {
          try {
            const updated = await jobsApi.getJob(projectId, jobId);
            if (!updated.isRunning || updated.status !== 'active') {
              resolve(updated);
              return;
            }
          } catch {
            resolve(null);
            return;
          }
          setTimeout(check, 1500);
        };
        check();
      });
      await onRefresh?.();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message ??
          'Failed to stop the sync run. Please try again.',
      );
    }
    setStoppingRun(false);
  };

  const handleOpenChange = async (next: boolean) => {
    if (next && pages.length === 0) {
      setLoadingDetails(true);
      try {
        const pagesData = await syncLogsApi.listPages(projectId, jobId, run.id);
        setPages(pagesData || []);
      } catch {
        /* ignore */
      }
      setLoadingDetails(false);
    }
    setExpanded(next);
  };

  const visiblePages = pages.slice(pageCursor, pageCursor + PAGES_PER_VIEW);
  const totalPageCount = pages.length;
  const hasPrev = pageCursor > 0;
  const hasNext = pageCursor + PAGES_PER_VIEW < totalPageCount;

  return (
    <Collapsible
      open={expanded}
      onOpenChange={handleOpenChange}
      className="overflow-hidden rounded-xl border"
    >
      <CollapsibleTrigger
        className="bg-card hover:bg-muted/40 group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors"
        title={`Run ID: ${run.id}`}
      >
        <ExpandChevron open={expanded} bordered />

        <div className="flex shrink-0 items-center gap-2">
          <div
            className={cn(
              'size-2 shrink-0 rounded-full',
              cfg.dot,
              cfg.pulse && 'animate-pulse',
            )}
          />
          <Badge className="bg-muted text-muted-foreground rounded-full font-medium">
            {cfg.label}
          </Badge>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground text-xs">
              {run.startedAt
                ? format(new Date(run.startedAt), 'MMM d, HH:mm:ss')
                : '—'}
            </span>
            <Badge
              variant="secondary"
              className={cn(
                'gap-1 rounded',
                run.triggeredBy === 'resume' && 'bg-primary/10 text-primary',
              )}
            >
              {run.triggeredBy === 'resume' ? (
                <>
                  <RotateCcw className="size-3" /> resumed
                </>
              ) : (
                run.triggeredBy
              )}
            </Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatChip icon={Plus} tone="success">
              {run.createdCount || 0} created
            </StatChip>
            <StatChip icon={ArrowUp} tone="info">
              {run.updatedCount || 0} updated
            </StatChip>
            <StatChip icon={SkipForward} tone="muted">
              {run.skippedCount || 0} skipped
            </StatChip>
            {(run.failedCount || 0) > 0 && (
              <StatChip icon={X} tone="destructive">
                {run.failedCount} failed
              </StatChip>
            )}
            <StatChip tone="muted">{run.totalFetched || 0} fetched</StatChip>
            {durationSec && (
              <StatChip icon={Clock} tone="muted">
                {durationSec}s
              </StatChip>
            )}
          </div>
          {run.status === 'partial' && run.errorMessage && (
            <p className="text-warning mt-1 text-xs">{run.errorMessage}</p>
          )}
        </div>

        {run.sourcePlatform && run.destPlatform && (
          <PlatformPair
            sourcePlatformId={run.sourcePlatform}
            destPlatformId={run.destPlatform}
            variant="text"
            size="sm"
            className="text-muted-foreground shrink-0"
            arrowClassName="mx-0"
          />
        )}

        {run.status === 'running' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStopRun}
            disabled={stoppingRun}
            className="bg-warning/10 text-warning hover:bg-warning/20 h-6 shrink-0 px-2.5 text-xs"
            title="Stop this sync run"
          >
            {stoppingRun ? (
              <>
                <RefreshCw className="animate-spin" /> Stopping…
              </>
            ) : (
              <>
                <XCircle /> Stop
              </>
            )}
          </Button>
        )}
        {loadingDetails && (
          <RefreshCw className="text-muted-foreground size-3 shrink-0 animate-spin" />
        )}
      </CollapsibleTrigger>

      <CollapsibleContent className="bg-muted/40 border-t">
        {pages.length > 0 && (
          <RecordFilterBar
            filters={recordFilters}
            onChange={setRecordFilters}
            onClear={() => setRecordFilters({})}
          />
        )}
        {pages.length > 0 && hasActiveFilters(recordFilters) ? (
          <FilteredRecordsList
            projectId={projectId}
            jobId={jobId}
            runId={run.id}
            filters={recordFilters}
          />
        ) : pages.length > 0 ? (
          <div className="px-5 py-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-foreground text-sm font-semibold">
                  Page Breakdown
                </p>
                <p className="text-muted-foreground text-xs">
                  {totalPageCount} page{totalPageCount !== 1 ? 's' : ''} ·{' '}
                  {run.totalFetched || 0} records
                </p>
              </div>
              {totalPageCount > PAGES_PER_VIEW && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {pageCursor + 1}–
                    {Math.min(pageCursor + PAGES_PER_VIEW, totalPageCount)} of{' '}
                    {totalPageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={!hasPrev}
                    onClick={() =>
                      setPageCursor((c) => Math.max(0, c - PAGES_PER_VIEW))
                    }
                  >
                    <ArrowLeft /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={!hasNext}
                    onClick={() => setPageCursor((c) => c + PAGES_PER_VIEW)}
                  >
                    Next <ArrowRight />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {visiblePages.map((pg) => (
                <PageRow
                  key={pg.id}
                  pg={pg}
                  projectId={projectId}
                  jobId={jobId}
                  runId={run.id}
                />
              ))}
            </div>

            {totalPageCount > PAGES_PER_VIEW && (
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="text-muted-foreground text-xs">
                  Showing pages {pageCursor + 1}–
                  {Math.min(pageCursor + PAGES_PER_VIEW, totalPageCount)} of{' '}
                  {totalPageCount}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={!hasPrev}
                    onClick={() =>
                      setPageCursor((c) => Math.max(0, c - PAGES_PER_VIEW))
                    }
                  >
                    <ArrowLeft /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={!hasNext}
                    onClick={() => setPageCursor((c) => c + PAGES_PER_VIEW)}
                  >
                    Next <ArrowRight />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          !loadingDetails && (
            <div className="text-muted-foreground px-5 py-4 text-sm">
              No detailed page/record logs for this run.
            </div>
          )
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function RunHistoryTab() {
  const { projectId, job, activeRunLog, liveProgress, refetch } =
    useJobDetailContext();
  const jobId = job.id;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const runLogsQuery = useRunLogsQuery(projectId, jobId, page, pageSize);

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  const handleRefresh = async () => {
    await refetch();
    await runLogsQuery.refetch();
  };

  // A run starting or finishing refreshes the job-detail bundle (which drives
  // activeRunLog) — mirror that here so page 1 picks up the new/completed run
  // instead of only updating on the next manual page change.
  useEffect(() => {
    runLogsQuery.refetch();
  }, [activeRunLog?.status]);

  if (runLogsQuery.isError) {
    return <ErrorState onRetry={() => runLogsQuery.refetch()} />;
  }

  if (runLogsQuery.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const runLogs = runLogsQuery.data?.data ?? [];
  const total = runLogsQuery.data?.total ?? runLogs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (runLogs.length === 0 && activeRunLog?.status !== 'running') {
    return (
      <EmptyState
        icon={Clock}
        title="No sync runs yet"
        description="Detailed logs will appear after the first sync run."
      />
    );
  }

  return (
    <div className="space-y-4">
      {activeRunLog?.status === 'running' && (
        <LiveProgressBar runLog={activeRunLog} liveProgress={liveProgress} />
      )}
      {runLogs.length > 0 && (
        <>
          <ListStack>
            {runLogs.map((run) => (
              <RunLogRow
                key={run.id}
                run={run}
                projectId={projectId}
                jobId={jobId}
                onRefresh={handleRefresh}
              />
            ))}
          </ListStack>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}
    </div>
  );
}
