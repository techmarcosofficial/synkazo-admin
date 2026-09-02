import { Check, Clock, Info, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useJobDetailContext } from '../context';

import { jobsApi } from '@/api/jobs';
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
  matchFrequency,
  type FrequencyPreset,
} from '@/features/jobs/utils';
import { showToast } from '@/lib/toast';
import { useEntitlements } from '@/queries/useEntitlements';

interface IntervalConfig {
  amount: number;
  unit: 'minutes' | 'hours';
}

export default function ScheduleTab() {
  const {
    projectId,
    job,
    refetch,
    scheduleToggling,
    handleScheduleToggle,
    pipelineRequired,
    pipelineConfigured,
    handleTabChange,
  } = useJobDetailContext();

  const initMode = () => job.scheduleMode || 'daily_time';
  const initTimes = () =>
    job.scheduleTimes?.length ? job.scheduleTimes : ['09:00'];
  const initDays = () =>
    job.scheduleDays?.length ? job.scheduleDays : [1, 2, 3, 4, 5];
  const initInterval = (): IntervalConfig => {
    const m = job.intervalMinutes;
    if (!m) return { amount: 15, unit: 'minutes' };
    if (m >= 60 && m % 60 === 0) return { amount: m / 60, unit: 'hours' };
    return { amount: m, unit: 'minutes' };
  };

  const [mode, setMode] = useState(initMode);
  const [times, setTimes] = useState<string[]>(initTimes);
  const [days, setDays] = useState<number[]>(initDays);
  const [interval, setInterval] = useState<IntervalConfig>(initInterval);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
        cronExpression: null,
      });
      try {
        await jobsApi.pauseSchedule(projectId, job.id);
        await jobsApi.resumeSchedule(projectId, job.id);
      } catch {
        /* ignore — schedule is still saved */
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      showToast.success('Schedule saved!');
      refetch();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast.error(
        e.response?.data?.message ?? 'Something went wrong. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  // Two-way sync has no user-configurable interval. Its forward + reverse legs
  // run on a fixed system interval managed by a super admin when the schedule
  // is running, so there's nothing to configure here — show a read-only notice
  // instead of the schedule editor. Starting/pausing it is still done via the
  // Run/Pause/Resume Schedule button above, same as one-way jobs.
  const scheduleToggle = (
    <ScheduleEnableToggle
      projectId={projectId}
      jobId={job.id}
      job={job}
      scheduleToggling={scheduleToggling}
      pipelineRequired={pipelineRequired}
      pipelineConfigured={pipelineConfigured}
      onGoToPipeline={() => handleTabChange('pipeline')}
      onScheduleToggle={handleScheduleToggle}
    />
  );

  if (job.syncDirection === 'two_way') {
    return (
      <div className="space-y-4">
        {scheduleToggle}
        <Card>
          <CardContent className="text-muted-foreground flex items-start gap-3 py-6 text-sm">
            <Info className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="text-foreground font-medium">
                Two-way sync has no interval to configure
              </p>
              <p>
                {TWO_WAY_SCHEDULE_MESSAGE} Use Run/Resume Schedule above to
                start it and Pause Schedule to stop it.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {scheduleToggle}
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

      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Spinner /> : saved ? <Check /> : <Clock />}
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Schedule'}
      </Button>
    </div>
  );
}
