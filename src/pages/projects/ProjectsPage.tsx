import { formatDistanceToNow } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PlatformIcon } from '@/components/platform';
import ErrorState from '@/components/shared/ErrorState';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PageHeader from '@/components/shared/PageHeader';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonCardGrid from '@/components/shared/skeletons/SkeletonCardGrid';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import SortableTableHead from '@/components/shared/SortableTableHead';
import StatusBadge from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
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
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ProjectGrid,
  ProjectEmptyState,
  CreateProjectButton,
  CreateProjectDialog,
} from '@/features/projects';
import { useProjectFilters } from '@/features/projects/hooks';
import {
  PROJECT_ENVIRONMENT_OPTIONS,
  PROJECT_STATUS_OPTIONS,
} from '@/features/projects/types';
import type {
  ProjectEnvironmentFilter,
  ProjectExtended,
  ProjectStatusFilter,
} from '@/features/projects/types';
import { buildJobCountsByProject } from '@/features/projects/utils';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { useViewMode } from '@/hooks/useViewMode';
import { useJobsQuery } from '@/queries/useJobs';
import { useProjectsQuery } from '@/queries/useProjects';
import { useHeaderStore } from '@/stores/useHeaderStore';

type ProjectWithMeta = ProjectExtended & { jobCount: number };

type SortKey =
  'name' | 'environment' | 'records' | 'rules' | 'lastSynced' | 'status';

/** Only shown once the environment has actually been activated — a fresh project
 *  defaults to "production" in the DB before any setup happens. */
function projectEnv(project: ProjectExtended): string | undefined {
  return project.environmentActivatedAt ? project.activeEnvironment : undefined;
}

function compareProjects(a: ProjectWithMeta, b: ProjectWithMeta, key: SortKey) {
  switch (key) {
    case 'name':
      return (a.name || '').localeCompare(b.name || '');
    case 'environment':
      return (projectEnv(a) || '').localeCompare(projectEnv(b) || '');
    case 'records':
      return (a.totalRecordsSynced ?? 0) - (b.totalRecordsSynced ?? 0);
    case 'rules':
      return a.jobCount - b.jobCount;
    case 'lastSynced':
      return (
        new Date(a.lastSyncedAt || 0).getTime() -
        new Date(b.lastSyncedAt || 0).getTime()
      );
    case 'status':
      return (a.status || '').localeCompare(b.status || '');
  }
}

export default function ProjectsPage() {
  const navigate = useNavigate();

  const projectsQuery = useProjectsQuery();
  const jobsQuery = useJobsQuery();

  const isLoading = projectsQuery.isLoading || jobsQuery.isLoading;
  const isError = projectsQuery.isError || jobsQuery.isError;
  const projects = (projectsQuery.data ?? []) as ProjectExtended[];
  const jobs = jobsQuery.data ?? [];

  const [viewMode, setViewMode] = useViewMode('projects');
  const { filters, setFilters, filteredProjects } = useProjectFilters(projects);
  const jobCountsByProject = buildJobCountsByProject(jobs);

  const projectsWithMeta: ProjectWithMeta[] = useMemo(
    () =>
      filteredProjects.map((p) => ({
        ...p,
        jobCount: jobCountsByProject[p.id] ?? 0,
      })),
    [filteredProjects, jobCountsByProject],
  );

  const { sorted, sortKey, direction, toggleSort } = useSort<
    ProjectWithMeta,
    SortKey
  >(projectsWithMeta, compareProjects);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    usePagination(sorted, 10);

  const handleProjectCreated = (project: ProjectExtended) =>
    navigate(`/projects/${project.id}`);
  const setActions = useHeaderStore((s) => s.setActions);
  const clearActions = useHeaderStore((s) => s.clearActions);

  useEffect(() => {
    setActions(<CreateProjectButton />);
    return () => clearActions();
  }, []);

  const hasResults = !isLoading && !isError && filteredProjects.length > 0;

  const paginationBar = (
    <PaginationBar
      page={page}
      totalPages={totalPages}
      total={total}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  );

  return (
    <div className="w-full space-y-6">
      {/* NOTE: wraps PageHeader instead of editing it, so other pages that
          use PageHeader aren't affected. If PageHeader already has a
          rightSlot/illustration prop, swap this wrapper for that instead. */}
      <PageHeader
        title="Projects"
        description={
          isLoading
            ? 'A project pairs one source and one destination platform'
            : `${projects.length} project${projects.length !== 1 ? 's' : ''} · a project pairs one source and one destination platform`
        }
      />
      <Card>
        <CardContent className="space-y-8">
          <div className="flex justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">Manage your projects</h3>
              <p className="text-muted-foreground text-sm">
                Search, filter, and switch between table and card view
              </p>
            </div>
            <ManagementToolbar
              searchValue={filters.search}
              onSearchChange={(search) => setFilters({ ...filters, search })}
              searchPlaceholder="Search projects…"
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              filters={
                <>
                  <Select
                    value={filters.status}
                    onValueChange={(status: ProjectStatusFilter) =>
                      setFilters({ ...filters, status })
                    }
                  >
                    <SelectTrigger className="bg-muted sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.environment}
                    onValueChange={(environment: ProjectEnvironmentFilter) =>
                      setFilters({ ...filters, environment })
                    }
                  >
                    <SelectTrigger className="bg-muted sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_ENVIRONMENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              }
            />
          </div>
          {isLoading ? (
            viewMode === 'table' ? (
              <Card className="overflow-hidden py-0">
                <SkeletonTable rows={6} columns={6} />
              </Card>
            ) : (
              <SkeletonCardGrid count={4} />
            )
          ) : isError ? (
            <ErrorState
              onRetry={() => {
                projectsQuery.refetch();
                jobsQuery.refetch();
              }}
            />
          ) : filteredProjects.length === 0 ? (
            <ProjectEmptyState
              hasNoProjects={projects.length === 0}
              onCreated={handleProjectCreated}
              viewMode={viewMode}
            />
          ) : viewMode === 'table' ? (
            <div className="overflow-hidden rounded-4xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted/50">
                    <SortableTableHead
                      active={sortKey === 'name'}
                      direction={direction}
                      onClick={() => toggleSort('name')}
                    >
                      Project
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'environment'}
                      direction={direction}
                      onClick={() => toggleSort('environment')}
                    >
                      Environment
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'rules'}
                      direction={direction}
                      onClick={() => toggleSort('rules')}
                    >
                      Rules
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'records'}
                      direction={direction}
                      onClick={() => toggleSort('records')}
                    >
                      Records Synced
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((project) => {
                    const env = projectEnv(project);
                    return (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex shrink-0 items-center gap-1.5">
                              <PlatformIcon
                                platformId={project.sourcePlatformId ?? ''}
                                variant="avatar"
                                size="md"
                              />
                              <ArrowRight className="text-muted-foreground size-3.5" />
                              <PlatformIcon
                                platformId={project.destPlatformId}
                                variant="avatar"
                                size="md"
                              />
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/projects/${project.id}`}
                                className="hover:text-primary block truncate text-sm font-medium transition-colors"
                              >
                                {project.name}
                              </Link>
                              {project.description && (
                                <p className="text-muted-foreground truncate text-xs">
                                  {project.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm capitalize">
                          {env ?? '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {project.jobCount}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {project.totalRecordsSynced ?? 0}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {project.lastSyncedAt
                            ? formatDistanceToNow(
                                new Date(project.lastSyncedAt),
                                { addSuffix: true },
                              )
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={project.status} size="sm" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {hasResults && viewMode === 'card' && (
        <>
          <ProjectGrid
            projects={pageItems}
            jobCountsByProject={jobCountsByProject}
          />
        </>
      )}
      {paginationBar}

      <CreateProjectDialog />
    </div>
  );
}
