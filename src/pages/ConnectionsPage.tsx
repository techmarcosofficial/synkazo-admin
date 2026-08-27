import { formatDistanceToNow } from 'date-fns';
import { Clock, ExternalLink, GitMerge, MoreVertical } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  getAllPlatforms,
  getPlatform,
  PlatformIcon,
} from '@/components/platform';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PageHeader from '@/components/shared/PageHeader';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonCardGrid from '@/components/shared/skeletons/SkeletonCardGrid';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import SortableTableHead from '@/components/shared/SortableTableHead';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { useViewMode } from '@/hooks/useViewMode';
import { useConnectionsQuery } from '@/queries/useConnections';
import { useProjectsQuery } from '@/queries/useProjects';
import type { Connection, Project } from '@/types';

interface ConnectionWithMeta extends Connection {
  projectName?: string;
}

type PlatformFilter = 'all' | Connection['platformId'];
type StatusFilter = 'all' | Connection['status'];
type SortKey = 'account' | 'type' | 'project' | 'status' | 'connectedAt';

function compareConnections(
  a: ConnectionWithMeta,
  b: ConnectionWithMeta,
  key: SortKey,
) {
  switch (key) {
    case 'account':
      return (a.accountName || a.platformId || '').localeCompare(
        b.accountName || b.platformId || '',
      );
    case 'type':
      return (a.connectionType || '').localeCompare(b.connectionType || '');
    case 'project':
      return (a.projectName || '').localeCompare(b.projectName || '');
    case 'status':
      return (a.status || '').localeCompare(b.status || '');
    case 'connectedAt':
      return (
        new Date(a.connectedAt || 0).getTime() -
        new Date(b.connectedAt || 0).getTime()
      );
  }
}

function ConnectionCard({ connection }: { connection: ConnectionWithMeta }) {
  const navigate = useNavigate();
  const platform = getPlatform(connection.platformId);
  const platformName = platform?.name ?? connection.platformId;

  return (
    <Card className="bg-secondary shadow">
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <PlatformIcon
            platformId={connection.platformId}
            variant="avatar"
            size="2xl"
          />
          <div className="flex items-center gap-1">
            <StatusBadge status={connection.status} size="sm" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="-mr-2 size-8">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => navigate(`/projects/${connection.projectId}`)}
                >
                  <ExternalLink className="size-4" /> View Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-1">
          <p className="truncate text-base font-bold">
            {connection.accountName || `${platformName} Connection`}
          </p>
          {connection.projectName ? (
            <Link
              to={`/projects/${connection.projectId}`}
              className="text-muted-foreground hover:text-primary block truncate text-xs transition-colors"
            >
              {connection.projectName}
            </Link>
          ) : (
            <span className="text-muted-foreground text-xs">No project</span>
          )}
        </div>
        <div className="border-t"></div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs capitalize">
          {connection.connectionType} · {platformName}
        </span>
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          {connection.connectedAt
            ? formatDistanceToNow(new Date(connection.connectedAt), {
                addSuffix: true,
              })
            : '—'}
        </span>
      </CardFooter>
    </Card>
  );
}

export default function ConnectionsPage() {
  const navigate = useNavigate();
  const connectionsQuery = useConnectionsQuery();
  const projectsQuery = useProjectsQuery();

  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useViewMode('connections');

  const isLoading = connectionsQuery.isLoading || projectsQuery.isLoading;
  const isError = connectionsQuery.isError || projectsQuery.isError;
  const connections = connectionsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];

  const getProject = (projectId: string) =>
    projects.find((p: Project) => p.id === projectId);

  const connectionsWithMeta: ConnectionWithMeta[] = useMemo(
    () =>
      connections.map((c) => ({
        ...c,
        projectName: getProject(c.projectId)?.name,
      })),

    [connections, projects],
  );

  const filteredConnections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return connectionsWithMeta.filter((c) => {
      const matchesSearch =
        !q ||
        c.accountName?.toLowerCase().includes(q) ||
        c.projectName?.toLowerCase().includes(q);
      const matchesPlatform =
        platformFilter === 'all' || c.platformId === platformFilter;
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesPlatform && matchesStatus;
    });
  }, [connectionsWithMeta, search, platformFilter, statusFilter]);

  const { sorted, sortKey, direction, toggleSort } = useSort<
    ConnectionWithMeta,
    SortKey
  >(filteredConnections, compareConnections);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    usePagination(sorted, 10);

  return (
    <div className="animate-fade-in-up space-y-6">
      <PageHeader
        backTo={{ label: 'Back to Dashboard', to: '/dashboard' }}
        title="Connections"
        description={
          isLoading
            ? undefined
            : `${connections.filter((c) => c.status === 'connected').length} of ${connections.length} connected`
        }
      />

      <Card>
        <CardContent className="space-y-8">
          <div className="flex justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Manage your connections</h3>
              <p className="text-muted-foreground text-xs">
                Search, filter, and switch between table and card view
              </p>
            </div>
            <ManagementToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search connections…"
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              filters={
                <>
                  <Select
                    value={platformFilter}
                    onValueChange={(v: PlatformFilter) => setPlatformFilter(v)}
                  >
                    <SelectTrigger className="bg-muted sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All platforms</SelectItem>
                      {getAllPlatforms().map((platform) => (
                        <SelectItem key={platform.id} value={platform.id}>
                          {platform.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusFilter}
                    onValueChange={(v: StatusFilter) => setStatusFilter(v)}
                  >
                    <SelectTrigger className="bg-muted sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="connected">Connected</SelectItem>
                      <SelectItem value="disconnected">Disconnected</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              }
            />
          </div>

          {isLoading ? (
            viewMode === 'table' ? (
              <div className="overflow-hidden rounded-4xl border">
                <SkeletonTable rows={6} columns={5} />
              </div>
            ) : (
              <SkeletonCardGrid count={6} />
            )
          ) : isError ? (
            <ErrorState
              onRetry={() => {
                connectionsQuery.refetch();
                projectsQuery.refetch();
              }}
            />
          ) : filteredConnections.length === 0 ? (
            connections.length === 0 ? (
              <EmptyState
                icon={GitMerge}
                title="No connections yet"
                description="Connections are created when you add a project. Create a project to get started."
                action={{
                  label: 'New Project',
                  onClick: () => navigate('/projects?new=1'),
                  icon: GitMerge,
                }}
                viewMode={viewMode}
              />
            ) : (
              <EmptyState
                icon={GitMerge}
                title="No connections match your filters"
                viewMode={viewMode}
              />
            )
          ) : viewMode === 'table' ? (
            <div className="overflow-hidden rounded-4xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted/50">
                    <SortableTableHead
                      active={sortKey === 'account'}
                      direction={direction}
                      onClick={() => toggleSort('account')}
                    >
                      Connection
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'type'}
                      direction={direction}
                      onClick={() => toggleSort('type')}
                    >
                      Type
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'project'}
                      direction={direction}
                      onClick={() => toggleSort('project')}
                    >
                      Project
                    </SortableTableHead>
                    <SortableTableHead
                      active={sortKey === 'connectedAt'}
                      direction={direction}
                      onClick={() => toggleSort('connectedAt')}
                    >
                      Connected
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
                  {pageItems.map((conn) => (
                    <TableRow key={conn.id}>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-3">
                          <PlatformIcon
                            platformId={conn.platformId}
                            variant="avatar"
                            size="lg"
                          />
                          <p className="text-sm font-medium">
                            {conn.accountName ||
                              `${conn.platformId} Connection`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm capitalize">
                        {conn.connectionType}
                      </TableCell>
                      <TableCell className="text-sm">
                        {conn.projectName ? (
                          <Link
                            to={`/projects/${conn.projectId}`}
                            className="hover:text-primary transition-colors"
                          >
                            {conn.projectName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {conn.connectedAt
                          ? formatDistanceToNow(new Date(conn.connectedAt), {
                              addSuffix: true,
                            })
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={conn.status} size="sm" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((conn) => (
                <ConnectionCard key={conn.id} connection={conn} />
              ))}
            </div>
          )}
        </CardContent>
        {!isLoading && !isError && filteredConnections.length > 0 && (
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
        )}
      </Card>
    </div>
  );
}
