import { CalendarClock, Pause, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { hasScheduleDefinition } from '@/features/jobs/lib/jobScheduleSettings';
import {
  canPauseIndividualSchedule,
  canResumeIndividualSchedule,
  isIndividualScheduleActive,
} from './individualScheduleActions';

export interface IndividualScheduleRowJob {
  id: string;
  name: string;
  sourceObject: string;
  destObject: string;
  syncDirection?: string;
  syncEnabled?: boolean;
  isEnabled?: boolean;
  isRunning?: boolean;
  scheduleState?: string;
  scheduleMode?: string | null;
  scheduleTimes?: string[] | null;
  scheduleDays?: number[] | null;
  intervalMinutes?: number | null;
  cronExpression?: string | null;
  timezone?: string | null;
  nextRunAt?: string | null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function cadence(job: IndividualScheduleRowJob): string {
  if (job.syncDirection === 'two_way') return 'Automatic two-way sync';
  if (!hasScheduleDefinition(job)) return 'No schedule configured';
  if (job.scheduleMode === 'interval') {
    const minutes = job.intervalMinutes ?? 0;
    return minutes % 60 === 0
      ? `Every ${minutes / 60} ${minutes === 60 ? 'hour' : 'hours'}`
      : `Every ${minutes} minutes`;
  }
  if (job.scheduleMode === 'daily_time')
    return `Daily at ${job.scheduleTimes?.join(', ')}`;
  if (job.scheduleMode === 'day_specific')
    return `${job.scheduleDays?.map((day) => DAYS[day]).join(', ')} at ${job.scheduleTimes?.join(', ')}`;
  if (job.scheduleMode === 'one_time') return 'One-time schedule';
  return 'Custom schedule';
}

function state(job: IndividualScheduleRowJob): string {
  if (job.syncDirection === 'two_way') return 'Automatic';
  if (!job.isEnabled) return 'Job disabled';
  if (!hasScheduleDefinition(job)) return 'Needs schedule';
  if (job.scheduleState === 'paused_limit_reached') return 'Plan limit';
  if (job.scheduleState === 'paused') return 'Paused';
  if (!job.syncEnabled) return 'Off';
  if (job.isRunning) return 'Running';
  return 'Scheduled';
}

export default function IndividualScheduleRow({
  job,
  href,
  busy = false,
  pendingSchedule = false,
  onConfigure,
  onToggle,
}: {
  job: IndividualScheduleRowJob;
  href: string;
  busy?: boolean;
  pendingSchedule?: boolean;
  onConfigure: () => void;
  onToggle?: () => void;
}) {
  const canToggle =
    canPauseIndividualSchedule(job) || canResumeIndividualSchedule(job);
  const active = isIndividualScheduleActive(job);
  return (
    <div className="grid min-w-0 gap-3 border-b px-4 py-3 text-sm last:border-b-0 md:grid-cols-[minmax(0,1.5fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <Link className="font-medium hover:underline" to={href}>
          {job.name}
        </Link>
        <p className="text-muted-foreground truncate text-xs">
          {job.sourceObject} → {job.destObject}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-[11px] md:hidden">Schedule</p>
        <p className="truncate text-xs font-medium">{cadence(job)}</p>
        {pendingSchedule && (
          <p className="text-primary text-[11px]">Pending save</p>
        )}
        {job.timezone && job.syncDirection !== 'two_way' && (
          <p className="text-muted-foreground truncate text-[11px]">
            {job.timezone}
          </p>
        )}
      </div>
      <div>
        <p className="text-xs font-medium">{state(job)}</p>
        <p className="text-muted-foreground text-[11px]">
          {job.syncDirection === 'two_way'
            ? 'Runs automatically'
            : job.isRunning
              ? 'Running now'
              : active && job.nextRunAt
                ? `Next ${new Date(job.nextRunAt).toLocaleString()}`
                : job.scheduleState === 'paused'
                  ? 'Resume to continue'
                  : 'No upcoming run'}
        </p>
      </div>
      <div className="flex items-center gap-2 md:justify-end">
        <Button size="sm" variant="outline" onClick={onConfigure}>
          <CalendarClock /> Configure
        </Button>
        {canToggle && onToggle && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || job.isRunning}
            onClick={onToggle}
          >
            {busy ? <Spinner /> : active ? <Pause /> : <Play />}
            {active ? 'Pause' : 'Resume'}
          </Button>
        )}
      </div>
    </div>
  );
}
