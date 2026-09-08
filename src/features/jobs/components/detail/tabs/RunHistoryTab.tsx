import { format } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  ChevronRight,
  Clock,
  Database,
  Edit2,
  Filter,
  Plus,
  RefreshCw,
  Search,
  SkipForward,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useJobDetailContext } from '../context';

import { jobsApi } from '@/api/jobs';
import { syncLogsApi, type SyncPageLog } from '@/api/syncLogs';
import { PlatformPair } from '@/components/platform';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ListStack from '@/components/shared/list/ListStack';
import PaginationBar from '@/components/shared/PaginationBar';
import StatusBadge from '@/components/shared/StatusBadge';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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

const RUN_STATUS_OPTIONS = [
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'partial', label: 'Partial' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'limit_reached', label: 'Limit reached' },
  { value: 'time_limit_reached', label: 'Time limit reached' },
  { value: 'running', label: 'Running' },
];

const RUN_TRIGGER_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'sync_all', label: 'All records' },
  { value: 'limit_sync', label: 'Limited run' },
  { value: 'cron', label: 'Automatic schedule' },
  { value: 'resume', label: 'Resumed' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'api', label: 'API' },
];

const RUN_PERIOD_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

function getRunStatus(run: ExtSyncRun): string {
  const executionStatus = run.executionStatus;
  if (
    executionStatus === 'cancelled' ||
    executionStatus === 'limit_reached' ||
    executionStatus === 'time_limit_reached'
  ) {
    return executionStatus;
  }
  if (run.status === 'completed' && (run.failedCount ?? 0) > 0) {
    return 'partial';
  }
  if (run.status === 'completed') return 'success';
  return run.status;
}

function getTriggerLabel(triggeredBy?: string): string {
  return (
    RUN_TRIGGER_OPTIONS.find((option) => option.value === triggeredBy)?.label ??
    enumLabel(triggeredBy || 'manual')
  );
}

function formatDuration(durationMs?: number): string {
  if (!durationMs) return '—';
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function friendlyRunMessage(message?: string | null): string | null {
  if (!message) return null;
  const normalized = message.toLowerCase();
  if (normalized.includes('monthly') && normalized.includes('limit')) {
    return 'This run stopped when the monthly record limit was reached. The remaining records were not changed.';
  }
  if (normalized.includes('execution window')) {
    return 'This run paused when its execution window ended. It will continue automatically from the saved position.';
  }
  if (normalized.includes('paused or deleted')) {
    return 'This run stopped because the sync job was paused or removed.';
  }
  if (
    normalized.includes('unauthorized') ||
    normalized.includes('authentication') ||
    normalized.includes('auth error')
  ) {
    return 'The platform connection needs attention. Reconnect it, then try the run again.';
  }
  if (normalized.includes('rate limit')) {
    return 'The platform temporarily limited requests. Wait a moment, then try again.';
  }
  if (normalized.includes('timeout') || normalized.includes('network')) {
    return 'The platform could not be reached reliably. Check the connection, then try again.';
  }
  return 'This run could not be completed. Review the failed records below, then try again.';
}

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

/**
 * The right-hand cell of a record row: why it was skipped/failed, or where it
 * landed. The reason badge names the category and the text is the one-line
 * cause the API already narrowed to this record — the full destination
 * response stays in the record log for anyone who needs it.
 */
function RecordReason({ rec }: { rec: SyncLogRecord }) {
  const reason = rec.skipReason || rec.failReason;
  const detail = rec.skipReasonDetail || rec.failReasonDetail;

  if (!reason && !detail) {
    return (
      <span className="text-muted-foreground flex min-w-0 flex-1 items-center gap-1 truncate">
        {rec.destRecordId ? (
          <>
            <ArrowRight className="size-3 shrink-0" /> {rec.destRecordId}
          </>
        ) : (
          '—'
        )}
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      {reason && (
        <Badge
          variant="outline"
          className={cn(
            'shrink-0 border-transparent font-normal',
            rec.action === 'failed'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {enumLabel(reason)}
        </Badge>
      )}
      <span
        className="text-muted-foreground min-w-0 flex-1 truncate"
        title={detail ?? undefined}
      >
        {detail || '—'}
      </span>
    </span>
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
  const [loadError, setLoadError] = useState(false);
  const [recordPage, setRecordPage] = useState(1);
  const RECS_PER_PAGE = 50;

  const handleOpenChange = async (next: boolean) => {
    if (next && records.length === 0) {
      setLoading(true);
      setLoadError(false);
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
        setLoadError(true);
      }
      setLoading(false);
    }
    setOpen(next);
  };

  const loadPage = async (p: number) => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await syncLogsApi.listRecords(projectId, jobId, runId, {
        pageNumber: pg.pageNumber,
        limit: RECS_PER_PAGE,
        page: p,
      });
      setRecords(res.data || []);
      setRecordPage(p);
    } catch {
      setLoadError(true);
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
        'bg-card overflow-hidden rounded-4xl border',
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
        {loadError ? (
          <div className="flex items-center justify-between gap-3 py-3 pr-4 pl-9">
            <span className="text-muted-foreground text-xs">
              Could not load records for this page.
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleOpenChange(true)}
            >
              <RefreshCw /> Try again
            </Button>
          </div>
        ) : records.length === 0 && !loading ? (
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
                  <RecordReason rec={rec} />
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

  useEffect(() => {
    setSearchDraft(filters.search ?? '');
  }, [filters.search]);

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
  const [loadError, setLoadError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);

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
    setLoadError(false);
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
          setLoadError(true);
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
    requestVersion,
  ]);

  const totalPages = Math.ceil(total / RECORD_FILTERS_PER_PAGE);

  if (loading && records.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 px-5 py-4 text-xs">
        <RefreshCw className="size-3 animate-spin" /> Loading records…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <span className="text-muted-foreground text-sm">
          Could not load matching records.
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRequestVersion((version) => version + 1)}
        >
          <RefreshCw /> Try again
        </Button>
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
      <div className="overflow-hidden rounded-4xl border">
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
              <RecordReason rec={rec} />
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
  recordSearch,
  onRefresh,
}: {
  run: ExtSyncRun;
  projectId: string;
  jobId: string;
  recordSearch?: string;
  onRefresh?: () => void | Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pages, setPages] = useState<SyncPageLog[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [stoppingRun, setStoppingRun] = useState(false);
  const [pageCursor, setPageCursor] = useState(0);
  const [recordFilters, setRecordFilters] = useState<RecordFilters>({
    search: recordSearch || undefined,
  });

  useEffect(() => {
    setRecordFilters((current) => ({
      ...current,
      search: recordSearch || undefined,
    }));
  }, [recordSearch]);

  const displayStatus = getRunStatus(run);
  const recordsSynced = (run.createdCount ?? 0) + (run.updatedCount ?? 0);
  const runMessage = friendlyRunMessage(run.errorMessage);

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
      setDetailError(false);
      try {
        const pagesData = await syncLogsApi.listPages(projectId, jobId, run.id);
        setPages(pagesData || []);
      } catch {
        setDetailError(true);
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
      className="bg-card overflow-hidden rounded-4xl border"
    >
      <div className="hover:bg-muted/30 flex items-stretch transition-colors">
        <CollapsibleTrigger
          className="group flex min-w-0 flex-1 items-center gap-4 px-4 py-3 text-left sm:px-5"
          title={`Run ID: ${run.id}`}
        >
          <StatusBadge status={displayStatus} size="sm" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {run.sourceObject && run.destObject
                ? `${enumLabel(run.sourceObject)} → ${enumLabel(run.destObject)}`
                : `${getTriggerLabel(run.triggeredBy)} sync`}
            </p>
            <div className="text-muted-foreground mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs">
              <span>{getTriggerLabel(run.triggeredBy)}</span>
              {run.sourcePlatform && run.destPlatform && (
                <>
                  <span aria-hidden="true">·</span>
                  <PlatformPair
                    sourcePlatformId={run.sourcePlatform}
                    destPlatformId={run.destPlatform}
                    variant="text"
                    size="sm"
                    className="min-w-0"
                    arrowClassName="mx-0"
                  />
                </>
              )}
            </div>
            <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-1.5 text-xs lg:hidden">
              <span>
                {run.startedAt
                  ? format(new Date(run.startedAt), 'MMM d · h:mm a')
                  : 'Start time unavailable'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{recordsSynced.toLocaleString()} synced</span>
              <span aria-hidden="true">·</span>
              <span>{formatDuration(run.durationMs)}</span>
            </div>
          </div>

          <div className="hidden shrink-0 items-center divide-x lg:flex">
            <div className="min-w-36 px-5">
              <p className="text-muted-foreground text-xs">Started</p>
              <p className="mt-0.5 text-sm font-medium">
                {run.startedAt
                  ? format(new Date(run.startedAt), 'MMM d, yyyy · h:mm a')
                  : '—'}
              </p>
            </div>
            <div className="min-w-28 px-5">
              <p className="text-muted-foreground text-xs">Records synced</p>
              <p className="mt-0.5 text-sm font-medium">
                {recordsSynced.toLocaleString()}
              </p>
            </div>
            <div className="min-w-24 px-5">
              <p className="text-muted-foreground text-xs">Duration</p>
              <p className="mt-0.5 text-sm font-medium">
                {formatDuration(run.durationMs)}
              </p>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
            {loadingDetails && (
              <RefreshCw className="text-muted-foreground size-3 animate-spin" />
            )}
            <ExpandChevron open={expanded} bordered />
          </div>
        </CollapsibleTrigger>

        {run.status === 'running' && (
          <div className="flex items-center pr-3">
            <Separator orientation="vertical" className="mr-3 h-7" />
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
          </div>
        )}
      </div>

      <CollapsibleContent className="bg-muted border-t">
        <div className="grid grid-cols-2 border-b sm:grid-cols-3 lg:grid-cols-5">
          {[
            ['Processed', run.totalFetched ?? 0],
            ['Created', run.createdCount ?? 0],
            ['Updated', run.updatedCount ?? 0],
            ['Skipped', run.skippedCount ?? 0],
            ['Failed', run.failedCount ?? 0],
          ].map(([label, value], index) => (
            <div
              key={label}
              className={cn(
                'p-1.5',
                index > 0 && 'border-l',
                index > 1 && 'max-sm:border-t',
              )}
            >
              <div className="bg-card space-y-1 rounded-4xl border px-3 py-2">
                <p
                  className={cn(
                    'text-md mt-0.5 font-semibold',
                    label === 'Failed' &&
                      Number(value) > 0 &&
                      'text-destructive',
                  )}
                >
                  {Number(value).toLocaleString()}
                </p>
                <p className="text-muted-foreground text-xs">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {runMessage && (
          <div
            className={cn(
              'mx-5 mt-4 rounded-4xl border px-4 py-3 text-sm',
              displayStatus === 'failed'
                ? 'border-destructive/20 bg-destructive/5 text-destructive'
                : 'border-warning/20 bg-warning/5 text-foreground',
            )}
          >
            <p className="font-medium">
              {displayStatus === 'failed'
                ? 'Why this run failed'
                : 'Why this run stopped early'}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">{runMessage}</p>
          </div>
        )}

        {pages.length > 0 && (
          <RecordFilterBar
            filters={recordFilters}
            onChange={setRecordFilters}
            onClear={() => setRecordFilters({})}
          />
        )}
        {detailError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
            <div>
              <p className="text-sm font-medium">Could not load run details</p>
              <p className="text-muted-foreground text-xs">
                Check your connection and try again.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenChange(true)}
            >
              <RefreshCw /> Try again
            </Button>
          </div>
        ) : pages.length > 0 && hasActiveFilters(recordFilters) ? (
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
              {(run.totalFetched ?? 0) === 0
                ? 'No matching records were found for this run. Nothing was changed.'
                : 'Detailed record logs are not available for this run.'}
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
  const [status, setStatus] = useState(ALL_FILTER_VALUE);
  const [triggeredBy, setTriggeredBy] = useState(ALL_FILTER_VALUE);
  const [period, setPeriod] = useState('all');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchDraft.trim()), 400);
    return () => clearTimeout(timeout);
  }, [searchDraft]);

  const since = useMemo(() => {
    if (period === 'all') return undefined;
    const date = new Date();
    date.setDate(date.getDate() - Number(period));
    return date.toISOString();
  }, [period]);

  const runFilters = useMemo(
    () => ({
      status: status === ALL_FILTER_VALUE ? undefined : status,
      triggeredBy: triggeredBy === ALL_FILTER_VALUE ? undefined : triggeredBy,
      since,
      search: search || undefined,
    }),
    [search, since, status, triggeredBy],
  );

  const runLogsQuery = useRunLogsQuery(
    projectId,
    jobId,
    page,
    pageSize,
    true,
    runFilters,
  );

  const hasFilters =
    status !== ALL_FILTER_VALUE ||
    triggeredBy !== ALL_FILTER_VALUE ||
    period !== 'all' ||
    !!search;

  useEffect(() => {
    setPage(1);
  }, [status, triggeredBy, period, search]);

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

  const runLogs = runLogsQuery.data?.data ?? [];
  const total = runLogsQuery.data?.total ?? runLogs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const clearFilters = () => {
    setStatus(ALL_FILTER_VALUE);
    setTriggeredBy(ALL_FILTER_VALUE);
    setPeriod('all');
    setSearchDraft('');
    setSearch('');
  };

  return (
    <Card className="gap-0 overflow-hidden">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="shrink-0">
          <CardTitle>Run history</CardTitle>
          <CardDescription className="mt-1">
            Review each sync run and expand it for page and record details.
          </CardDescription>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
          <div className="relative w-56">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search record ID"
              aria-label="Search runs by record ID"
              className="h-9 pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger size="sm" className="h-9 w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL_FILTER_VALUE}>All statuses</SelectItem>
                {RUN_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={triggeredBy} onValueChange={setTriggeredBy}>
              <SelectTrigger size="sm" className="h-9 w-40">
                <SelectValue placeholder="Run type" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL_FILTER_VALUE}>All run types</SelectItem>
                {RUN_TRIGGER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger size="sm" className="h-9 w-40">
                <CalendarDays className="text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {RUN_PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X /> Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-5">
        {activeRunLog?.status === 'running' && (
          <LiveProgressBar runLog={activeRunLog} liveProgress={liveProgress} />
        )}

        {runLogsQuery.isError ? (
          <ErrorState onRetry={() => runLogsQuery.refetch()} />
        ) : runLogsQuery.isLoading ? (
          <div className="space-y-3" aria-label="Loading run history">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-4xl" />
            ))}
          </div>
        ) : runLogs.length === 0 ? (
          <EmptyState
            icon={hasFilters ? Search : Database}
            title={hasFilters ? 'No matching runs' : 'No sync runs yet'}
            description={
              hasFilters
                ? 'Try a different record ID, status, run type, or date range.'
                : 'Run this sync job to see its history and record details here.'
            }
            action={
              hasFilters
                ? { label: 'Clear filters', onClick: clearFilters, icon: X }
                : null
            }
          />
        ) : (
          <>
            <ListStack>
              {runLogs.map((run) => (
                <RunLogRow
                  key={run.id}
                  run={run}
                  projectId={projectId}
                  jobId={jobId}
                  recordSearch={search}
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
              disabled={runLogsQuery.isFetching}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
