import { CalendarClock, Check, Clock, Info } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { useJobDetailContext } from '../context';

import { jobsApi } from '@/api/jobs';
import UpgradeRequiredDialog from '@/components/shared/UpgradeRequiredDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CardAction } from '@/components/ui/card';
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
  buildScheduleUpdatePayload,
  getIntervalMinutes,
  type IntervalConfig,
  type ScheduleDraft,
} from '@/features/jobs/lib/jobScheduleSettings';
import {
  FREQUENCY_PRESET_ORDER,
  TWO_WAY_SCHEDULE_MESSAGE,
  WEEKDAYS,
  matchFrequency,
  type FrequencyPreset,
} from '@/features/jobs/utils';
import { BROWSER_TIMEZONE } from '@/lib/timezones';
import { showToast } from '@/lib/toast';
import { useEntitlements } from '@/queries/useEntitlements';
import { usePriorityQueueQuery } from '@/queries/usePriorityQueue';

export function JobScheduleSettingsHeader() {
  const {
    projectId,
    job,
    scheduleToggling,
    pipelineRequired,
    pipelineConfigured,
    handleScheduleToggle,
    handleTabChange,
  } = useJobDetailContext();
  const priorityQueueQuery = usePriorityQueueQuery(projectId);
  const priorityModeActive =
    priorityQueueQuery.data?.schedulerMode === 'priority';

  return (
    <>
      <div className="flex items-start gap-3">
        <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
          <CalendarClock className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2
            id="job-settings-section-title"
            className="font-heading text-lg font-semibold tracking-tight"
          >
            Schedule
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Control when this job runs automatically.
          </p>
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
    </>
  );
}

export default function JobScheduleSettings() {
  const { projectId, job, refetch, upgradeDialog, setUpgradeDialog } =
    useJobDetailContext();

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
  const [frequencyChoice, setFrequencyChoice] = useState<string | null>(null);

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
  const intervalMinutes = getIntervalMinutes(interval);
  const frequency =
    frequencyChoice ?? matchFrequency(mode, intervalMinutes, times);
  const showEditor = canCustomise && (!hasPresets || frequency === 'custom');
  const minIntervalMinutes = entitlements.minIntervalMinutes;
  const minIntervalAmount =
    interval.unit === 'hours'
      ? Math.max(1, Math.ceil(minIntervalMinutes / 60))
      : minIntervalMinutes;

  const priorityQueueQuery = usePriorityQueueQuery(projectId);
  const priorityModeActive =
    priorityQueueQuery.data?.schedulerMode === 'priority';
  const isTwoWay = job.syncDirection === 'two_way';

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
    if (mode === 'interval' && intervalMinutes < minIntervalMinutes) {
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
    <>
      <section aria-labelledby="job-settings-section-title">
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
                    This project uses Priority Scheduling, so its project queue
                    controls when this job runs. Individual schedule settings
                    are unavailable here.
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
                <AlertDescription>{TWO_WAY_SCHEDULE_MESSAGE}</AlertDescription>
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

        {!isTwoWay &&
          !priorityModeActive &&
          !priorityQueueQuery.isLoading &&
          !priorityQueueQuery.isError && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
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
            </div>
          )}
      </section>

      <Alert surface="outer" className="mt-5">
        <Info />
        <AlertDescription>
          <span className="text-foreground font-medium">Good to know. </span>
          Automatic runs process records created or updated since the last
          successful sync. Manual runs from Overview do not change this
          schedule.
        </AlertDescription>
      </Alert>

      <UpgradeRequiredDialog
        open={upgradeDialog.open}
        onOpenChange={(open) => setUpgradeDialog({ ...upgradeDialog, open })}
        message={upgradeDialog.message}
      />
    </>
  );
}
