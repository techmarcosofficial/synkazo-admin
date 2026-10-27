import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { jobsApi } from '@/api/jobs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { useLegacyJobsQuery, useProjectEnvironmentsQuery } from '@/queries/useProjects';
import type { Job } from '@/types';

export default function WorkspaceInventory({
  projectId,
  jobs = [],
  onRefresh,
}: {
  projectId: string;
  jobs?: Job[];
  onRefresh?: () => void;
}) {
  const { data, isPending, isError } = useProjectEnvironmentsQuery(projectId);
  const legacyJobs = useLegacyJobsQuery(projectId);
  const { hasRole } = useSynkazoAuth();
  const [resumingJobId, setResumingJobId] = useState<string | null>(null);
  const heldJobs = jobs.filter((job) => job.resumeRequired);

  const resumeJob = async (job: Job) => {
    if (!data?.environmentGeneration) return;
    setResumingJobId(job.id);
    try {
      await jobsApi.resumeWorkspaceJob(projectId, job.id, data.environmentGeneration);
      toast.success(`${job.name} resumed. Schedule and webhook write-back remain off.`);
      onRefresh?.();
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })
        .response?.data?.message ?? 'Could not resume this job. Review the workspace and retry.';
      toast.error(message);
    } finally {
      setResumingJobId(null);
    }
  };

  return (
    <section aria-label="Workspace inventory" className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Workspace inventory</h3>
        <p className="text-muted-foreground text-xs">
          Counts include only data assigned to a workspace. Historical data
          awaiting classification appears separately.
        </p>
      </div>

      {isPending && (
        <p className="text-muted-foreground text-sm">
          Loading workspace counts…
        </p>
      )}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            Workspace counts are unavailable. Try refreshing this page.
          </AlertDescription>
        </Alert>
      )}
      {data && (
        <>
          {data.workspaces.length === 0 ? (
            <Alert>
              <AlertCircle className="size-4" />
              <AlertDescription>
                No workspace records are available yet.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.workspaces.map((workspace) => (
                <Card key={workspace.id} className="gap-0 py-0">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{workspace.label}</p>
                        <p className="text-muted-foreground text-xs">
                          {workspace.lifecycleStatus}
                        </p>
                      </div>
                      {workspace.active && <Badge size="xs">Selected</Badge>}
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-muted-foreground text-xs">Jobs</dt>
                        <dd className="font-semibold">{workspace.jobs}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          Connections
                        </dt>
                        <dd className="font-semibold">
                          {workspace.connections}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">Runs</dt>
                        <dd className="font-semibold">{workspace.runs}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          Run logs
                        </dt>
                        <dd className="font-semibold">{workspace.runLogs}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {(data.legacyUnassigned.jobs > 0 ||
            data.legacyUnassigned.connections > 0 ||
            data.legacyUnassigned.runs > 0 ||
            data.legacyUnassigned.runLogs > 0) && (
            <Alert>
              <AlertCircle className="size-4" />
              <AlertDescription>
                Unclassified legacy data — saved jobs:{' '}
                {data.legacyUnassigned.jobs}; connections:{' '}
                {data.legacyUnassigned.connections}; runs:{' '}
                {data.legacyUnassigned.runs}; run logs:{' '}
                {data.legacyUnassigned.runLogs}. These are excluded from
                workspace counts. Old shared jobs require manual recreation in
                each workspace at cutover; historical records need separate
                reconciliation.
              </AlertDescription>
            </Alert>
          )}
          {legacyJobs.isError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>Legacy job details are unavailable. Refresh to retry.</AlertDescription>
            </Alert>
          )}
          {heldJobs.length > 0 && (
            <Card className="gap-0 py-0">
              <CardContent className="space-y-3 p-4">
                <div>
                  <h4 className="text-sm font-semibold">Jobs awaiting review</h4>
                  <p className="text-muted-foreground text-xs">
                    Resume a job only after checking its active workspace connections and mappings.
                    Scheduling and webhook write-back stay off until enabled separately.
                  </p>
                </div>
                <ul className="divide-y text-sm">
                  {heldJobs.map((job) => (
                    <li key={job.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="font-medium">{job.name}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!hasRole('editor') || resumingJobId !== null}
                        onClick={() => void resumeJob(job)}
                      >
                        {resumingJobId === job.id ? 'Resuming…' : 'Resume job'}
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {legacyJobs.data && legacyJobs.data.length > 0 && (
            <Card className="gap-0 py-0">
              <CardContent className="space-y-3 p-4">
                <div>
                  <h4 className="text-sm font-semibold">Legacy jobs to recreate</h4>
                  <p className="text-muted-foreground text-xs">
                    Read-only reference. Recreate each needed job in its intended workspace.
                  </p>
                </div>
                <ul className="divide-y text-sm">
                  {legacyJobs.data.map((job) => (
                    <li key={job.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span>
                        <span className="font-medium">{job.name}</span>
                        <span className="text-muted-foreground ml-2">
                          {job.sourceObject} → {job.destObject}
                        </span>
                      </span>
                      <Badge size="xs" variant="outline">
                        {job.legacyArchivedAt ? 'Archived' : 'Awaiting cutover'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </section>
  );
}
