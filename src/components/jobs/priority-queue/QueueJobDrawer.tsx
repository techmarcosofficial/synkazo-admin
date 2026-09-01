import { useEffect, useState } from 'react';

import { jobsApi } from '@/api/jobs';
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
import { showToast } from '@/lib/toast';
import { BROWSER_TIMEZONE, TIMEZONES } from '@/lib/timezones';
import { useProjectJobsQuery } from '@/queries/useJobs';
import { useProjectQuery } from '@/queries/useProjects';
import type { Job, QueueJob, QueueJobBaselineMode } from '@/types';

const BASELINE_OPTIONS: {
  value: QueueJobBaselineMode | 'default';
  label: string;
}[] = [
  { value: 'default', label: "Use Job's Last Synced Time (default)" },
  { value: 'from_now', label: 'From Now' },
  { value: 'last_1_hour', label: 'Last 1 Hour' },
  { value: 'last_6_hours', label: 'Last 6 Hours' },
  { value: 'last_24_hours', label: 'Last 24 Hours' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Date and Time' },
];

export interface QueueJobFormValues {
  jobId: string;
  executionWindowMinutes: number;
  enabled: boolean;
  baselineMode: QueueJobBaselineMode | null;
  baselineCustomAt?: string;
  baselineTimezone?: string;
  overrideEnabled: boolean;
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
  const projectQuery = useProjectQuery(projectId);
  const initialOverride = editing?.overrideSyncConfig ?? null;

  const [jobId, setJobId] = useState(editing?.jobId ?? '');
  const [windowMinutes, setWindowMinutes] = useState(
    editing ? Math.round(editing.executionWindowSec / 60) : 30,
  );
  const [enabled, setEnabled] = useState(editing?.enabled ?? true);
  const [baselineSelection, setBaselineSelection] = useState<
    QueueJobBaselineMode | 'default'
  >(editing?.baselineMode ?? 'default');
  const [baselineCustomAt, setBaselineCustomAt] = useState(
    editing?.customBaselineAt ? editing.customBaselineAt.slice(0, 16) : '',
  );
  const [baselineTimezone, setBaselineTimezone] = useState(
    editing?.baselineTimezone ?? BROWSER_TIMEZONE,
  );
  const [overrideEnabled, setOverrideEnabled] = useState(!!initialOverride);
  const [batchSize, setBatchSize] = useState(
    Number(initialOverride?.batchSize ?? 100),
  );

  const availableJobs: Job[] = (jobsQuery.data ?? []).filter(
    (j) => j.id === editing?.jobId || !existingJobIds.includes(j.id),
  );
  const selectedJob = (jobsQuery.data ?? []).find((j) => j.id === jobId);

  // Dataforma's Customers API has no create/modify-date filter — this job's
  // real baseline is tracked by customer id (see dataforma-customer-cursor.util.ts
  // on the backend and DataformaCustomerCursorCard on the job's own Settings
  // tab), so the usual Date-based Record Baseline options here would be a
  // silent no-op for it. Every other job/platform keeps the Date UI untouched.
  const isDataformaCustomers =
    projectQuery.data?.sourcePlatformId === 'dataforma' &&
    selectedJob?.sourceObject === 'customers';

  const [dataformaStartingId, setDataformaStartingId] = useState(
    selectedJob?.dataformaStartingCustomerId ?? 0,
  );
  const [savingStartingId, setSavingStartingId] = useState(false);
  // Only relevant pre-edit-lock (the Job select is disabled once editing an
  // existing queue entry), so this only ever fires while adding a new one.
  useEffect(() => {
    setDataformaStartingId(selectedJob?.dataformaStartingCustomerId ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const isDirty =
    jobId !== (editing?.jobId ?? '') ||
    windowMinutes !==
      (editing ? Math.round(editing.executionWindowSec / 60) : 30) ||
    enabled !== (editing?.enabled ?? true) ||
    baselineSelection !== (editing?.baselineMode ?? 'default') ||
    (isDataformaCustomers &&
      dataformaStartingId !== (selectedJob?.dataformaStartingCustomerId ?? 0));

  const handleSubmit = async () => {
    if (!jobId || windowMinutes < 1) return;
    if (!isDataformaCustomers && baselineSelection === 'custom' && !baselineCustomAt)
      return;

    if (isDataformaCustomers) {
      setSavingStartingId(true);
      try {
        await jobsApi.updateJob(projectId, jobId, {
          dataformaStartingCustomerId: dataformaStartingId,
        });
      } catch {
        showToast.error(
          'Failed to save the starting customer ID. Please try again.',
        );
        setSavingStartingId(false);
        return;
      }
      setSavingStartingId(false);
    }

    onSubmit({
      jobId,
      executionWindowMinutes: windowMinutes,
      enabled,
      // Date-based baseline is meaningless for a Dataforma customers job — its
      // baseline is the id field saved above instead. Clear it rather than
      // leave a stale/misleading value on the QueueJob row.
      baselineMode: isDataformaCustomers
        ? null
        : baselineSelection === 'default'
          ? null
          : baselineSelection,
      ...(!isDataformaCustomers && baselineSelection === 'custom'
        ? { baselineCustomAt, baselineTimezone }
        : {}),
      overrideEnabled,
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
          <Button
            onClick={handleSubmit}
            disabled={saving || savingStartingId || !jobId}
          >
            {saving || savingStartingId ? <Spinner /> : null}
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

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Record Baseline</label>
          {isDataformaCustomers ? (
            <>
              <p className="text-muted-foreground text-xs">
                Dataforma&apos;s Customers API has no date filter — every sync
                fetches everything, then keeps only records at or above this
                ID. The floor advances automatically to the highest customer
                ID synced each cycle, the same as this job's own Settings tab.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground text-xs">
                    Starting Customer ID
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={dataformaStartingId}
                    onChange={(e) =>
                      setDataformaStartingId(
                        Math.max(0, parseInt(e.target.value) || 0),
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground text-xs">
                    Currently Synced Through
                  </label>
                  <div className="bg-muted text-muted-foreground truncate rounded-3xl px-3 py-2 text-sm">
                    {selectedJob?.dataformaCustomerIdCursor ?? '—'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-xs">
                The lower bound used when fetching records for this job in the
                priority queue. Relative options are calculated from the
                moment the queue cycle starts, not from when this job's turn
                comes up.
              </p>
              <Select
                value={baselineSelection}
                onValueChange={(v) =>
                  setBaselineSelection(v as QueueJobBaselineMode | 'default')
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BASELINE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {baselineSelection === 'custom' && (
                <div className="flex flex-wrap items-end gap-2 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-xs">
                      Date and Time
                    </label>
                    <Input
                      type="datetime-local"
                      value={baselineCustomAt}
                      onChange={(e) => setBaselineCustomAt(e.target.value)}
                      className="w-56"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-xs">
                      Time Zone
                    </label>
                    <Select
                      value={baselineTimezone}
                      onValueChange={setBaselineTimezone}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </>
          )}
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
