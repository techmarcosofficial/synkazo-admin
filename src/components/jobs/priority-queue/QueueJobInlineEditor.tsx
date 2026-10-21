import { Check, Plus, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { UpdateQueueJobPayload } from '@/api/priorityQueue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { BROWSER_TIMEZONE, TIMEZONES } from '@/lib/timezones';
import QueueOptionPicker from './QueueOptionPicker';
import type {
  PriorityQueueJobDisplay,
  QueueJobBaselineMode,
} from '@/types/priorityQueue';

export interface QueueJobOption {
  id: string;
  name: string;
  sourceObject: string;
  destObject: string;
  dataformaStartingCustomerId?: number | null;
}

export interface QueueJobInlineValues {
  jobId: string;
  executionWindowMinutes: number;
  enabled: boolean;
  baselineMode: QueueJobBaselineMode | null;
  baselineCustomAt: string;
  baselineTimezone: string;
  batchSize: string;
  startingCustomerId?: number;
}

export interface QueueJobDraft extends QueueJobInlineValues {
  draftId: string;
}

const BASELINES: Array<{
  value: QueueJobBaselineMode | 'default';
  label: string;
}> = [
  { value: 'default', label: "Job's last synced time" },
  { value: 'from_now', label: 'From now' },
  { value: 'last_1_hour', label: 'Last 1 hour' },
  { value: 'last_6_hours', label: 'Last 6 hours' },
  { value: 'last_24_hours', label: 'Last 24 hours' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom date and time' },
];

const GRID =
  'grid-cols-1 items-start gap-2.5 sm:grid-cols-2 md:grid-cols-[minmax(8rem,.85fr)_9rem_minmax(9rem,1fr)_5rem] xl:grid-cols-[minmax(8rem,.85fr)_9rem_minmax(10rem,1fr)_5rem_minmax(8rem,.8fr)_2rem]';

function emptyDraft(): QueueJobDraft {
  return {
    draftId: `queue-draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    jobId: '',
    executionWindowMinutes: 30,
    enabled: true,
    baselineMode: null,
    baselineCustomAt: '',
    baselineTimezone: BROWSER_TIMEZONE,
    batchSize: '',
  };
}

function valuesFromQueueJob(
  row: PriorityQueueJobDisplay,
): QueueJobInlineValues {
  return {
    jobId: row.jobId,
    executionWindowMinutes: Math.round(row.executionWindowSec / 60),
    enabled: row.enabled,
    baselineMode: row.baselineMode ?? null,
    baselineCustomAt: row.customBaselineAt?.slice(0, 16) ?? '',
    baselineTimezone: row.baselineTimezone ?? BROWSER_TIMEZONE,
    batchSize:
      row.overrideSyncConfig?.batchSize == null
        ? ''
        : String(row.overrideSyncConfig.batchSize),
  };
}

export function queueJobValuesToPayload(
  values: QueueJobInlineValues,
): UpdateQueueJobPayload {
  return {
    executionWindowMinutes: values.executionWindowMinutes,
    enabled: values.enabled,
    baselineMode: values.baselineMode,
    baselineCustomAt:
      values.baselineMode === 'custom' ? values.baselineCustomAt : undefined,
    baselineTimezone:
      values.baselineMode === 'custom' ? values.baselineTimezone : undefined,
    overrideSyncConfig: { batchSize: Number(values.batchSize || 100) },
  };
}

function validationError(values: QueueJobInlineValues): string | null {
  if (!values.jobId) return 'Select a job.';
  if (
    !Number.isInteger(values.executionWindowMinutes) ||
    values.executionWindowMinutes < 1
  )
    return 'Enter an execution window of at least one minute.';
  if (values.baselineMode === 'custom' && !values.baselineCustomAt)
    return 'Choose the custom baseline date and time.';
  if (
    values.batchSize !== '' &&
    (!Number.isInteger(Number(values.batchSize)) ||
      Number(values.batchSize) < 1)
  )
    return 'Records per batch must be a positive whole number.';
  return null;
}

export default function QueueJobInlineEditor({
  open,
  onClose,
  jobs,
  existingJobIds,
  editing,
  onApply,
  onUpdate,
  busy,
  sourcePlatformId,
}: {
  open: boolean;
  onClose: () => void;
  jobs: QueueJobOption[];
  existingJobIds: string[];
  editing: PriorityQueueJobDisplay | null;
  onApply: (drafts: QueueJobDraft[]) => void;
  onUpdate: (
    queueJobId: string,
    values: QueueJobInlineValues,
    onSaved: () => void,
  ) => void;
  busy: boolean;
  sourcePlatformId?: string;
}) {
  const [drafts, setDrafts] = useState<QueueJobDraft[]>([]);
  const [editValues, setEditValues] = useState<QueueJobInlineValues | null>(
    null,
  );
  const editJob = jobs.find((candidate) => candidate.id === editing?.jobId);

  useEffect(() => {
    if (!open) {
      setDrafts([]);
    } else if (editing) {
      setDrafts([]);
    } else {
      setDrafts((current) => (current.length > 0 ? current : [emptyDraft()]));
    }
  }, [open, editing]);

  useEffect(() => {
    if (!editing) {
      setEditValues(null);
      return;
    }
    const values = valuesFromQueueJob(editing);
    if (
      sourcePlatformId === 'dataforma' &&
      editJob?.sourceObject === 'customers'
    ) {
      values.baselineMode = null;
      values.startingCustomerId =
        editJob.dataformaStartingCustomerId === undefined
          ? undefined
          : (editJob.dataformaStartingCustomerId ?? 0);
    }
    setEditValues(values);
  }, [editing, editJob, sourcePlatformId]);

  const selectedIds = new Set([
    ...existingJobIds,
    ...drafts.map((draft) => draft.jobId).filter(Boolean),
  ]);
  const canAdd = jobs.some((job) => !selectedIds.has(job.id));
  const updateDraft = (
    draftId: string,
    change: Partial<QueueJobInlineValues>,
  ) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.draftId === draftId ? { ...draft, ...change } : draft,
      ),
    );
  };
  const saveAll = () => {
    if (drafts.length === 0 || drafts.some((draft) => validationError(draft)))
      return;
    onApply(drafts);
    onClose();
  };

  if (!open) return null;

  const renderRow = (
    values: QueueJobInlineValues,
    rowId: string,
    index: number,
    isNew: boolean,
    change: (update: Partial<QueueJobInlineValues>) => void,
    remove: () => void,
  ) => {
    const selectedJob = jobs.find((job) => job.id === values.jobId);
    const isDataformaCustomers =
      sourcePlatformId === 'dataforma' &&
      selectedJob?.sourceObject === 'customers';
    const error = validationError(values);
    return (
      <div
        key={rowId}
        className="animate-in fade-in-0 slide-in-from-top-2 duration-200"
      >
        <div className={`grid ${GRID}`}>
          <div className="min-w-0 space-y-1">
            <span className="text-muted-foreground text-[11px] xl:hidden">
              Job
            </span>
            <QueueOptionPicker
              ariaLabel={`${isNew ? 'Select job' : 'Job'} in row ${index + 1}`}
              value={values.jobId}
              disabled={!isNew || busy}
              placeholder="Choose a job…"
              searchPlaceholder="Search jobs…"
              onChange={(jobId) => {
                const job = jobs.find((candidate) => candidate.id === jobId);
                change({
                  jobId,
                  startingCustomerId:
                    job?.dataformaStartingCustomerId === undefined
                      ? undefined
                      : (job.dataformaStartingCustomerId ?? 0),
                  baselineMode: null,
                });
              }}
              options={jobs
                .filter(
                  (job) => job.id === values.jobId || !selectedIds.has(job.id),
                )
                .map((job) => ({
                  value: job.id,
                  label: job.name,
                  detail: `${job.sourceObject} → ${job.destObject}`,
                }))}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <span className="text-muted-foreground text-[11px] xl:hidden">
              Window (min)
            </span>
            <Input
              type="number"
              min={1}
              step={1}
              uiSize="sm"
              className="h-9"
              aria-label={`Execution window in minutes for row ${index + 1}`}
              value={values.executionWindowMinutes}
              disabled={busy}
              onChange={(event) =>
                change({ executionWindowMinutes: Number(event.target.value) })
              }
            />
          </div>
          <div className="min-w-0 space-y-1">
            <span className="text-muted-foreground text-[11px] xl:hidden">
              Record baseline
            </span>
            {isDataformaCustomers ? (
              values.startingCustomerId == null ? (
                <span className="text-muted-foreground text-xs">
                  Customer ID baseline is managed in job settings.
                </span>
              ) : (
                <Input
                  type="number"
                  min={0}
                  uiSize="sm"
                  aria-label={`Starting customer ID for row ${index + 1}`}
                  value={values.startingCustomerId}
                  disabled={busy}
                  onChange={(event) =>
                    change({
                      startingCustomerId: Math.max(
                        0,
                        Number(event.target.value),
                      ),
                    })
                  }
                />
              )
            ) : (
              <>
                <QueueOptionPicker
                  ariaLabel={`Record baseline for row ${index + 1}`}
                  value={values.baselineMode ?? 'default'}
                  disabled={busy}
                  placeholder="Choose baseline…"
                  searchPlaceholder="Search baselines…"
                  options={BASELINES.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  onChange={(value) =>
                    change({
                      baselineMode:
                        value === 'default'
                          ? null
                          : (value as QueueJobBaselineMode),
                    })
                  }
                />
                {values.baselineMode === 'custom' && (
                  <>
                    <Input
                      type="datetime-local"
                      uiSize="sm"
                      aria-label={`Custom baseline date for row ${index + 1}`}
                      value={values.baselineCustomAt}
                      disabled={busy}
                      onChange={(event) =>
                        change({ baselineCustomAt: event.target.value })
                      }
                    />
                    <QueueOptionPicker
                      ariaLabel={`Baseline timezone for row ${index + 1}`}
                      value={values.baselineTimezone}
                      disabled={busy}
                      placeholder="Choose timezone…"
                      searchPlaceholder="Search timezones…"
                      options={TIMEZONES.map((timezone) => ({
                        value: timezone,
                        label: timezone,
                      }))}
                      onChange={(baselineTimezone) =>
                        change({ baselineTimezone })
                      }
                    />
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex h-9 items-center gap-2 xl:justify-center">
            <span className="text-muted-foreground text-[11px] xl:hidden">
              Status
            </span>
            <Switch
              size="sm"
              checked={values.enabled}
              onCheckedChange={(enabled) => change({ enabled })}
              disabled={busy}
              aria-label={`Enable row ${index + 1}`}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <span className="text-muted-foreground text-[11px] xl:hidden">
              Records per batch
            </span>
            <Input
              type="number"
              min={1}
              step={1}
              uiSize="sm"
              className="h-9"
              placeholder="100 records/batch"
              aria-label={`Records per batch for row ${index + 1}`}
              value={values.batchSize}
              disabled={busy}
              onChange={(event) => change({ batchSize: event.target.value })}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            className="border-destructive/40 text-destructive mt-1 border-dashed"
            onClick={remove}
            disabled={busy}
            aria-label={
              isNew
                ? `Remove new job row ${index + 1}`
                : 'Cancel editing queue job'
            }
          >
            <X />
          </Button>
        </div>
        {error && values.jobId && (
          <p className="text-destructive mt-2 text-xs" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-primary/5 border-primary/20 animate-in fade-in-0 slide-in-from-top-2 border-b p-4 shadow-xs transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-lg">
            <Sparkles className="size-3.5" />
          </span>
          <span className="text-xs font-semibold">
            {editing ? 'Edit queue job' : 'Add queue jobs'}
          </span>
          <span className="text-muted-foreground text-xs">
            — Configure each row, then apply
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={busy}
            className="h-8 text-xs"
          >
            Discard
          </Button>
          {editing && editValues && (
            <Button
              type="button"
              size="sm"
              disabled={busy || !!validationError(editValues)}
              onClick={() => onUpdate(editing.id, editValues, onClose)}
              className="h-8 text-xs"
            >
              {busy ? <Spinner /> : <Check className="size-3.5" />}
              Apply
            </Button>
          )}
          {drafts.length > 0 && (
            <Button
              type="button"
              size="sm"
              disabled={
                busy || drafts.some((draft) => !!validationError(draft))
              }
              onClick={saveAll}
              className="h-8 text-xs"
            >
              {busy ? <Spinner /> : <Check className="size-3.5" />}
              Apply ({drafts.length})
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="icon-xs"
            onClick={onClose}
            disabled={busy}
            aria-label="Close queue job editor"
            className="text-muted-foreground hover:text-foreground ml-1"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <div>
        <div
          className={`hidden xl:grid ${GRID} text-muted-foreground pb-2 text-[11px] font-medium`}
        >
          <span>Job</span>
          <span className="whitespace-nowrap">Execution window (min)</span>
          <span>Record baseline</span>
          <span>Status</span>
          <span>Records per batch</span>
          <span>Remove</span>
        </div>
        <div className="space-y-2.5">
          {editing &&
            editValues &&
            renderRow(
              editValues,
              `edit-${editing.id}`,
              0,
              false,
              (change) =>
                setEditValues((current) =>
                  current ? { ...current, ...change } : current,
                ),
              onClose,
            )}
          {drafts.map((draft, index) =>
            renderRow(
              draft,
              draft.draftId,
              index,
              true,
              (change) => updateDraft(draft.draftId, change),
              () => {
                if (drafts.length <= 1) {
                  onClose();
                } else {
                  setDrafts((current) =>
                    current.filter((row) => row.draftId !== draft.draftId),
                  );
                }
              },
            ),
          )}
          {!editing && (
            <div className="flex justify-end pt-0.5">
              <div className="flex w-8 shrink-0 items-center justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={() =>
                    setDrafts((current) => [...current, emptyDraft()])
                  }
                  disabled={!canAdd || busy}
                  title="Add queue job row"
                  aria-label="Add queue job row"
                  className="border-primary/40 bg-background text-primary hover:border-primary hover:bg-primary/10 size-7 rounded-lg border-dashed shadow-xs transition-all"
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
