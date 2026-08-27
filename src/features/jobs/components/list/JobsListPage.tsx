import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  ArrowRight,
  GitBranch,
  Loader2,
  Play,
  RefreshCw,
} from 'lucide-react';
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import PipelineMissingBanner from './PipelineMissingBanner';

import { jobsApi } from '@/api/jobs';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PageContextAlert from '@/components/shared/PageContextAlert';
import PageHeader from '@/components/shared/PageHeader';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import SortableTableHead from '@/components/shared/SortableTableHead';
import StatusBadge from '@/components/shared/StatusBadge';
import UpgradeRequiredDialog from '@/components/shared/UpgradeRequiredDialog';
import RunConfirmModal from '@/components/sync/RunConfirmModal';
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
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/queries/queryKeys';
import { useJobsQuery } from '@/queries/useJobs';
import { useProjectsQuery } from '@/queries/useProjects';
import type { Job, JobStatus } from '@/types';

interface JobWithMeta extends Job {
  projectName?: string;
}

type StatusFilter = 'all' | JobStatus;
type SortKey = 'name' | 'project' | 'records' | 'lastSynced' | 'status';

function compareJobs(a: JobWithMeta, b: JobWithMeta, key: SortKey) {
  switch (key) {
    case 'name':
      return (a.name || '').localeCompare(b.name || '');
    case 'project':
      return (a.projectName || '').localeCompare(b.projectName || '');
    case 'records':
      return (a.recordsSynced ?? 0) - (b.recordsSynced ?? 0);
    case 'lastSynced':
      return (
        new Date(a.lastSyncedAt || 0).getTime() -
        new Date(b.lastSyncedAt || 0).getTime()
      );
    case 'status':
      return (a.status || '').localeCompare(b.status || '');
  }
}

export default function JobsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const jobsQuery = useJobsQuery();
  const projectsQuery = useProjectsQuery();

  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ job: Job } | null>(null);
  const [pipelineIssues, setPipelineIssues] = useState<Record<string, boolean>>(
    {},
  );
  const [upgradeDialog, setUpgradeDialog] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });

  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const jobs = jobsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const isLoading = jobsQuery.isLoading || projectsQuery.isLoading;
  const hasNoData =
    (jobsQuery.isError && jobsQuery.data === undefined) ||
    (projectsQuery.isError && projectsQuery.data === undefined);

  useEffect(() => {
    if (jobs.length === 0) {
      setPipelineIssues({});
      return;
    }
    let cancelled = false;
    (async () => {
      const issues: Record<string, boolean> = {};
      await Promise.allSettled(
        jobs.map(async (job) => {
          try {
            const status = (await jobsApi.getPipelineStatus(
              job.projectId,
              job.id,
            )) as unknown as { required?: boolean; configured?: boolean };
            if (status.required && !status.configured) {
              issues[job.id] = true;
            }
          } catch {
            /* non-blocking */
          }
        }),
      );
      if (!cancelled) setPipelineIssues(issues);
    })();
    return () => {
      cancelled = true;
    };
    // Re-run whenever the job list identity changes (new fetch/refetch).
  }, [jobs]);

  useEffect(() => {
    const timers = pollTimers.current;
    return () => Object.values(timers).forEach(clearInterval);
  }, []);

  const startPolling = useCallback(
    (jobId: string) => {
      if (pollTimers.current[jobId]) return;
      pollTimers.current[jobId] = setInterval(async () => {
        const allJobs = await jobsApi.listAllJobs();
        queryClient.setQueryData(queryKeys.jobs.all, allJobs);
        const updated = allJobs.find((j) => j.id === jobId);
        if (!updated) return;
        if (updated.status !== 'active') {
          clearInterval(pollTimers.current[jobId]);
          delete pollTimers.current[jobId];
          setRunningIds((prev) => {
            const next = new Set(prev);
            next.delete(jobId);
            return next;
          });
        }
      }, 5000);
    },
    [queryClient],
  );

  const handleConfirmRun = useCallback(async () => {
    if (!confirm) return;
    const job = confirm.job;
    setConfirm(null);

    setRunningIds((prev) => new Set(prev).add(job.id));
    queryClient.setQueryData<Job[]>(queryKeys.jobs.all, (old) =>
      old?.map((j) => (j.id === job.id ? { ...j, status: 'running' } : j)),
    );

    try {
      await jobsApi.runJob(job.projectId, job.id);
      toast.success('Sync started');
      startPolling(job.id);
    } catch (err) {
      const e = err as {
        response?: { data?: { message?: string; code?: string } };
      };
      if (e.response?.data?.code === 'PLAN_LIMIT_RECORDS') {
        setUpgradeDialog({
          open: true,
          message:
            e.response.data.message ??
            "You've reached your plan's monthly record sync limit.",
        });
      } else {
        toast.error(e.response?.data?.message ?? 'Failed to start sync');
      }
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
      queryClient.setQueryData<Job[]>(queryKeys.jobs.all, (old) =>
        old?.map((j) => (j.id === job.id ? { ...j, status: job.status } : j)),
      );
    }
  }, [confirm, queryClient, startPolling]);

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const jobsWithMeta: JobWithMeta[] = useMemo(
    () =>
      jobs.map((job) => ({
        ...job,
        projectName: projectMap[job.projectId]?.name,
      })),

    [jobs, projects],
  );

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobsWithMeta.filter((job) => {
      const matchesSearch =
        !q ||
        job.name?.toLowerCase().includes(q) ||
        job.projectName?.toLowerCase().includes(q);
      const matchesProject =
        projectFilter === 'all' || job.projectId === projectFilter;
      const matchesStatus =
        statusFilter === 'all' || job.status === statusFilter;
      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [jobsWithMeta, search, projectFilter, statusFilter]);

  const { sorted, sortKey, direction, toggleSort } = useSort<
    JobWithMeta,
    SortKey
  >(filteredJobs, compareJobs);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    usePagination(sorted, 10);

  const totalPipelineIssues = Object.keys(pipelineIssues).length;

  const header = (
    <PageHeader
      backTo={{ label: 'Back to Dashboard', to: '/dashboard' }}
      title="Jobs"
      description="Manage and trigger sync jobs"
      actions={
        <Button
          variant="outline"
          size="icon"
          onClick={() => jobsQuery.refetch()}
        >
          <RefreshCw />
        </Button>
      }
    />
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <Card className="overflow-hidden py-0">
          <SkeletonTable rows={6} columns={6} />
        </Card>
      </div>
    );
  }

  if (hasNoData) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <ErrorState
          onRetry={() => {
            jobsQuery.refetch();
            projectsQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {header}

      {totalPipelineIssues > 0 && (
        <PageContextAlert
          variant="error"
          icon={GitBranch}
          title={`${totalPipelineIssues} job${totalPipelineIssues !== 1 ? 's' : ''} cannot run — pipeline not configured`}
          description="Open each job to set up the required HubSpot pipeline."
        />
      )}

      {jobs.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="No jobs found"
          description="Create a job from a project to see it here."
          viewMode="table"
        />
      ) : (
        <Card>
          <CardContent className="space-y-6">
            <div className="flex justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Manage jobs</h3>
                <p className="text-muted-foreground text-sm">
                  Manage and trigger sync jobs
                </p>
              </div>
              <ManagementToolbar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search jobs…"
                filters={
                  <>
                    <Select
                      value={projectFilter}
                      onValueChange={setProjectFilter}
                    >
                      <SelectTrigger className="bg-muted sm:w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All projects</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={statusFilter}
                      onValueChange={(v: StatusFilter) => setStatusFilter(v)}
                    >
                      <SelectTrigger className="bg-muted sm:w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="idle">Idle</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                }
              />
            </div>
            {filteredJobs.length === 0 ? (
              <EmptyState
                icon={AlertCircle}
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
                        active={sortKey === 'project'}
                        direction={direction}
                        onClick={() => toggleSort('project')}
                      >
                        Project
                      </SortableTableHead>
                      <SortableTableHead
                        active={sortKey === 'records'}
                        direction={direction}
                        onClick={() => toggleSort('records')}
                      >
                        Records
                      </SortableTableHead>
                      <SortableTableHead
                        active={sortKey === 'lastSynced'}
                        direction={direction}
                        onClick={() => toggleSort('lastSynced')}
                      >
                        Last Synced
                      </SortableTableHead>
                      <SortableTableHead
                        active={sortKey === 'status'}
                        direction={direction}
                        onClick={() => toggleSort('status')}
                      >
                        Status
                      </SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map((job) => {
                      const isRunning =
                        runningIds.has(job.id) &&
                        job.isEnabled &&
                        job.syncEnabled;
                      const pipelineMissing = !!pipelineIssues[job.id];
                      const blocked = pipelineMissing && !isRunning;
                      return (
                        <Fragment key={job.id}>
                          <TableRow>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="bg-muted shrink-0 rounded-lg p-2">
                                  <RefreshCw
                                    className={cn(
                                      'size-3.5',
                                      isRunning
                                        ? 'text-success animate-spin'
                                        : 'text-muted-foreground',
                                    )}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Link
                                      to={`/projects/${job.projectId}/jobs/${job.id}`}
                                      className="hover:text-primary block truncate text-sm font-medium transition-colors"
                                    >
                                      {job.name}
                                    </Link>
                                    {pipelineMissing && (
                                      <span className="bg-destructive/10 text-destructive shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold">
                                        Pipeline Missing
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1 truncate font-mono text-xs">
                                    {job.sourceObject}{' '}
                                    <ArrowRight className="size-3 shrink-0" />{' '}
                                    {job.destObject} ·{' '}
                                    {job.scheduleMode
                                      ? String(job.scheduleMode).replace(
                                          '_',
                                          ' ',
                                        )
                                      : job.cronExpression || 'no schedule'}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <Link
                                to={`/projects/${job.projectId}`}
                                className="hover:text-primary transition-colors"
                              >
                                {job.projectName ?? 'Unknown Project'}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {job.recordsSynced ?? 0}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {job.lastSyncedAt
                                ? formatDistanceToNow(
                                    new Date(job.lastSyncedAt),
                                    { addSuffix: true },
                                  )
                                : '—'}
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                status={isRunning ? 'running' : job.status}
                                size="sm"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end">
                                <Button
                                  size="sm"
                                  variant={
                                    blocked ? 'destructive' : 'secondary'
                                  }
                                  onClick={() =>
                                    blocked
                                      ? toast.error(
                                          'Configure a pipeline before running this job.',
                                        )
                                      : setConfirm({ job })
                                  }
                                  disabled={isRunning}
                                  title={
                                    blocked
                                      ? 'Pipeline not configured — cannot run'
                                      : 'Run Now'
                                  }
                                >
                                  {isRunning ? (
                                    <>
                                      <Loader2 className="animate-spin" />{' '}
                                      Running…
                                    </>
                                  ) : blocked ? (
                                    <>
                                      <GitBranch /> No Pipeline
                                    </>
                                  ) : (
                                    <>
                                      <Play /> Run Now
                                    </>
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {pipelineMissing && (
                            <TableRow>
                              <TableCell colSpan={6} className="py-2">
                                <PipelineMissingBanner
                                  job={job}
                                  projectId={job.projectId}
                                />
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
      )}

      {confirm && (
        <RunConfirmModal
          job={confirm.job}
          projectId={confirm.job.projectId}
          jobId={confirm.job.id}
          mode="runNow"
          pipelineRequired={!!pipelineIssues[confirm.job.id]}
          pipelineConfigured={!pipelineIssues[confirm.job.id]}
          onGoToPipeline={() => {
            const { projectId, id } = confirm.job;
            setConfirm(null);
            navigate(`/projects/${projectId}/jobs/${id}?tab=pipeline`);
          }}
          onConfirm={handleConfirmRun}
          onClose={() => setConfirm(null)}
        />
      )}

      <UpgradeRequiredDialog
        open={upgradeDialog.open}
        onOpenChange={(open) => setUpgradeDialog({ ...upgradeDialog, open })}
        message={upgradeDialog.message}
      />
    </div>
  );
}
