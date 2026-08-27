import { useState } from 'react';

import FormDrawer from '@/components/form/FormDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { useProjectJobsQuery } from '@/queries/useJobs';
import type { Job, QueueJob } from '@/types';

export interface QueueJobFormValues {
  jobId: string;
  executionWindowMinutes: number;
  enabled: boolean;
  overrideEnabled: boolean;
  fullSync: boolean;
  batchSize: number;
}

export default function QueueJobDrawer({
  projectId,
  open,
  onOpenChange,
  editing,
  existingJobIds,
  onSubmit,
  saving,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: QueueJob | null;
  existingJobIds: string[];
  onSubmit: (values: QueueJobFormValues) => void;
  saving: boolean;
}) {
  const jobsQuery = useProjectJobsQuery(projectId);
  const initialOverride = editing?.overrideSyncConfig ?? null;

  const [jobId, setJobId] = useState(editing?.jobId ?? '');
  const [windowMinutes, setWindowMinutes] = useState(
    editing ? Math.round(editing.executionWindowSec / 60) : 30,
  );
  const [enabled, setEnabled] = useState(editing?.enabled ?? true);
  const [overrideEnabled, setOverrideEnabled] = useState(!!initialOverride);
  const [fullSync, setFullSync] = useState(
    Boolean(initialOverride?.fullSync ?? false),
  );
  const [batchSize, setBatchSize] = useState(
    Number(initialOverride?.batchSize ?? 100),
  );

  const isDirty =
    jobId !== (editing?.jobId ?? '') ||
    windowMinutes !==
      (editing ? Math.round(editing.executionWindowSec / 60) : 30) ||
    enabled !== (editing?.enabled ?? true);

  const availableJobs: Job[] = (jobsQuery.data ?? []).filter(
    (j) => j.id === editing?.jobId || !existingJobIds.includes(j.id),
  );

  const handleSubmit = () => {
    if (!jobId || windowMinutes < 1) return;
    onSubmit({
      jobId,
      executionWindowMinutes: windowMinutes,
      enabled,
      overrideEnabled,
      fullSync,
      batchSize,
    });
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Edit Queue Job' : 'Add Job to Priority Queue'}
      isDirty={isDirty}
      footer={(requestClose) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !jobId}>
            {saving ? <Spinner /> : null}
            {editing ? 'Save Changes' : 'Add Job'}
          </Button>
        </>
      )}
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Job</label>
          <Select value={jobId} onValueChange={setJobId} disabled={!!editing}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a job" />
            </SelectTrigger>
            <SelectContent>
              {availableJobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.name} ({job.sourceObject} → {job.destObject})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Execution Window</label>
          <p className="text-muted-foreground text-xs">
            The maximum time this job can run before its progress is saved and
            the scheduler moves to the next job.
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(Number(e.target.value))}
              className="w-28"
            />
            <span className="text-muted-foreground text-sm">minutes</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Status</label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                Override for Priority Scheduling
              </p>
              <p className="text-muted-foreground text-xs">
                By default this job uses its own sync configuration. Turn this
                on to override it for the queue only.
              </p>
            </div>
            <Switch
              checked={overrideEnabled}
              onCheckedChange={setOverrideEnabled}
            />
          </div>

          {overrideEnabled && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm">All Records (full sync)</label>
                <Switch checked={fullSync} onCheckedChange={setFullSync} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm">Records per Batch</label>
                <Input
                  type="number"
                  min={1}
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-28"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </FormDrawer>
  );
}
