import { format } from 'date-fns';
import { FolderOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PageHeader from '@/components/shared/PageHeader';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import SortableTableHead from '@/components/shared/SortableTableHead';
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
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
import { useOrgsQuery } from '@/queries/useOrganisations';
import { useProjectsQuery } from '@/queries/useProjects';
import type { ProjectStatus } from '@/types/project';

interface ProjectWithOrg {
  id: string;
  name: string;
  status: ProjectStatus;
  organisationId: string;
  organisationName: string;
  createdAt?: string;
}

type StatusFilter = 'all' | ProjectStatus;
type SortKey = 'name' | 'organisation' | 'status' | 'createdAt';

function compareProjects(a: ProjectWithOrg, b: ProjectWithOrg, key: SortKey) {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'organisation':
      return a.organisationName.localeCompare(b.organisationName);
    case 'status':
      return a.status.localeCompare(b.status);
    case 'createdAt':
      return (
        new Date(a.createdAt ?? 0).getTime() -
        new Date(b.createdAt ?? 0).getTime()
      );
  }
}

export default function ProjectsPage() {
  const projectsQuery = useProjectsQuery();
  const orgsQuery = useOrgsQuery();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const isLoading = projectsQuery.isLoading || orgsQuery.isLoading;
  const hasNoData =
    (projectsQuery.isError && projectsQuery.data === undefined) ||
    (orgsQuery.isError && orgsQuery.data === undefined);

  const orgNameById = useMemo(
    () => new Map((orgsQuery.data ?? []).map((org) => [org.id, org.name])),
    [orgsQuery.data],
  );

  const projects: ProjectWithOrg[] = useMemo(
    () =>
      (projectsQuery.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        organisationId: p.organisationId,
        organisationName: orgNameById.get(p.organisationId) ?? '—',
        createdAt: p.createdAt,
      })),
    [projectsQuery.data, orgNameById],
  );

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.organisationName.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const { sorted, sortKey, direction, toggleSort } = useSort<
    ProjectWithOrg,
    SortKey
  >(filteredProjects, compareProjects);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    usePagination(sorted, 10);

  const header = (
    <PageHeader
      backTo={{ label: 'Back to Super Admin', to: '/super-admin' }}
      title="Projects"
      description="View all projects across every organisation on the platform"
    />
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <Card className="p-0">
          <SkeletonList count={5} />
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
            projectsQuery.refetch();
            orgsQuery.refetch();
          }}
        />
      </div>
    );
  }

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
    <div className="animate-fade-in-up space-y-6">
      {header}
      <Card>
        <CardContent className="space-y-6">
          <div className="flex justify-between">
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold">Manage projects</h3>
              <p className="text-muted-foreground text-sm">
                View every project across the platform
              </p>
            </div>
            <ManagementToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search projects…"
              filters={
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
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </div>
          {filteredProjects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No projects match your filters"
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
                      Project
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'organisation'}
                      direction={direction}
                      onClick={() => toggleSort('organisation')}
                    >
                      Organisation
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'status'}
                      direction={direction}
                      onClick={() => toggleSort('status')}
                    >
                      Status
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'createdAt'}
                      direction={direction}
                      onClick={() => toggleSort('createdAt')}
                    >
                      Created
                    </SortableTableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{project.name}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {project.organisationName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={project.status} size="sm" />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {project.createdAt
                          ? format(new Date(project.createdAt), 'MMM d, yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/projects/${project.id}`}
                          className="text-primary text-sm font-medium hover:underline"
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter>{paginationBar}</CardFooter>
      </Card>
    </div>
  );
}
