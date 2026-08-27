import { format, formatDistanceToNow, subDays, subHours } from 'date-fns';
import { ChevronDown, Clock, Download, FileText, Lock } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

import { syncLogsApi } from '@/api/syncLogs';
import { PlatformPair } from '@/components/platform';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PageHeader from '@/components/shared/PageHeader';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
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
import type { OrgSyncLog as SyncLog } from '@/features/dashboard';
import { cn } from '@/lib/utils';
import { useOrgSyncLogsQuery } from '@/queries/useDashboard';
import { useEntitlements } from '@/queries/useEntitlements';
import { useJobsQuery } from '@/queries/useJobs';

const LEVEL_OPTIONS = [
  { key: 'all', label: 'All activity' },
  { key: 'success', label: 'Successful' },
  { key: 'error', label: 'Errors only' },
  { key: 'warn', label: 'Warnings' },
];

const BADGE: Record<string, { label: string }> = {
  success: { label: 'Success' },
  error: { label: 'Failed' },
  warn: { label: 'Warning' },
  info: { label: 'Info' },
};

const DOT: Record<string, string> = {
  success: 'bg-success',
  error: 'bg-destructive',
  warn: 'bg-warning',
  info: 'bg-info',
};

function StatusPill({ level }: { level: string }) {
  const cfg = BADGE[level] ?? BADGE.info;
  return (
    <Badge className="bg-muted text-muted-foreground gap-1.5 rounded-full font-bold">
      <span className={cn('size-1.5 rounded-full', DOT[level] ?? 'bg-info')} />
      {cfg.label}
    </Badge>
  );
}

function formatDuration(ms: number | null | undefined) {
  if (!ms) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// `days` is the range this option looks back over — compared against the plan's
// `log_history_days` so a 7-day-retention plan doesn't offer a 30-day filter that can only
// ever return the same rows (the nightly prune has already deleted the rest).
const DATE_OPTIONS = [
  { key: 'all', label: 'All time', cutoff: null, days: Infinity },
  {
    key: '24h',
    label: 'Last 24 hours',
    cutoff: () => subHours(new Date(), 24),
    days: 1,
  },
  {
    key: '7d',
    label: 'Last 7 days',
    cutoff: () => subDays(new Date(), 7),
    days: 7,
  },
  {
    key: '30d',
    label: 'Last 30 days',
    cutoff: () => subDays(new Date(), 30),
    days: 30,
  },
];

interface LogWithMeta extends SyncLog {
  projectLabel: string;
  jobLabel: string;
}

export default function LogsPage() {
  const retentionDays = useEntitlements().logRetentionDays;
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const dateCutoff =
    DATE_OPTIONS.find((o) => o.key === dateFilter)?.cutoff?.() ?? null;
  const level = filterLevel !== 'all' ? filterLevel : undefined;
  const searchTerm = search.trim() || undefined;
  const since = dateCutoff ? dateCutoff.toISOString() : undefined;

  const logsQuery = useOrgSyncLogsQuery(pageSize, {
    page,
    level,
    search: searchTerm,
    since,
  });
  const jobsQuery = useJobsQuery();

  const isLoading = logsQuery.isLoading || jobsQuery.isLoading;
  const isError = logsQuery.isError || jobsQuery.isError;

  const logsRes = logsQuery.data;
  const logs = ((logsRes as unknown as { data?: SyncLog[] })?.data ??
    (logsRes as unknown as SyncLog[]) ??
    []) as SyncLog[];
  const total = logsRes?.total ?? logs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const jobs = jobsQuery.data ?? [];

  const getJobName = (log: SyncLog) =>
    log.metadata?.jobName ||
    (log.jobId && jobs.find((j) => j.id === log.jobId)?.name) ||
    '—';

  const logsWithMeta: LogWithMeta[] = useMemo(
    () =>
      logs.map((log) => {
        const jobLabel = getJobName(log);
        return {
          ...log,
          jobLabel,
          projectLabel: log.metadata?.projectName ?? jobLabel,
        };
      }),

    [logs, jobs],
  );

  const hasActiveFilters = !!searchTerm || !!level || !!since;

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleLevelChange(value: string) {
    setFilterLevel(value);
    setPage(1);
  }

  function handleDateChange(value: string) {
    setDateFilter(value);
    setPage(1);
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  async function handleExportCsv() {
    setIsExporting(true);
    try {
      const exportRes = await syncLogsApi.listOrgSyncLogs({
        page: 1,
        limit: total,
        level,
        search: searchTerm,
        since,
      });
      const res = exportRes as unknown as { data: SyncLog[] };
      const rows = [
        [
          'Date',
          'Project',
          'Job',
          'Source',
          'Destination',
          'Status',
          'Records',
          'Duration',
          'Message',
        ],
        ...res.data.map((log) => [
          log.createdAt
            ? format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')
            : '',
          log.metadata?.projectName ?? '',
          getJobName(log),
          log.metadata?.sourcePlatformId ?? '',
          log.metadata?.destPlatformId ?? '',
          BADGE[log.level as keyof typeof BADGE]?.label ?? log.level ?? '',
          log.recordsProcessed ?? '',
          formatDuration(log.durationMs) ?? '',
          (log.message ?? '').replace(/"/g, '""'),
        ]),
      ];
      const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `synkazo-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  const header = (
    <PageHeader
      backTo={{ label: 'Back to Dashboard', to: '/dashboard' }}
      title="Sync History"
      description="Every transfer across all projects, newest first"
      actions={
        <Button
          variant="outline"
          onClick={handleExportCsv}
          disabled={total === 0 || isExporting}
        >
          <Download className={cn(isExporting && 'animate-pulse')} /> Export CSV
        </Button>
      }
    />
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <Card className="overflow-hidden py-0">
          <SkeletonTable rows={6} columns={5} />
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full space-y-6">
        {header}
        <ErrorState
          onRetry={() => {
            logsQuery.refetch();
            jobsQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {header}

      <Card>
        <CardContent className="space-y-6">
          <div className="flex justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Manage sync history</h3>
              <p className="text-muted-foreground text-sm">
                Every transfer across all projects, newest first
              </p>
            </div>
            <ManagementToolbar
              searchValue={search}
              onSearchChange={handleSearchChange}
              searchPlaceholder="Search project or job…"
              filters={
                <>
                  <Select value={filterLevel} onValueChange={handleLevelChange}>
                    <SelectTrigger className="bg-muted sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={handleDateChange}>
                    <SelectTrigger className="bg-muted sm:w-40">
                      <Clock className="size-3.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_OPTIONS.map((opt) => {
                        const beyondRetention =
                          retentionDays !== null && opt.days > retentionDays;
                        return (
                          <SelectItem
                            key={opt.key}
                            value={opt.key}
                            disabled={beyondRetention}
                          >
                            <span className="flex w-full items-center gap-2">
                              {opt.label}
                              {beyondRetention && (
                                <Lock className="text-muted-foreground size-3" />
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </>
              }
            />
          </div>

          {logs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No logs found"
              description={
                hasActiveFilters
                  ? 'No logs match your filters.'
                  : 'Logs will appear here once sync jobs run.'
              }
              viewMode="table"
            />
          ) : (
            <div className="overflow-hidden rounded-4xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted/50">
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">
                      Project / Job
                    </TableHead>
                    <TableHead className="font-semibold">Records</TableHead>
                    <TableHead className="font-semibold">Duration</TableHead>
                    <TableHead className="font-semibold">Time</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsWithMeta.map((log) => {
                    const isOpen = expanded === log.id;
                    const dur = formatDuration(log.durationMs);
                    const time = log.createdAt
                      ? formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                        })
                      : '—';

                    return (
                      <Fragment key={log.id}>
                        <TableRow>
                          <TableCell>
                            <StatusPill level={log.level ?? 'info'} />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-semibold">
                                {log.projectLabel}
                              </span>
                              {log.metadata?.sourcePlatformId &&
                                log.metadata?.destPlatformId && (
                                  <PlatformPair
                                    sourcePlatformId={
                                      log.metadata.sourcePlatformId
                                    }
                                    destPlatformId={log.metadata.destPlatformId}
                                    variant="text"
                                    size="sm"
                                  />
                                )}
                            </div>
                            {log.jobId && (
                              <span className="bg-muted text-muted-foreground mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium">
                                {log.jobLabel}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {log.recordsProcessed ?? 0}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {dur ?? '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {time}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() =>
                                setExpanded(isOpen ? null : (log.id ?? null))
                              }
                            >
                              <ChevronDown
                                className={cn(
                                  'transition-transform',
                                  isOpen && 'rotate-180',
                                )}
                              />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow>
                            <TableCell colSpan={6} className="p-0">
                              <div className="bg-muted! p-2.5">
                                <div className="bg-card flex flex-wrap gap-6 rounded-4xl border p-3">
                                  {log.createdAt && (
                                    <div>
                                      <div className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                                        Time
                                      </div>
                                      <div className="text-muted-foreground font-mono text-xs">
                                        {format(
                                          new Date(log.createdAt),
                                          'MMM d, yyyy HH:mm:ss',
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {log.jobId && (
                                    <div>
                                      <div className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                                        Rule
                                      </div>
                                      <div className="text-muted-foreground text-xs">
                                        {log.jobLabel}
                                      </div>
                                    </div>
                                  )}
                                  {log.jobRunId && (
                                    <div>
                                      <div className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                                        Run ID
                                      </div>
                                      <div
                                        className="text-muted-foreground font-mono text-xs"
                                        title="For debugging/support reference only"
                                      >
                                        {log.jobRunId}
                                      </div>
                                    </div>
                                  )}
                                  {dur && (
                                    <div>
                                      <div className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                                        Duration
                                      </div>
                                      <div className="text-muted-foreground font-mono text-xs">
                                        {dur}
                                      </div>
                                    </div>
                                  )}
                                  {log.message && log.jobId && (
                                    <div className="text-muted-foreground w-full rounded-md font-mono text-xs">
                                      {log.message}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {total > 0 && (
          <CardFooter>
            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
