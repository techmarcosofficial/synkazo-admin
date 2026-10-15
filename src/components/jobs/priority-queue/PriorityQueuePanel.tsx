import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type {
  UpdateAssociationQueuePayload,
  UpdateQueueJobPayload,
  UpdateQueueSchedulePayload,
} from '@/api/priorityQueue';
import { jobsApi } from '@/api/jobs';
import IndividualSchedulerList, {
  type IndividualScheduleDraft,
} from '@/components/jobs/IndividualSchedulerList';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { showToast } from '@/lib/toast';
import { useProjectJobsQuery } from '@/queries/useJobs';
import { useProjectQuery } from '@/queries/useProjects';
import {
  useAddQueueJobMutation,
  useClearAndRestartQueueMutation,
  usePauseQueueMutation,
  usePriorityQueueQuery,
  useRemoveQueueJobMutation,
  useReorderQueueJobsMutation,
  useResumeQueueMutation,
  useRetryQueueJobMutation,
  useSetSchedulerModeMutation,
  useUpdateAssociationConfigMutation,
  useUpdateQueueJobMutation,
  useUpdateQueueScheduleMutation,
} from '@/queries/usePriorityQueue';
import { useEntitlements } from '@/queries/useEntitlements';
import type { QueueJob } from '@/types';

import AssociationQueueCard from './AssociationQueueCard';
import PrioritySchedulerOverviewCard from './PrioritySchedulerOverviewCard';
import QueueJobInlineEditor, {
  queueJobValuesToPayload,
  type QueueJobDraft,
  type QueueJobInlineValues,
} from './QueueJobInlineEditor';
import QueueJobList from './QueueJobList';
import QueueScheduleCard, {
  queueScheduleDraft,
  queueScheduleValid,
} from './QueueScheduleCard';
import QueueStatusPanel from './QueueStatusPanel';
import SchedulerDraftFooter from './SchedulerDraftFooter';

const EMPTY_QUEUE_JOBS: QueueJob[] = [];

export default function PriorityQueuePanel({
  projectId,
}: {
  projectId: string;
}) {
  const queueQuery = usePriorityQueueQuery(projectId);
  const jobsQuery = useProjectJobsQuery(projectId);
  const projectQuery = useProjectQuery(projectId);
  const { priorityScheduling: canUsePriorityScheduling } = useEntitlements();
  const modeMutation = useSetSchedulerModeMutation(projectId);
  const scheduleMutation = useUpdateQueueScheduleMutation(projectId);
  const addJobMutation = useAddQueueJobMutation(projectId);
  const updateJobMutation = useUpdateQueueJobMutation(projectId);
  const removeJobMutation = useRemoveQueueJobMutation(projectId);
  const reorderMutation = useReorderQueueJobsMutation(projectId);
  const associationMutation = useUpdateAssociationConfigMutation(projectId);
  const retryMutation = useRetryQueueJobMutation(projectId);
  const pauseMutation = usePauseQueueMutation(projectId);
  const resumeMutation = useResumeQueueMutation(projectId);
  const clearMutation = useClearAndRestartQueueMutation(projectId);

  const [modeDraft, setModeDraft] = useState<boolean | null>(null);
  const [scheduleDraft, setScheduleDraft] =
    useState<UpdateQueueSchedulePayload | null>(null);
  const [localJobs, setLocalJobs] = useState<QueueJob[]>([]);
  const [orderDirty, setOrderDirty] = useState(false);
  const [jobUpdates, setJobUpdates] = useState<
    Record<string, UpdateQueueJobPayload>
  >({});
  const [startingCustomerEdits, setStartingCustomerEdits] = useState<
    Record<string, QueueJobInlineValues>
  >({});
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [stagedJobs, setStagedJobs] = useState<QueueJobDraft[]>([]);
  const [associationDraft, setAssociationDraft] =
    useState<UpdateAssociationQueuePayload | null>(null);
  const [associationSavedRevision, setAssociationSavedRevision] = useState(0);
  const [individualScheduleDrafts, setIndividualScheduleDrafts] = useState<
    Record<string, IndividualScheduleDraft>
  >({});
  const [individualRefreshKey, setIndividualRefreshKey] = useState(0);
  const [editing, setEditing] = useState<QueueJob | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queue = queueQuery.data;
  const serverJobs = queue?.queueJobs ?? EMPTY_QUEUE_JOBS;
  useEffect(() => {
    if (
      !orderDirty &&
      removedIds.length === 0 &&
      Object.keys(jobUpdates).length === 0
    ) {
      setLocalJobs(serverJobs);
    }
  }, [serverJobs, orderDirty, removedIds.length, jobUpdates]);

  const onAssociationChange = useCallback(
    (draft: UpdateAssociationQueuePayload) => setAssociationDraft(draft),
    [],
  );
  if (queueQuery.isLoading)
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    );
  if (!queue)
    return (
      <p className="text-destructive text-sm">Scheduler could not be loaded.</p>
    );

  const priority = modeDraft ?? queue.schedulerMode === 'priority';
  const schedule = scheduleDraft ?? queueScheduleDraft(queue.queue);
  const availableJobsCount = (jobsQuery.data ?? []).filter(
    (job) =>
      !serverJobs.some((row) => row.jobId === job.id) &&
      !stagedJobs.some((row) => row.jobId === job.id),
  ).length;
  const inlineJobs = (jobsQuery.data ?? []).map((job) => {
    const staged = Object.values(startingCustomerEdits).find(
      (value) => value.jobId === job.id,
    );
    return staged?.startingCustomerId == null
      ? job
      : { ...job, dataformaStartingCustomerId: staged.startingCustomerId };
  });
  const hasChanges =
    modeDraft !== null ||
    scheduleDraft !== null ||
    orderDirty ||
    Object.keys(jobUpdates).length > 0 ||
    Object.keys(startingCustomerEdits).length > 0 ||
    removedIds.length > 0 ||
    stagedJobs.length > 0 ||
    associationDraft !== null ||
    Object.keys(individualScheduleDrafts).length > 0;

  const stageJobUpdate = (row: QueueJob, payload: UpdateQueueJobPayload) => {
    setJobUpdates((current) => ({
      ...current,
      [row.id]: { ...current[row.id], ...payload },
    }));
    setLocalJobs((current) =>
      current.map((item) =>
        item.id === row.id
          ? {
              ...item,
              enabled: payload.enabled ?? item.enabled,
              executionWindowSec: payload.executionWindowMinutes
                ? payload.executionWindowMinutes * 60
                : item.executionWindowSec,
              overrideSyncConfig:
                payload.overrideSyncConfig === undefined
                  ? item.overrideSyncConfig
                  : payload.overrideSyncConfig,
              baselineMode:
                payload.baselineMode === undefined
                  ? item.baselineMode
                  : payload.baselineMode,
              customBaselineAt:
                payload.baselineCustomAt === undefined
                  ? item.customBaselineAt
                  : payload.baselineCustomAt,
              baselineTimezone:
                payload.baselineTimezone === undefined
                  ? item.baselineTimezone
                  : payload.baselineTimezone,
            }
          : item,
      ),
    );
  };

  const saveStartingCustomerId = async (values: QueueJobInlineValues) => {
    const job = jobsQuery.data?.find((item) => item.id === values.jobId);
    if (
      projectQuery.data?.sourcePlatformId === 'dataforma' &&
      job?.sourceObject === 'customers' &&
      values.startingCustomerId != null &&
      values.startingCustomerId !== (job.dataformaStartingCustomerId ?? 0)
    ) {
      await jobsApi.updateJob(projectId, values.jobId, {
        dataformaStartingCustomerId: values.startingCustomerId,
      });
      await jobsQuery.refetch();
    }
  };

  const save = async () => {
    if (
      !hasChanges ||
      saving ||
      (scheduleDraft && !queueScheduleValid(schedule))
    )
      return;
    setSaving(true);
    setError(null);
    let individualScheduleSaved = false;
    try {
      if (modeDraft === true && queue.schedulerMode !== 'priority') {
        await modeMutation.mutateAsync(true);
        setModeDraft(null);
      }
      if (scheduleDraft) {
        await scheduleMutation.mutateAsync(scheduleDraft);
        setScheduleDraft(null);
      }
      for (const id of removedIds) {
        await removeJobMutation.mutateAsync(id);
        setRemovedIds((current) => current.filter((item) => item !== id));
      }
      for (const [id, payload] of Object.entries(jobUpdates)) {
        if (startingCustomerEdits[id])
          await saveStartingCustomerId(startingCustomerEdits[id]);
        await updateJobMutation.mutateAsync({ queueJobId: id, payload });
        setJobUpdates((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        setStartingCustomerEdits((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      }
      if (orderDirty) {
        await reorderMutation.mutateAsync(
          localJobs.map((row, position) => ({ id: row.id, position })),
        );
        setOrderDirty(false);
      }
      for (const draft of stagedJobs) {
        await saveStartingCustomerId(draft);
        const payload = queueJobValuesToPayload(draft);
        await addJobMutation.mutateAsync({
          jobId: draft.jobId,
          ...payload,
          executionWindowMinutes: draft.executionWindowMinutes,
          overrideSyncConfig: payload.overrideSyncConfig ?? undefined,
        });
        setStagedJobs((current) =>
          current.filter((item) => item.draftId !== draft.draftId),
        );
      }
      if (associationDraft) {
        await associationMutation.mutateAsync(associationDraft);
        setAssociationDraft(null);
        setAssociationSavedRevision((current) => current + 1);
      }
      if (modeDraft === false && queue.schedulerMode === 'priority') {
        await modeMutation.mutateAsync(false);
        setModeDraft(null);
      }
      for (const [jobId, draft] of Object.entries(individualScheduleDrafts)) {
        await jobsApi.updateJob(projectId, jobId, draft);
        setIndividualScheduleDrafts((current) => {
          const next = { ...current };
          delete next[jobId];
          return next;
        });
        individualScheduleSaved = true;
      }
      showToast.success('Scheduler changes saved.');
    } catch {
      setError(
        'Some changes could not be saved. Your remaining edits are still here; retry Save.',
      );
    } finally {
      if (individualScheduleSaved)
        setIndividualRefreshKey((value) => value + 1);
      setSaving(false);
    }
  };

  return (
    <div className={`space-y-4 ${hasChanges ? 'pb-24' : ''}`}>
      <h2 className="text-base font-semibold">
        Manage schedules of all sync flows
      </h2>
      <PrioritySchedulerOverviewCard
        enabled={priority}
        disabled={saving || (!priority && !canUsePriorityScheduling)}
        onEnabledChange={(next) =>
          setModeDraft(
            next === (queue.schedulerMode === 'priority') ? null : next,
          )
        }
        schedule={
          <QueueScheduleCard
            queue={queue.queue}
            value={schedule}
            onChange={setScheduleDraft}
          />
        }
        status={
          <QueueStatusPanel
            embedded
            config={queue}
            onPause={() => pauseMutation.mutate()}
            onResume={() => resumeMutation.mutate()}
            pausing={pauseMutation.isPending || resumeMutation.isPending}
            onClearAndRestart={async () => {
              await clearMutation.mutateAsync();
            }}
            clearingAndRestarting={clearMutation.isPending}
          />
        }
      >
        <section
          className="min-w-0 space-y-3 border-t px-4 py-4"
          aria-label="Priority queue jobs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">Step 1 · Priority Queue</h3>
              <span className="text-muted-foreground text-xs">
                {localJobs.length + stagedJobs.length} configured{' '}
                {localJobs.length + stagedJobs.length === 1 ? 'job' : 'jobs'}
              </span>
            </div>
            <Button
              size="sm"
              disabled={
                composerOpen ||
                saving ||
                availableJobsCount === 0 ||
                jobsQuery.isLoading
              }
              onClick={() => {
                setEditing(null);
                setComposerOpen(true);
              }}
            >
              <Plus /> Add job
            </Button>
          </div>
          <QueueJobList
            queueJobs={localJobs}
            editingQueueJobId={composerOpen ? editing?.id : null}
            onReorderLocal={(rows) => {
              setLocalJobs(rows);
              setOrderDirty(true);
            }}
            onEdit={(row) => {
              setEditing(row);
              setComposerOpen(true);
            }}
            onToggleEnabled={(row) =>
              stageJobUpdate(row, { enabled: !row.enabled })
            }
            onRetry={(id) => retryMutation.mutate(id)}
            onRemove={(id) => {
              setRemovedIds((current) => [...current, id]);
              setJobUpdates((current) => {
                const next = { ...current };
                delete next[id];
                return next;
              });
              setStartingCustomerEdits((current) => {
                const next = { ...current };
                delete next[id];
                return next;
              });
              setLocalJobs((current) => current.filter((row) => row.id !== id));
            }}
            drafts={stagedJobs}
            draftsBusy={saving}
            jobs={jobsQuery.data ?? []}
            onRemoveDraft={(id) =>
              setStagedJobs((current) =>
                current.filter((row) => row.draftId !== id),
              )
            }
            composer={
              <QueueJobInlineEditor
                open={composerOpen}
                onClose={() => {
                  setComposerOpen(false);
                  setEditing(null);
                }}
                jobs={inlineJobs}
                existingJobIds={[
                  ...serverJobs.map((row) => row.jobId),
                  ...stagedJobs.map((row) => row.jobId),
                ]}
                editing={editing}
                onApply={(drafts) =>
                  setStagedJobs((current) => [...current, ...drafts])
                }
                onUpdate={(id, values, done) => {
                  const row = localJobs.find((item) => item.id === id);
                  if (row) {
                    stageJobUpdate(row, queueJobValuesToPayload(values));
                    if (values.startingCustomerId != null)
                      setStartingCustomerEdits((current) => ({
                        ...current,
                        [id]: values,
                      }));
                  }
                  done();
                }}
                busy={saving}
                sourcePlatformId={
                  projectQuery.data?.sourcePlatformId ?? undefined
                }
              />
            }
          />
        </section>
        <AssociationQueueCard
          projectId={projectId}
          queue={queue.queue}
          items={queue.associationQueueItems}
          onChange={onAssociationChange}
          savedRevision={associationSavedRevision}
        />
      </PrioritySchedulerOverviewCard>
      {!priority && (
        <IndividualSchedulerList
          projectId={projectId}
          refreshKey={individualRefreshKey}
          scheduleDrafts={individualScheduleDrafts}
          onStageSchedule={(jobId, draft) =>
            setIndividualScheduleDrafts((current) => ({
              ...current,
              [jobId]: draft,
            }))
          }
        />
      )}
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <SchedulerDraftFooter
        dirty={hasChanges}
        saving={saving}
        valid={scheduleDraft === null || queueScheduleValid(schedule)}
        onSave={() => void save()}
      />
    </div>
  );
}
