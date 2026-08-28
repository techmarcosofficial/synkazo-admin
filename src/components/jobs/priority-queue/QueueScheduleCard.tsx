import { useState } from 'react';

import type { UpdateQueueSchedulePayload } from '@/api/priorityQueue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { WEEKDAYS } from '@/features/jobs/utils';
import { BROWSER_TIMEZONE, TIMEZONES } from '@/lib/timezones';
import type { ProjectQueue, QueueScheduleMode } from '@/types';

interface IntervalConfig {
  amount: number;
  unit: 'minutes' | 'hours';
}

function scheduleTimeToMinutesUnit(
  intervalMinutes: number | null | undefined,
): IntervalConfig {
  const m = intervalMinutes ?? 60;
  return m >= 60 && m % 60 === 0
    ? { amount: m / 60, unit: 'hours' }
    : { amount: m, unit: 'minutes' };
}

export default function QueueScheduleCard({
  queue,
  onSave,
  saving,
}: {
  queue: ProjectQueue | null;
  onSave: (payload: UpdateQueueSchedulePayload) => void;
  saving: boolean;
}) {
  const [scheduleMode, setScheduleMode] = useState<QueueScheduleMode>(
    queue?.scheduleMode ?? 'daily_time',
  );
  const [time, setTime] = useState(queue?.scheduleTimes?.[0] ?? '02:00');
  const [interval, setInterval] = useState<IntervalConfig>(
    scheduleTimeToMinutesUnit(queue?.intervalMinutes),
  );
  const [days, setDays] = useState<number[]>(
    queue?.scheduleDays ?? [1, 2, 3, 4, 5],
  );
  const [oneTimeAt, setOneTimeAt] = useState(
    queue?.oneTimeAt ? queue.oneTimeAt.slice(0, 16) : '',
  );
  const [timezone, setTimezone] = useState(queue?.timezone ?? BROWSER_TIMEZONE);

  const toggleDay = (d: number) =>
    setDays((prev) =>
      prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d].sort((a, b) => a - b),
    );

  const getIntervalMinutes = () =>
    interval.unit === 'hours' ? interval.amount * 60 : interval.amount;

  const handleSave = () => {
    const payload: UpdateQueueSchedulePayload = { scheduleMode, timezone };
    if (scheduleMode === 'interval') {
      payload.intervalMinutes = getIntervalMinutes();
    } else if (scheduleMode === 'daily_time') {
      payload.scheduleTimes = [time];
    } else if (scheduleMode === 'day_specific') {
      payload.scheduleTimes = [time];
      payload.scheduleDays = days;
    } else if (scheduleMode === 'one_time') {
      payload.oneTimeAt = oneTimeAt;
    }
    onSave(payload);
  };

  const canSave =
    (scheduleMode !== 'day_specific' || days.length > 0) &&
    (scheduleMode !== 'one_time' || !!oneTimeAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Queue Schedule</CardTitle>
        <p className="text-muted-foreground text-xs">
          When the queue starts a new cycle. Once started, it runs continuously
          through the jobs below until every job's pending work is done.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Schedule Type</label>
            <Select
              value={scheduleMode}
              onValueChange={(v) => setScheduleMode(v as QueueScheduleMode)}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interval">Every N Hours</SelectItem>
                <SelectItem value="daily_time">Once Per Day</SelectItem>
                <SelectItem value="day_specific">Selected Weekdays</SelectItem>
                <SelectItem value="one_time">One-Time Date and Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Time Zone</label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {scheduleMode === 'interval' && (
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              value={interval.amount}
              onChange={(e) =>
                setInterval((prev) => ({
                  ...prev,
                  amount: Math.max(1, parseInt(e.target.value) || 1),
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
            <span className="text-muted-foreground text-xs">
              between cycles (measured from when the previous cycle finished)
            </span>
          </div>
        )}

        {scheduleMode === 'daily_time' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Time of Day</label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-32 font-mono"
            />
          </div>
        )}

        {scheduleMode === 'day_specific' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Days of Week</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
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
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Time of Day</label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-32 font-mono"
              />
            </div>
          </div>
        )}

        {scheduleMode === 'one_time' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Date and Time</label>
            <Input
              type="datetime-local"
              value={oneTimeAt}
              onChange={(e) => setOneTimeAt(e.target.value)}
              className="w-56"
            />
            {queue?.oneTimeCompletedAt && (
              <p className="text-muted-foreground text-xs">
                Last fired {new Date(queue.oneTimeCompletedAt).toLocaleString()}{' '}
                — saving a new date re-arms it.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleSave} disabled={saving || !canSave}>
            {saving ? <Spinner /> : null}
            Save Schedule
          </Button>
          {queue?.nextStartAt && (
            <p className="text-muted-foreground text-xs">
              Next cycle starts {new Date(queue.nextStartAt).toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
