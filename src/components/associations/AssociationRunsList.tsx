import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  CalendarDays,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  FileText,
  Info,
  Link2,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  associationsApi,
  type AssociationRecord,
  type AssociationRecordStatus,
  type AssociationRunLog,
} from '@/api/associations';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PaginationBar from '@/components/shared/PaginationBar';
import StatusBadge from '@/components/shared/StatusBadge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type AssociationResultFilter =
  'all' | 'associated' | 'pending' | 'failed';

export interface AssociationRunFilters {
  search: string;
  status: string;
  result: AssociationResultFilter;
  days: string;
}

function formatTimestamp(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : format(date, 'MMM d, yyyy · h:mm a');
}

function formatDuration(run: AssociationRunLog): string {
  if (!run.completedAt || !run.startedAt)
    return run.status === 'running' ? 'Running' : '—';
  const milliseconds =
    new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return '—';
  const seconds = Math.max(1, Math.round(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function runStatus(run: AssociationRunLog): string {
  if (run.status === 'running') return 'in_progress';
  if (run.status === 'failed') return 'failed';
  if (run.failed > 0 || run.pendingCreated > 0) return 'partial';
  return 'success';
}

function recordStatus(status: AssociationRecordStatus): string {
  if (status === 'completed') return 'associated';
  if (status === 'pending') return 'pending';
  return 'failed';
}

function RunMetric({
  icon: Icon,
  label,
  value,
  iconClassName,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  iconClassName: string;
}) {
  return (
    <div className="border-border bg-background flex min-w-0 items-center gap-2.5 rounded-2xl border px-3 py-2.5">
      <div className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full">
        <Icon className={cn('size-3.5', iconClassName)} />
      </div>
      <div>
        <div className="text-base leading-none font-semibold tabular-nums">
          {value.toLocaleString()}
        </div>
        <div className="text-muted-foreground mt-1 text-xs">{label}</div>
      </div>
    </div>
  );
}

function RecordDetails({
  projectId,
  run,
  search,
  globalResult,
}: {
  projectId: string;
  run: AssociationRunLog;
  search: string;
  globalResult: AssociationResultFilter;
}) {
  const [result, setResult] = useState<AssociationResultFilter | null>(
    globalResult === 'all' ? null : globalResult,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const ruleId = run.associationRuleId ?? run.associationRule?.id ?? '';
  const status = result === 'associated' ? 'completed' : result;

  useEffect(() => {
    setResult(globalResult === 'all' ? null : globalResult);
    setPage(1);
  }, [globalResult]);
  const query = useQuery({
    queryKey: [
      'associations',
      'run-records',
      projectId,
      run.id,
      status,
      search,
      page,
      pageSize,
    ],
    queryFn: () =>
      associationsApi.getRuleRecords(projectId, ruleId, {
        runId: run.id,
        status: status as AssociationRecordStatus,
        search,
        page,
        limit: pageSize,
      }),
    enabled: Boolean(ruleId && result),
    placeholderData: keepPreviousData,
  });

  const records = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const recordGroups = [
    {
      id: 'associated' as const,
      title: 'Associated Records',
      description: 'Records linked successfully by this run.',
      count: run.succeeded,
      icon: Link2,
      iconClassName: 'text-success',
    },
    {
      id: 'pending' as const,
      title: 'Pending Records',
      description: 'Records waiting for a matching destination.',
      count: run.pendingCreated,
      icon: Clock3,
      iconClassName: 'text-warning',
    },
    {
      id: 'failed' as const,
      title: 'Failed Records',
      description: 'Records that could not be associated.',
      count: run.failed,
      icon: CircleAlert,
      iconClassName: 'text-destructive',
    },
  ].filter((group) => group.count > 0);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Record Details</h4>

      {recordGroups.length === 0 ? (
        <div className="border-border bg-background text-muted-foreground rounded-2xl border px-4 py-3 text-sm">
          No record results are available for this run.
        </div>
      ) : (
        <div className="space-y-2">
          {recordGroups.map((group) => {
            const GroupIcon = group.icon;
            const open = result === group.id;
            return (
              <Collapsible
                key={group.id}
                open={open}
                onOpenChange={(nextOpen) => {
                  setResult(nextOpen ? group.id : null);
                  setPage(1);
                }}
                className="border-border bg-background overflow-hidden rounded-2xl border"
              >
                <CollapsibleTrigger className="group hover:bg-muted/30 flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors">
                  <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full">
                    <GroupIcon
                      className={cn('size-3.5', group.iconClassName)}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {group.title} ({group.count.toLocaleString()})
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {group.description}
                    </span>
                  </span>
                  <span className="border-border/60 bg-muted/50 text-muted-foreground group-hover:text-foreground flex size-6 shrink-0 items-center justify-center rounded-full border">
                    <ChevronRight
                      className={cn(
                        'size-3.5 transition-transform duration-200',
                        open && 'rotate-90',
                      )}
                    />
                  </span>
                </CollapsibleTrigger>

                <CollapsibleContent className="border-t">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source Record ID</TableHead>
                          <TableHead>Destination Record ID</TableHead>
                          <TableHead>Source HS ID</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead>Updated At</TableHead>
                          <TableHead className="min-w-48">
                            Error / Reason
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {query.isLoading ? (
                          Array.from({ length: 4 }).map((_, index) => (
                            <TableRow key={index}>
                              <TableCell colSpan={6} className="py-3">
                                <Skeleton className="h-5 w-full" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : records.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-muted-foreground h-24 text-center"
                            >
                              No records in this result.
                            </TableCell>
                          </TableRow>
                        ) : (
                          records.map((record: AssociationRecord) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-mono text-xs">
                                {record.sourceId}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {record.targetHsId || record.targetId || '—'}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {record.sourceHsId || '—'}
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  status={recordStatus(record.status)}
                                  size="sm"
                                />
                              </TableCell>
                              <TableCell>
                                {formatTimestamp(
                                  record.lastAttemptedAt || record.createdAt,
                                )}
                              </TableCell>
                              <TableCell className="max-w-72 whitespace-normal">
                                <span
                                  className={cn(
                                    record.errorMessage && 'text-destructive',
                                  )}
                                >
                                  {record.errorMessage || '—'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {query.isError && (
                    <p className="text-destructive border-t px-4 py-3 text-sm">
                      Record details could not be loaded.
                    </p>
                  )}

                  <div className="border-t px-3 py-2">
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
                      pageSizeOptions={[10, 25, 50]}
                      disabled={query.isFetching}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AssociationRunRow({
  projectId,
  run,
  search,
  result,
}: {
  projectId: string;
  run: AssociationRunLog;
  search: string;
  result: AssociationResultFilter;
}) {
  const [expanded, setExpanded] = useState(false);
  const processed =
    run.totalAttempted ?? run.succeeded + run.pendingCreated + run.failed;

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className="bg-card overflow-hidden rounded-3xl border"
    >
      <CollapsibleTrigger className="group hover:bg-muted/30 grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors lg:grid-cols-[minmax(150px,1fr)_180px_140px_100px_auto]">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <StatusBadge status={runStatus(run)} size="sm" />
            <span className="text-muted-foreground truncate font-mono text-xs">
              #{run.id.slice(0, 8)}
            </span>
          </div>
          <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-1.5 text-xs lg:hidden">
            <span>{formatTimestamp(run.startedAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{processed.toLocaleString()} processed</span>
            <span aria-hidden="true">·</span>
            <span>{formatDuration(run)}</span>
          </div>
        </div>

        <div className="hidden border-l pl-4 lg:block">
          <div className="text-muted-foreground text-xs">Started</div>
          <div className="mt-0.5 text-sm font-medium">
            {formatTimestamp(run.startedAt)}
          </div>
        </div>
        <div className="hidden border-l pl-4 lg:block">
          <div className="text-muted-foreground text-xs">Processed</div>
          <div className="mt-0.5 text-sm font-medium tabular-nums">
            {processed.toLocaleString()}
          </div>
        </div>
        <div className="hidden border-l pl-4 lg:block">
          <div className="text-muted-foreground text-xs">Duration</div>
          <div className="mt-0.5 text-sm font-medium">
            {formatDuration(run)}
          </div>
        </div>

        <span className="border-border/60 bg-muted/50 text-muted-foreground group-hover:text-foreground flex size-7 items-center justify-center rounded-full border">
          <ChevronRight
            className={cn(
              'size-4 transition-transform duration-200',
              expanded && 'rotate-90',
            )}
          />
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent className="bg-muted/35 border-t">
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <RunMetric
              icon={FileText}
              label="Processed"
              value={processed}
              iconClassName="text-muted-foreground"
            />
            <RunMetric
              icon={Link2}
              label="Associated"
              value={run.succeeded}
              iconClassName="text-success"
            />
            <RunMetric
              icon={Clock3}
              label="Pending"
              value={run.pendingCreated}
              iconClassName="text-warning"
            />
            <RunMetric
              icon={CircleAlert}
              label="Failed"
              value={run.failed}
              iconClassName="text-destructive"
            />
          </div>

          {run.errorMessage && (
            <div className="border-destructive/25 bg-destructive/5 text-destructive flex gap-2.5 rounded-2xl border px-3.5 py-2.5 text-sm">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{run.errorMessage}</span>
            </div>
          )}

          <RecordDetails
            projectId={projectId}
            run={run}
            search={search}
            globalResult={result}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AssociationRunsList({
  projectId,
  ruleId,
  filters,
  showToolbar = true,
}: {
  projectId: string;
  ruleId?: string;
  filters?: AssociationRunFilters;
  showToolbar?: boolean;
}) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [result, setResult] = useState<AssociationResultFilter>('all');
  const [days, setDays] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const activeSearch = filters?.search ?? search;
  const activeStatus = filters?.status ?? status;
  const activeResult = filters?.result ?? result;
  const activeDays = filters?.days ?? days;

  useEffect(() => {
    setPage(1);
  }, [activeDays, activeResult, activeSearch, activeStatus]);

  const params = useMemo(
    () => ({
      ruleId,
      status: activeStatus === 'all' ? undefined : activeStatus,
      result: activeResult === 'all' ? undefined : activeResult,
      days: activeDays === 'all' ? undefined : Number(activeDays),
      search: activeSearch || undefined,
      page,
      limit: pageSize,
    }),
    [
      activeDays,
      activeResult,
      activeSearch,
      activeStatus,
      page,
      pageSize,
      ruleId,
    ],
  );
  const query = useQuery({
    queryKey: ['associations', 'project-runs', projectId, params],
    queryFn: () => associationsApi.getProjectRuns(projectId, params),
    placeholderData: keepPreviousData,
  });

  const runs = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const runContent = (
    <>
      {showToolbar && (
        <div className="border-info/20 bg-info/5 text-info flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs">
          <Info className="size-4 shrink-0" />
          These filters apply to association runs and expanded record details.
        </div>
      )}

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-3xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : runs.length === 0 ? (
        <EmptyState
          icon={CircleCheck}
          title="No association runs found"
          description="Runs will appear here after an association rule is processed. Try changing the filters if you are looking for an earlier run."
        />
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <AssociationRunRow
              key={run.id}
              projectId={projectId}
              run={run}
              search={activeSearch}
              result={activeResult}
            />
          ))}
        </div>
      )}

      <div className="pt-1">
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
          pageSizeOptions={[5, 10, 25]}
          disabled={query.isFetching}
        />
      </div>
    </>
  );

  if (!showToolbar) {
    return <div className="space-y-3">{runContent}</div>;
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-4 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle>Association Runs</CardTitle>
            <CardDescription>
              View association runs and the records processed in each run.
            </CardDescription>
          </div>

          {showToolbar && (
            <div className="grid gap-2 sm:grid-cols-2 xl:flex">
              <div className="relative sm:col-span-2 xl:w-64">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search runs, record IDs…"
                  className="pl-9"
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="xl:w-36" aria-label="Run status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="running">In progress</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={result}
                onValueChange={(value) => {
                  setResult(value as AssociationResultFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger className="xl:w-32" aria-label="Run result">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All results</SelectItem>
                  <SelectItem value="associated">Associated</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={days}
                onValueChange={(value) => {
                  setDays(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="xl:w-32" aria-label="Run date range">
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
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-4">{runContent}</CardContent>
    </Card>
  );
}
