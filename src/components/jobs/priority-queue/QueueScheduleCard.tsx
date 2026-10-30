import type { UpdateQueueSchedulePayload } from '@/api/priorityQueue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WEEKDAYS } from '@/features/jobs/utils';
import { BROWSER_TIMEZONE } from '@/lib/timezones';
import type { ProjectQueue, QueueScheduleMode } from '@/types';

export function queueScheduleDraft(
  queue: ProjectQueue | null,
): UpdateQueueSchedulePayload {
  return {
    scheduleMode: queue?.scheduleMode ?? 'daily_time',
    timezone: queue?.timezone ?? BROWSER_TIMEZONE,
    scheduleTimes: queue?.scheduleTimes ?? ['02:00'],
    intervalMinutes: queue?.intervalMinutes ?? 60,
    scheduleDays: queue?.scheduleDays ?? [1, 2, 3, 4, 5],
    oneTimeAt: queue?.oneTimeAt?.slice(0, 16) || undefined,
  };
}

export function queueScheduleValid(value: UpdateQueueSchedulePayload): boolean {
  if (value.scheduleMode === 'day_specific')
    return !!value.scheduleDays?.length && !!value.scheduleTimes?.[0];
  if (value.scheduleMode === 'one_time') return !!value.oneTimeAt;
  if (value.scheduleMode === 'interval')
    return (value.intervalMinutes ?? 0) > 0;
  return !!value.scheduleTimes?.[0];
}

export default function QueueScheduleCard({
  queue,
  value,
  onChange,
}: {
  queue: ProjectQueue | null;
  value: UpdateQueueSchedulePayload;
  onChange: (value: UpdateQueueSchedulePayload) => void;
}) {
  const mode = value.scheduleMode;
  const minutes = value.intervalMinutes ?? 60;
  const intervalUnit =
    minutes >= 60 && minutes % 60 === 0 ? 'hours' : 'minutes';
  const intervalAmount = intervalUnit === 'hours' ? minutes / 60 : minutes;
  const update = (change: Partial<UpdateQueueSchedulePayload>) =>
    onChange({ ...value, ...change });

  return (
    <div className="space-y-2.5">
      <div>
        <h3 className="text-sm font-semibold">Cycle start</h3>
        <p className="text-muted-foreground text-xs">
          When a new queue cycle begins
        </p>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-[minmax(10rem,13rem)_minmax(0,1fr)] sm:items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium">Schedule type</label>
          <Select
            value={mode}
            onValueChange={(next) =>
              update({ scheduleMode: next as QueueScheduleMode })
            }
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="interval">Repeat interval</SelectItem>
              <SelectItem value="daily_time">Once per day</SelectItem>
              <SelectItem value="day_specific">Selected weekdays</SelectItem>
              <SelectItem value="one_time">One-time date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {mode === 'interval' && (
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Every</label>
              <Input
                type="number"
                min={1}
                uiSize="sm"
                className="w-20"
                value={intervalAmount}
                onChange={(event) =>
                  update({
                    intervalMinutes:
                      Math.max(1, Number(event.target.value) || 1) *
                      (intervalUnit === 'hours' ? 60 : 1),
                  })
                }
              />
            </div>
            <Select
              value={intervalUnit}
              onValueChange={(unit) =>
                update({
                  intervalMinutes: intervalAmount * (unit === 'hours' ? 60 : 1),
                })
              }
            >
              <SelectTrigger size="sm" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">minutes</SelectItem>
                <SelectItem value="hours">hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {(mode === 'daily_time' || mode === 'day_specific') && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Time of day</label>
            <Input
              type="time"
              uiSize="sm"
              className="w-36"
              value={value.scheduleTimes?.[0] ?? '02:00'}
              onChange={(event) =>
                update({ scheduleTimes: [event.target.value] })
              }
            />
          </div>
        )}
        {mode === 'one_time' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Date and time</label>
            <Input
              type="datetime-local"
              uiSize="sm"
              className="w-56 max-w-full"
              value={value.oneTimeAt ?? ''}
              onChange={(event) =>
                update({ oneTimeAt: event.target.value || undefined })
              }
            />
          </div>
        )}
      </div>
      {mode === 'day_specific' && (
        <div className="flex flex-wrap gap-1">
          {WEEKDAYS.map((day) => (
            <Button
              key={day.value}
              type="button"
              size="sm"
              variant={
                value.scheduleDays?.includes(day.value) ? 'default' : 'outline'
              }
              onClick={() =>
                update({
                  scheduleDays: value.scheduleDays?.includes(day.value)
                    ? value.scheduleDays.filter((item) => item !== day.value)
                    : [...(value.scheduleDays ?? []), day.value].sort(
                        (a, b) => a - b,
                      ),
                })
              }
            >
              {day.label}
            </Button>
          ))}
        </div>
      )}
      {queue?.nextStartAt && (
        <p className="text-muted-foreground text-xs">
          Next cycle: {new Date(queue.nextStartAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
