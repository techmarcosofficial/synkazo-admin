import { Info, Plus, Save } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { jobsApi } from '@/api/jobs';
import ErrorState from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FrequencyPresetPicker,
  ScheduleModeCards,
} from '@/features/jobs/components/schedule/SchedulePlanControls';
import TimeInput from '@/features/jobs/components/TimeInput';
import {
  FREQUENCY_PRESET_ORDER,
  TWO_WAY_SCHEDULE_MESSAGE,
  WEEKDAYS,
  matchFrequency,
  type FrequencyPreset,
} from '@/features/jobs/utils';
import { useEntitlements } from '@/queries/useEntitlements';
import { useJobQuery, useUpdateJobMutation } from '@/queries/useJobs';

interface IntervalConfig {
  amount: number;
  unit: 'minutes' | 'hours';
}

function JobScheduleSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-3">
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export interface JobScheduleFormHandle {
  /** Validates + saves the schedule. Resolves to whether it actually saved. */
  save: () => Promise<boolean>;
}

export interface JobScheduleFormState {
  saving: boolean;
  isDirty: boolean;
}

interface JobScheduleFormProps {
  projectId: string;
  jobId: string;
  onSaved: () => void;
  /** When true, hides the form's own "Save Schedule" button — a host (e.g. the Project Setup Wizard) drives saving via the ref instead. */
  embedded?: boolean;
  onStateChange?: (state: JobScheduleFormState) => void;
}

// The reusable schedule-editing form — rendered by the Project Setup Wizard's
// "Configure Schedule" step (embedded) and by JobScheduleDrawer. Edits the
// same sync-based schedule model (daily_time / interval / day_specific) as
// the Job Detail page's Schedule tab, so a schedule set up here reads back
// identically there.
export const JobScheduleForm = forwardRef<
  JobScheduleFormHandle,
  JobScheduleFormProps
>(function JobScheduleForm(
  { projectId, jobId, onSaved, embedded = false, onStateChange = undefined },
  ref,
) {
  const jobQuery = useJobQuery(projectId, jobId);
  const updateJobMutation = useUpdateJobMutation(projectId, jobId);
  // Two-way sync is not user-schedulable — it polls on a fixed, admin-configured
  // interval. Show a static notice instead of the schedule editor and make save
  // a no-op so the setup wizard can still advance ("Finish Setup").
  const isTwoWay = jobQuery.data?.syncDirection === 'two_way';

  const [mode, setMode] = useState('daily_time');
  const [times, setTimes] = useState<string[]>(['09:00']);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [interval, setInterval] = useState<IntervalConfig>({
    amount: 15,
    unit: 'minutes',
  });
  const [initialized, setInitialized] = useState(false);
  const [touched, setTouched] = useState(false);
  const skipNextDirtyCheck = useRef(true);

  useEffect(() => {
    if (!jobQuery.data || initialized) return;
    const job = jobQuery.data;
    setMode(job.scheduleMode || 'daily_time');
    if (job.scheduleTimes?.length) setTimes(job.scheduleTimes);
    if (job.scheduleDays?.length) setDays(job.scheduleDays);
    const m = job.intervalMinutes;
    if (m)
      setInterval(
        m >= 60 && m % 60 === 0
          ? { amount: m / 60, unit: 'hours' }
          : { amount: m, unit: 'minutes' },
      );
    setInitialized(true);
  }, [jobQuery.data, initialized]);

  useEffect(() => {
    if (!initialized) return;
    if (skipNextDirtyCheck.current) {
      skipNextDirtyCheck.current = false;
      return;
    }
    setTouched(true);
  }, [initialized, mode, times, days, interval]);

  const getIntervalMinutes = () =>
    interval.unit === 'hours' ? interval.amount * 60 : interval.amount;

  // Plan gating — same rules as the create-job wizard's Schedule step.
  const entitlements = useEntitlements();
  const canCustomise = entitlements.frequency('custom');
  const hasPresets = FREQUENCY_PRESET_ORDER.some((k) =>
    entitlements.frequency(k),
  );
  const [freqChoice, setFreqChoice] = useState<string | null>(null);
  const frequency =
    freqChoice ?? matchFrequency(mode, getIntervalMinutes(), times);
  const showEditor = canCustomise && (!hasPresets || frequency === 'custom');
  const minIntervalMinutes = entitlements.minIntervalMinutes;
  const minIntervalAmount =
    interval.unit === 'hours'
      ? Math.max(1, Math.ceil(minIntervalMinutes / 60))
      : minIntervalMinutes;

  const applyFrequency = (key: string, preset: FrequencyPreset | null) => {
    setFreqChoice(key);
    if (!preset) return;
    setMode(preset.mode);
    if (preset.intervalMinutes != null)
      setInterval({ amount: preset.intervalMinutes, unit: 'minutes' });
    if (preset.times) setTimes(preset.times);
  };

  const addTime = () => setTimes((prev) => [...prev, '09:00']);
  const updateTime = (i: number, v: string) =>
    setTimes((prev) => prev.map((t, idx) => (idx === i ? v : t)));
  const removeTime = (i: number) =>
    setTimes((prev) => prev.filter((_, idx) => idx !== i));
  const toggleDay = (d: number) =>
    setDays((prev) =>
      prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d].sort((a, b) => a - b),
    );

  const handleSave = async (): Promise<boolean> => {
    // Two-way sync has no schedule to persist — succeed immediately so the
    // wizard/host can advance without writing any schedule config.
    if (isTwoWay) {
      onSaved();
      return true;
    }
    if (mode !== 'interval' && times.length === 0) {
      toast.error('Add at least one time.');
      return false;
    }
    if (mode === 'day_specific' && days.length === 0) {
      toast.error('Select at least one day.');
      return false;
    }
    if (mode === 'interval' && getIntervalMinutes() < minIntervalMinutes) {
      toast.error(
        `Interval must be at least ${minIntervalMinutes} minute${minIntervalMinutes === 1 ? '' : 's'}.`,
      );
      return false;
    }
    try {
      await updateJobMutation.mutateAsync({
        scheduleMode: mode,
        scheduleTimes: mode !== 'interval' ? times : null,
        scheduleDays: mode === 'day_specific' ? days : null,
        intervalMinutes: mode === 'interval' ? getIntervalMinutes() : null,
        cronExpression: null,
      });
      try {
        await jobsApi.pauseSchedule(projectId, jobId);
        await jobsApi.resumeSchedule(projectId, jobId);
      } catch {
        /* ignore — schedule is still saved */
      }
      toast.success('Schedule saved');
      onSaved();
      return true;
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to save schedule');
      return false;
    }
  };

  useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

  useEffect(() => {
    if (!embedded) return;
    onStateChange?.({ saving: updateJobMutation.isPending, isDirty: touched });
  }, [embedded, updateJobMutation.isPending, touched]);

  if (jobQuery.isLoading) {
    return <JobScheduleSkeleton />;
  }

  if (jobQuery.isError) {
    return <ErrorState onRetry={() => jobQuery.refetch()} />;
  }

  // Two-way sync: no schedule to configure — just the static notice.
  if (isTwoWay) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-start gap-3 py-6 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>{TWO_WAY_SCHEDULE_MESSAGE}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4">
          <FrequencyPresetPicker value={frequency} onSelect={applyFrequency} />
          {showEditor && <ScheduleModeCards value={mode} onChange={setMode} />}
        </CardContent>
      </Card>

      <Card className={showEditor ? undefined : 'hidden'}>
        <CardContent className="space-y-4">
          {mode === 'daily_time' && (
            <>
              <div>
                <h4 className="mb-1 text-sm font-semibold">Times of Day</h4>
                <p className="text-muted-foreground text-xs">
                  Job runs every day at each time listed below.
                </p>
              </div>
              <div className="space-y-2">
                {times.map((t, i) => (
                  <TimeInput
                    key={i}
                    value={t}
                    onChange={(v) => updateTime(i, v)}
                    onRemove={() => removeTime(i)}
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
                <Plus /> Add another time
              </Button>
            </>
          )}

          {mode === 'interval' && (
            <>
              <div>
                <h4 className="mb-1 text-sm font-semibold">Run Interval</h4>
                <p className="text-muted-foreground text-xs">
                  Job runs this long after each run completes — including manual
                  runs.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={minIntervalAmount}
                  max={interval.unit === 'hours' ? 720 : 43200}
                  value={interval.amount}
                  onChange={(e) =>
                    setInterval((prev) => ({
                      ...prev,
                      amount: Math.max(
                        minIntervalAmount,
                        parseInt(e.target.value) || minIntervalAmount,
                      ),
                    }))
                  }
                  className="w-24 font-mono"
                />
                <Select
                  value={interval.unit}
                  onValueChange={(v) =>
                    setInterval((prev) => ({
                      ...prev,
                      unit: v as 'minutes' | 'hours',
                    }))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">minutes</SelectItem>
                    <SelectItem value="hours">hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-muted-foreground text-xs">
                = {getIntervalMinutes()} minute
                {getIntervalMinutes() !== 1 ? 's' : ''} between runs
              </p>
            </>
          )}

          {mode === 'day_specific' && (
            <>
              <div>
                <h4 className="mb-1 text-sm font-semibold">Days of Week</h4>
                <p className="text-muted-foreground text-xs">
                  Job runs only on the selected days, at each time listed.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((wd) => (
                  <Button
                    key={wd.value}
                    type="button"
                    variant={days.includes(wd.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDay(wd.value)}
                  >
                    {wd.label}
                  </Button>
                ))}
              </div>
              <div>
                <h4 className="mt-2 mb-2 text-sm font-semibold">Times</h4>
                <div className="space-y-2">
                  {times.map((t, i) => (
                    <TimeInput
                      key={i}
                      value={t}
                      onChange={(v) => updateTime(i, v)}
                      onRemove={() => removeTime(i)}
                      canRemove={times.length > 1}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="mt-2 h-auto p-0"
                  onClick={addTime}
                >
                  <Plus /> Add another time
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!embedded && (
        <Button
          onClick={handleSave}
          loading={updateJobMutation.isPending}
          className="w-full"
        >
          {!updateJobMutation.isPending && <Save />}
          {updateJobMutation.isPending ? 'Saving…' : 'Save Schedule'}
        </Button>
      )}
    </div>
  );
});
