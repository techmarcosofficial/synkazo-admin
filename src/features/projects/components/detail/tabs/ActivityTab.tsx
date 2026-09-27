import { format } from 'date-fns';
import {
  AlertCircle,
  ArrowUpRight,
  Clock,
  Database,
  RefreshCw,
  Timer,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useProjectDetailContext } from '../context';

import type { ActivityLog } from '@/api/activity';
import { PlatformPair } from '@/components/platform';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PaginationBar from '@/components/shared/PaginationBar';
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useProjectActivityQuery } from '@/queries/useActivity';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];
const PAGE_SIZE_STORAGE_KEY = 'sb_activity_page_size';

function readStoredPageSize(): number {
  try {
    const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : 20;
  } catch {
    return 20;
  }
}

function statusFor(log: ActivityLog): string {
  if (log.metadata?.status) return log.metadata.status;
  if (log.level === 'success') return 'success';
  if (log.level === 'error') return 'failed';
  if (log.level === 'warn') return 'partial';
  return 'pending';
}

function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDuration(ms?: number | null): string {
  if (ms == null) return '—';
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function triggerLabel(triggeredBy?: string): string | null {
  if (!triggeredBy) return null;
  const labels: Record<string, string> = {
    cron: 'Scheduled run',
    manual: 'Manual run',
    api: 'API run',
    resume: 'Resumed run',
    sync_all: 'All records',
    limit_sync: 'Limited run',
    webhook: 'Webhook run',
  };
  return labels[triggeredBy] ?? titleCase(triggeredBy);
}

export default function ActivityTab() {
  const { projectId, project, jobs } = useProjectDetailContext();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(readStoredPageSize);

  const query = useProjectActivityQuery(projectId, page, limit);
  const res = query.data;
  const logs = res?.data ?? [];
  const total = res?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  function handleLimitChange(next: number) {
    setLimit(next);
    setPage(1);
    try {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(next));
    } catch {
      // localStorage unavailable (e.g. private browsing) — selection just won't persist
    }
  }

  const renderHeader = () => (
    <CardHeader className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <CardTitle>Sync activity</CardTitle>
        <CardDescription className="mt-1">
          Complete history of sync executions, record outcomes, and timings across this project.
        </CardDescription>
      </div>
      <CardAction className="flex items-center gap-2.5">
        <Badge variant="secondary" className="px-2.5 py-1 text-xs font-medium">
          {total.toLocaleString()} total event{total !== 1 ? 's' : ''}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="gap-1.5 rounded-xl text-xs"
        >
          <RefreshCw className={cn('size-3.5', query.isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </CardAction>
    </CardHeader>
  );

  if (query.isLoading) {
    return (
      <Card className="gap-0 overflow-hidden">
        {renderHeader()}
        <CardContent className="space-y-3 p-4 sm:p-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex min-h-[100px] flex-col justify-between gap-3 rounded-3xl border p-4 sm:p-5"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-5 w-48 rounded-lg" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-8 w-28 rounded-xl" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (query.isError && !res) {
    return (
      <Card className="gap-0 overflow-hidden">
        {renderHeader()}
        <CardContent className="p-6">
          <ErrorState onRetry={() => query.refetch()} />
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="gap-0 overflow-hidden">
        {renderHeader()}
        <CardContent className="p-6">
          <div className="rounded-3xl border">
            <EmptyState
              icon={Database}
              title="No sync activity yet"
              description="When a sync job runs, its status, record counts, and timing will appear here."
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden">
      {renderHeader()}

      <CardContent className="space-y-3 p-4 sm:p-5">
        {logs.map((log) => {
          const matchedJob = jobs.find((j) => j.id === log.jobId);
          const jobName = log.metadata?.jobName ?? matchedJob?.name ?? 'Sync run';
          const sourcePlatformId =
            log.metadata?.sourcePlatformId ?? project.sourcePlatformId;
          const destPlatformId =
            log.metadata?.destPlatformId ?? project.destPlatformId;
          const entity =
            log.metadata?.sourceObject && log.metadata?.destObject
              ? `${titleCase(log.metadata.sourceObject)} → ${titleCase(log.metadata.destObject)}`
              : jobName;
          const completedAt = log.createdAt ? new Date(log.createdAt) : null;
          const hasValidDate = completedAt && !Number.isNaN(completedAt.getTime());
          const failedRecords = log.metadata?.recordsFailed ?? 0;
          const status = statusFor(log);
          const isFailed = status === 'failed';
          const runType = triggerLabel(log.metadata?.triggeredBy);
          const linkHref = log.jobId
            ? `/projects/${projectId}/jobs/${log.jobId}?tab=run-history`
            : null;

          return (
            <div
              key={log.id}
              className={cn(
                'group relative flex min-h-[100px] flex-col justify-between gap-4 rounded-3xl border bg-card p-4 transition-all duration-200 hover:border-border hover:shadow-xs sm:flex-row sm:items-center sm:p-5',
                isFailed && 'border-destructive/25 bg-destructive/[0.02]',
              )}
            >
              {/* Left Column: Status, Platforms & Entity flow */}
              <div className="flex min-w-0 flex-1 items-start gap-3.5">
                <div className="mt-0.5 shrink-0">
                  <StatusBadge status={status} size="sm" />
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold tracking-tight text-foreground">
                      {entity}
                    </p>
                    {sourcePlatformId && destPlatformId && (
                      <PlatformPair
                        sourcePlatformId={sourcePlatformId}
                        destPlatformId={destPlatformId}
                        variant="text"
                        size="sm"
                        className="text-xs"
                      />
                    )}
                  </div>

                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    {jobName && jobName !== entity && (
                      <span className="font-medium text-foreground/80 max-w-48 truncate">
                        {jobName}
                      </span>
                    )}
                    {jobName && jobName !== entity && runType && (
                      <span aria-hidden="true">·</span>
                    )}
                    {runType && (
                      <Badge
                        variant="secondary"
                        className="h-5 px-2 text-[11px] font-medium"
                      >
                        {runType}
                      </Badge>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="size-3 text-muted-foreground" />
                      {hasValidDate
                        ? format(completedAt, 'MMM d, yyyy · h:mm a')
                        : 'Time unavailable'}
                    </span>
                  </div>

                  {log.message && isFailed && (
                    <div className="flex items-center gap-1.5 pt-0.5 text-xs text-destructive">
                      <AlertCircle className="size-3.5 shrink-0" />
                      <span className="line-clamp-1">{log.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Middle Column: Operational Metrics */}
              <div className="flex shrink-0 flex-wrap items-center gap-4 sm:flex-col sm:items-end sm:gap-1.5">
                <div className="flex items-baseline gap-1 text-left sm:text-right">
                  <span className="text-base font-bold tabular-nums text-foreground">
                    {(log.recordsProcessed ?? 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    synced
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {failedRecords > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-destructive/10 text-destructive border-destructive/20 h-5 px-2 text-[11px] font-semibold"
                    >
                      {failedRecords.toLocaleString()} failed
                    </Badge>
                  )}
                  <span className="text-muted-foreground inline-flex items-center gap-1 tabular-nums">
                    <Timer className="size-3.5" />
                    {formatDuration(log.durationMs)}
                  </span>
                </div>
              </div>

              {/* Right Column: Direct Navigation & Action flow */}
              <div className="flex shrink-0 items-center justify-end gap-2 border-t pt-2 sm:border-t-0 sm:pt-0">
                {linkHref ? (
                  <>
                    {failedRecords > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 gap-1 rounded-xl bg-destructive/10 text-xs font-medium text-destructive hover:bg-destructive/20"
                      >
                        <Link
                          to={linkHref}
                          state={{
                            jobBackTo: `/projects/${projectId}?tab=activity`,
                            jobBackLabel: 'Back to Project Activity',
                          }}
                        >
                          <Wrench className="size-3" />
                          <span>Triage</span>
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-8 gap-1.5 rounded-xl text-xs font-medium hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors"
                    >
                      <Link
                        to={linkHref}
                        state={{
                          jobBackTo: `/projects/${projectId}?tab=activity`,
                          jobBackLabel: 'Back to Project Activity',
                        }}
                      >
                        <span>Run details</span>
                        <ArrowUpRight className="size-3.5 opacity-70" />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>

      <CardFooter className="border-t p-4 sm:p-5">
        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={handleLimitChange}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
        />
      </CardFooter>
    </Card>
  );
}
