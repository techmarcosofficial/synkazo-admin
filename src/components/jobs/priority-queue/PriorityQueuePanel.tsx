import { Plus, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import QueueJobDrawer, { type QueueJobFormValues } from './QueueJobDrawer';
import QueueJobList from './QueueJobList';
import QueueScheduleCard from './QueueScheduleCard';
import QueueStatusPanel from './QueueStatusPanel';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  useAddQueueJobMutation,
  usePauseQueueMutation,
  usePriorityQueueQuery,
  useRemoveQueueJobMutation,
  useReorderQueueJobsMutation,
  useResumeQueueMutation,
  useRetryQueueJobMutation,
  useUpdateQueueJobMutation,
  useUpdateQueueScheduleMutation,
} from '@/queries/usePriorityQueue';
import type { QueueJob } from '@/types';

export default function PriorityQueuePanel({
  projectId,
}: {
  projectId: string;
}) {
  const queueQuery = usePriorityQueueQuery(projectId);
  const scheduleMutation = useUpdateQueueScheduleMutation(projectId);
  const addJobMutation = useAddQueueJobMutation(projectId);
  const updateJobMutation = useUpdateQueueJobMutation(projectId);
  const removeJobMutation = useRemoveQueueJobMutation(projectId);
  const reorderMutation = useReorderQueueJobsMutation(projectId);
  const retryMutation = useRetryQueueJobMutation(projectId);
  const pauseMutation = usePauseQueueMutation(projectId);
  const resumeMutation = useResumeQueueMutation(projectId);

  const [localJobs, setLocalJobs] = useState<QueueJob[]>([]);
  const [dirty, setDirty] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<QueueJob | null>(null);

  const serverJobs = queueQuery.data?.queueJobs ?? [];

  useEffect(() => {
    if (!dirty) setLocalJobs(serverJobs);
  }, [dirty, serverJobs]);

  if (queueQuery.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner className="text-paused size-6" />
      </div>
    );
  }

  const config = queueQuery.data;
  if (!config) return null;

  const handleReorderLocal = (reordered: QueueJob[]) => {
    setLocalJobs(reordered);
    setDirty(true);
  };

  const saveOrder = () => {
    reorderMutation.mutate(
      localJobs.map((qj, i) => ({ id: qj.id, position: i })),
      { onSuccess: () => setDirty(false) },
    );
  };

  const openAddDrawer = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (queueJob: QueueJob) => {
    setEditing(queueJob);
    setDrawerOpen(true);
  };

  const handleToggleEnabled = (queueJob: QueueJob) => {
    updateJobMutation.mutate({
      queueJobId: queueJob.id,
      payload: { enabled: !queueJob.enabled },
    });
  };

  const handleDrawerSubmit = (values: QueueJobFormValues) => {
    const overrideSyncConfig = values.overrideEnabled
      ? { fullSync: values.fullSync, batchSize: values.batchSize }
      : null;

    if (editing) {
      updateJobMutation.mutate(
        {
          queueJobId: editing.id,
          payload: {
            executionWindowMinutes: values.executionWindowMinutes,
            enabled: values.enabled,
            overrideSyncConfig,
          },
        },
        { onSuccess: () => setDrawerOpen(false) },
      );
    } else {
      addJobMutation.mutate(
        {
          jobId: values.jobId,
          executionWindowMinutes: values.executionWindowMinutes,
          enabled: values.enabled,
          overrideSyncConfig: overrideSyncConfig ?? undefined,
        },
        { onSuccess: () => setDrawerOpen(false) },
      );
    }
  };

  const savingDrawer = addJobMutation.isPending || updateJobMutation.isPending;

  return (
    <div className="space-y-4">
      <QueueScheduleCard
        queue={config.queue}
        saving={scheduleMutation.isPending}
        onSave={(startTime, timezone) =>
          scheduleMutation.mutate({ startTime, timezone })
        }
      />

      <QueueStatusPanel
        config={config}
        onPause={() => pauseMutation.mutate()}
        onResume={() => resumeMutation.mutate()}
        pausing={pauseMutation.isPending || resumeMutation.isPending}
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Priority Queue</p>
              <p className="text-muted-foreground text-xs">
                Drag jobs to change execution order. Top runs first.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {dirty && (
                <Button
                  size="sm"
                  className="bg-paused hover:bg-paused/90"
                  onClick={saveOrder}
                  disabled={reorderMutation.isPending}
                >
                  {reorderMutation.isPending ? <Spinner /> : <Save />}
                  Save Changes
                </Button>
              )}
              <Button size="sm" onClick={openAddDrawer}>
                <Plus />
                Add Job
              </Button>
            </div>
          </div>

          {localJobs.length === 0 ? (
            <div className="py-10 text-center">
              <p className="mb-1 text-sm font-medium">
                No jobs have been added to the priority queue
              </p>
              <p className="text-muted-foreground text-xs">
                Add jobs to create an execution sequence.
              </p>
            </div>
          ) : (
            <QueueJobList
              queueJobs={localJobs}
              onReorderLocal={handleReorderLocal}
              onEdit={openEditDrawer}
              onToggleEnabled={handleToggleEnabled}
              onRetry={(id) => retryMutation.mutate(id)}
              onRemove={(id) => removeJobMutation.mutate(id)}
            />
          )}
        </CardContent>
      </Card>

      <QueueJobDrawer
        projectId={projectId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editing={editing}
        existingJobIds={serverJobs.map((qj) => qj.jobId)}
        onSubmit={handleDrawerSubmit}
        saving={savingDrawer}
      />
    </div>
  );
}
