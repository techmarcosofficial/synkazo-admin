import { format, formatDistanceToNow } from 'date-fns';
import { AlertCircle, Clock3, Database, Workflow } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectPlatformPair } from '@/features/projects/components/cards';
import {
  useSuperAdminJobQuery,
  useSuperAdminProjectQuery,
} from '@/queries/useSuperAdmin';

function dateLabel(value: string | null) {
  return value ? format(new Date(value), 'PPp') : '—';
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium [overflow-wrap:anywhere]">
        {value ?? '—'}
      </dd>
    </div>
  );
}

export default function OrganisationJobDetailPage() {
  const {
    organisationId = '',
    projectId = '',
    jobId = '',
  } = useParams<{
    organisationId: string;
    projectId: string;
    jobId: string;
  }>();
  const projectQuery = useSuperAdminProjectQuery(organisationId, projectId);
  const jobQuery = useSuperAdminJobQuery(organisationId, projectId, jobId);
  const projectPath = `/super-admin/organisations/${organisationId}/projects/${projectId}`;

  if (!organisationId || !projectId || !jobId) {
    return (
      <EmptyState
        icon={Workflow}
        title="Missing route parameters"
        description="Organisation, project, and job identifiers are required."
      />
    );
  }

  if (jobQuery.isLoading) return <SkeletonList count={4} />;
  if (jobQuery.isError) {
    return (
      <ErrorState
        title="Could not load job"
        onRetry={() => jobQuery.refetch()}
      />
    );
  }
  if (!jobQuery.data) {
    return (
      <EmptyState
        icon={Workflow}
        title="Job not found"
        description="This job is unavailable."
      />
    );
  }

  const job = jobQuery.data;
  const failures = job.recentFailures ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={job.name}
        description={projectQuery.data?.name ?? 'Sync job'}
        backTo={{ label: 'Back to project', to: projectPath }}
        badge={
          <Badge variant={job.isEnabled ? 'secondary' : 'outline'}>
            {job.isEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        }
      />

      {projectQuery.data && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <ProjectPlatformPair
                sourcePlatformId={projectQuery.data.sourcePlatformId}
                destPlatformId={projectQuery.data.destPlatformId}
                syncMode={
                  projectQuery.data.syncMode === 'two_way'
                    ? 'two_way'
                    : 'one_way'
                }
                size="2xl"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {projectQuery.data.name}
                </p>
                <p className="text-muted-foreground text-xs">
                  {job.sourceObjectId ?? 'Source object'} →{' '}
                  {job.destObjectId ?? 'Destination object'}
                </p>
              </div>
            </div>
            <Badge variant="outline">{job.syncDirection}</Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-2">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Workflow className="size-4" aria-hidden />
              Status
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{job.status}</Badge>
              <Badge variant="outline">
                {job.isRunning ? 'Running' : 'Idle'}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Clock3 className="size-4" aria-hidden />
              Schedule
            </div>
            <p className="text-sm font-semibold">{job.scheduleState}</p>
            <p className="text-muted-foreground text-xs">
              Next run: {dateLabel(job.nextRunAt)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Database className="size-4" aria-hidden />
              Last sync
            </div>
            <p className="text-sm font-semibold">
              {job.lastSyncedAt
                ? formatDistanceToNow(new Date(job.lastSyncedAt), {
                    addSuffix: true,
                  })
                : 'Never'}
            </p>
            <p className="text-muted-foreground text-xs">
              {dateLabel(job.lastSyncedAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader visualLevel="section">
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-5 sm:grid-cols-2">
              <DetailItem label="Sync direction" value={job.syncDirection} />
              <DetailItem label="Schedule mode" value={job.scheduleMode} />
              <DetailItem
                label="Interval"
                value={
                  job.intervalMinutes == null
                    ? '—'
                    : `${job.intervalMinutes} minutes`
                }
              />
              <DetailItem label="Source object" value={job.sourceObjectId} />
              <DetailItem label="Destination object" value={job.destObjectId} />
              <DetailItem
                label="Depends on job"
                value={
                  job.dependsOnJobId ? (
                    <Link
                      className="text-primary hover:underline"
                      to={`${projectPath}/jobs/${job.dependsOnJobId}`}
                    >
                      {job.dependsOnJobId}
                    </Link>
                  ) : (
                    'None'
                  )
                }
              />
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader visualLevel="section">
            <CardTitle>Resume checkpoint</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-5 sm:grid-cols-2">
              <DetailItem label="Page" value={job.checkpointPage} />
              <DetailItem
                label="Since"
                value={dateLabel(job.checkpointSince)}
              />
              <DetailItem label="Run ID" value={job.checkpointRunId} />
              <DetailItem label="Full sync page" value={job.syncAllPage} />
            </dl>
            <p className="text-muted-foreground mt-5 text-xs">
              The next run may resume from these values.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader visualLevel="section">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="size-4" aria-hidden />
            Recent failed runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {failures.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No recent failed runs.
            </p>
          ) : (
            <ul className="divide-y rounded-3xl border">
              {failures.map((failure) => (
                <li
                  key={failure.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {dateLabel(failure.startedAt)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Run {failure.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {failure.failedCount} failed · {failure.totalFetched}{' '}
                      fetched
                    </span>
                    <Badge variant="destructive">{failure.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
