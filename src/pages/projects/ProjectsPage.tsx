import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, FolderOpen } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import ErrorState from '@/components/shared/ErrorState';
import ManagementCardHeader from '@/components/shared/ManagementCardHeader';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonCardGrid from '@/components/shared/skeletons/SkeletonCardGrid';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import SortableTableHead from '@/components/shared/SortableTableHead';
import StatusBadge from '@/components/shared/StatusBadge';
import { Card } from '@/components/ui/card';
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
import {
  CreateProjectButton,
  ProjectEmptyState,
  ProjectGrid,
} from '@/features/projects';
import { useCreateProjectStore } from '@/features/projects/store/useCreateProjectStore';
import { ProjectPlatformPair } from '@/features/projects/components/cards';
import { useProjectFilters } from '@/features/projects/hooks';
import { PROJECT_STATUS_OPTIONS } from '@/features/projects/types';
import type {
  ProjectExtended,
  ProjectStatusFilter,
} from '@/features/projects/types';
import { buildJobCountsByProject } from '@/features/projects/utils';
import { usePagination } from '@/hooks/usePagination';
import { useSort, type SortDirection } from '@/hooks/useSort';
import { useViewMode } from '@/hooks/useViewMode';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { useJobsQuery } from '@/queries/useJobs';
import { useProjectsQuery } from '@/queries/useProjects';

type ProjectWithMeta = ProjectExtended & {
  jobCount: number;
};

type SortKey =
  'name' | 'records' | 'rules' | 'lastSynced' | 'status' | 'updatedAt';

interface CardSortOption {
  value: string;
  label: string;
  key: SortKey;
  direction: SortDirection;
}

const CARD_SORT_OPTIONS: CardSortOption[] = [
  {
    value: 'updatedAt-desc',
    label: 'Recently updated',
    key: 'updatedAt',
    direction: 'desc',
  },
  { value: 'name-asc', label: 'Name: A–Z', key: 'name', direction: 'asc' },
  { value: 'name-desc', label: 'Name: Z–A', key: 'name', direction: 'desc' },
  {
    value: 'records-desc',
    label: 'Most records synced',
    key: 'records',
    direction: 'desc',
  },
  {
    value: 'rules-desc',
    label: 'Most sync jobs',
    key: 'rules',
    direction: 'desc',
  },
  {
    value: 'lastSynced-desc',
    label: 'Recently synced',
    key: 'lastSynced',
    direction: 'desc',
  },
  { value: 'status-asc', label: 'Status', key: 'status', direction: 'asc' },
];

function timestamp(value?: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function compareProjects(a: ProjectWithMeta, b: ProjectWithMeta, key: SortKey) {
  switch (key) {
    case 'name':
      return (a.name || '').localeCompare(b.name || '');
    case 'records':
      return (a.totalRecordsSynced ?? 0) - (b.totalRecordsSynced ?? 0);
    case 'rules':
      return a.jobCount - b.jobCount;
    case 'lastSynced':
      return timestamp(a.lastSyncedAt) - timestamp(b.lastSyncedAt);
    case 'status':
      return (a.status || '').localeCompare(b.status || '');
    case 'updatedAt':
      return timestamp(a.updatedAt) - timestamp(b.updatedAt);
  }
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useSynkazoAuth();
  const canCreateProject = hasPermission('project.create');
  const openCreateProjectDialog = useCreateProjectStore((s) => s.open);

  useEffect(() => {
    if (searchParams.get('new') === '1' && canCreateProject) {
      openCreateProjectDialog();
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('new');
          return next;
        },
        { replace: true },
      );
    }
  }, [
    searchParams,
    canCreateProject,
    openCreateProjectDialog,
    setSearchParams,
  ]);

  const projectsQuery = useProjectsQuery();
  const jobsQuery = useJobsQuery();

  const isLoading = projectsQuery.isLoading || jobsQuery.isLoading;
  const isError = projectsQuery.isError || jobsQuery.isError;
  const projects = (projectsQuery.data ?? []) as ProjectExtended[];
  const jobs = jobsQuery.data ?? [];

  const [viewMode, setViewMode] = useViewMode('projects', 'card');
  const { filters, setFilters, filteredProjects } = useProjectFilters(projects);
  const jobCountsByProject = useMemo(
    () => buildJobCountsByProject(jobs),
    [jobs],
  );

  const projectsWithMeta: ProjectWithMeta[] = useMemo(
    () =>
      filteredProjects.map((project) => ({
        ...project,
        jobCount: jobCountsByProject[project.id] ?? 0,
      })),
    [filteredProjects, jobCountsByProject],
  );

  const { sorted, sortKey, direction, toggleSort, setSort } = useSort<
    ProjectWithMeta,
    SortKey
  >(projectsWithMeta, compareProjects);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    usePagination(sorted, 10);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status, setPage]);

  const handleProjectCreated = (project: ProjectExtended) =>
    navigate(`/projects/${project.id}`);
  const clearFilters = () => setFilters({ search: '', status: 'all' });
  const hasResults = !isLoading && !isError && filteredProjects.length > 0;
  const cardSortValue = CARD_SORT_OPTIONS.find(
    (option) => option.key === sortKey && option.direction === direction,
  )?.value;

  const paginationBar = (
    <PaginationBar
      page={page}
      totalPages={totalPages}
      total={total}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      pageSizeLabel="Projects per page"
    />
  );

  return (
    <div className="w-full space-y-6">
      <section className="space-y-3" aria-label="Project results">
        <ManagementCardHeader
          title="Projects"
          subtitle="Connect, monitor, and manage your syncs."
          icon={FolderOpen}
          count={filteredProjects.length}
          countLabel={filteredProjects.length === 1 ? 'project' : 'projects'}
          isLoading={isLoading}
          action={
            canCreateProject && projects.length > 0 ? (
              <CreateProjectButton />
            ) : undefined
          }
        >
          <ManagementToolbar
            directoryLayout
            filterCount={1}
            searchValue={filters.search}
            onSearchChange={(search) => setFilters({ ...filters, search })}
            searchPlaceholder="Search projects…"
            searchLabel="Search projects"
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            filters={
              <Select
                value={filters.status}
                onValueChange={(status: ProjectStatusFilter) =>
                  setFilters({ ...filters, status })
                }
              >
                <SelectTrigger
                  size="sm"
                  className="border-border/80 bg-card hover:border-foreground/25 dark:bg-card w-full min-w-0"
                  aria-label="Filter projects by status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            sort={
              viewMode === 'card' ? (
                <Select
                  value={cardSortValue}
                  onValueChange={(value) => {
                    const option = CARD_SORT_OPTIONS.find(
                      (candidate) => candidate.value === value,
                    );
                    if (option) setSort(option.key, option.direction);
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="border-border/80 bg-card hover:border-foreground/25 dark:bg-card w-full min-w-0 [&_[data-slot=select-value]]:truncate"
                    aria-label="Sort projects"
                  >
                    <SelectValue placeholder="Sort projects" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : undefined
            }
          />
        </ManagementCardHeader>

        {isLoading ? (
          viewMode === 'table' ? (
            <Card className="overflow-hidden py-0">
              <SkeletonTable rows={6} columns={7} />
            </Card>
          ) : (
            <SkeletonCardGrid count={6} />
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
            onClearFilters={clearFilters}
            canCreate={canCreateProject}
            viewMode={viewMode}
          />
        ) : viewMode === 'table' ? (
          <Card size="sm" className="py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      active={sortKey === 'name'}
                      direction={direction}
                      onClick={() => toggleSort('name')}
                    >
                      Project
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'rules'}
                      direction={direction}
                      onClick={() => toggleSort('rules')}
                    >
                      Sync jobs
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'records'}
                      direction={direction}
                      onClick={() => toggleSort('records')}
                    >
                      Records synced
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'lastSynced'}
                      direction={direction}
                      onClick={() => toggleSort('lastSynced')}
                    >
                      Last synced
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'status'}
                      direction={direction}
                      onClick={() => toggleSort('status')}
                    >
                      Status
                    </SortableTableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((project) => {
                    const activeEnv =
                      project.activeEnvironment ?? project.active_environment;
                    const isSandbox = activeEnv === 'sandbox';

                    return (
                      <TableRow key={project.id}>
                        <TableCell className="min-w-72">
                          <div className="flex items-center gap-3">
                            <ProjectPlatformPair
                              sourcePlatformId={project.sourcePlatformId}
                              destPlatformId={project.destPlatformId}
                              syncMode={project.syncMode}
                            />
                            <div className="min-w-0">
                              <Link
                                to={`/projects/${project.id}`}
                                className="hover:text-primary focus-visible:ring-ring block truncate rounded-sm text-sm font-medium transition-colors outline-none focus-visible:ring-2"
                              >
                                {project.name}
                              </Link>
                              {project.description && (
                                <p className="text-muted-foreground max-w-72 truncate text-xs">
                                  {project.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {project.jobCount}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {(project.totalRecordsSynced ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {project.lastSyncedAt
                            ? formatDistanceToNow(
                                new Date(project.lastSyncedAt),
                                {
                                  addSuffix: true,
                                },
                              )
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={project.status} size="sm" />
                        </TableCell>
                        <TableCell>
                          {activeEnv ? (
                            <Link
                              to={`/projects/${project.id}?tab=settings&section=environments`}
                              className="focus-visible:ring-ring inline-flex rounded-full transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:outline-none"
                              title={
                                isSandbox
                                  ? 'Operating in Sandbox (Test Mode) — Click to open Environment Settings'
                                  : 'Operating in Production (Live) — Click to open Environment Settings'
                              }
                            >
                              <StatusBadge
                                status={activeEnv}
                                label={
                                  isSandbox
                                    ? 'Sandbox (Test Mode)'
                                    : 'Production (Live)'
                                }
                                size="sm"
                              />
                            </Link>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            to={`/projects/${project.id}`}
                            className="text-primary focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm text-sm font-medium outline-none hover:underline focus-visible:ring-2"
                          >
                            View
                            <ArrowRight
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : null}

        {hasResults && viewMode === 'card' && (
          <ProjectGrid
            projects={pageItems}
            jobCountsByProject={jobCountsByProject}
          />
        )}

        {hasResults && paginationBar}
      </section>
    </div>
  );
}
