import { formatDistanceToNow } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import ErrorState from '@/components/shared/ErrorState';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PageHeader from '@/components/shared/PageHeader';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonCardGrid from '@/components/shared/skeletons/SkeletonCardGrid';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import SortableTableHead from '@/components/shared/SortableTableHead';
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CreateProjectButton,
  CreateProjectDialog,
  ProjectEmptyState,
  ProjectGrid,
} from '@/features/projects';
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
import { useOrgsQuery } from '@/queries/useOrganisations';
import { useProjectsQuery } from '@/queries/useProjects';
import { useHeaderStore } from '@/stores/useHeaderStore';

type ProjectWithMeta = ProjectExtended & {
  jobCount: number;
  organisationName?: string;
};

type SortKey =
  | 'name'
  | 'organisation'
  | 'records'
  | 'rules'
  | 'lastSynced'
  | 'status'
  | 'updatedAt';

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
  {
    value: 'organisation-asc',
    label: 'Organisation: A–Z',
    key: 'organisation',
    direction: 'asc',
  },
];

function timestamp(value?: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function compareProjects(a: ProjectWithMeta, b: ProjectWithMeta, key: SortKey) {
  switch (key) {
    case 'name':
      return (a.name || '').localeCompare(b.name || '');
    case 'organisation':
      return (a.organisationName || '').localeCompare(b.organisationName || '');
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
  const { currentUser, hasPermission } = useSynkazoAuth();
  const showOrganisation = currentUser?.role === 'super_admin';
  const canCreateProject = hasPermission('project.create');

  const projectsQuery = useProjectsQuery();
  const jobsQuery = useJobsQuery();
  const orgsQuery = useOrgsQuery({ enabled: showOrganisation });

  const isLoading =
    projectsQuery.isLoading ||
    jobsQuery.isLoading ||
    (showOrganisation && orgsQuery.isLoading);
  const isError =
    projectsQuery.isError ||
    jobsQuery.isError ||
    (showOrganisation && orgsQuery.isError);
  const projects = (projectsQuery.data ?? []) as ProjectExtended[];
  const jobs = jobsQuery.data ?? [];

  const organisationNamesById = useMemo(
    () =>
      new Map((orgsQuery.data ?? []).map((org) => [org.id, org.name] as const)),
    [orgsQuery.data],
  );

  const searchableProjects: Array<
    ProjectExtended & { organisationName?: string }
  > = useMemo(
    () =>
      projects.map((project) => ({
        ...project,
        organisationName: showOrganisation
          ? organisationNamesById.get(project.organisationId)
          : undefined,
      })),
    [projects, showOrganisation, organisationNamesById],
  );

  const [viewMode, setViewMode] = useViewMode('projects', 'card');
  const { filters, setFilters, filteredProjects } =
    useProjectFilters(searchableProjects);
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
  const setActions = useHeaderStore((state) => state.setActions);
  const clearActions = useHeaderStore((state) => state.clearActions);

  useEffect(() => {
    if (canCreateProject) setActions(<CreateProjectButton />);
    else clearActions();
    return () => clearActions();
  }, [canCreateProject, clearActions, setActions]);

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
      <PageHeader
        title="Projects"
        description={
          isLoading
            ? 'A project connects a source and destination platform'
            : `${projects.length} project${projects.length !== 1 ? 's' : ''} · connect, monitor, and manage your syncs`
        }
      />

      <Card>
        <CardContent className="space-y-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Manage projects</h2>
              <p className="text-muted-foreground text-sm">
                Find a project, review its status, or open it to manage syncs.
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
                    <SelectTrigger
                      className="bg-muted sm:w-40"
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

                  {viewMode === 'card' && (
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
                        className="bg-muted sm:w-48"
                        aria-label="Sort projects"
                      >
                        <SelectValue placeholder="Sort projects" />
                      </SelectTrigger>
                      <SelectContent>
                        {CARD_SORT_OPTIONS.filter(
                          (option) =>
                            showOrganisation || option.key !== 'organisation',
                        ).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              }
            />
          </div>

          {isLoading ? (
            viewMode === 'table' ? (
              <Card className="overflow-hidden py-0">
                <SkeletonTable rows={6} columns={showOrganisation ? 7 : 6} />
              </Card>
            ) : (
              <SkeletonCardGrid count={6} />
            )
          ) : isError ? (
            <ErrorState
              onRetry={() => {
                projectsQuery.refetch();
                jobsQuery.refetch();
                if (showOrganisation) orgsQuery.refetch();
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
            <div className="border-border overflow-x-auto rounded-4xl border">
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
                    {showOrganisation && (
                      <SortableTableHead
                        active={sortKey === 'organisation'}
                        direction={direction}
                        onClick={() => toggleSort('organisation')}
                      >
                        Organisation
                      </SortableTableHead>
                    )}
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((project) => (
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
                      {showOrganisation && (
                        <TableCell>
                          <Badge variant="secondary">
                            {project.organisationName ?? 'Unknown organisation'}
                          </Badge>
                        </TableCell>
                      )}
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
                      <TableCell className="text-right">
                        <Link
                          to={`/projects/${project.id}`}
                          className="text-primary focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm text-sm font-medium outline-none hover:underline focus-visible:ring-2"
                        >
                          View
                          <ArrowRight className="size-3.5" aria-hidden="true" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {hasResults && viewMode === 'card' && (
        <ProjectGrid
          projects={pageItems}
          jobCountsByProject={jobCountsByProject}
          organisationNamesById={
            showOrganisation ? organisationNamesById : undefined
          }
        />
      )}

      {hasResults && paginationBar}

      {canCreateProject && <CreateProjectDialog />}
    </div>
  );
}
