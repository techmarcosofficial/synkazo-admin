import { format } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  CircleAlert,
  ChevronRight,
  Clock,
  Copy,
  Database,
  Edit2,
  FileText,
  Info,
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
import { RecordReason } from './RecordReason';

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
  created: {
    className: 'text-success',
    badgeClassName: 'bg-success/10 text-success',
    icon: Plus,
    label: 'Created',
  },
  updated: {
    className: 'text-info',
    badgeClassName: 'bg-info/10 text-info',
    icon: Edit2,
    label: 'Updated',
  },
  skipped: {
    className: 'text-muted-foreground',
    badgeClassName: 'bg-muted text-muted-foreground',
    icon: SkipForward,
    label: 'Skipped',
  },
  failed: {
    className: 'text-destructive',
    badgeClassName: 'bg-destructive/10 text-destructive',
    icon: XCircle,
    label: 'Failed',
  },
};

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

const DEFAULT_RECORDS_PER_PAGE = 25;
const RECORDS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const PAGE_RECORD_FILTERS = [
  'all',
  'created',
  'updated',
  'failed',
  'skipped',
] as const;

type PageRecordFilter = (typeof PAGE_RECORD_FILTERS)[number];

function formatPageDuration(durationMs: number | null): string {
  if (durationMs == null) return '—';
  if (durationMs < 1000) return `${durationMs}ms`;
  return formatDuration(durationMs);
}

function PageRow({
  pg,
  projectId,
  jobId,
  runId,
  recordSearch,
  recordContext,
}: {
  pg: SyncPageLog;
  projectId: string;
  jobId: string;
  runId: string;
  recordSearch?: string;
  recordContext?: {
    sourceObject?: string;
    destObject?: string;
    sourcePlatform?: string;
    destPlatform?: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<SyncLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [recordPage, setRecordPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_RECORDS_PER_PAGE);
  const [filter, setFilter] = useState<PageRecordFilter>('all');
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    syncLogsApi
      .listRecords(projectId, jobId, runId, {
        pageNumber: pg.pageNumber,
        action: filter === 'all' ? undefined : filter,
        search: recordSearch,
        limit: pageSize,
        page: recordPage,
      })
      .then((res) => {
        if (cancelled) return;
        setRecords(res.data || []);
        setTotal(res.total || 0);
      })
      .catch(() => {
        if (cancelled) return;
        setRecords([]);
        setTotal(0);
        setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    filter,
    jobId,
    open,
    pg.pageNumber,
    pageSize,
    projectId,
    recordPage,
    recordSearch,
    requestVersion,
    runId,
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFailed = pg.failedCount > 0;
  const loggedRecordCount =
    pg.createdCount + pg.updatedCount + pg.skippedCount + pg.failedCount;
  const filterCounts: Record<PageRecordFilter, number> = {
    all: filter === 'all' && !loading && !loadError ? total : loggedRecordCount,
    created: pg.createdCount,
    updated: pg.updatedCount,
    failed: pg.failedCount,
    skipped: pg.skippedCount,
  };
  const metrics = [
    { label: 'Fetched', value: pg.recordsFetched, className: '' },
    { label: 'Created', value: pg.createdCount, className: 'text-success' },
    { label: 'Updated', value: pg.updatedCount, className: 'text-info' },
    {
      label: 'Skipped',
      value: pg.skippedCount,
      className: 'text-muted-foreground',
    },
    {
      label: 'Failed',
      value: pg.failedCount,
      className: hasFailed ? 'text-destructive' : 'text-muted-foreground',
    },
  ];

  const changeFilter = (nextFilter: PageRecordFilter) => {
    if (nextFilter === filter) return;
    setLoading(true);
    setLoadError(false);
    setRecords([]);
    setRecordPage(1);
    setFilter(nextFilter);
  };

  const changeRecordPage = (nextPage: number) => {
    setRecords([]);
    setRecordPage(nextPage);
  };

  const changePageSize = (nextPageSize: number) => {
    setRecords([]);
    setRecordPage(1);
    setPageSize(nextPageSize);
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        'bg-card overflow-hidden rounded-2xl border',
        hasFailed && 'border-destructive/30',
      )}
    >
      <div
        className={cn(
          'min-h- flex w-full flex-nowrap items-center gap-1.5 px-2.5 py-1 text-xs transition-colors',
          hasFailed && 'bg-destructive/5',
        )}
      >
        <CollapsibleTrigger className="group hover:text-foreground flex min-w-0 flex-1 items-center gap-x-2.5 overflow-x-auto text-left whitespace-nowrap transition-colors">
          <span className="flex shrink-0 items-center gap-1.5 font-medium">
            <FileText className="text-muted-foreground size-3.5" />
            Page {pg.pageNumber}
          </span>
          {metrics.map((metric) => (
            <span
              key={metric.label}
              className={cn(
                'shrink-0 tabular-nums',
                metric.label === 'Fetched'
                  ? 'text-muted-foreground'
                  : metric.className,
              )}
            >
              {metric.value.toLocaleString()} {metric.label.toLowerCase()}
            </span>
          ))}
          <span className="text-muted-foreground flex shrink-0 items-center gap-1 tabular-nums">
            <Clock className="size-3" />
            {formatPageDuration(pg.fetchDurationMs)}
          </span>
        </CollapsibleTrigger>

        {open && (
          <>
            <div
              className="ml-auto flex max-w-[58vw] shrink-0 items-center justify-end gap-1 overflow-x-auto"
              role="group"
              aria-label={`Page ${pg.pageNumber} record filters`}
            >
              {PAGE_RECORD_FILTERS.map((option) => {
                const active = filter === option;
                const actionConfig =
                  option === 'all' ? null : ACTION_CONFIG[option];
                return (
                  <Button
                    key={option}
                    type="button"
                    variant={active ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'h-6 rounded-md px-2 text-[11px]',
                      active && actionConfig?.className,
                    )}
                    aria-pressed={active}
                    onClick={() => changeFilter(option)}
                  >
                    {option === 'all' ? 'All' : actionConfig?.label}
                    <span className="text-muted-foreground tabular-nums">
                      {filterCounts[option].toLocaleString()}
                    </span>
                  </Button>
                );
              })}
            </div>
            <Separator orientation="vertical" className="my-auto mr-1 h-4" />
          </>
        )}

        <CollapsibleTrigger
          className="group flex size-5 shrink-0 items-center justify-center rounded-full border"
          aria-label={`${open ? 'Collapse' : 'Expand'} page ${pg.pageNumber} records`}
        >
          <ExpandChevron open={open} />
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="bg-card overflow-hidden border-t">
          {loadError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-4">
              <span className="text-muted-foreground text-xs">
                Could not load records for this page.
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setRequestVersion((version) => version + 1)}
              >
                <RefreshCw /> Try again
              </Button>
            </div>
          ) : loading && records.length === 0 ? (
            <div className="space-y-1.5 p-3" aria-label="Loading page records">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-full rounded-lg" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="text-muted-foreground px-3 py-4 text-xs">
              No {filter === 'all' ? '' : `${filter} `}record logs for this
              page.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="w-12 px-3 py-1.5 font-medium">#</th>
                    <th className="px-3 py-1.5 font-medium">Source ID</th>
                    <th className="px-3 py-1.5 font-medium">Status</th>
                    <th className="px-3 py-1.5 font-medium">Destination ID</th>
                    <th className="px-3 py-1.5 font-medium">Error / reason</th>
                  </tr>
                </thead>
                <tbody className="align-middle">
                  {records.map((record, index) => {
                    const actionConfig =
                      ACTION_CONFIG[record.action] || ACTION_CONFIG.created;
                    return (
                      <tr
                        key={record.id}
                        className={cn(
                          'border-t align-middle',
                          record.action === 'failed' &&
                            'bg-destructive/[0.025]',
                        )}
                      >
                        <td className="text-muted-foreground px-3 py-1.5 tabular-nums">
                          {(recordPage - 1) * pageSize + index + 1}
                        </td>
                        <td
                          className="max-w-56 truncate px-3 py-1.5 font-mono"
                          title={record.sourceRecordId}
                        >
                          {record.sourceRecordId}
                        </td>
                        <td className="px-3 py-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              'border-transparent font-normal',
                              actionConfig.badgeClassName,
                            )}
                          >
                            {actionConfig.label}
                          </Badge>
                        </td>
                        <td
                          className="text-muted-foreground max-w-56 truncate px-3 py-1.5 font-mono"
                          title={record.destRecordId ?? undefined}
                        >
                          {record.destRecordId || '—'}
                        </td>
                        <td className="max-w-sm px-3 py-1.5">
                          <RecordReason rec={record} context={recordContext} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loadError && total > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2">
              <span className="text-muted-foreground text-xs tabular-nums">
                Showing {(recordPage - 1) * pageSize + 1}–
                {Math.min(recordPage * pageSize, total)} of{' '}
                {total.toLocaleString()}
              </span>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                <label
                  className="text-muted-foreground text-xs"
                  htmlFor={`page-${pg.id}-page-size`}
                >
                  Rows per page
                </label>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => changePageSize(Number(value))}
                >
                  <SelectTrigger
                    id={`page-${pg.id}-page-size`}
                    size="sm"
                    className="h-6! rounded-xl"
                    aria-label={`Rows per page for sync page ${pg.pageNumber}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECORDS_PER_PAGE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Separator orientation="vertical" className="my-auto h-5" />
                <Button
                  variant="outline"
                  size="xs"
                  className="rounded-xl"
                  disabled={loading || recordPage <= 1}
                  onClick={() => changeRecordPage(recordPage - 1)}
                  aria-label={`Previous records for page ${pg.pageNumber}`}
                >
                  <ArrowLeft /> Previous
                </Button>
                <span className="text-muted-foreground min-w-20 text-center text-xs tabular-nums">
                  Page {recordPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  className="rounded-xl"
                  disabled={loading || recordPage >= totalPages}
                  onClick={() => changeRecordPage(recordPage + 1)}
                  aria-label={`Next records for page ${pg.pageNumber}`}
                >
                  Next <ArrowRight />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

const ALL_FILTER_VALUE = '__all__';
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

  return (
    <Collapsible
      open={expanded}
      onOpenChange={handleOpenChange}
      className="bg-card overflow-hidden rounded-4xl border"
    >
      <div className="hover:bg-muted/30 flex items-stretch transition-colors">
        <CollapsibleTrigger
          className="group flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left"
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
            <div className="min-w-36 px-4">
              <p className="text-muted-foreground text-xs">Started</p>
              <p className="mt-0.5 text-sm font-medium">
                {run.startedAt
                  ? format(new Date(run.startedAt), 'MMM d, yyyy · h:mm a')
                  : '—'}
              </p>
            </div>
            <div className="min-w-28 px-4">
              <p className="text-muted-foreground text-xs">Records synced</p>
              <p className="mt-0.5 text-sm font-medium">
                {recordsSynced.toLocaleString()}
              </p>
            </div>
            <div className="min-w-24 px-4">
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

      <CollapsibleContent className="bg-muted/35 border-t">
        <div className="space-y-4 p-4">
          <section>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {[
                {
                  label: 'Processed',
                  value: run.totalFetched ?? 0,
                  icon: FileText,
                  iconClassName: 'text-muted-foreground',
                },
                {
                  label: 'Created',
                  value: run.createdCount ?? 0,
                  icon: Plus,
                  iconClassName: 'text-success',
                },
                {
                  label: 'Updated',
                  value: run.updatedCount ?? 0,
                  icon: Edit2,
                  iconClassName: 'text-info',
                },
                {
                  label: 'Skipped',
                  value: run.skippedCount ?? 0,
                  icon: SkipForward,
                  iconClassName: 'text-warning',
                },
                {
                  label: 'Failed',
                  value: run.failedCount ?? 0,
                  icon: CircleAlert,
                  iconClassName: 'text-destructive',
                },
              ].map(({ label, value, icon: MetricIcon, iconClassName }) => (
                <div
                  key={label}
                  className="bg-card flex items-center gap-2.5 rounded-2xl border px-3 py-2.5"
                >
                  <div className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full">
                    <MetricIcon className={cn('size-3.5', iconClassName)} />
                  </div>
                  <div>
                    <p className="text-base leading-none font-semibold">
                      {Number(value).toLocaleString()}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {runMessage && (
            <div
              className={cn(
                'flex gap-2.5 rounded-2xl border px-3.5 py-2.5',
                displayStatus === 'failed'
                  ? 'border-destructive/25 bg-destructive/5'
                  : 'border-warning/25 bg-warning/5',
              )}
            >
              <CircleAlert
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  displayStatus === 'failed'
                    ? 'text-destructive'
                    : 'text-warning',
                )}
              />
              <div>
                <p className="text-sm font-semibold">
                  {displayStatus === 'failed'
                    ? 'Why this run failed'
                    : 'Why this run stopped early'}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {runMessage}
                </p>
              </div>
            </div>
          )}

          {detailError ? (
            <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-3xl border px-4 py-4">
              <div>
                <p className="text-sm font-medium">
                  Could not load run details
                </p>
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
          ) : pages.length > 0 ? (
            <section>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">Page Breakdown</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Expand a page to review and filter only its records.
                  </p>
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-1.5 text-xs transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(run.id);
                    toast.success('Run ID copied');
                  }}
                >
                  <span className="max-w-56 truncate">Run ID: {run.id}</span>
                  <Copy className="size-3.5 shrink-0" />
                </button>
              </div>
              <div className="space-y-1">
                {pages.map((pageLog) => (
                  <PageRow
                    key={pageLog.id}
                    pg={pageLog}
                    projectId={projectId}
                    jobId={jobId}
                    runId={run.id}
                    recordSearch={recordSearch}
                    recordContext={{
                      sourceObject: run.sourceObject,
                      destObject: run.destObject,
                      sourcePlatform: run.sourcePlatform,
                      destPlatform: run.destPlatform,
                    }}
                  />
                ))}
              </div>
            </section>
          ) : (
            !loadingDetails && (
              <div className="bg-card text-muted-foreground rounded-3xl border px-4 py-4 text-sm">
                {(run.totalFetched ?? 0) === 0
                  ? 'No matching records were found for this run. Nothing was changed.'
                  : 'Detailed record logs are not available for this run.'}
              </div>
            )
          )}
        </div>
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
      <CardHeader className="flex flex-col gap-4 border-b pb-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="shrink-0">
          <CardTitle>Run History</CardTitle>
          <CardDescription className="mt-1">
            Review each sync run and expand it for page and record details.
          </CardDescription>
        </div>

        <div
          className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end"
          aria-label="Run History filters"
        >
          <div className="relative min-w-56 flex-1 xl:w-72 xl:flex-none">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search run or record ID…"
              aria-label="Search Run History"
              className="h-9 pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                <SelectValue placeholder="Sync type" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL_FILTER_VALUE}>All sync types</SelectItem>
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
        <div className="bg-info/5 text-muted-foreground border-info/10 flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs">
          <Info className="text-info size-3.5 shrink-0" />
          Run filters narrow this history. Record filters stay scoped to the
          page you expand.
        </div>

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
