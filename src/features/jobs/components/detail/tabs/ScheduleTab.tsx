import {
  ChartNoAxesColumnIncreasing,
  CalendarClock,
  Check,
  Clock,
  Database,
  Info,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Timer,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { useJobDetailContext } from '../context';

import { jobsApi } from '@/api/jobs';
import StatusBadge from '@/components/shared/StatusBadge';
import UpgradeRequiredDialog from '@/components/shared/UpgradeRequiredDialog';
import StartSyncModal from '@/components/sync/StartSyncModal';
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

interface IntervalConfig {
  amount: number;
  unit: 'minutes' | 'hours';
}

interface ScheduleDraft {
  mode: string;
  times: string[];
  days: number[];
  interval: IntervalConfig;
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
    beginTracking,
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

  const getIntervalMinutes = () =>
    interval.unit === 'hours' ? interval.amount * 60 : interval.amount;

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
    frequencyChoice ?? matchFrequency(mode, getIntervalMinutes(), times);
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

  const scheduleStatus = priorityModeActive
    ? projectQueue?.status === 'paused'
      ? 'schedule_paused'
      : 'active'
    : job.scheduleState === 'paused_limit_reached'
      ? 'limit_reached'
      : job.scheduleState === 'retry_pending'
        ? 'retry_pending'
        : job.scheduleState === 'paused'
          ? 'schedule_paused'
          : scheduleActive
            ? 'active'
            : 'disabled';

  const effectiveTimezone = BROWSER_TIMEZONE;
  const nextRunAt = priorityModeActive
    ? projectQueue?.nextStartAt
    : job.nextRunAt;
  const scheduleSummary = isTwoWay
    ? 'Managed automatically'
    : priorityModeActive && projectQueue
      ? formatSchedule({
          scheduleMode: projectQueue.scheduleMode ?? undefined,
          intervalMinutes: projectQueue.intervalMinutes,
          scheduleTimes: projectQueue.scheduleTimes ?? undefined,
          scheduleDays: projectQueue.scheduleDays ?? undefined,
          cronExpression: projectQueue.startCronExpression,
        })
      : formatSchedule(job);
  const performance = deriveSyncJobSummary(job, runLogs);
  const completedRunCount = runLogs.filter(
    (run) => !['running', 'pending', 'queued', 'paused'].includes(run.status),
  ).length;
  const performanceMetrics = [
    {
      label: 'Records synced',
      value: (job.recordsSynced ?? 0).toLocaleString(),
      description: 'Total synced records',
      icon: Database,
    },
    {
      label: 'Avg duration',
      value: formatDurationMs(performance.averageDurationMs),
      description: completedRunCount
        ? `Across ${completedRunCount} recent runs`
        : 'No completed runs',
      icon: Timer,
    },
    {
      label: 'Last sync',
      value: performance.lastSyncAt
        ? formatScheduledAt(performance.lastSyncAt, effectiveTimezone)
        : 'Never',
      description: performance.lastSyncAt
        ? 'Most recent completed run'
        : 'Not synced yet',
      icon: CalendarClock,
    },
    {
      label: 'Success rate',
      value:
        performance.successRate == null
          ? '—'
          : `${performance.successRate.toFixed(performance.successRate % 1 === 0 ? 0 : 1)}%`,
      description: completedRunCount ? 'Successful recent runs' : 'No run data',
      icon: ChartNoAxesColumnIncreasing,
    },
  ];
  const manualRunBlocked = !job.isEnabled || queued || isSyncing;

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
    if (mode === 'interval' && getIntervalMinutes() < minIntervalMinutes) {
      toast.error(
        `Interval must be at least ${minIntervalMinutes} minute${minIntervalMinutes === 1 ? '' : 's'}.`,
      );
      return;
    }

    setSaving(true);
    try {
      await jobsApi.updateJob(projectId, job.id, {
        scheduleMode: mode,
        scheduleTimes: mode !== 'interval' ? times : null,
        scheduleDays: mode === 'day_specific' ? days : null,
        intervalMinutes: mode === 'interval' ? getIntervalMinutes() : null,
        timezone: BROWSER_TIMEZONE,
        cronExpression: null,
      });
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
      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="p-0">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            {performanceMetrics.map((metric, index) => (
              <div
                key={metric.label}
                className={`flex min-w-0 items-center gap-3 p-4 ${
                  index < 3 ? 'border-b xl:border-r xl:border-b-0' : ''
                } ${index === 0 ? 'sm:border-r' : ''} ${
                  index === 1 ? 'xl:border-r' : ''
                } ${index === 2 ? 'sm:border-r sm:border-b-0' : ''}`}
              >
                <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <metric.icon className="size-4.5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold tracking-tight">
                    {metric.value}
                  </p>
                  <p className="text-muted-foreground truncate text-xs font-medium">
                    {metric.label}
                  </p>
                  <p className="text-muted-foreground truncate text-[11px]">
                    {metric.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Play className="size-4.5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <CardTitle>Run manually</CardTitle>
              <CardDescription>
                Sync data now without changing the automatic schedule.
              </CardDescription>
            </div>
          </div>
          <CardAction className="flex flex-wrap items-center gap-2">
            {isSyncing && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleStop}
                disabled={stopping}
              >
                {stopping ? <RefreshCw className="animate-spin" /> : <Square />}
                {stopping ? 'Stopping…' : 'Stop sync'}
              </Button>
            )}
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
          {(activeRunLog?.status === 'running' || isSyncing) && (
            <div className="bg-muted/30 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3 text-xs">
              <StatusBadge status="running" size="sm" />
              <span className="text-muted-foreground">
                {liveProgress?.recordsProcessed ?? 0} records processed
              </span>
              {liveProgress?.etaSeconds != null && (
                <span className="text-muted-foreground">
                  About {Math.max(1, Math.ceil(liveProgress.etaSeconds / 60))}{' '}
                  min remaining
                </span>
              )}
            </div>
          )}

          {!job.isEnabled && !isSyncing && (
            <Alert>
              <Info />
              <AlertDescription>
                Set the job status to Active before starting a manual run.
              </AlertDescription>
            </Alert>
          )}

          {queued && !isSyncing && (
            <Alert>
              <Clock />
              <AlertDescription>
                This job is waiting in the queue. Cancel it before starting a
                different manual run.
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
            onLimitSyncDone={() => void beginTracking()}
            onSyncAll={(range) =>
              void handleSyncAll(() => handleTabChange('run-history'), range)
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
              <CalendarClock className="size-4.5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <CardTitle>Automatic schedule</CardTitle>
              <CardDescription>
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
            <Skeleton className="h-40 w-full rounded-2xl" />
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
            <div className="flex flex-col gap-4">
              <div className="order-last space-y-5 rounded-2xl border p-4">
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
                        <Link to={`/projects/${projectId}?tab=scheduler`}>
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

              <div className="order-first grid overflow-hidden rounded-2xl border text-xs sm:grid-cols-2 xl:grid-cols-4">
                <div className="flex min-w-0 items-center justify-between gap-3 border-b p-3 sm:border-r xl:border-b-0">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={scheduleStatus} size="sm" />
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 border-b p-3 xl:border-r xl:border-b-0">
                  <span className="text-muted-foreground">Schedule</span>
                  <span className="truncate text-right font-medium capitalize">
                    {scheduleSummary}
                  </span>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 border-b p-3 sm:border-r sm:border-b-0 xl:border-r">
                  <span className="text-muted-foreground">Next run</span>
                  <span className="truncate text-right font-medium">
                    {formatScheduledAt(nextRunAt, effectiveTimezone)}
                  </span>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 p-3">
                  <span className="text-muted-foreground">Last synced</span>
                  <span className="truncate text-right font-medium">
                    {performance.lastSyncAt
                      ? formatScheduledAt(
                          performance.lastSyncAt,
                          effectiveTimezone,
                        )
                      : 'Never'}
                  </span>
                </div>
              </div>
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

      <Alert>
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
