import {
  CalendarClock,
  CalendarDays,
  Check,
  Clock,
  Info,
  Lock,
  Plus,
  Timer,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { jobsApi } from '@/api/jobs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import TimeInput from '@/features/jobs/components/TimeInput';
import type { ExtJob } from '@/features/jobs/hooks/useJobDetail';
import {
  buildScheduleUpdatePayload,
  getIntervalMinutes,
  type IntervalConfig,
  type ScheduleDraft,
} from '@/features/jobs/lib/jobScheduleSettings';
import { TWO_WAY_SCHEDULE_MESSAGE, WEEKDAYS } from '@/features/jobs/utils';
import { BROWSER_TIMEZONE } from '@/lib/timezones';
import { showToast } from '@/lib/toast';
import { useEntitlements } from '@/queries/useEntitlements';
import { usePriorityQueueQuery } from '@/queries/usePriorityQueue';

interface JobScheduleModalProps {
  projectId: string;
  jobId: string;
  job: ExtJob;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const DISPLAY_WEEKDAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

const INTERVAL_PRESETS = [
  { label: '15 min', minutes: 15, amount: 15, unit: 'minutes' as const },
  { label: '30 min', minutes: 30, amount: 30, unit: 'minutes' as const },
  { label: '1 hour', minutes: 60, amount: 1, unit: 'hours' as const },
  { label: '2 hours', minutes: 120, amount: 2, unit: 'hours' as const },
  { label: '4 hours', minutes: 240, amount: 4, unit: 'hours' as const },
  { label: '6 hours', minutes: 360, amount: 6, unit: 'hours' as const },
];

const SCHEDULE_TYPES = [
  {
    id: 'interval',
    title: 'Recurring Interval',
    subtitle: 'Run continuously every N minutes or hours',
    icon: Timer,
  },
  {
    id: 'daily_time',
    title: 'Daily Schedule',
    subtitle: 'Run every day at your specified times',
    icon: Clock,
  },
  {
    id: 'day_specific',
    title: 'Specific Days',
    subtitle: 'Run on designated days of the week',
    icon: CalendarDays,
  },
] as const;

export default function JobScheduleModal({
  projectId,
  jobId,
  job,
  open,
  onOpenChange,
  onSaved,
}: JobScheduleModalProps) {
  const isTwoWay = job.syncDirection === 'two_way';
  const priorityQueueQuery = usePriorityQueueQuery(projectId);
  const priorityModeActive =
    priorityQueueQuery.data?.schedulerMode === 'priority';

  const [mode, setMode] = useState<string>(job.scheduleMode || 'daily_time');
  const [times, setTimes] = useState<string[]>(
    job.scheduleTimes?.length ? job.scheduleTimes : ['09:00'],
  );
  const [days, setDays] = useState<number[]>(
    job.scheduleDays?.length ? job.scheduleDays : [1, 2, 3, 4, 5],
  );
  const [interval, setInterval] = useState<IntervalConfig>(() => {
    const minutes = job.intervalMinutes;
    if (!minutes) return { amount: 15, unit: 'minutes' };
    return minutes >= 60 && minutes % 60 === 0
      ? { amount: minutes / 60, unit: 'hours' }
      : { amount: minutes, unit: 'minutes' };
  });
  const [customIntervalActive, setCustomIntervalActive] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync state on modal open
  useEffect(() => {
    if (open) {
      const initialMode = job.scheduleMode || 'daily_time';
      setMode(initialMode);
      setTimes(job.scheduleTimes?.length ? job.scheduleTimes : ['09:00']);
      setDays(job.scheduleDays?.length ? job.scheduleDays : [1, 2, 3, 4, 5]);
      const m = job.intervalMinutes || 15;
      const initialInterval: IntervalConfig =
        m >= 60 && m % 60 === 0
          ? { amount: m / 60, unit: 'hours' }
          : { amount: m, unit: 'minutes' };
      setInterval(initialInterval);
      setCustomIntervalActive(
        !INTERVAL_PRESETS.some((preset) => preset.minutes === m),
      );
    }
  }, [open, job]);

  const entitlements = useEntitlements();
  const intervalMinutes = getIntervalMinutes(interval);
  const minIntervalMinutes = entitlements.minIntervalMinutes;
  const minIntervalAmount =
    interval.unit === 'hours'
      ? Math.max(1, Math.ceil(minIntervalMinutes / 60))
      : minIntervalMinutes;

  const addTime = () => setTimes((prev) => [...prev, '09:00']);
  const updateTime = (index: number, value: string) =>
    setTimes((prev) =>
      prev.map((time, currentIndex) =>
        currentIndex === index ? value : time,
      ),
    );
  const removeTime = (index: number) =>
    setTimes((prev) => prev.filter((_, currentIndex) => currentIndex !== index));

  const toggleDay = (day: number) =>
    setDays((prev) =>
      prev.includes(day)
        ? prev.filter((val) => val !== day)
        : [...prev, day].sort((a, b) => a - b),
    );

  const applyDayPreset = (type: 'weekdays' | 'weekends' | 'all') => {
    if (type === 'weekdays') setDays([1, 2, 3, 4, 5]);
    else if (type === 'weekends') setDays([0, 6]);
    else if (type === 'all') setDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const handleSave = async () => {
    if (mode !== 'interval' && times.length === 0) {
      toast.error('Add at least one run time.');
      return;
    }
    if (mode === 'day_specific' && days.length === 0) {
      toast.error('Select at least one day of the week.');
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
      const currentDraft: ScheduleDraft = { mode, times, days, interval };
      await jobsApi.updateJob(
        projectId,
        jobId,
        buildScheduleUpdatePayload(currentDraft, BROWSER_TIMEZONE),
      );
      showToast.success('Schedule updated successfully.');
      onSaved?.();
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl space-y-4 p-5 sm:max-w-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
              <CalendarClock className="size-4" />
            </span>
            <DialogTitle className="text-base font-semibold">
              Configure Sync Schedule
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Select your sync schedule type. Times use your local timezone (
            <strong className="font-mono text-foreground">{BROWSER_TIMEZONE}</strong>).
          </DialogDescription>
        </DialogHeader>

        {isTwoWay ? (
          <Alert className="py-3">
            <Info className="size-4" />
            <AlertDescription className="text-xs">
              {TWO_WAY_SCHEDULE_MESSAGE}
            </AlertDescription>
          </Alert>
        ) : priorityModeActive ? (
          <Alert className="py-3">
            <Info className="size-4" />
            <AlertDescription className="text-xs">
              This project uses Priority Scheduling. Execution timing is managed
              by the project queue scheduler.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {/* 1. Schedule Type Primary Cards */}
            <div className="space-y-2">
              <FieldLabel className="text-xs font-semibold text-foreground">
                Schedule Type
              </FieldLabel>

              <RadioGroup
                value={mode}
                onValueChange={setMode}
                className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
              >
                {SCHEDULE_TYPES.map((type) => {
                  const Icon = type.icon;
                  const allowed = entitlements.schedulingMode(type.id);
                  const isSelected = mode === type.id;

                  return (
                    <label
                      key={type.id}
                      htmlFor={`sched-type-${type.id}`}
                      className={`relative flex flex-col justify-between rounded-2xl border p-3.5 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/[0.04] ring-1 ring-primary/20 shadow-xs'
                          : 'border-border/80 bg-background hover:bg-muted/30 hover:border-border'
                      } ${!allowed ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`flex size-7 items-center justify-center rounded-lg border ${
                              isSelected
                                ? 'border-primary/30 bg-primary/10 text-primary'
                                : 'border-border/60 bg-muted/40 text-muted-foreground'
                            }`}
                          >
                            <Icon className="size-3.5" />
                          </span>
                          <RadioGroupItem
                            value={type.id}
                            id={`sched-type-${type.id}`}
                            disabled={!allowed}
                          />
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            {type.title}
                            {!allowed && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground font-normal">
                                <Lock className="size-2.5" /> Locked
                              </span>
                            )}
                          </span>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            {type.subtitle}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            {/* 2. Interactive Parameters Sub-Panel based on Chosen Type */}
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
              {/* Recurring Interval Configuration */}
              {mode === 'interval' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <FieldLabel className="text-xs font-semibold text-foreground">
                      Frequency Cadence
                    </FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {INTERVAL_PRESETS.map((preset) => {
                        const isPresetActive =
                          !customIntervalActive &&
                          interval.amount === preset.amount &&
                          interval.unit === preset.unit;
                        const isAllowed =
                          preset.minutes >= minIntervalMinutes &&
                          entitlements.frequency(
                            preset.minutes === 15
                              ? '15min'
                              : preset.minutes === 60
                                ? 'hourly'
                                : 'custom',
                          );

                        return (
                          <button
                            key={preset.label}
                            type="button"
                            disabled={!isAllowed}
                            onClick={() => {
                              setInterval({
                                amount: preset.amount,
                                unit: preset.unit,
                              });
                              setCustomIntervalActive(false);
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                              isPresetActive
                                ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30 font-semibold'
                                : 'border-border/80 bg-background hover:bg-muted/40 text-foreground'
                            } ${!isAllowed ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {isPresetActive && (
                              <Check className="size-3 text-primary" />
                            )}
                            {preset.label}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setCustomIntervalActive(true)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                          customIntervalActive
                            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30 font-semibold'
                            : 'border-border/80 bg-background hover:bg-muted/40 text-foreground'
                        } cursor-pointer`}
                      >
                        {customIntervalActive && (
                          <Check className="size-3 text-primary" />
                        )}
                        Custom interval
                      </button>
                    </div>
                  </div>

                  {customIntervalActive && (
                    <Field className="space-y-1.5 pt-1">
                      <FieldLabel className="text-xs font-medium text-foreground">
                        Custom Duration Between Syncs
                      </FieldLabel>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={minIntervalAmount}
                          max={interval.unit === 'hours' ? 720 : 43200}
                          value={interval.amount}
                          onChange={(e) =>
                            setInterval((curr) => ({
                              ...curr,
                              amount: Math.max(
                                minIntervalAmount,
                                Number.parseInt(e.target.value) ||
                                  minIntervalAmount,
                              ),
                            }))
                          }
                          className="w-24 text-xs font-mono"
                        />
                        <Select
                          value={interval.unit}
                          onValueChange={(val) =>
                            setInterval((curr) => ({
                              ...curr,
                              unit: val as 'minutes' | 'hours',
                            }))
                          }
                        >
                          <SelectTrigger className="w-32 text-xs">
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

                  <p className="text-[11px] text-muted-foreground">
                    Next sync triggers automatically{' '}
                    <strong className="text-foreground">
                      {interval.amount} {interval.unit}
                    </strong>{' '}
                    after each execution completes.
                  </p>
                </div>
              )}

              {/* Daily Schedule Configuration */}
              {mode === 'daily_time' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <FieldLabel className="text-xs font-semibold text-foreground">
                      Daily Execution Times
                    </FieldLabel>
                    <div className="space-y-2">
                      {times.map((time, idx) => (
                        <TimeInput
                          key={idx}
                          value={time}
                          onChange={(val) => updateTime(idx, val)}
                          onRemove={() => removeTime(idx)}
                          canRemove={times.length > 1}
                        />
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={addTime}
                    >
                      <Plus className="size-3 mr-1" /> Add another daily run time
                    </Button>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    This job runs once every day at each configured time listed
                    above.
                  </p>
                </div>
              )}

              {/* Specific Days Configuration */}
              {mode === 'day_specific' && (
                <div className="space-y-3.5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <FieldLabel className="text-xs font-semibold text-foreground">
                        Select Active Days
                      </FieldLabel>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyDayPreset('weekdays')}
                          className="text-[10px] text-muted-foreground hover:text-primary underline cursor-pointer"
                        >
                          Weekdays
                        </button>
                        <span className="text-muted-foreground/40 text-[10px]">
                          •
                        </span>
                        <button
                          type="button"
                          onClick={() => applyDayPreset('weekends')}
                          className="text-[10px] text-muted-foreground hover:text-primary underline cursor-pointer"
                        >
                          Weekends
                        </button>
                        <span className="text-muted-foreground/40 text-[10px]">
                          •
                        </span>
                        <button
                          type="button"
                          onClick={() => applyDayPreset('all')}
                          className="text-[10px] text-muted-foreground hover:text-primary underline cursor-pointer"
                        >
                          All Days
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2 w-full">
                      {DISPLAY_WEEKDAYS.map((wd) => {
                        const active = days.includes(wd.value);
                        return (
                          <button
                            key={wd.value}
                            type="button"
                            onClick={() => toggleDay(wd.value)}
                            className={`flex h-9 w-full items-center justify-center rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                              active
                                ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                                : 'border-border/80 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-border'
                            }`}
                          >
                            {wd.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-border/50">
                    <FieldLabel className="text-xs font-semibold text-foreground">
                      Run Times on Selected Days
                    </FieldLabel>
                    <div className="space-y-2">
                      {times.map((time, idx) => (
                        <TimeInput
                          key={idx}
                          value={time}
                          onChange={(val) => updateTime(idx, val)}
                          onRemove={() => removeTime(idx)}
                          canRemove={times.length > 1}
                        />
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={addTime}
                    >
                      <Plus className="size-3 mr-1" /> Add another run time
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between border-t border-border/60 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          {!isTwoWay && !priorityModeActive && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Spinner className="size-3.5 mr-1" />
              ) : (
                <Clock className="size-3.5 mr-1" />
              )}
              {saving ? 'Saving…' : 'Save Schedule'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
