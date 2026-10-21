import { ArrowLeftRight, Copy, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { jobCopiesApi } from '@/api/jobCopies';
import { PlanLock } from '@/components/shared/PlanGate';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useEntitlements } from '@/queries/useEntitlements';
import { useProjectEnvironmentsQuery } from '@/queries/useProjects';
import { queryKeys } from '@/queries/queryKeys';
import { useSynkazoAuth } from '@/lib/synkazoAuth';

export default function WorkspaceJobCopy({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const { hasRole } = useSynkazoAuth();
  const { envMigration } = useEntitlements();
  const [reverse, setReverse] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const inventory = useProjectEnvironmentsQuery(projectId);
  const workspaces = inventory.data?.workspaces ?? [];
  const active = workspaces.find((item) => item.active) ?? workspaces[0];
  const other = workspaces.find((item) => item.id !== active?.id);
  const from = reverse ? active : other;
  const to = reverse ? other : active;
  const previewKey = ['projects', projectId, 'job-copy-preview', from?.id, to?.id];
  const preview = useQuery({
    queryKey: previewKey,
    queryFn: () => jobCopiesApi.preview(projectId, from!.id, to!.id),
    enabled: Boolean(from?.id && to?.id),
  });
  const jobs = preview.data?.jobs ?? [];
  const exceedsJobLimit = Boolean(preview.data &&
    selected.length + preview.data.savedJobs > preview.data.maxJobs);
  const readyIds = useMemo(
    () => jobs.filter((job) => job.status === 'ready').map((job) => job.jobId),
    [jobs],
  );
  useEffect(() => setSelected([]), [from?.id, to?.id]);

  const selectJob = (jobId: string, checked: boolean) => {
    setSelected((current) => {
      if (checked) {
        const next = new Set(current);
        let candidate = jobs.find((job) => job.jobId === jobId);
        while (candidate?.status === 'ready' && !next.has(candidate.jobId)) {
          next.add(candidate.jobId);
          candidate = candidate.dependsOnJobId
            ? jobs.find((job) => job.jobId === candidate?.dependsOnJobId)
            : undefined;
        }
        return [...next];
      }
      const removed = new Set([jobId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const candidate of jobs) {
          if (candidate.dependsOnJobId && removed.has(candidate.dependsOnJobId) &&
              !removed.has(candidate.jobId)) {
            removed.add(candidate.jobId);
            changed = true;
          }
        }
      }
      return current.filter((id) => !removed.has(id));
    });
  };

  const copy = useMutation({
    mutationFn: () => jobCopiesApi.copy(projectId, {
      fromWorkspaceId: from!.id,
      toWorkspaceId: to!.id,
      jobIds: selected,
    }),
    onSuccess: async (result) => {
      toast.success(`${result.copied.length} inactive job ${result.copied.length === 1 ? 'copy' : 'copies'} created in ${to?.label}`);
      setSelected([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: previewKey }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.environments(projectId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.jobs.byProject(projectId) }),
      ]);
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } })
        .response?.data?.message ?? 'Job copy failed. Review the preview and retry.';
      toast.error(message);
    },
  });

  if (inventory.isPending) return <p className="text-muted-foreground text-sm">Loading workspace jobs…</p>;
  if (inventory.isError || !from || !to) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Both project workspaces must be available before jobs can be copied.</AlertDescription>
      </Alert>
    );
  }

  const requestCopy = () => confirm({
    variant: 'warning',
    title: `Copy ${selected.length} ${selected.length === 1 ? 'job' : 'jobs'} to ${to.label}?`,
    description: 'New jobs and field mappings will be saved in the target workspace.',
    body: (
      <p className="text-sm text-muted-foreground">
        Copies start inactive with no external record mappings, cursors, run history, active schedules, or webhooks. Running a copied job remains blocked until the workspace safety cutover and explicit manual-resume flow are complete.
      </p>
    ),
    confirmLabel: 'Copy as inactive',
    onConfirm: () => copy.mutateAsync().then(() => undefined),
  });

  return (
    <Card className="gap-0 py-0" aria-label="Copy jobs between workspaces">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <CardTitle>Copy job configuration</CardTitle>
          <p className="text-muted-foreground mt-1 text-xs">
            Choose saved jobs from {from.label} to create inactive copies in {to.label}.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { setReverse((value) => !value); setSelected([]); }}
        >
          <ArrowLeftRight className="size-4" /> Reverse direction
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <Badge variant="secondary">{from.label}</Badge>
          <span aria-hidden>→</span>
          <Badge variant="secondary">{to.label}</Badge>
          {preview.data && (
            <span className="text-muted-foreground ml-auto text-xs">
              {preview.data.savedJobs} of {preview.data.maxJobs} organisation saved-job slots used
            </span>
          )}
        </div>

        {preview.isPending && <p className="text-muted-foreground text-sm">Checking target connections, objects, and fields…</p>}
        {preview.isError && (
          <Alert variant="destructive">
            <AlertDescription>Could not preview jobs. Check the connections and retry.</AlertDescription>
          </Alert>
        )}
        {preview.data && (
          <>
            {preview.data.legacyUnassignedJobs > 0 && (
              <Alert>
                <AlertDescription>
                  {preview.data.legacyUnassignedJobs} old shared {preview.data.legacyUnassignedJobs === 1 ? 'job is' : 'jobs are'} unclassified. They cannot be copied into either workspace; recreate them manually after the legacy cutover.
                </AlertDescription>
              </Alert>
            )}
            {jobs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No workspace-owned jobs are saved in {from.label} yet.</p>
            ) : (
              <div className="space-y-2">
                {readyIds.length > 0 && (
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <Checkbox
                      checked={selected.length === readyIds.length}
                      onCheckedChange={(checked) => setSelected(checked ? readyIds : [])}
                    />
                    Select all {readyIds.length} eligible {readyIds.length === 1 ? 'job' : 'jobs'}
                  </label>
                )}
                {jobs.map((job) => (
                  <label key={job.jobId} className="flex items-start gap-3 rounded-xl border p-3">
                    <Checkbox
                      aria-label={`Select ${job.name}`}
                      checked={selected.includes(job.jobId)}
                      disabled={job.status !== 'ready'}
                      onCheckedChange={(checked) => selectJob(job.jobId, checked === true)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{job.name}</span>
                      <span className="text-muted-foreground block text-xs">
                        {job.sourceObject} → {job.destObject} · {job.mappingCount} field mappings
                      </span>
                      {job.reason && <span className="text-warning block text-xs">{job.reason}</span>}
                      {job.dependsOnJobId && job.status === 'ready' && (
                        <span className="text-muted-foreground block text-xs">Selecting this job includes its parent jobs.</span>
                      )}
                    </span>
                    <Badge variant={job.status === 'ready' ? 'secondary' : 'outline'} size="xs">
                      {job.status === 'ready' ? 'Eligible' : 'Manual setup'}
                    </Badge>
                  </label>
                ))}
              </div>
            )}
            {selected.length > 0 && (
              <PlanLock
                locked={!envMigration}
                message="Environment migration is required to copy jobs between workspaces."
              >
                {exceedsJobLimit && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      These copies exceed the saved-job limit. Remove selections or upgrade the plan.
                    </AlertDescription>
                  </Alert>
                )}
                <Button
                  type="button"
                  disabled={copy.isPending || exceedsJobLimit || !hasRole('editor')}
                  onClick={requestCopy}
                >
                  {copy.isPending ? <RefreshCw className="size-4 animate-spin" /> : <Copy className="size-4" />}
                  Copy {selected.length} as inactive
                </Button>
              </PlanLock>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
