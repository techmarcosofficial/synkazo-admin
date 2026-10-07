import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, ExternalLink, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Badge } from '@/components/ui/badge';
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

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

export default function OrganisationProjectsPage() {
  const { organisationId } = useParams<{ organisationId: string }>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const orgQuery = useSuperAdminOrganisationQuery(organisationId);
  const projectsQuery = useSuperAdminProjectsQuery(organisationId ?? '', {
    page,
    limit: pageSize,
    sortBy: 'lastSyncedAt',
    sortOrder: 'desc',
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
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to={`/super-admin/organisations/${organisationId}/overview`}
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to organisation
        </Link>
        <PageHeader
          title="Projects"
          description={orgQuery.data?.name ?? organisationId}
        />
      </div>

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
          title="No projects yet"
          description="This organisation has not created any sync projects."
        />
      ) : (
        <div className="bg-card overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Source → Destination</TableHead>
                <TableHead>Sync mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Jobs</TableHead>
                <TableHead>Last sync</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link
                      to={`/super-admin/organisations/${organisationId}/projects/${project.id}`}
                      className="hover:text-primary flex flex-col"
                    >
                      <span className="font-medium">{project.name}</span>
                      {project.description ? (
                        <span className="text-muted-foreground truncate text-xs">
                          {project.description}
                        </span>
                      ) : null}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="font-mono text-xs">
                      {project.sourcePlatformId} → {project.destPlatformId}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{project.syncMode}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{project.status}</Badge>
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
                  <TableCell>
                    <Link
                      to={`/super-admin/organisations/${organisationId}/projects/${project.id}`}
                      aria-label={`Open ${project.name}`}
                    >
                      <ExternalLink className="text-muted-foreground size-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
    </div>
  );
}
