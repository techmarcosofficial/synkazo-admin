import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  CircleDot,
  Clock,
  GitBranch,
  Layers,
  type LucideIcon,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import type { QueueStats } from '@/api/notificationsApi';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PageHeader from '@/components/shared/PageHeader';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonStatGrid from '@/components/shared/skeletons/SkeletonStatGrid';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import SortableTableHead from '@/components/shared/SortableTableHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
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
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { cn } from '@/lib/utils';
import {
  useCancelQueueJobMutation,
  usePauseScheduleMutation,
  useQueueStatsQuery,
  useResumeScheduleMutation,
  useSchedulerHealthQuery,
} from '@/queries/useScheduler';

interface SchedulerLastRun {
  status: string;
  finishedAt?: string | null;
  startedAt?: string;
  errorMessage?: string;
  bullmqJobId?: string;
}

interface SchedulerHealthJob {
  id: string;
  name: string;
  projectId: string;
  bucket: string;
  scheduleState?: string;
  cronExpression?: string;
  timezone?: string;
  nextRunAt?: string | null;
  dependsOnJobId?: string | null;
  isEnabled?: boolean;
  retryCount?: number;
  maxRetries?: number;
  lastRun?: SchedulerLastRun | null;
}

interface SchedulerHealthData {
  counts: Record<string, number>;
  jobs: SchedulerHealthJob[];
}

interface QueueStatsWithWorker extends QueueStats {
  workerOnline?: boolean;
}

interface BucketConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: string;
}

const BUCKETS: BucketConfig[] = [
  { id: 'running', label: 'Running', icon: Activity, tone: 'text-success' },
  { id: 'retrying', label: 'Retrying', icon: RotateCcw, tone: 'text-warning' },
  {
    id: 'resuming',
    label: 'Catching up',
    icon: RotateCcw,
    tone: 'text-info',
  },
  {
    id: 'overdue',
    label: 'Overdue',
    icon: AlertTriangle,
    tone: 'text-destructive',
  },
  { id: 'queued', label: 'Queued', icon: Clock, tone: 'text-info' },
  {
    id: 'scheduled',
    label: 'Scheduled',
    icon: CircleDot,
    tone: 'text-primary',
  },
  {
    id: 'waiting_on_dependency',
    label: 'Waiting',
    icon: GitBranch,
    tone: 'text-primary',
  },
  { id: 'paused', label: 'Paused', icon: Pause, tone: 'text-paused' },
  {
    id: 'paused_limit_reached',
    label: 'Plan limit reached',
    icon: AlertTriangle,
    tone: 'text-warning',
  },
  { id: 'idle', label: 'Idle', icon: Pause, tone: 'text-muted-foreground' },
];

const bucketCfg = (id: string): BucketConfig =>
  BUCKETS.find((b) => b.id === id) ?? {
    id,
    label: id,
    tone: 'text-muted-foreground',
    icon: CircleDot,
  };

function fmt(date: string | null | undefined): string {
  if (!date) return '—';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '—';
  }
}

function extractErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e.response?.data?.message ?? fallback;
}

type SortKey = 'name' | 'state' | 'nextRun' | 'lastRun';

function bucketRank(bucket: string): number {
  const i = BUCKETS.findIndex((b) => b.id === bucket);
  return i === -1 ? BUCKETS.length : i;
}

function compareJobs(
  a: SchedulerHealthJob,
  b: SchedulerHealthJob,
  key: SortKey,
) {
  switch (key) {
    case 'name':
      return (a.name || '').localeCompare(b.name || '');
    case 'state':
      return bucketRank(a.bucket) - bucketRank(b.bucket);
    case 'nextRun':
      return (
        new Date(a.nextRunAt || 0).getTime() -
        new Date(b.nextRunAt || 0).getTime()
      );
    case 'lastRun':
      return (
        new Date(a.lastRun?.finishedAt || a.lastRun?.startedAt || 0).getTime() -
        new Date(b.lastRun?.finishedAt || b.lastRun?.startedAt || 0).getTime()
      );
  }
}

function SchedulerHealthSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-4 w-28" />
            <div className="bg-border h-4 w-px" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </CardContent>
      </Card>
      <SkeletonStatGrid count={8} />
      <Card className="overflow-hidden py-0">
        <SkeletonTable rows={6} columns={6} />
      </Card>
    </div>
  );
}

export default function SchedulerHealth() {
  const healthQuery = useSchedulerHealthQuery();
  const queueStatsQuery = useQueueStatsQuery();
  const pauseMutation = usePauseScheduleMutation();
  const resumeMutation = useResumeScheduleMutation();
  const cancelMutation = useCancelQueueJobMutation();

  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');

  const data = (healthQuery.data as SchedulerHealthData) || {
    counts: {},
    jobs: [],
  };
  const queueStatsRes = queueStatsQuery.data;
  const queueStats: QueueStatsWithWorker | undefined =
    queueStatsRes?.data ??
    (queueStatsRes as unknown as QueueStatsWithWorker | undefined);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.jobs.filter((job) => {
      const matchesSearch = !q || job.name?.toLowerCase().includes(q);
      const matchesState = stateFilter === 'all' || job.bucket === stateFilter;
      return matchesSearch && matchesState;
    });
  }, [data.jobs, search, stateFilter]);

  const { sorted, sortKey, direction, toggleSort } = useSort<
    SchedulerHealthJob,
    SortKey
  >(filteredJobs, compareJobs);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    usePagination(sorted, 10);

  const cancelQueueJob = (job: SchedulerHealthJob) => {
    if (!job.lastRun?.bullmqJobId) return;
    cancelMutation.mutate(job.lastRun.bullmqJobId, {
      onSuccess: () => toast.success(`Removed "${job.name}" from queue`),
      onError: (err) => toast.error(extractErrorMessage(err, 'Cancel failed')),
    });
  };

  const togglePause = (job: SchedulerHealthJob) => {
    if (
      job.scheduleState === 'paused' ||
      job.scheduleState === 'paused_limit_reached'
    ) {
      resumeMutation.mutate(
        { projectId: job.projectId, jobId: job.id },
        {
          onSuccess: () => toast.success(`Resumed "${job.name}"`),
          onError: (err) =>
            toast.error(extractErrorMessage(err, 'Action failed')),
        },
      );
    } else {
      pauseMutation.mutate(
        { projectId: job.projectId, jobId: job.id },
        {
          onSuccess: () => toast.success(`Paused "${job.name}"`),
          onError: (err) =>
            toast.error(extractErrorMessage(err, 'Action failed')),
        },
      );
    }
  };

  const isTogglingJob = (jobId: string) =>
    (pauseMutation.isPending && pauseMutation.variables?.jobId === jobId) ||
    (resumeMutation.isPending && resumeMutation.variables?.jobId === jobId);

  const header = (
    <PageHeader
      backTo={{ label: 'Back to Dashboard', to: '/dashboard' }}
      title="Scheduler Health"
      description="Live view of every job's scheduling state across all projects"
      actions={
        <Button variant="outline" onClick={() => healthQuery.refetch()}>
          <RefreshCw /> Refresh
        </Button>
      }
    />
  );

  if (healthQuery.isLoading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <SchedulerHealthSkeleton />
      </div>
    );
  }

  if (healthQuery.isError && healthQuery.data === undefined) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <ErrorState onRetry={() => healthQuery.refetch()} />
      </div>
    );
  }

  const { counts } = data;

  const queueMetrics = queueStats
    ? [
        {
          label: 'Waiting',
          value: queueStats.waiting,
          tone: queueStats.waiting > 20 ? 'text-warning' : 'text-foreground',
        },
        {
          label: 'Active',
          value: queueStats.active,
          tone: queueStats.active > 0 ? 'text-success' : 'text-foreground',
        },
        {
          label: 'Failed',
          value: queueStats.failed,
          tone: queueStats.failed > 0 ? 'text-destructive' : 'text-foreground',
        },
        {
          label: 'Completed',
          value: queueStats.completed,
          tone: 'text-muted-foreground',
        },
      ]
    : [];

  return (
    <div className="animate-fade-in-up space-y-6">
      {header}

      {queueStats && (
        <Card className={cn(!queueStats.workerOnline && 'border-destructive')}>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                {queueStats.workerOnline ? (
                  <Wifi className="text-success size-4" />
                ) : (
                  <WifiOff className="text-destructive size-4" />
                )}
                <span
                  className={cn(
                    'text-sm font-semibold',
                    queueStats.workerOnline
                      ? 'text-success'
                      : 'text-destructive',
                  )}
                >
                  Worker {queueStats.workerOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="bg-border h-4 w-px" />
              {queueMetrics.map((stat) => (
                <div key={stat.label} className="flex items-center gap-1.5">
                  <Layers className="text-muted-foreground size-3" />
                  <span className="text-muted-foreground text-xs">
                    {stat.label}:
                  </span>
                  <span className={cn('text-sm font-bold', stat.tone)}>
                    {stat.value ?? 0}
                  </span>
                </div>
              ))}
            </div>
            {!queueStats.workerOnline && (
              <p className="text-destructive text-xs">
                Sync jobs are queued but no worker is processing them. Run:{' '}
                <code>pm2 start synkazo-worker</code>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {BUCKETS.map((b) => (
          <Card key={b.id}>
            <CardContent className="space-y-1">
              <div className={cn('flex items-center gap-2', b.tone)}>
                <b.icon className="size-4" />
                <span className="text-muted-foreground text-xs font-medium">
                  {b.label}
                </span>
              </div>
              <p className="text-2xl font-bold">{counts[b.id] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-6">
          <div className="flex justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Manage scheduled jobs</h3>
              <p className="text-muted-foreground text-sm">
                Live view of every job's scheduling state across all projects
              </p>
            </div>
            <ManagementToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search jobs…"
              filters={
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="bg-muted sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All states</SelectItem>
                    {BUCKETS.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
          </div>
          {filteredJobs.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No jobs match your filters"
              viewMode="table"
            />
          ) : (
            <div className="overflow-hidden rounded-4xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted/50">
                    <SortableTableHead
                      active={sortKey === 'name'}
                      direction={direction}
                      onClick={() => toggleSort('name')}
                    >
                      Job
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'state'}
                      direction={direction}
                      onClick={() => toggleSort('state')}
                    >
                      State
                    </SortableTableHead>
                    <TableHead>Schedule</TableHead>
                    <SortableTableHead
                      active={sortKey === 'nextRun'}
                      direction={direction}
                      onClick={() => toggleSort('nextRun')}
                    >
                      Next run
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'lastRun'}
                      direction={direction}
                      onClick={() => toggleSort('lastRun')}
                    >
                      Last run
                    </SortableTableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((job) => {
                    const cfg = bucketCfg(job.bucket);
                    const cancelling =
                      cancelMutation.isPending &&
                      cancelMutation.variables === job.lastRun?.bullmqJobId;
                    return (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Link
                            to={`/projects/${job.projectId}/jobs/${job.id}`}
                            className="hover:text-primary font-medium transition-colors"
                          >
                            {job.name}
                          </Link>
                          {job.dependsOnJobId && (
                            <span className="text-muted-foreground ml-2 inline-flex items-center gap-1 text-xs">
                              <GitBranch className="size-3" /> dependent
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-xs font-medium',
                              cfg.tone,
                            )}
                          >
                            <cfg.icon className="size-3.5" /> {cfg.label}
                            {(job.retryCount ?? 0) > 0 && (
                              <span className="text-muted-foreground">
                                ({job.retryCount}/{job.maxRetries})
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {job.cronExpression ? (
                            <code className="text-xs">
                              {job.cronExpression}
                              {job.timezone ? ` · ${job.timezone}` : ''}
                            </code>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {fmt(job.nextRunAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {job.lastRun ? (
                            <span title={job.lastRun.errorMessage || ''}>
                              {job.lastRun.status} ·{' '}
                              {fmt(
                                job.lastRun.finishedAt || job.lastRun.startedAt,
                              )}
                            </span>
                          ) : (
                            'never'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            {job.bucket === 'queued' &&
                              job.lastRun?.bullmqJobId && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => cancelQueueJob(job)}
                                  disabled={cancelling}
                                >
                                  <X /> Cancel
                                </Button>
                              )}
                            {job.isEnabled !== false && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => togglePause(job)}
                                disabled={isTogglingJob(job.id)}
                              >
                                {job.scheduleState === 'paused' ||
                                job.scheduleState === 'paused_limit_reached' ? (
                                  <>
                                    <Play /> Resume
                                  </>
                                ) : (
                                  <>
                                    <Pause /> Pause
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardFooter>
      </Card>
    </div>
  );
}
