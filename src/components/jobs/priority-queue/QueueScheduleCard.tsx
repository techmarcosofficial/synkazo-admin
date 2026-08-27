import { useState } from 'react';

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
import type { ProjectQueue } from '@/types';

// Intl.supportedValuesOf is widely supported at runtime but not yet in this
// project's configured TS lib target — accessed via a loosely-typed alias
// rather than bumping the lib target for one call site.
const intlWithTimezones = Intl as unknown as {
  supportedValuesOf?: (key: string) => string[];
};

const TIMEZONES: string[] =
  typeof intlWithTimezones.supportedValuesOf === 'function'
    ? intlWithTimezones.supportedValuesOf('timeZone')
    : ['UTC'];

export default function QueueScheduleCard({
  queue,
  onSave,
  saving,
}: {
  queue: ProjectQueue | null;
  onSave: (startTime: string, timezone: string) => void;
  saving: boolean;
}) {
  const [startTime, setStartTime] = useState(
    queue?.startCronExpression
      ? cronToTime(queue.startCronExpression)
      : '02:00',
  );
  const [timezone, setTimezone] = useState(
    queue?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Queue Schedule</CardTitle>
        <p className="text-muted-foreground text-xs">
          When the queue starts a new cycle. Once started, it runs continuously
          through the jobs below.
        </p>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Start Queue</label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-32"
          />
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
        <Button
          size="sm"
          onClick={() => onSave(startTime, timezone)}
          disabled={saving}
        >
          {saving ? <Spinner /> : null}
          Save Schedule
        </Button>
        {queue?.nextStartAt && (
          <p className="text-muted-foreground w-full text-xs">
            Next cycle starts {new Date(queue.nextStartAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function cronToTime(cron: string): string {
  const [mm, hh] = cron.split(' ');
  const h = (hh ?? '2').padStart(2, '0');
  const m = (mm ?? '0').padStart(2, '0');
  return `${h}:${m}`;
}
