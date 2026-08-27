import { format } from 'date-fns';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Clock,
  GitBranch,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { jobsApi } from '@/api/jobs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { Job, SyncEstimate } from '@/types';

// Combines a calendar day with a separate "HH:mm" time input into one instant.
function combineDateTime(
  date: Date | undefined,
  time: string,
): Date | undefined {
  if (!date) return undefined;
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours || 0, minutes || 0, 0, 0);
  return combined;
}

function fmtDuration(sec: number | null | undefined): string {
  if (sec == null) return '—';
  if (sec < 60) return `~${Math.max(1, Math.round(sec))}s`;
  if (sec < 3600) return `~${Math.round(sec / 60)} min`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

function fmtDate(d?: string | Date | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return format(date, 'MMM d, yyyy · h:mm a');
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

interface SyncAllTabProps {
  projectId: string;
  jobId: string;
  job?: Job;
  onConfirm: (range: { startDate?: string; endDate?: string }) => void;
  pipelineRequired?: boolean;
  pipelineConfigured?: boolean;
  onGoToPipeline?: () => void;
}

export default function SyncAllTab({
  projectId,
  jobId,
  job,
  onConfirm,
  pipelineRequired = false,
  pipelineConfigured = true,
  onGoToPipeline,
}: SyncAllTabProps) {
  const pipelineBlocked = pipelineRequired && !pipelineConfigured;
  const isTwoWay = job?.syncDirection === 'two_way';

  // An interrupted ranged Sync All — resume it with the same bounds instead of
  // letting the user pick a new range (changing the range requires resetting the
  // checkpoint first, elsewhere in the app).
  const hasInterruptedRange =
    job?.syncAllPage != null &&
    (job?.syncAllRangeStart || job?.syncAllRangeEnd);

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('00:00');
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [endTime, setEndTime] = useState(() => format(new Date(), 'HH:mm'));
  const [endDateTouched, setEndDateTouched] = useState(false);
  const [estimate, setEstimate] = useState<SyncEstimate | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const startDateTime = combineDateTime(startDate, startTime);
  const endDateTime = combineDateTime(endDate, endTime);

  const handleStartDateChange = (d?: Date) => {
    setStartDate(d);
    setAttempted(false);
  };
  const handleStartTimeChange = (t: string) => {
    setStartTime(t);
    setAttempted(false);
  };
  const handleEndDateChange = (d?: Date) => {
    setEndDate(d);
    setEndDateTouched(true);
    setAttempted(false);
  };
  const handleEndTimeChange = (t: string) => {
    setEndTime(t);
    setEndDateTouched(true);
    setAttempted(false);
  };

  const handleCheck = async () => {
    setChecking(true);
    setCheckError(false);
    setAttempted(false);
    try {
      const res = await jobsApi.getEstimate(projectId, jobId, {
        full: true,
        startDate: startDateTime?.toISOString(),
        endDate: endDateTime?.toISOString(),
      });
      setEstimate(res);
    } catch {
      setCheckError(true);
    } finally {
      setChecking(false);
      setAttempted(true);
    }
  };

  if (isTwoWay) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTriangle />
          <AlertDescription>
            Date-bounded Sync All isn't available for two-way jobs yet — this
            will sync all historical records from scratch, same as before.
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => onConfirm({})}
          disabled={pipelineBlocked}
          className="bg-paused hover:bg-paused/90 w-full"
        >
          <RotateCcw /> Start Full Sync
        </Button>
      </div>
    );
  }

  const countAvailable = estimate?.countAvailable;

  return (
    <div className="space-y-5">
      {pipelineBlocked && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertDescription className="space-y-1.5">
            <p className="font-semibold">Pipeline not configured</p>
            <p>
              This job syncs to <strong>{job?.destObject}</strong> which
              requires a HubSpot pipeline. Configure one before running the
              sync.
            </p>
            {onGoToPipeline && (
              <Button size="sm" onClick={onGoToPipeline}>
                <GitBranch /> Go to Pipeline tab
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {hasInterruptedRange ? (
        <>
          <Alert className="bg-warning/10 border-warning/20">
            <RotateCcw className="text-warning" />
            <AlertDescription className="space-y-1">
              <p>
                A previous Sync All ran from{' '}
                <strong className="text-foreground">
                  {fmtDate(job.syncAllRangeStart)}
                </strong>{' '}
                to{' '}
                <strong className="text-foreground">
                  {fmtDate(job.syncAllRangeEnd)}
                </strong>{' '}
                and stopped
                {job.syncAllProgressDate && (
                  <>
                    {' '}
                    at{' '}
                    <strong className="text-foreground">
                      {fmtDate(job.syncAllProgressDate)}
                    </strong>
                  </>
                )}
                .
              </p>
              <p>Starting below resumes it instead of starting over.</p>
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => onConfirm({})}
            disabled={pipelineBlocked}
            className="bg-paused hover:bg-paused/90 w-full"
          >
            <RotateCcw /> Resume Full Sync
          </Button>
        </>
      ) : (
        <>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Start Date</FieldLabel>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start font-normal',
                          !startDate && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon />
                        {startDate
                          ? format(startDate, 'MMM d, yyyy')
                          : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={handleStartDateChange}
                        disabled={(d) =>
                          d > new Date() || (!!endDate && d > endDate)
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    className="w-28 shrink-0"
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    disabled={!startDate}
                  />
                </div>
                <p className="text-muted-foreground text-[10px]">
                  Where to start syncing from — leave unset to sync all
                  historical records up to the end date
                </p>
              </Field>

              <Field>
                <FieldLabel>End Date</FieldLabel>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start font-normal',
                          !endDateTouched && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon />
                        {endDate ? format(endDate, 'MMM d, yyyy') : 'Today'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={handleEndDateChange}
                        disabled={(d) =>
                          d > new Date() || (!!startDate && d < startDate)
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    className="w-28 shrink-0"
                    value={endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    disabled={!endDate}
                  />
                </div>
                <p className="text-muted-foreground text-[10px]">
                  Defaults to right now — clear the date to sync up through the
                  current moment
                </p>
              </Field>
            </div>
          </FieldGroup>

          <Button
            variant="outline"
            onClick={handleCheck}
            disabled={(!startDate && !endDate) || checking}
            className="w-full"
          >
            {checking ? <Spinner /> : <Search />}
            {checking ? 'Checking…' : 'Check Records'}
          </Button>

          {attempted && (
            <>
              {checkError ? (
                <Alert className="bg-warning/10 border-warning/20">
                  <AlertTriangle className="text-warning" />
                  <AlertDescription>
                    Couldn't estimate the run size. You can still start the sync
                    — it will sync all records in range.
                  </AlertDescription>
                </Alert>
              ) : (
                <Card className="py-0">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      This run will sync
                    </p>
                    {countAvailable ? (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        <Row
                          label="Records"
                          value={(estimate!.totalRecords ?? 0).toLocaleString()}
                        />
                        <Row
                          label="Estimated Time"
                          value={fmtDuration(estimate!.estimatedSeconds)}
                        />
                      </div>
                    ) : (
                      <div className="text-muted-foreground flex items-start gap-2.5 text-sm">
                        <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
                        <span>
                          Exact count unavailable for this source — the run will
                          sync{' '}
                          <strong className="text-foreground">
                            all records in range
                          </strong>
                          .
                        </span>
                      </div>
                    )}
                    {countAvailable && estimate!.estimatedSeconds != null && (
                      <p className="text-muted-foreground flex items-center gap-1 text-[10px]">
                        <Clock className="size-2.5" />
                        Time estimated from{' '}
                        {estimate!.basis === 'history'
                          ? "this job's recent run speed"
                          : 'a default rate'}{' '}
                        ({estimate!.ratePerSec} rec/s).
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={() =>
                  onConfirm({
                    startDate: startDateTime?.toISOString(),
                    endDate: endDateTime?.toISOString(),
                  })
                }
                disabled={pipelineBlocked}
                className="bg-paused hover:bg-paused/90 w-full"
              >
                <RotateCcw /> Start Sync
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
