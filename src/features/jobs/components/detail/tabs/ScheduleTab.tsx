import {
  CalendarClock,
  Check,
  Clock,
  Database,
  Info,
  Play,
  RotateCcw,
  Timer,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { useJobDetailContext } from '../context';

import { jobsApi } from '@/api/jobs';
import UpgradeRequiredDialog from '@/components/shared/UpgradeRequiredDialog';
import StartSyncModal from '@/components/sync/StartSyncModal';
import SyncRunProgress from '@/components/sync/SyncRunProgress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import ScheduleEnableToggle from '@/features/jobs/components/schedule/ScheduleEnableToggle';
import {
  FrequencyPresetPicker,
  ScheduleModeCards,
} from '@/features/jobs/components/schedule/SchedulePlanControls';
import TimeInput from '@/features/jobs/components/TimeInput';
import {
  FREQUENCY_PRESET_ORDER,
  TWO_WAY_SCHEDULE_MESSAGE,
  WEEKDAYS,
  formatSchedule,
  matchFrequency,
  type FrequencyPreset,
} from '@/features/jobs/utils';
import {
  deriveSyncJobSummary,
  formatDurationMs,
} from '@/features/projects/lib/syncJobSummary';
import { BROWSER_TIMEZONE } from '@/lib/timezones';
import { showToast } from '@/lib/toast';
import { useEntitlements } from '@/queries/useEntitlements';
import { usePriorityQueueQuery } from '@/queries/usePriorityQueue';

export interface IntervalConfig {
  amount: number;
  unit: 'minutes' | 'hours';
}

export interface ScheduleDraft {
  mode: string;
  times: string[];
  days: number[];
  interval: IntervalConfig;
}

function SyncSummaryCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card size="sm" className="min-w-0 gap-0 py-0">
      <CardContent className="space-y-2.5 p-4">
        <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-3xl">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-lg leading-tight font-bold tracking-tight">
            {value}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs font-medium">
            {label}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function hasScheduleDefinition(schedule: {
  scheduleMode?: string | null;
  intervalMinutes?: number | null;
  scheduleTimes?: string[] | null;
  scheduleDays?: number[] | null;
  cronExpression?: string | null;
  oneTimeAt?: string | null;
}): boolean {
  if (schedule.scheduleMode === 'interval') {
    return Boolean(schedule.intervalMinutes);
  }
  if (schedule.scheduleMode === 'daily_time') {
    return Boolean(schedule.scheduleTimes?.length);
  }
  if (schedule.scheduleMode === 'day_specific') {
    return Boolean(
      schedule.scheduleDays?.length && schedule.scheduleTimes?.length,
    );
  }
  if (schedule.scheduleMode === 'one_time') {
    return Boolean(schedule.oneTimeAt);
  }
  return Boolean(schedule.cronExpression);
}

export function getIntervalMinutes(interval: IntervalConfig) {
  return interval.unit === 'hours' ? interval.amount * 60 : interval.amount;
}

/**
 * Only send the schedule values that apply to the selected mode. Clearing the
 * inactive values avoids a previous daily/day-specific configuration leaking
 * into an interval update (and vice versa).
 */
export function buildScheduleUpdatePayload(
  draft: ScheduleDraft,
  timezone: string,
) {
  return {
    scheduleMode: draft.mode,
    scheduleTimes: draft.mode !== 'interval' ? draft.times : null,
    scheduleDays: draft.mode === 'day_specific' ? draft.days : null,
    intervalMinutes:
      draft.mode === 'interval' ? getIntervalMinutes(draft.interval) : null,
    timezone,
    cronExpression: null,
  };
}

function capitalizeFirst(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function formatScheduledAt(value: string | null | undefined, timezone: string) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';

  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function getNextRunCardState({
  scheduleConfigured,
  schedulePaused,
  nextRunAt,
  timezone,
}: {
  scheduleConfigured: boolean;
  schedulePaused: boolean;
  nextRunAt?: string | null;
  timezone: string;
}): { value: string; description: string } {
  if (!scheduleConfigured) {
    return { value: '—', description: 'Configure a schedule' };
  }
  if (schedulePaused) {
    return { value: 'Not scheduled', description: 'Schedule is paused' };
  }
  if (!nextRunAt) {
    return {
      value: 'Not scheduled',
      description: 'Waiting for the next run time',
    };
  }
  return {
    value: formatScheduledAt(nextRunAt, timezone),
    description: 'Next scheduled run',
  };
}

export default function ScheduleTab() {
  const {
    projectId,
    job,
    refetch,
    isSyncing,
    stopping,
    scheduleToggling,
    cancellingQueue,
    retryingQueue,
    activeRunLog,
    liveProgress,
    runLogs,
    pipelineRequired,
    pipelineConfigured,
    upgradeDialog,
    setUpgradeDialog,
    handleRunNow,
    handleSyncAll,
    handleStop,
    handleCancelQueue,
    handleRetryQueue,
    handleScheduleToggle,
    handleTabChange,
  } = useJobDetailContext();

  const initialDraft: ScheduleDraft = {
    mode: job.scheduleMode || 'daily_time',
    times: job.scheduleTimes?.length ? job.scheduleTimes : ['09:00'],
    days: job.scheduleDays?.length ? job.scheduleDays : [1, 2, 3, 4, 5],
    interval: (() => {
      const minutes = job.intervalMinutes;
      if (!minutes) return { amount: 15, unit: 'minutes' as const };
      return minutes >= 60 && minutes % 60 === 0
        ? { amount: minutes / 60, unit: 'hours' as const }
        : { amount: minutes, unit: 'minutes' as const };
    })(),
  };

  const [mode, setMode] = useState(initialDraft.mode);
  const [times, setTimes] = useState<string[]>(initialDraft.times);
  const [days, setDays] = useState<number[]>(initialDraft.days);
  const [interval, setInterval] = useState<IntervalConfig>(
    initialDraft.interval,
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(initialDraft),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const getCurrentIntervalMinutes = () => getIntervalMinutes(interval);

  const currentDraft = useMemo<ScheduleDraft>(
    () => ({ mode, times, days, interval }),
    [mode, times, days, interval],
  );
  const currentSnapshot = JSON.stringify(currentDraft);
  const isDirty = currentSnapshot !== savedSnapshot;

  useEffect(() => {
    if (!isDirty) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [isDirty]);

  const entitlements = useEntitlements();
  const canCustomise = entitlements.frequency('custom');
  const hasPresets = FREQUENCY_PRESET_ORDER.some((key) =>
    entitlements.frequency(key),
  );
  const [frequencyChoice, setFrequencyChoice] = useState<string | null>(null);
  const frequency =
    frequencyChoice ?? matchFrequency(mode, getCurrentIntervalMinutes(), times);
  const showEditor = canCustomise && (!hasPresets || frequency === 'custom');
  const minIntervalMinutes = entitlements.minIntervalMinutes;
  const minIntervalAmount =
    interval.unit === 'hours'
      ? Math.max(1, Math.ceil(minIntervalMinutes / 60))
      : minIntervalMinutes;

  const priorityQueueQuery = usePriorityQueueQuery(projectId);
  const priorityModeActive =
    priorityQueueQuery.data?.schedulerMode === 'priority';
  const projectQueue = priorityQueueQuery.data?.queue;
  const isTwoWay = job.syncDirection === 'two_way';
  const queued = runLogs[0]?.status === 'queued';
  const failedQueueJob = !!runLogs[0]?.bullmqJobId && job.status === 'error';
  const scheduleActive =
    job.syncEnabled &&
    (job.scheduleState === 'active' ||
      job.scheduleState === 'retry_pending' ||
      job.scheduleState === 'resume_pending');

  const effectiveTimezone = BROWSER_TIMEZONE;
  const nextRunAt = priorityModeActive
    ? projectQueue?.nextStartAt
    : job.nextRunAt;
  const scheduleSummary = isTwoWay
    ? 'Managed automatically'
    : priorityModeActive && projectQueue
      ? projectQueue.scheduleMode === 'one_time'
        ? `Once on ${formatScheduledAt(projectQueue.oneTimeAt, effectiveTimezone)}`
        : formatSchedule({
            scheduleMode: projectQueue.scheduleMode ?? undefined,
            intervalMinutes: projectQueue.intervalMinutes,
            scheduleTimes: projectQueue.scheduleTimes ?? undefined,
            scheduleDays: projectQueue.scheduleDays ?? undefined,
            cronExpression: projectQueue.startCronExpression,
          })
      : formatSchedule(job);
  const performance = deriveSyncJobSummary(job, runLogs);
  const scheduleConfigured = isTwoWay
    ? true
    : priorityModeActive
      ? Boolean(
          projectQueue &&
          hasScheduleDefinition({
            scheduleMode: projectQueue.scheduleMode,
            intervalMinutes: projectQueue.intervalMinutes,
            scheduleTimes: projectQueue.scheduleTimes,
            scheduleDays: projectQueue.scheduleDays,
            cronExpression: projectQueue.startCronExpression,
            oneTimeAt: projectQueue.oneTimeAt,
          }),
        )
      : hasScheduleDefinition(job);
  const schedulePaused = priorityModeActive
    ? projectQueue?.status === 'paused'
    : !scheduleActive;
  const scheduleValue = scheduleConfigured
    ? capitalizeFirst(scheduleSummary)
    : 'Not configured';
  const nextRunCard = getNextRunCardState({
    scheduleConfigured,
    schedulePaused,
    nextRunAt,
    timezone: effectiveTimezone,
  });
  const summaryCards = [
    {
      label: 'Records synced',
      value: (job.recordsSynced ?? 0).toLocaleString(),
      description: 'Total synced records',
      icon: Database,
    },
    {
      label: 'Schedule at',
      value: scheduleValue,
      description: scheduleConfigured
        ? 'Current active schedule'
        : 'Configure a schedule',
      icon: CalendarClock,
    },
    {
      label: 'Avg duration',
      value: formatDurationMs(performance.averageDurationMs),
      description: 'Based on recent runs',
      icon: Timer,
    },
    {
      label: 'Last sync',
      value: performance.lastSyncAt
        ? formatScheduledAt(performance.lastSyncAt, effectiveTimezone)
        : 'Never',
      description: performance.lastSyncAt
        ? 'Most recent completed run'
        : 'No completed runs',
      icon: Clock,
    },
    {
      label: 'Next run',
      value: nextRunCard.value,
      description: nextRunCard.description,
      icon: Play,
    },
  ];
  const manualRunBlocked = !job.isEnabled || queued || isSyncing;
  const liveProcessed =
    liveProgress?.recordsProcessed ??
    (activeRunLog?.createdCount ?? 0) +
      (activeRunLog?.updatedCount ?? 0) +
      (activeRunLog?.skippedCount ?? 0) +
      (activeRunLog?.failedCount ?? 0);
  const liveTotal = liveProgress?.totalRecords;

  const applyFrequency = (key: string, preset: FrequencyPreset | null) => {
    setFrequencyChoice(key);
    if (!preset) return;
    setMode(preset.mode);
    if (preset.intervalMinutes != null) {
      setInterval({ amount: preset.intervalMinutes, unit: 'minutes' });
    }
    if (preset.times) setTimes(preset.times);
  };

  const addTime = () => setTimes((current) => [...current, '09:00']);
  const updateTime = (index: number, value: string) =>
    setTimes((current) =>
      current.map((time, currentIndex) =>
        currentIndex === index ? value : time,
      ),
    );
  const removeTime = (index: number) =>
    setTimes((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  const toggleDay = (day: number) =>
    setDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );

  const resetChanges = () => {
    const savedDraft = JSON.parse(savedSnapshot) as ScheduleDraft;
    setMode(savedDraft.mode);
    setTimes(savedDraft.times);
    setDays(savedDraft.days);
    setInterval(savedDraft.interval);
    setFrequencyChoice(null);
  };

  const handleSave = async () => {
    if (mode !== 'interval' && times.length === 0) {
      toast.error('Add at least one time.');
      return;
    }
    if (mode === 'day_specific' && days.length === 0) {
      toast.error('Select at least one day.');
      return;
    }
    if (
      mode === 'interval' &&
      getCurrentIntervalMinutes() < minIntervalMinutes
    ) {
      toast.error(
        `Interval must be at least ${minIntervalMinutes} minute${minIntervalMinutes === 1 ? '' : 's'}.`,
      );
      return;
    }

    setSaving(true);
    try {
      await jobsApi.updateJob(
        projectId,
        job.id,
        buildScheduleUpdatePayload(currentDraft, BROWSER_TIMEZONE),
      );
      setSavedSnapshot(currentSnapshot);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      showToast.success('Schedule saved.');
      refetch();
    } catch (error) {
      const apiError = error as { response?: { data?: { message?: string } } };
      showToast.error(
        apiError.response?.data?.message ??
          'Something went wrong. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <SyncSummaryCard key={card.label} {...card} />
        ))}
      </div>

      <div className="space-y-5">
        <Card size="sm" className="min-w-0">
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Play className="size-4.5" aria-hidden="true" />
              </span>
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold">
                  Run manually
                </CardTitle>
                <CardDescription className="text-xs leading-tight">
                  Sync data now without changing the automatic schedule.
                </CardDescription>
              </div>
            </div>
            <CardAction className="flex flex-wrap items-center gap-2">
              {runLogs[0]?.bullmqJobId && queued && !isSyncing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelQueue}
                  disabled={cancellingQueue}
                  className="text-destructive"
                >
                  <X /> {cancellingQueue ? 'Cancelling…' : 'Cancel queue'}
                </Button>
              )}
              {failedQueueJob && !isSyncing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetryQueue}
                  disabled={retryingQueue}
                >
                  <RotateCcw /> {retryingQueue ? 'Retrying…' : 'Retry'}
                </Button>
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            {!job.isEnabled && !isSyncing && (
              <Alert className="py-2.5">
                <Info />
                <AlertDescription className="space-y-0.5 [&_p:not(:last-child)]:mb-0">
                  <p className="text-foreground font-semibold">
                    Job is inactive
                  </p>
                  <p>
                    Set the job status to Active before starting a manual run.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {queued && !isSyncing && (
              <Alert className="py-2.5">
                <Clock />
                <AlertDescription className="space-y-0.5 [&_p:not(:last-child)]:mb-0">
                  <p className="text-foreground font-semibold">Run queued</p>
                  <p>
                    Cancel the queued run before starting a different manual
                    run.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <StartSyncModal
              embedded
              projectId={projectId}
              jobId={job.id}
              job={job}
              hasBaseline={!!job.lastSyncedAt}
              pipelineRequired={pipelineRequired}
              pipelineConfigured={pipelineConfigured}
              disabled={manualRunBlocked}
              onGoToPipeline={() => handleTabChange('pipeline')}
              onClose={() => undefined}
              onRunNow={() => void handleRunNow()}
              onLimitSyncDone={() => void refetch()}
              onSyncAll={(range) => void handleSyncAll(undefined, range)}
              runProgress={
                activeRunLog?.status === 'running' || isSyncing ? (
                  <SyncRunProgress
                    totalRecords={liveTotal}
                    processedRecords={liveProcessed}
                    createdCount={activeRunLog?.createdCount}
                    updatedCount={activeRunLog?.updatedCount}
                    skippedCount={activeRunLog?.skippedCount}
                    failedCount={activeRunLog?.failedCount}
                    etaSeconds={liveProgress?.etaSeconds}
                    description="Syncing all records in the selected date range."
                    onStop={() => void handleStop()}
                    stopping={stopping}
                  />
                ) : null
              }
            />
          </CardContent>
        </Card>

        <Card size="sm" className="min-w-0">
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                <CalendarClock className="size-4.5" aria-hidden="true" />
              </span>
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold">
                  Automatic schedule
                </CardTitle>
                <CardDescription className="text-xs leading-tight">
                  Let Synkazo run this job automatically.
                </CardDescription>
              </div>
            </div>
            <CardAction>
              {!priorityModeActive &&
                !priorityQueueQuery.isLoading &&
                !priorityQueueQuery.isError && (
                  <ScheduleEnableToggle
                    projectId={projectId}
                    jobId={job.id}
                    job={job}
                    scheduleToggling={scheduleToggling}
                    pipelineRequired={pipelineRequired}
                    pipelineConfigured={pipelineConfigured}
                    onGoToPipeline={() => handleTabChange('pipeline')}
                    onScheduleToggle={handleScheduleToggle}
                    className="w-auto"
                  />
                )}
            </CardAction>
          </CardHeader>

          <CardContent className="space-y-5">
            {priorityQueueQuery.isLoading ? (
              <Skeleton className="h-40 w-full rounded-4xl" />
            ) : priorityQueueQuery.isError ? (
              <Alert>
                <Info />
                <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    We could not determine which schedule controls this job.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => priorityQueueQuery.refetch()}
                  >
                    Try again
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-5 rounded-4xl border p-4">
                {priorityModeActive ? (
                  <Alert>
                    <Info />
                    <AlertDescription className="space-y-2">
                      <p>
                        This project uses Priority Scheduling, so its project
                        queue controls when this job runs. Individual schedule
                        settings are unavailable here.
                      </p>
                      <Button asChild variant="outline" size="sm">
                        <Link
                          to={`/projects/${projectId}?tab=settings&section=schedule`}
                        >
                          Open project schedule
                        </Link>
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : isTwoWay ? (
                  <Alert>
                    <Info />
                    <AlertDescription>
                      {TWO_WAY_SCHEDULE_MESSAGE}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <FrequencyPresetPicker
                      value={frequency}
                      onSelect={applyFrequency}
                    />

                    {showEditor && (
                      <ScheduleModeCards value={mode} onChange={setMode} />
                    )}

                    {showEditor && mode === 'daily_time' && (
                      <div className="space-y-3">
                        <FieldLabel>Run times</FieldLabel>
                        <div className="space-y-2">
                          {times.map((time, index) => (
                            <TimeInput
                              key={index}
                              value={time}
                              onChange={(value) => updateTime(index, value)}
                              onRemove={() => removeTime(index)}
                              canRemove={times.length > 1}
                            />
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          onClick={addTime}
                        >
                          Add another time
                        </Button>
                      </div>
                    )}

                    {showEditor && mode === 'interval' && (
                      <Field>
                        <FieldLabel>Time between runs</FieldLabel>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            min={minIntervalAmount}
                            max={interval.unit === 'hours' ? 720 : 43200}
                            value={interval.amount}
                            onChange={(event) =>
                              setInterval((current) => ({
                                ...current,
                                amount: Math.max(
                                  minIntervalAmount,
                                  Number.parseInt(event.target.value) ||
                                    minIntervalAmount,
                                ),
                              }))
                            }
                            className="w-24 font-mono"
                          />
                          <Select
                            value={interval.unit}
                            onValueChange={(value) =>
                              setInterval((current) => ({
                                ...current,
                                unit: value as 'minutes' | 'hours',
                              }))
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutes">Minutes</SelectItem>
                              <SelectItem value="hours">Hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </Field>
                    )}

                    {showEditor && mode === 'day_specific' && (
                      <div className="space-y-4">
                        <Field>
                          <FieldLabel>Days to run</FieldLabel>
                          <div className="flex flex-wrap gap-2">
                            {WEEKDAYS.map((weekday) => (
                              <Button
                                key={weekday.value}
                                type="button"
                                variant={
                                  days.includes(weekday.value)
                                    ? 'default'
                                    : 'outline'
                                }
                                size="sm"
                                onClick={() => toggleDay(weekday.value)}
                              >
                                {weekday.label}
                              </Button>
                            ))}
                          </div>
                        </Field>

                        <div className="space-y-3">
                          <FieldLabel>Run times</FieldLabel>
                          <div className="space-y-2">
                            {times.map((time, index) => (
                              <TimeInput
                                key={index}
                                value={time}
                                onChange={(value) => updateTime(index, value)}
                                onRemove={() => removeTime(index)}
                                canRemove={times.length > 1}
                              />
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            onClick={addTime}
                          >
                            Add another time
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>

          {!isTwoWay &&
            !priorityModeActive &&
            !priorityQueueQuery.isLoading &&
            !priorityQueueQuery.isError && (
              <CardFooter className="justify-between gap-3 border-t">
                <span className="text-muted-foreground text-xs">
                  {isDirty
                    ? 'You have unsaved changes.'
                    : 'Schedule is up to date.'}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={resetChanges}
                    disabled={!isDirty || saving}
                  >
                    Reset
                  </Button>
                  <Button onClick={handleSave} disabled={!isDirty || saving}>
                    {saving ? <Spinner /> : saved ? <Check /> : <Clock />}
                    {saving ? 'Saving…' : saved ? 'Saved' : 'Save schedule'}
                  </Button>
                </div>
              </CardFooter>
            )}
        </Card>
      </div>

      <Alert surface="outer">
        <Info />
        <AlertDescription>
          <span className="text-foreground font-medium">Good to know. </span>
          Automatic runs process records created or updated since the last
          successful sync. Manual runs let you reprocess all records or a
          controlled subset without changing this schedule.
        </AlertDescription>
      </Alert>

      <UpgradeRequiredDialog
        open={upgradeDialog.open}
        onOpenChange={(open) => setUpgradeDialog({ ...upgradeDialog, open })}
        message={upgradeDialog.message}
      />
    </div>
  );
}
