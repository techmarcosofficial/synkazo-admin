import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, FolderOpen, Play } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import RunJobDialog, { type RunJobDialogValues } from './projects/RunJobDialog';
import RunStatusPoller from './projects/RunStatusPoller';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { showToast } from '@/lib/toast';
import {
  useRunSuperAdminJobMutation,
  useSuperAdminJobsQuery,
  useSuperAdminOrganisationQuery,
  useSuperAdminProjectQuery,
} from '@/queries/useSuperAdmin';

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

interface ActiveRun {
  jobId: string;
  jobName: string;
  bullJobId: string;
}

interface JobRowProps {
  organisationId: string;
  projectId: string;
  job: ReturnType<typeof useSuperAdminJobsQuery>['data'] extends
    | infer T
    | undefined
    ? T extends readonly (infer U)[]
      ? U
      : never
    : never;
  onRun: (jobId: string, jobName: string) => void;
  runDisabled: boolean;
}

function JobRow({ job, onRun, runDisabled }: JobRowProps) {
  return (
    <TableRow key={job.id}>
      <TableCell className="font-medium">{job.name}</TableCell>
      <TableCell>
        <Badge variant="outline">{job.syncDirection}</Badge>
      </TableCell>
      <TableCell>
        {job.isEnabled ? (
          <Badge className="bg-emerald-100 text-emerald-900">Enabled</Badge>
        ) : (
          <Badge className="bg-muted text-muted-foreground">Disabled</Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline">{job.scheduleState}</Badge>
      </TableCell>
      <TableCell>
        {job.isRunning ? (
          <Badge className="bg-blue-100 text-blue-900">Running</Badge>
        ) : (
          <Badge variant="outline">Idle</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {job.lastSyncedAt
          ? formatDistanceToNow(new Date(job.lastSyncedAt), { addSuffix: true })
          : 'Never'}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {job.nextRunAt
          ? formatDistanceToNow(new Date(job.nextRunAt), { addSuffix: true })
          : '—'}
      </TableCell>
      {/* GAP-014 — checkpoint visibility. The next run resumes from
          checkpointPage/checkpointSince. `—` when the job has never
          run or has just completed a full sweep. */}
      <TableCell className="text-muted-foreground text-sm">
        {job.checkpointPage != null || job.checkpointSince != null ? (
          <span
            title={
              job.checkpointRunId
                ? `Set by run ${job.checkpointRunId}`
                : 'Latest checkpoint'
            }
          >
            {job.checkpointPage != null ? `page ${job.checkpointPage}` : ''}
            {job.checkpointPage != null && job.checkpointSince != null
              ? ' · '
              : ''}
            {job.checkpointSince
              ? `since ${new Date(job.checkpointSince).toISOString().slice(0, 10)}`
              : ''}
          </span>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRun(job.id, job.name)}
          disabled={runDisabled || job.isRunning}
          title={
            runDisabled
              ? 'Another run is in flight from this page. Dismiss it first.'
              : job.isRunning
                ? 'Job is already running.'
                : undefined
          }
        >
          <Play className="size-3.5" aria-hidden />
          Run now
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function OrganisationProjectDetailPage() {
  const { organisationId, projectId } = useParams<{
    organisationId: string;
    projectId: string;
  }>();

  const orgQuery = useSuperAdminOrganisationQuery(organisationId);
  const projectQuery = useSuperAdminProjectQuery(
    organisationId ?? '',
    projectId,
  );
  const jobsQuery = useSuperAdminJobsQuery(
    organisationId ?? '',
    projectId ?? '',
  );

  const [runDialog, setRunDialog] = useState<{
    jobId: string;
    jobName: string;
  } | null>(null);
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);

  const runMutation = useRunSuperAdminJobMutation(
    organisationId ?? '',
    projectId ?? '',
    runDialog?.jobId ?? '',
  );

  if (!organisationId || !projectId) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Missing route parameters"
        description="Both organisation and project ids are required."
      />
    );
  }

  if (projectQuery.isLoading) {
    return <SkeletonList count={5} />;
  }
  if (projectQuery.isError) {
    return (
      <ErrorState
        title="Could not load project"
        description={extractErrorMessage(projectQuery.error)}
        onRetry={() => projectQuery.refetch()}
      />
    );
  }

  const project = projectQuery.data!;
  const jobs = jobsQuery.data ?? [];

  const startRun = (jobId: string, jobName: string) => {
    setRunDialog({ jobId, jobName });
  };

  const submitRun = (values: RunJobDialogValues) => {
    if (!runDialog) return;
    runMutation.mutate(values, {
      onSuccess: (response) => {
        if (response?.success === false) {
          showToast.info(response.message ?? 'A run is already in progress.');
          return;
        }
        const bullJobId = response?.bullJobId;
        if (bullJobId) {
          setActiveRun({
            jobId: runDialog.jobId,
            jobName: runDialog.jobName,
            bullJobId,
          });
          setRunDialog(null);
          showToast.success('Run queued.');
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to={`/super-admin/organisations/${organisationId}/projects`}
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All projects
        </Link>
        <PageHeader
          title={project.name}
          description={orgQuery.data?.name ?? organisationId}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{project.status}</Badge>
          <Badge variant="outline">{project.syncMode}</Badge>
          <Badge variant="outline">
            {project.sourcePlatformId} → {project.destPlatformId}
          </Badge>
          <Badge variant="outline">{project.schedulerMode}</Badge>
        </div>
      </div>

      {activeRun ? (
        <RunStatusPoller
          organisationId={organisationId}
          projectId={projectId}
          jobId={activeRun.jobId}
          bullJobId={activeRun.bullJobId}
          onDismiss={() => setActiveRun(null)}
        />
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Jobs</h2>
        {jobsQuery.isLoading ? (
          <SkeletonList count={3} />
        ) : jobsQuery.isError ? (
          <ErrorState
            title="Could not load jobs"
            description={extractErrorMessage(jobsQuery.error)}
            onRetry={() => jobsQuery.refetch()}
          />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No jobs in this project"
            description="Members can create jobs from the tenant workspace."
          />
        ) : (
          <div className="bg-card overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Live</TableHead>
                  <TableHead>Last sync</TableHead>
                  <TableHead>Next run</TableHead>
                  <TableHead>Checkpoint</TableHead>
                  <TableHead className="w-24 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <JobRow
                    key={job.id}
                    organisationId={organisationId}
                    projectId={projectId}
                    job={job}
                    onRun={startRun}
                    runDisabled={!!activeRun}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <RunJobDialog
        open={!!runDialog}
        onOpenChange={(o) => (o ? undefined : setRunDialog(null))}
        jobName={runDialog?.jobName ?? ''}
        isSubmitting={runMutation.isPending}
        errorMessage={
          runMutation.isError ? extractErrorMessage(runMutation.error) : null
        }
        onSubmit={submitRun}
      />
    </div>
  );
}
