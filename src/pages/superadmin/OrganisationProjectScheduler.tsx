import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import LifecycleConfirmDialog from './lifecycle/LifecycleConfirmDialog';

import type {
  UpdateQueueJobPayload,
  UpdateQueueSchedulePayload,
} from '@/api/priorityQueue';
import { superAdminOperationsApi } from '@/api/superAdminOperations';
import { superAdminPriorityQueueApi } from '@/api/superAdminPriorityQueue';
import ErrorState from '@/components/shared/ErrorState';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import AssociationQueueComposer from '@/components/jobs/priority-queue/AssociationQueueComposer';
import type { IndividualScheduleDraft } from '@/components/jobs/IndividualSchedulerList';
import IndividualScheduleRow from '@/components/jobs/scheduler/IndividualScheduleRow';
import {
  canPauseIndividualSchedule,
  canResumeIndividualSchedule,
  isIndividualScheduleActive,
} from '@/components/jobs/scheduler/individualScheduleActions';
import PrioritySchedulerOverviewCard from '@/components/jobs/priority-queue/PrioritySchedulerOverviewCard';
import QueueJobInlineEditor, {
  queueJobValuesToPayload,
  type QueueJobDraft,
  type QueueJobInlineValues,
} from '@/components/jobs/priority-queue/QueueJobInlineEditor';
import QueueJobList from '@/components/jobs/priority-queue/QueueJobList';
import SchedulerDraftFooter from '@/components/jobs/priority-queue/SchedulerDraftFooter';
import QueueScheduleCard, {
  queueScheduleDraft,
  queueScheduleValid,
} from '@/components/jobs/priority-queue/QueueScheduleCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import JobScheduleModal from '@/features/jobs/components/schedule/JobScheduleModal';
import { useSuperAdminJobsQuery } from '@/queries/useSuperAdmin';
import type { PriorityQueueJobDisplay } from '@/types/priorityQueue';

function errorMessage(error: unknown): string {
  const response = error as { response?: { data?: { message?: string } } };
  return (
    response.response?.data?.message ??
    (error instanceof Error ? error.message : 'The request failed. Try again.')
  );
}

type AssociationItem = { associationRuleId: string; enabled: boolean };

export default function OrganisationProjectScheduler({
  organisationId,
  projectId,
  organisationName,
  sourcePlatformId,
}: {
  organisationId: string;
  projectId: string;
  organisationName: string;
  sourcePlatformId?: string;
}) {
  const queryClient = useQueryClient();
  const key = [
    'superAdmin',
    organisationId,
    'projects',
    projectId,
    'priority-queue',
  ];
  const queueQuery = useQuery({
    queryKey: key,
    queryFn: () =>
      superAdminPriorityQueueApi.getConfig(organisationId, projectId),
    refetchInterval: (query) =>
      query.state.data?.currentExecution?.status === 'running' ? 5_000 : 20_000,
  });
  const rulesQuery = useQuery({
    queryKey: [...key, 'association-rule-options'],
    queryFn: () =>
      superAdminPriorityQueueApi.getAssociationRuleOptions(
        organisationId,
        projectId,
      ),
  });
  const jobsQuery = useSuperAdminJobsQuery(organisationId, projectId);
  const [pendingAction, setPendingAction] = useState<{
    title: string;
    effect: string;
    run: (reason: string) => Promise<unknown>;
    destructive: boolean;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modeDraft, setModeDraft] = useState<boolean | null>(null);
  const [scheduleDraft, setScheduleDraft] =
    useState<UpdateQueueSchedulePayload | null>(null);
  const [localJobs, setLocalJobs] = useState<PriorityQueueJobDisplay[]>([]);
  const [orderDirty, setOrderDirty] = useState(false);
  const [jobUpdates, setJobUpdates] = useState<
    Record<string, UpdateQueueJobPayload>
  >({});
  const [startingCustomerEdits, setStartingCustomerEdits] = useState<
    Record<string, QueueJobInlineValues>
  >({});
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [stagedJobs, setStagedJobs] = useState<QueueJobDraft[]>([]);
  const [editing, setEditing] = useState<PriorityQueueJobDisplay | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [associationEnabled, setAssociationEnabled] = useState(false);
  const [associationDelay, setAssociationDelay] = useState(0);
  const [associationItems, setAssociationItems] = useState<AssociationItem[]>(
    [],
  );
  const [associationDirty, setAssociationDirty] = useState(false);
  const [associationComposerOpen, setAssociationComposerOpen] = useState(false);
  const [configuringJobId, setConfiguringJobId] = useState<string | null>(null);
  const [individualScheduleDrafts, setIndividualScheduleDrafts] = useState<
    Record<string, IndividualScheduleDraft>
  >({});
  const [, tick] = useState(0);
  const queue = queueQuery.data;

  useEffect(() => {
    if (
      !orderDirty &&
      removedIds.length === 0 &&
      Object.keys(jobUpdates).length === 0
    )
      setLocalJobs(queue?.queueJobs ?? []);
  }, [queue?.queueJobs, orderDirty, removedIds.length, jobUpdates]);
  useEffect(() => {
    if (!queue || associationDirty) return;
    setAssociationEnabled(queue.queue?.associationQueueEnabled ?? false);
    setAssociationDelay(queue.queue?.associationDelayMinutes ?? 0);
    setAssociationItems(
      queue.associationQueueItems.map((item) => ({
        associationRuleId: item.associationRuleId,
        enabled: item.enabled,
      })),
    );
  }, [queue, associationDirty]);
  useEffect(() => {
    if (queue?.currentExecution?.status !== 'running') return;
    const timer = setInterval(() => tick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [queue?.currentExecution?.status]);

  const ask = (
    title: string,
    effect: string,
    run: (reason: string) => Promise<unknown>,
    destructive = false,
  ) => {
    setError(null);
    setPendingAction({ title, effect, run, destructive });
  };
  const confirm = async ({ reason }: { reason: string }) => {
    if (!pendingAction || pending) return;
    setPending(true);
    setError(null);
    try {
      await pendingAction.run(reason);
      await queryClient.invalidateQueries({ queryKey: key });
      await jobsQuery.refetch();
      toast.success(`${pendingAction.title} completed.`);
      setPendingAction(null);
    } catch (cause) {
      setError(errorMessage(cause));
      setPendingAction(null);
    } finally {
      setPending(false);
    }
  };

  if (queueQuery.isLoading) return <SkeletonList count={2} />;
  if (queueQuery.isError || !queue)
    return (
      <ErrorState
        title="Could not load the bulk scheduler"
        description={errorMessage(queueQuery.error)}
        onRetry={() => queueQuery.refetch()}
      />
    );

  const priority = modeDraft ?? queue.schedulerMode === 'priority';
  const schedule = scheduleDraft ?? queueScheduleDraft(queue.queue);
  const availableJobsCount = (jobsQuery.data ?? []).filter(
    (job) =>
      !localJobs.some((row) => row.jobId === job.id) &&
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
    associationDirty ||
    Object.keys(individualScheduleDrafts).length > 0;
  const pausableCount = (jobsQuery.data ?? []).filter(
    canPauseIndividualSchedule,
  ).length;
  const resumableCount = (jobsQuery.data ?? []).filter(
    canResumeIndividualSchedule,
  ).length;
  const configuringJob = jobsQuery.data?.find(
    (job) => job.id === configuringJobId,
  );
  const execution = queue.currentExecution;
  const elapsed = execution
    ? Math.max(0, (Date.now() - new Date(execution.startedAt).getTime()) / 1000)
    : 0;
  const progress = execution
    ? Math.min(100, (elapsed / Math.max(1, execution.executionWindowSec)) * 100)
    : 0;

  const stageJobUpdate = (
    row: PriorityQueueJobDisplay,
    payload: UpdateQueueJobPayload,
  ) => {
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
  const moveAssociation = (index: number, offset: number) => {
    const next = [...associationItems];
    const target = index + offset;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setAssociationItems(next);
    setAssociationDirty(true);
  };
  const save = () =>
    ask(
      'Save scheduler changes',
      'Saves the pending scheduler configuration and queue edits.',
      async (reason) => {
        if (modeDraft === true && queue.schedulerMode !== 'priority') {
          await superAdminPriorityQueueApi.setMode(
            organisationId,
            projectId,
            true,
            reason,
          );
          setModeDraft(null);
        }
        if (scheduleDraft) {
          await superAdminPriorityQueueApi.updateSchedule(
            organisationId,
            projectId,
            scheduleDraft,
            reason,
          );
          setScheduleDraft(null);
        }
        for (const id of removedIds) {
          await superAdminPriorityQueueApi.removeJob(
            organisationId,
            projectId,
            id,
            reason,
          );
          setRemovedIds((current) => current.filter((item) => item !== id));
        }
        for (const [id, payload] of Object.entries(jobUpdates)) {
          const startingCustomer = startingCustomerEdits[id];
          if (startingCustomer?.startingCustomerId != null)
            await superAdminOperationsApi.updateJob(
              organisationId,
              projectId,
              startingCustomer.jobId,
              {
                dataformaStartingCustomerId:
                  startingCustomer.startingCustomerId,
              },
            );
          await superAdminPriorityQueueApi.updateJob(
            organisationId,
            projectId,
            id,
            payload,
            reason,
          );
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
          await superAdminPriorityQueueApi.reorder(
            organisationId,
            projectId,
            localJobs.map((row, position) => ({ id: row.id, position })),
            reason,
          );
          setOrderDirty(false);
        }
        for (const draft of stagedJobs) {
          if (draft.startingCustomerId != null)
            await superAdminOperationsApi.updateJob(
              organisationId,
              projectId,
              draft.jobId,
              { dataformaStartingCustomerId: draft.startingCustomerId },
            );
          const payload = queueJobValuesToPayload(draft);
          await superAdminPriorityQueueApi.addJob(
            organisationId,
            projectId,
            {
              jobId: draft.jobId,
              ...payload,
              executionWindowMinutes: draft.executionWindowMinutes,
              overrideSyncConfig: payload.overrideSyncConfig ?? undefined,
            },
            reason,
          );
          setStagedJobs((current) =>
            current.filter((item) => item.draftId !== draft.draftId),
          );
        }
        if (associationDirty) {
          await superAdminPriorityQueueApi.updateAssociations(
            organisationId,
            projectId,
            {
              enabled: associationEnabled,
              delayMinutes: associationDelay,
              items: associationItems.map((item, position) => ({
                ...item,
                position,
              })),
            },
            reason,
          );
          setAssociationDirty(false);
        }
        if (modeDraft === false && queue.schedulerMode === 'priority') {
          await superAdminPriorityQueueApi.setMode(
            organisationId,
            projectId,
            false,
            reason,
          );
          setModeDraft(null);
        }
        for (const [jobId, draft] of Object.entries(individualScheduleDrafts)) {
          await superAdminOperationsApi.updateJob(
            organisationId,
            projectId,
            jobId,
            {
              ...draft,
              scheduleMode: draft.scheduleMode as
                'daily_time' | 'interval' | 'day_specific',
            },
          );
          setIndividualScheduleDrafts((current) => {
            const next = { ...current };
            delete next[jobId];
            return next;
          });
        }
      },
    );

  return (
    <div className={`space-y-4 ${hasChanges ? 'pb-24' : ''}`}>
      <PrioritySchedulerOverviewCard
        enabled={priority}
        disabled={pending}
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
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Current cycle</h3>
                <StatusBadge status={queue.displayStatus} label={queue.displayStatus} />
            </div>
            {execution ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="truncate">
                    {queue.currentQueueJob?.job?.name ?? 'Running job'}
                  </span>
                  <span>
                    {Math.round(elapsed / 60)} /{' '}
                    {Math.round(execution.executionWindowSec / 60)} min
                  </span>
                </div>
                <Progress value={progress} className="h-1.5" />
                <p className="text-muted-foreground">
                  {execution.recordsProcessed.toLocaleString()} records
                  processed
                </p>
              </div>
            ) : (
              <div className="text-muted-foreground space-y-1 text-xs">
                <p>
                  {queue.activeCycle?.associationsStatus === 'running'
                    ? 'Association rules are running.'
                    : queue.activeCycle?.associationsStatus === 'waiting'
                      ? 'Waiting to run association rules.'
                      : queue.queue?.status === 'paused'
                        ? 'Queue is paused.'
                        : 'Waiting for the next cycle.'}
                </p>
                {queue.activeCycle?.associationsStatus === 'waiting' &&
                  queue.activeCycle.associationsDelayUntil && (
                    <p>
                      Association rules start{' '}
                      {new Date(
                        queue.activeCycle.associationsDelayUntil,
                      ).toLocaleString()}
                    </p>
                  )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {queue.queue?.status === 'paused' ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs"
                  disabled={pending}
                  onClick={() =>
                    ask(
                      'Resume priority queue',
                      'Allows this queue to continue processing.',
                      (reason) =>
                        superAdminPriorityQueueApi.resume(
                          organisationId,
                          projectId,
                          reason,
                        ),
                    )
                  }
                >
                  <Play className="size-3.5" /> Resume
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs"
                  disabled={pending}
                  onClick={() =>
                    ask(
                      'Pause priority queue',
                      'Stops this queue from starting new work.',
                      (reason) =>
                        superAdminPriorityQueueApi.pause(
                          organisationId,
                          projectId,
                          reason,
                        ),
                    )
                  }
                >
                  <Pause className="size-3.5" /> Pause
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs"
                disabled={pending}
                onClick={() =>
                  ask(
                    'Clear and restart scheduler',
                    'Clears the active cycle and job failure state before restarting from idle.',
                    (reason) =>
                      superAdminPriorityQueueApi.clearAndRestart(
                        organisationId,
                        projectId,
                        reason,
                      ),
                    true,
                  )
                }
              >
                <RotateCcw className="size-3.5" /> Clear & restart
              </Button>
            </div>
          </div>
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
                pending ||
                composerOpen ||
                jobsQuery.isLoading ||
                availableJobsCount === 0
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
            onRetry={(id) =>
              ask(
                'Retry queue job',
                'Retries the blocked job in this queue.',
                (reason) =>
                  superAdminPriorityQueueApi.retryJob(
                    organisationId,
                    projectId,
                    id,
                    reason,
                  ),
              )
            }
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
            draftsBusy={pending}
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
                  ...queue.queueJobs.map((row) => row.jobId),
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
                busy={pending}
                sourcePlatformId={sourcePlatformId}
              />
            }
          />
        </section>
        <section
          className="min-w-0 space-y-3 border-t px-4 py-4"
          aria-label="Association queue rules"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">
                Step 2 · Association Queue
              </h3>
              <span className="text-muted-foreground text-xs">
                {associationItems.length} configured{' '}
                {associationItems.length === 1 ? 'rule' : 'rules'}
              </span>
              {!associationEnabled && (
                <span className="text-muted-foreground text-xs">· Off</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {associationEnabled && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    associationComposerOpen ||
                    rulesQuery.isLoading ||
                    !(rulesQuery.data ?? []).some(
                      (rule) =>
                        !associationItems.some(
                          (item) => item.associationRuleId === rule.id,
                        ),
                    )
                  }
                  onClick={() => setAssociationComposerOpen(true)}
                >
                  <Plus /> Add rule
                </Button>
              )}
              <Switch
                checked={associationEnabled}
                onCheckedChange={(next) => {
                  setAssociationEnabled(next);
                  setAssociationDirty(true);
                }}
                aria-label="Run association queue"
              />
            </div>
          </div>
          {!associationEnabled ? null : rulesQuery.isError ? (
            <ErrorState
              title="Could not load association rules"
              description={errorMessage(rulesQuery.error)}
              onRetry={() => rulesQuery.refetch()}
            />
          ) : (
            <>
              <div className="bg-muted/40 flex flex-wrap items-center gap-3 rounded-xl px-3 py-2 text-xs">
                <label htmlFor="association-delay">
                  Wait after priority jobs (minutes)
                </label>
                <Input
                  id="association-delay"
                  type="number"
                  min={0}
                  className="w-20"
                  value={associationDelay}
                  onChange={(event) => {
                    setAssociationDelay(
                      Math.max(0, Number(event.target.value)),
                    );
                    setAssociationDirty(true);
                  }}
                />
              </div>
              <div className="divide-y overflow-hidden rounded-xl border">
                <AssociationQueueComposer
                  open={associationComposerOpen}
                  onClose={() => setAssociationComposerOpen(false)}
                  options={rulesQuery.data ?? []}
                  existingRuleIds={associationItems.map(
                    (item) => item.associationRuleId,
                  )}
                  onApply={(drafts) => {
                    setAssociationItems((current) => [...current, ...drafts]);
                    setAssociationDirty(true);
                  }}
                />
                {associationItems.map((item, index) => (
                  <div
                    key={item.associationRuleId}
                    className="flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {rulesQuery.data?.find(
                        (rule) => rule.id === item.associationRuleId,
                      )?.name ?? item.associationRuleId}
                    </span>
                    <Switch
                      size="sm"
                      checked={item.enabled}
                      aria-label={`Enable association rule ${index + 1}`}
                      onCheckedChange={(enabled) => {
                        setAssociationItems((current) =>
                          current.map((row) =>
                            row.associationRuleId === item.associationRuleId
                              ? { ...row, enabled }
                              : row,
                          ),
                        );
                        setAssociationDirty(true);
                      }}
                    />
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Move rule up"
                      disabled={index === 0}
                      onClick={() => moveAssociation(index, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Move rule down"
                      disabled={index === associationItems.length - 1}
                      onClick={() => moveAssociation(index, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAssociationItems((current) =>
                          current.filter(
                            (row) =>
                              row.associationRuleId !== item.associationRuleId,
                          ),
                        );
                        setAssociationDirty(true);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                {associationItems.length === 0 && !associationComposerOpen && (
                  <p className="text-muted-foreground p-5 text-center text-xs">
                    No association rules added.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </PrioritySchedulerOverviewCard>
      {!priority && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Project job schedules</h3>
              <p className="text-muted-foreground text-xs">
                Review each cadence and next run. Configure a job to change its
                schedule.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pending || pausableCount === 0}
                onClick={() =>
                  ask(
                    'Pause active schedules',
                    'Pauses all eligible individual job schedules.',
                    (reason) =>
                      superAdminPriorityQueueApi.pauseIndividualSchedules(
                        organisationId,
                        projectId,
                        reason,
                      ),
                  )
                }
              >
                <Pause /> Pause all
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending || resumableCount === 0}
                onClick={() =>
                  ask(
                    'Resume paused schedules',
                    'Resumes all eligible individual job schedules.',
                    (reason) =>
                      superAdminPriorityQueueApi.resumeIndividualSchedules(
                        organisationId,
                        projectId,
                        reason,
                      ),
                  )
                }
              >
                <Play /> Resume all
              </Button>
            </div>
          </div>
          {(jobsQuery.data ?? []).length > 0 &&
            pausableCount === 0 &&
            resumableCount === 0 && (
              <p className="text-muted-foreground text-xs">
                No schedules can be paused or resumed. These actions need an
                enabled one-way job with a configured schedule.
              </p>
            )}
          {jobsQuery.isLoading ? (
            <SkeletonList count={2} />
          ) : jobsQuery.isError ? (
            <ErrorState
              title="Could not load sync flows"
              description={errorMessage(jobsQuery.error)}
              onRetry={() => jobsQuery.refetch()}
            />
          ) : (jobsQuery.data ?? []).length === 0 ? (
            <p className="text-muted-foreground rounded-xl border p-5 text-sm">
              No scheduled jobs in this project.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              {(jobsQuery.data ?? []).map((job) => {
                const active = isIndividualScheduleActive(job);
                return (
                  <IndividualScheduleRow
                    key={job.id}
                    job={
                      individualScheduleDrafts[job.id]
                        ? { ...job, ...individualScheduleDrafts[job.id] }
                        : job
                    }
                    pendingSchedule={!!individualScheduleDrafts[job.id]}
                    href={`/super-admin/organisations/${organisationId}/projects/${projectId}/jobs/${job.id}`}
                    busy={pending}
                    onConfigure={() => setConfiguringJobId(job.id)}
                    onToggle={
                      individualScheduleDrafts[job.id]
                        ? undefined
                        : () =>
                            ask(
                              active
                                ? 'Pause job schedule'
                                : 'Resume job schedule',
                              `Changes the schedule for ${job.name}.`,
                              (reason) =>
                                superAdminPriorityQueueApi.changeIndividualSchedule(
                                  organisationId,
                                  projectId,
                                  job.id,
                                  !active,
                                  reason,
                                ),
                            )
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
      {error && !pendingAction && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <SchedulerDraftFooter
        dirty={hasChanges}
        saving={pending}
        valid={scheduleDraft === null || queueScheduleValid(schedule)}
        onSave={save}
      />
      {configuringJob && (
        <JobScheduleModal
          projectId={projectId}
          jobId={configuringJob.id}
          job={
            individualScheduleDrafts[configuringJob.id]
              ? {
                  ...configuringJob,
                  ...individualScheduleDrafts[configuringJob.id],
                }
              : configuringJob
          }
          open
          onOpenChange={(open) => !open && setConfiguringJobId(null)}
          skipPriorityQueue
          stageOnly
          minIntervalMinutesOverride={1}
          saveSchedule={async (payload) =>
            setIndividualScheduleDrafts((current) => ({
              ...current,
              [configuringJob.id]: payload,
            }))
          }
        />
      )}
      <LifecycleConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setPendingAction(null);
        }}
        title={pendingAction?.title ?? ''}
        description={`${pendingAction?.effect ?? ''} This action applies to ${organisationName}.`}
        actionLabel={pendingAction?.title ?? 'Confirm'}
        tone={pendingAction?.destructive ? 'danger' : 'warning'}
        organisationName={organisationName}
        requiresNameConfirm={pendingAction?.destructive ?? false}
        minReasonLength={10}
        reasonPlaceholder="Why is this scheduler change needed?"
        isSubmitting={pending}
        errorMessage={error}
        onSubmit={confirm}
      />
    </div>
  );
}
