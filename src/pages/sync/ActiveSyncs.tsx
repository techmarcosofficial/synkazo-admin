import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeftRight,
  ArrowRight,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import type { ActiveSync } from '@/api/dashboard';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ListPanel from '@/components/shared/list/ListPanel';
import ListRow from '@/components/shared/list/ListRow';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveSyncsQuery } from '@/queries/useDashboard';
import { useJobsQuery } from '@/queries/useJobs';
import { useProjectsQuery } from '@/queries/useProjects';
import type { Job } from '@/types';

interface RunRecord extends ActiveSync {
  id?: string;
  job?: { id: string; name: string; projectId: string };
  currentPage?: number;
  totalPages?: number;
  errorCount?: number;
}

function formatNum(n: number | null | undefined): string | number {
  if (!n) return 0;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n;
}

function groupByProject<T>(
  items: T[],
  projectIdFn: (item: T) => string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const pid = projectIdFn(item);
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid)!.push(item);
  }
  return map;
}

function ActiveSyncsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="mb-3 h-5 w-40" />
          <ListPanel>
            {Array.from({ length: 3 }).map((_, j) => (
              <ListRow key={j}>
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-1.5 w-full" />
                </div>
              </ListRow>
            ))}
          </ListPanel>
        </div>
      ))}
    </div>
  );
}

export default function ActiveSyncs() {
  const activeSyncsQuery = useActiveSyncsQuery();
  const jobsQuery = useJobsQuery();
  const projectsQuery = useProjectsQuery();

  const [search, setSearch] = useState('');

  const isLoading =
    activeSyncsQuery.isLoading ||
    jobsQuery.isLoading ||
    projectsQuery.isLoading;
  const hasNoData =
    (activeSyncsQuery.isError && activeSyncsQuery.data === undefined) ||
    (jobsQuery.isError && jobsQuery.data === undefined) ||
    (projectsQuery.isError && projectsQuery.data === undefined);

  const activeRuns = (activeSyncsQuery.data ?? []) as RunRecord[];
  const allJobs: Job[] = jobsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];

  const idleJobs = allJobs.filter(
    (j) => !activeRuns.some((r) => r.jobId === j.id),
  );
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const runsByProject = groupByProject(
    activeRuns,
    (r: RunRecord) => r.job?.projectId ?? r.projectId ?? 'unknown',
  );
  const idleByProject = groupByProject(
    idleJobs,
    (j: Job) => j.projectId ?? 'unknown',
  );
  const allProjectIds = [
    ...new Set([...runsByProject.keys(), ...idleByProject.keys()]),
  ];

  const q = search.trim().toLowerCase();
  const matchesSearch = (value?: string | null) =>
    !q || (value ?? '').toLowerCase().includes(q);

  const visibleProjectIds = allProjectIds.filter((pid) => {
    if (matchesSearch(projectMap[pid]?.name)) return true;
    const runs = runsByProject.get(pid) ?? [];
    const idle = idleByProject.get(pid) ?? [];
    return (
      runs.some((r) => matchesSearch(r.job?.name ?? r.jobName)) ||
      idle.some((j) => matchesSearch(j.name))
    );
  });

  const handleRefresh = () => {
    activeSyncsQuery.refetch();
    jobsQuery.refetch();
    projectsQuery.refetch();
  };

  const header = (
    <PageHeader
      backTo={{ label: 'Back to Dashboard', to: '/dashboard' }}
      title="Live Activity"
      description="Real-time view of every sync job"
      actions={
        <>
          <Badge variant="secondary" className="gap-1.5">
            <span className="bg-destructive animate-sb-pulse size-1.5 rounded-full" />
            Live
          </Badge>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw />
          </Button>
        </>
      }
    />
  );

  if (isLoading) {
    return (
      <div className="w-full">
        {header}
        <ActiveSyncsSkeleton />
      </div>
    );
  }

  if (hasNoData) {
    return (
      <div className="w-full space-y-6">
        {header}
        <ErrorState onRetry={handleRefresh} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {header}

      <Card>
        <CardContent className="space-y-6">
          <div className="flex justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Manage live activity</h3>
              <p className="text-muted-foreground text-sm">
                Syncs currently running or idle, grouped by project
              </p>
            </div>
            <ManagementToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search projects or jobs…"
            />
          </div>

          {visibleProjectIds.map((pid) => {
            const project = projectMap[pid];
            const projectMatches = matchesSearch(project?.name);
            const runs = (runsByProject.get(pid) ?? []).filter(
              (r) => projectMatches || matchesSearch(r.job?.name ?? r.jobName),
            );
            const idle = (idleByProject.get(pid) ?? []).filter(
              (j) => projectMatches || matchesSearch(j.name),
            );
            return (
              <Collapsible
                className="overflow-hidden rounded-4xl border"
                key={pid}
                defaultOpen
              >
                <div className="bg-muted flex items-center justify-between px-3 py-2">
                  <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-2.5 text-left">
                    <ChevronRight className="text-muted-foreground group-hover:text-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                    <h3 className="group-hover:text-primary text-md truncate font-semibold transition-colors">
                      {project?.name ?? 'Unknown Project'}
                    </h3>

                    {runs.length > 0 && (
                      <Badge className="bg-success/10 text-success gap-1.5">
                        <span className="bg-success size-1.5 rounded-full" />
                        {runs.length} running
                      </Badge>
                    )}
                  </CollapsibleTrigger>
                  <Button asChild variant="link" size="sm" className="shrink-0">
                    <Link to={`/projects/${pid}`}>
                      View project <ArrowRight />
                    </Link>
                  </Button>
                </div>
                <CollapsibleContent>
                  {runs.length > 0 && (
                    <ListPanel className="mb-2">
                      {runs.map((run) => {
                        const pct =
                          run.currentPage && run.totalPages
                            ? Math.round(
                                (run.currentPage / run.totalPages) * 100,
                              )
                            : null;
                        return (
                          <ListRow key={run.id ?? run.jobId} asChild>
                            <Link
                              to={`/projects/${pid}/jobs/${run.job?.id ?? run.jobId}`}
                            >
                              <div className="bg-success/10 text-success flex size-9 shrink-0 items-center justify-center rounded-lg">
                                <RefreshCw className="size-4.5 animate-spin" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <span className="truncate text-sm font-semibold">
                                    {run.job?.name ??
                                      run.jobName ??
                                      'Running job'}
                                  </span>
                                  {pct !== null ? (
                                    <span className="text-success shrink-0 text-xs font-semibold">
                                      Page {run.currentPage} of {run.totalPages}{' '}
                                      · {pct}%
                                    </span>
                                  ) : (
                                    (run.recordsProcessed ?? 0) > 0 && (
                                      <span className="text-success shrink-0 text-xs font-semibold">
                                        {formatNum(run.recordsProcessed)}{' '}
                                        records
                                      </span>
                                    )
                                  )}
                                </div>
                                {pct !== null ? (
                                  <Progress
                                    value={pct}
                                    className="*:data-[slot=progress-indicator]:bg-success h-1.5"
                                  />
                                ) : (
                                  <div className="text-muted-foreground text-xs">
                                    Started{' '}
                                    {formatDistanceToNow(
                                      new Date(run.startedAt),
                                      {
                                        addSuffix: true,
                                      },
                                    )}
                                    {(run.errorCount ?? 0) > 0 &&
                                      ` · ${run.errorCount} error${run.errorCount !== 1 ? 's' : ''}`}
                                  </div>
                                )}
                              </div>
                            </Link>
                          </ListRow>
                        );
                      })}
                    </ListPanel>
                  )}

                  {idle.length > 0 && (
                    <ListPanel>
                      {idle.map((job) => (
                        <ListRow key={job.id} asChild>
                          <Link to={`/projects/${pid}/jobs/${job.id}`}>
                            <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                              <ArrowLeftRight className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold">
                                {job.name}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {job.lastSyncedAt
                                  ? `Last run ${formatDistanceToNow(new Date(job.lastSyncedAt), { addSuffix: true })}`
                                  : 'Not yet run'}
                              </div>
                            </div>
                            <StatusBadge status={job.status} size="sm" />
                          </Link>
                        </ListRow>
                      ))}
                    </ListPanel>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {visibleProjectIds.length === 0 &&
            (activeRuns.length > 0 || idleJobs.length > 0) && (
              <EmptyState
                icon={ArrowLeftRight}
                title="No syncs match your search"
                description="Try a different project or job name."
              />
            )}

          {activeRuns.length === 0 && idleJobs.length === 0 && (
            <EmptyState
              icon={ArrowLeftRight}
              title="No sync jobs yet"
              description="Create a sync job inside a project to see it here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
