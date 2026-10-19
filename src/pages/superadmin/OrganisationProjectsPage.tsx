import { formatDistanceToNow } from 'date-fns';
import { FolderOpen, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ManagementCardHeader from '@/components/shared/ManagementCardHeader';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProjectPlatformPair } from '@/features/projects/components/cards';
import ProjectSummaryCard from '@/features/projects/components/cards/ProjectSummaryCard';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useSuperAdminOrganisationQuery,
  useSuperAdminProjectsQuery,
} from '@/queries/useSuperAdmin';
import CreateOrganisationProjectDialog from './projects/CreateOrganisationProjectDialog';

const SORT_OPTIONS = [
  { value: 'lastSyncedAt', label: 'Recently synced', order: 'desc' },
  { value: 'createdAt', label: 'Recently created', order: 'desc' },
  { value: 'name', label: 'Name: A–Z', order: 'asc' },
  { value: 'status', label: 'Status', order: 'asc' },
] as const;

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

export default function OrganisationProjectsPage() {
  const { organisationId } = useParams<{ organisationId: string }>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [sortBy, setSortBy] =
    useState<(typeof SORT_OPTIONS)[number]['value']>('lastSyncedAt');
  const [status, setStatus] = useState<'all' | 'active' | 'setup' | 'archived'>(
    'all',
  );
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const orgQuery = useSuperAdminOrganisationQuery(organisationId);
  const projectsQuery = useSuperAdminProjectsQuery(organisationId ?? '', {
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    sortBy,
    sortOrder: SORT_OPTIONS.find((option) => option.value === sortBy)!.order,
  });

  if (!organisationId) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Missing organisation id"
        description="This route requires an organisation identifier in the URL."
      />
    );
  }

  const projects = projectsQuery.data?.data ?? [];
  const total = projectsQuery.data?.total ?? 0;

  return (
    <div className="w-full space-y-6">
      <section className="space-y-3" aria-label="Project results">
        <ManagementCardHeader
          title="Projects"
          subtitle="Manage this organisation’s sync projects."
          icon={FolderOpen}
          count={total}
          countLabel={total === 1 ? 'project' : 'projects'}
          isLoading={projectsQuery.isLoading}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden />
              Create Project
            </Button>
          }
        >
          <ManagementToolbar
            directoryLayout
            filterCount={1}
            searchValue={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchPlaceholder="Search projects…"
            searchLabel="Search projects"
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            filters={
              <Select
                value={status}
                onValueChange={(value: typeof status) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="border-border/80 bg-card hover:border-foreground/25 dark:bg-card w-full min-w-0"
                  aria-label="Filter projects by status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="setup">Setup</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            }
            sort={
              <Select
                value={sortBy}
                onValueChange={(value: typeof sortBy) => {
                  setSortBy(value);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="border-border/80 bg-card hover:border-foreground/25 dark:bg-card w-full min-w-0 [&_[data-slot=select-value]]:truncate"
                  aria-label="Sort projects"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </ManagementCardHeader>

        {projectsQuery.isLoading ? (
          <SkeletonList count={5} />
        ) : projectsQuery.isError ? (
          <ErrorState
            title="Could not load projects"
            description={extractErrorMessage(projectsQuery.error)}
            onRetry={() => projectsQuery.refetch()}
          />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={
              search || status !== 'all'
                ? 'No matching projects'
                : 'No projects yet'
            }
            description={
              search || status !== 'all'
                ? 'Try another search or status.'
                : 'This organisation has not created any sync projects.'
            }
          />
        ) : viewMode === 'card' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const path = `/super-admin/organisations/${organisationId}/projects/${project.id}`;
              return (
                <ProjectSummaryCard
                  key={project.id}
                  to={path}
                  name={project.name}
                  description={project.description}
                  footerAction={
                    <span className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-sm font-medium">
                      <Link className="text-primary hover:underline" to={path}>
                        View project
                        <span className="sr-only"> {project.name}</span>
                      </Link>
                      <Link
                        className="text-primary hover:underline"
                        to={`${path}/associations`}
                      >
                        Association rules
                        <span className="sr-only"> for {project.name}</span>
                      </Link>
                      <Link
                        className="text-primary hover:underline"
                        to={`${path}/migration`}
                      >
                        Migration
                        <span className="sr-only"> for {project.name}</span>
                      </Link>
                    </span>
                  }
                  sourcePlatformId={project.sourcePlatformId}
                  destPlatformId={project.destPlatformId}
                  syncMode={
                    project.syncMode === 'two_way' ? 'two_way' : 'one_way'
                  }
                  status={project.status}
                  statusBadge={
                    <Badge
                      variant={
                        project.status === 'active' ? 'secondary' : 'outline'
                      }
                    >
                      {project.status}
                    </Badge>
                  }
                  activityLabel={
                    project.lastSyncedAt
                      ? `Synced ${formatDistanceToNow(new Date(project.lastSyncedAt), { addSuffix: true })}`
                      : 'Not synced yet'
                  }
                  metrics={[
                    { label: 'Sync jobs', value: project.jobCount },
                    { label: 'Enabled jobs', value: project.enabledJobCount },
                  ]}
                />
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Platforms</TableHead>
                  <TableHead>Sync mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Jobs</TableHead>
                  <TableHead>Last sync</TableHead>
                  <TableHead className="text-right">Support tools</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{project.name}</span>
                        {project.description ? (
                          <span className="text-muted-foreground truncate text-xs">
                            {project.description}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ProjectPlatformPair
                        sourcePlatformId={project.sourcePlatformId}
                        destPlatformId={project.destPlatformId}
                        syncMode={
                          project.syncMode === 'two_way' ? 'two_way' : 'one_way'
                        }
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      {project.syncMode}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          project.status === 'active' ? 'secondary' : 'outline'
                        }
                      >
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {project.enabledJobCount}/{project.jobCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {project.lastSyncedAt
                        ? formatDistanceToNow(new Date(project.lastSyncedAt), {
                            addSuffix: true,
                          })
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-sm">
                        <Link
                          to={`/super-admin/organisations/${organisationId}/projects/${project.id}`}
                          className="text-primary hover:underline"
                        >
                          View project
                          <span className="sr-only"> {project.name}</span>
                        </Link>
                        <Link
                          to={`/super-admin/organisations/${organisationId}/projects/${project.id}/associations`}
                          className="text-primary hover:underline"
                        >
                          Associations
                          <span className="sr-only"> for {project.name}</span>
                        </Link>
                        <Link
                          to={`/super-admin/organisations/${organisationId}/projects/${project.id}/migration`}
                          className="text-primary hover:underline"
                        >
                          Migration
                          <span className="sr-only"> for {project.name}</span>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <PaginationBar
        page={page}
        totalPages={Math.max(1, Math.ceil(total / pageSize))}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
      {createOpen ? (
        <CreateOrganisationProjectDialog
          key={organisationId}
          organisationId={organisationId}
          organisationName={orgQuery.data?.name ?? 'this organisation'}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
    </div>
  );
}
