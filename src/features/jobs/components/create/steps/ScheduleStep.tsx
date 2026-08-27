import { InfoIcon } from 'lucide-react';
import { useState, type Dispatch, type SetStateAction } from 'react';

import { ChoiceCardItem } from '@/components/form/ChoiceCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import {
  FrequencyPresetPicker,
  ScheduleModeCards,
} from '@/features/jobs/components/schedule/SchedulePlanControls';
import TimeInput from '@/features/jobs/components/TimeInput';
import type { SchedInterval } from '@/features/jobs/types';
import {
  FREQUENCY_PRESET_ORDER,
  TWO_WAY_SCHEDULE_MESSAGE,
  WEEKDAYS,
  matchFrequency,
  type FrequencyPreset,
} from '@/features/jobs/utils';
import { useEntitlements } from '@/queries/useEntitlements';

export default function ScheduleStep({
  schedMode,
  setSchedMode,
  schedTimes,
  setSchedTimes,
  schedDays,
  setSchedDays,
  schedInterval,
  setSchedInterval,
  startEnabled,
  setStartEnabled,
  summaryItems,
  syncDirection = 'one_way',
}: {
  schedMode: string;
  setSchedMode: Dispatch<SetStateAction<string>>;
  schedTimes: string[];
  setSchedTimes: Dispatch<SetStateAction<string[]>>;
  schedDays: number[];
  setSchedDays: Dispatch<SetStateAction<number[]>>;
  schedInterval: SchedInterval;
  setSchedInterval: Dispatch<SetStateAction<SchedInterval>>;
  startEnabled: boolean;
  setStartEnabled: Dispatch<SetStateAction<boolean>>;
  summaryItems: [string, string][];
  syncDirection?: string;
}) {
  const getIntervalMinutes = () =>
    schedInterval.unit === 'hours'
      ? schedInterval.amount * 60
      : schedInterval.amount;
  const isTwoWay = syncDirection === 'two_way';

  // Plan gating: `sync_frequency` decides whether the user picks a fixed cadence or gets the
  // hand-built editor; `scheduling_modes` and `min_interval_minutes` constrain that editor.
  const entitlements = useEntitlements();
  const canCustomise = entitlements.frequency('custom');
  const hasPresets = FREQUENCY_PRESET_ORDER.some((k) =>
    entitlements.frequency(k),
  );
  const [freqChoice, setFreqChoice] = useState<string | null>(null);
  const frequency =
    freqChoice ?? matchFrequency(schedMode, getIntervalMinutes(), schedTimes);
  const showEditor = canCustomise && (!hasPresets || frequency === 'custom');
  const minIntervalMinutes = entitlements.minIntervalMinutes;
  const minIntervalAmount =
    schedInterval.unit === 'hours'
      ? Math.max(1, Math.ceil(minIntervalMinutes / 60))
      : minIntervalMinutes;

  const applyFrequency = (key: string, preset: FrequencyPreset | null) => {
    setFreqChoice(key);
    if (!preset) return; // "custom" — keep the current schedule, just unlock the editor
    setSchedMode(preset.mode);
    if (preset.intervalMinutes != null)
      setSchedInterval({ amount: preset.intervalMinutes, unit: 'minutes' });
    if (preset.times) setSchedTimes(preset.times);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[7fr_3fr] lg:items-start">
      <div className="space-y-6">
        {/* Two-way sync is not user-schedulable — it runs on a fixed system
            interval. Show a read-only notice in place of the schedule
            controls, but keep Start As + Summary. */}
        {isTwoWay ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Schedule</h3>
            <div className="text-muted-foreground flex items-start gap-3 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              <p>{TWO_WAY_SCHEDULE_MESSAGE}</p>
            </div>
          </div>
        ) : (
          <>
            <FrequencyPresetPicker
              value={frequency}
              onSelect={applyFrequency}
            />

            {showEditor && (
              <ScheduleModeCards value={schedMode} onChange={setSchedMode} />
            )}

            <div className={showEditor ? 'space-y-3' : 'hidden'}>
              <h3 className="text-sm font-medium">
                {schedMode === 'daily_time' && 'Times of Day'}
                {schedMode === 'interval' && 'Run Interval'}
                {schedMode === 'day_specific' && 'Days & Times'}
              </h3>
              {schedMode === 'daily_time' && (
                <>
                  <p className="text-muted-foreground text-xs">
                    Job runs every day at each time listed below.
                  </p>
                  <div className="space-y-2">
                    {schedTimes.map((t, i) => (
                      <TimeInput
                        key={i}
                        value={t}
                        onChange={(v) =>
                          setSchedTimes((p) =>
                            p.map((x, idx) => (idx === i ? v : x)),
                          )
                        }
                        onRemove={() =>
                          setSchedTimes((p) => p.filter((_, idx) => idx !== i))
                        }
                        canRemove={schedTimes.length > 1}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => setSchedTimes((p) => [...p, '09:00'])}
                  >
                    + Add another time
                  </Button>
                </>
              )}
              {schedMode === 'interval' && (
                <>
                  <p className="text-muted-foreground text-xs">
                    Job runs this long after each run completes — including
                    manual runs.
                  </p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={minIntervalAmount}
                      max={schedInterval.unit === 'hours' ? 720 : 43200}
                      value={schedInterval.amount}
                      onChange={(e) =>
                        setSchedInterval((p) => ({
                          ...p,
                          amount: Math.max(
                            minIntervalAmount,
                            parseInt(e.target.value) || minIntervalAmount,
                          ),
                        }))
                      }
                      className="w-24 font-mono"
                    />
                    <Select
                      value={schedInterval.unit}
                      onValueChange={(v) =>
                        setSchedInterval((p) => ({ ...p, unit: v }))
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
                    {minIntervalMinutes > 1 &&
                      ` — your plan's minimum is ${minIntervalMinutes} minutes`}
                  </p>
                </>
              )}
              {schedMode === 'day_specific' && (
                <>
                  <div>
                    <h4 className="mb-2 text-sm font-medium">Days of Week</h4>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((wd) => (
                        <Button
                          key={wd.value}
                          type="button"
                          variant={
                            schedDays.includes(wd.value) ? 'default' : 'outline'
                          }
                          size="sm"
                          onClick={() =>
                            setSchedDays((p) =>
                              p.includes(wd.value)
                                ? p.filter((x) => x !== wd.value)
                                : [...p, wd.value].sort((a, b) => a - b),
                            )
                          }
                        >
                          {wd.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-medium">Times</h4>
                    <div className="space-y-2">
                      {schedTimes.map((t, i) => (
                        <TimeInput
                          key={i}
                          value={t}
                          onChange={(v) =>
                            setSchedTimes((p) =>
                              p.map((x, idx) => (idx === i ? v : x)),
                            )
                          }
                          onRemove={() =>
                            setSchedTimes((p) =>
                              p.filter((_, idx) => idx !== i),
                            )
                          }
                          canRemove={schedTimes.length > 1}
                        />
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="mt-2 h-auto p-0"
                      onClick={() => setSchedTimes((p) => [...p, '09:00'])}
                    >
                      + Add another time
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        <div className="space-y-3 border-t pt-6">
          <h3 className="text-sm font-medium">Start As</h3>
          <RadioGroup
            value={String(startEnabled)}
            onValueChange={(v) => setStartEnabled(v === 'true')}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <ChoiceCardItem
              value="true"
              id="start-as-true"
              title="Active"
              description="Start syncing immediately"
            />
            <ChoiceCardItem
              value="false"
              id="start-as-false"
              title="Paused"
              description="Activate manually later"
            />
          </RadioGroup>
        </div>
      </div>

      <div className="bg-muted/40 space-y-3 rounded-xl p-4 lg:sticky lg:top-0">
        <h3 className="text-sm font-medium">Summary</h3>
        <Table>
          <TableBody>
            {summaryItems.map(([label, value]) => (
              <TableRow key={label} className="hover:bg-transparent">
                <TableCell className="text-muted-foreground px-0">
                  {label}
                </TableCell>
                <TableCell className="px-0 text-right font-mono text-xs">
                  {value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
