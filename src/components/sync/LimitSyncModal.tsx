import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Info,
  Play,
  RefreshCw,
  Sliders,
  Square,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { jobsApi } from '@/api/jobs';
import { syncLogsApi } from '@/api/syncLogs';
import UpgradeRequiredDialog from '@/components/shared/UpgradeRequiredDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { Job, SyncRun } from '@/types';

const MAX_POLL_COUNT = 180;
const STUCK_THRESHOLD = 30;

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number | null;
  tone?: string;
}) {
  return (
    <div className="bg-muted/40 flex min-w-[72px] flex-col items-center gap-0.5 rounded-lg border px-3 py-2">
      <span className={cn('text-base font-bold', tone ?? 'text-foreground')}>
        {value ?? 0}
      </span>
      <span className="text-muted-foreground text-center text-[10px] leading-tight">
        {label}
      </span>
    </div>
  );
}

interface LimitSyncModalProps {
  projectId: string;
  jobId: string;
  job?: Job;
  onDone?: () => void;
  onClose: () => void;
  pipelineRequired?: boolean;
  pipelineConfigured?: boolean;
  onGoToPipeline?: () => void;
  /** Render as plain tab content (no Dialog/overlay/close button) — used inside StartSyncModal. */
  embedded?: boolean;
}

// DialogTitle requires Radix Dialog context — swap for a plain equivalent when embedded.
function Title({
  embedded,
  className,
  children,
}: {
  embedded: boolean;
  className?: string;
  children: ReactNode;
}) {
  return embedded ? (
    <div
      className={cn(
        'font-heading text-base leading-none font-medium',
        className,
      )}
    >
      {children}
    </div>
  ) : (
    <DialogTitle className={className}>{children}</DialogTitle>
  );
}

// Wraps step content in a Dialog when standalone, or a plain scrollable div when
// embedded as a StartSyncModal tab (no overlay/close button/escape handling needed —
// the parent Dialog already owns those).
function Frame({
  embedded,
  onClose,
  children,
}: {
  embedded: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (embedded) {
    return <div className="flex max-h-[70vh] flex-col gap-4">{children}</div>;
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="sm"
        className="flex max-h-[90vh] flex-col"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

export default function LimitSyncModal({
  projectId,
  jobId,
  job,
  onDone,
  onClose,
  pipelineRequired = false,
  pipelineConfigured = true,
  onGoToPipeline,
  embedded = false,
}: LimitSyncModalProps) {
  const pipelineBlocked = pipelineRequired && !pipelineConfigured;
  const [step, setStep] = useState('config');

  const [limit, setLimit] = useState<number>(100);
  const [startPage, setStartPage] = useState<number>(1);
  const [batchSize, setBatchSize] = useState<number>(100);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [runLog, setRunLog] = useState<SyncRun | null>(null);
  const [stopping, setStopping] = useState(false);
  const [stuckWarning, setStuckWarning] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [upgradeDialog, setUpgradeDialog] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCount = useRef(0);
  const lastFetched = useRef(0);
  const stuckCount = useRef(0);
  const activeRunId = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    },
    [],
  );

  const safeLimit = Math.max(1, limit || 1);
  const safeBatch = Math.max(10, Math.min(500, batchSize || 100));
  const safeStart = Math.max(1, startPage || 1);
  const estBatches = Math.ceil(safeLimit / safeBatch);
  const estSrcPages = Math.ceil(safeLimit / 500);
  const srcPageEnd = safeStart + estSrcPages - 1;

  const pct = runLog
    ? runLog.status !== 'running'
      ? 100
      : Math.min(99, Math.round(((runLog.totalFetched ?? 0) / safeLimit) * 100))
    : 0;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!limit || limit < 1) e.limit = 'Must be at least 1';
    if (limit > 50000) e.limit = 'Max 50 000 records per limit sync';
    if (startPage < 1) e.startPage = 'Must be at least 1';
    if (batchSize < 10) e.batchSize = 'Min batch size is 10';
    if (batchSize > 500) e.batchSize = 'Max batch size is 500';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const pollRun = async (runLogId: string) => {
    pollCount.current += 1;

    if (pollCount.current > MAX_POLL_COUNT) {
      setTimedOut(true);
      setStep('done');
      return;
    }

    try {
      const updated = await syncLogsApi.getRunLog(projectId, jobId, runLogId);
      setRunLog(updated);

      const fetched = updated?.totalFetched ?? 0;
      if (fetched === lastFetched.current) {
        stuckCount.current += 1;
        if (stuckCount.current >= STUCK_THRESHOLD) setStuckWarning(true);
      } else {
        lastFetched.current = fetched;
        stuckCount.current = 0;
        setStuckWarning(false);
      }

      if (updated?.status === 'running') {
        pollRef.current = setTimeout(() => pollRun(runLogId), 2000);
      } else {
        setStep('done');
        onDone?.();
      }
    } catch {
      stuckCount.current += 1;
      if (stuckCount.current >= STUCK_THRESHOLD) setStuckWarning(true);
      if (pollCount.current <= MAX_POLL_COUNT) {
        pollRef.current = setTimeout(() => pollRun(runLogId), 3000);
      }
    }
  };

  const findAndPollLatestRun = async (triggerTime: number) => {
    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise((r) => setTimeout(r, attempt === 0 ? 600 : 800));
      try {
        const res = await syncLogsApi.listRunLogs(projectId, jobId, {
          limit: 1,
        });
        const latest = (res.data || [])[0];
        if (latest) {
          const runStarted = latest.startedAt
            ? new Date(latest.startedAt).getTime()
            : 0;
          if (runStarted >= triggerTime - 3000) {
            activeRunId.current = latest.id;
            setRunLog(latest);
            if (latest.status === 'running') {
              pollRef.current = setTimeout(() => pollRun(latest.id), 2000);
            } else {
              setStep('done');
              onDone?.();
            }
            return;
          }
        }
      } catch {
        /* retry */
      }
    }
    try {
      const res = await syncLogsApi.listRunLogs(projectId, jobId, { limit: 1 });
      const latest = (res.data || [])[0];
      if (latest) {
        activeRunId.current = latest.id;
        setRunLog(latest);
        setStep('done');
        onDone?.();
      }
    } catch {
      /* ignore */
    }
  };

  const handleStart = async () => {
    if (!validate()) return;
    setStep('running');
    pollCount.current = 0;
    stuckCount.current = 0;
    lastFetched.current = 0;
    setStuckWarning(false);
    setTimedOut(false);
    const triggerTime = Date.now();
    try {
      const resp = (await jobsApi.limitSync(projectId, jobId, {
        limit: safeLimit,
        startPage: safeStart,
        batchSize: safeBatch,
      })) as { alreadyRunning?: boolean } | undefined;
      if (resp?.alreadyRunning) {
        setStep('config');
        toast.error(
          'A sync is already in progress. Stop it first or wait for it to finish.',
        );
        return;
      }
      await findAndPollLatestRun(triggerTime);
    } catch (err) {
      const e = err as {
        response?: { data?: { message?: string; code?: string } };
      };
      setStep('config');
      if (e?.response?.data?.code === 'PLAN_LIMIT_RECORDS') {
        setUpgradeDialog({
          open: true,
          message:
            e.response!.data!.message ??
            "You've reached your plan's monthly record sync limit.",
        });
      } else {
        toast.error(e?.response?.data?.message ?? 'Failed to start limit sync');
      }
    }
  };

  const handleStop = async () => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    setStopping(true);
    try {
      await jobsApi.stopJob(projectId, jobId);
      toast.success(
        'Stop signal sent. Run will finish its current batch then stop.',
      );
      if (activeRunId.current) {
        const updated = await syncLogsApi.getRunLog(
          projectId,
          jobId,
          activeRunId.current,
        );
        setRunLog(updated);
      }
    } catch {
      toast.error('Could not send stop signal — check Run History.');
    }
    setStopping(false);
    setStep('done');
  };

  return (
    <>
      <Frame embedded={embedded} onClose={onClose}>
        {step === 'config' && (
          <>
            <DialogHeader>
              <Title embedded={embedded} className="flex items-center gap-3">
                <div className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
                  <Sliders className="text-primary size-4" />
                </div>
                <div>
                  <div>Custom Sync</div>
                  <p className="text-muted-foreground flex items-center gap-1 text-xs font-normal">
                    {job?.sourceObject} <ArrowRight className="size-3" />{' '}
                    {job?.destObject}
                  </p>
                </div>
              </Title>
            </DialogHeader>

            <div className="flex-1 space-y-5 overflow-y-auto">
              {pipelineBlocked && (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertDescription className="space-y-1.5">
                    <p className="font-semibold">Pipeline not configured</p>
                    <p>
                      This job syncs to <strong>{job?.destObject}</strong> which
                      requires a HubSpot pipeline. Configure one before running
                      the sync.
                    </p>
                    {onGoToPipeline && (
                      <Button size="sm" onClick={onGoToPipeline}>
                        <ArrowRight /> Go to Pipeline tab
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Alert className="bg-primary/5 border-primary/20">
                <Info className="text-primary" />
                <AlertDescription>
                  Process a controlled subset of records. Uses the same
                  mappings, deduplication, and sync rules as a regular sync.
                  Does not update the job's last synced timestamp.
                </AlertDescription>
              </Alert>

              <FieldGroup>
                <Field data-invalid={!!errors.limit}>
                  <FieldLabel htmlFor="limit-count">
                    Number of Records to Sync
                  </FieldLabel>
                  <Input
                    id="limit-count"
                    type="number"
                    min={1}
                    max={50000}
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 100"
                    aria-invalid={!!errors.limit}
                  />
                  {errors.limit && (
                    <p className="text-destructive text-xs">{errors.limit}</p>
                  )}
                  <p className="text-muted-foreground text-[10px]">
                    Max 50,000 per run
                  </p>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field data-invalid={!!errors.startPage}>
                    <FieldLabel htmlFor="start-page">Starting Page</FieldLabel>
                    <Input
                      id="start-page"
                      type="number"
                      min={1}
                      value={startPage}
                      onChange={(e) =>
                        setStartPage(parseInt(e.target.value) || 1)
                      }
                      placeholder="1"
                      aria-invalid={!!errors.startPage}
                    />
                    {errors.startPage && (
                      <p className="text-destructive text-xs">
                        {errors.startPage}
                      </p>
                    )}
                    <p className="text-muted-foreground text-[10px]">
                      Source API page to start from
                    </p>
                  </Field>
                  <Field data-invalid={!!errors.batchSize}>
                    <FieldLabel htmlFor="batch-size">
                      Records per Batch
                    </FieldLabel>
                    <Input
                      id="batch-size"
                      type="number"
                      min={10}
                      max={500}
                      value={batchSize}
                      onChange={(e) =>
                        setBatchSize(parseInt(e.target.value) || 100)
                      }
                      placeholder="100"
                      aria-invalid={!!errors.batchSize}
                    />
                    {errors.batchSize && (
                      <p className="text-destructive text-xs">
                        {errors.batchSize}
                      </p>
                    )}
                    <p className="text-muted-foreground text-[10px]">
                      Records per processing batch
                    </p>
                  </Field>
                </div>
              </FieldGroup>

              <Card className="py-0">
                <CardContent className="space-y-3 p-4">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    Preview
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        Records
                      </span>
                      <ChevronRight className="text-muted-foreground size-3" />
                      <span className="text-sm font-semibold">
                        up to {safeLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        Batches
                      </span>
                      <ChevronRight className="text-muted-foreground size-3" />
                      <span className="text-sm font-semibold">
                        {estBatches}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        Source pages
                      </span>
                      <ChevronRight className="text-muted-foreground size-3" />
                      <span className="text-sm font-semibold">
                        {safeStart === srcPageEnd
                          ? safeStart
                          : `${safeStart}–${srcPageEnd}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        Records per batch
                      </span>
                      <ChevronRight className="text-muted-foreground size-3" />
                      <span className="text-sm font-semibold">{safeBatch}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-[10px]">
                    Source page estimates assume ~500 records per page. Actual
                    counts depend on the API response.
                  </p>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleStart}
                disabled={pipelineBlocked}
                className="flex-1"
              >
                <Play /> Start Sync
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'running' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 pr-8">
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-xl">
                <RefreshCw className="text-primary size-4 animate-spin" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">Sync Running…</h3>
                <p className="text-muted-foreground text-xs">
                  Up to {safeLimit.toLocaleString()} records · starting page{' '}
                  {safeStart}
                </p>
              </div>
              <span className="text-primary shrink-0 text-sm font-bold tabular-nums">
                {pct}%
              </span>
            </div>

            <Progress value={pct} className="h-1.5" />

            {stuckWarning && !timedOut && (
              <Alert className="bg-warning/10 border-warning/25 py-2">
                <AlertTriangle className="text-warning size-3.5" />
                <AlertDescription className="text-warning text-xs">
                  No progress in the last 60 seconds — the run may be stuck. You
                  can stop it below.
                </AlertDescription>
              </Alert>
            )}

            {runLog ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Stat
                    label="Processed"
                    value={
                      (runLog.createdCount ?? 0) + (runLog.updatedCount ?? 0)
                    }
                    tone="text-primary"
                  />
                  <Stat
                    label="Created"
                    value={runLog.createdCount}
                    tone="text-success"
                  />
                  <Stat
                    label="Updated"
                    value={runLog.updatedCount}
                    tone="text-info"
                  />
                  <Stat label="Skipped" value={runLog.skippedCount} />
                  <Stat
                    label="Failed"
                    value={runLog.failedCount}
                    tone="text-destructive"
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Fetched{' '}
                  <strong className="text-foreground">
                    {(runLog.totalFetched ?? 0).toLocaleString()}
                  </strong>{' '}
                  of{' '}
                  <strong className="text-foreground">
                    {safeLimit.toLocaleString()}
                  </strong>{' '}
                  records from source
                </p>
              </div>
            ) : (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Spinner /> Starting — waiting for run to begin…
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleStop}
              disabled={stopping}
              className="border-destructive/30 text-destructive bg-destructive/5 w-full"
            >
              {stopping ? <Spinner /> : <Square className="fill-current" />}
              {stopping ? 'Stopping…' : 'Stop Sync'}
            </Button>
          </div>
        )}

        {step === 'done' && (
          <>
            <DialogHeader>
              <Title embedded={embedded} className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex size-9 items-center justify-center rounded-xl',
                    timedOut || (runLog?.failedCount ?? 0) > 0
                      ? 'bg-warning/10'
                      : 'bg-success/10',
                  )}
                >
                  {timedOut || (runLog?.failedCount ?? 0) > 0 ? (
                    <AlertTriangle className="text-warning size-4" />
                  ) : (
                    <CheckCircle2 className="text-success size-4" />
                  )}
                </div>
                <div>
                  <div className="capitalize">
                    {timedOut
                      ? 'Run timed out'
                      : `Custom Sync ${runLog?.status ?? 'done'}`}
                  </div>
                  <p className="text-muted-foreground text-xs font-normal">
                    {safeLimit.toLocaleString()} records · page {safeStart}
                  </p>
                </div>
              </Title>
            </DialogHeader>

            <div className="flex-1 space-y-4 overflow-y-auto">
              {timedOut && (
                <Alert className="bg-warning/10 border-warning/25">
                  <AlertTriangle className="text-warning" />
                  <AlertDescription className="text-warning">
                    Stopped polling after 6 minutes — the run may still be
                    running in the background. Check{' '}
                    <strong>Run History</strong> for the final status.
                  </AlertDescription>
                </Alert>
              )}
              {runLog && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Stat
                      label="Processed"
                      value={
                        (runLog.createdCount ?? 0) + (runLog.updatedCount ?? 0)
                      }
                      tone="text-primary"
                    />
                    <Stat
                      label="Created"
                      value={runLog.createdCount}
                      tone="text-success"
                    />
                    <Stat
                      label="Updated"
                      value={runLog.updatedCount}
                      tone="text-info"
                    />
                    <Stat label="Skipped" value={runLog.skippedCount} />
                    <Stat
                      label="Failed"
                      value={runLog.failedCount}
                      tone="text-destructive"
                    />
                    <Stat label="Fetched" value={runLog.totalFetched} />
                  </div>
                  {runLog.durationMs != null && (
                    <p className="text-muted-foreground text-xs">
                      Completed in {(runLog.durationMs / 1000).toFixed(1)}s
                      {runLog.errorMessage && (
                        <span className="text-destructive ml-2">
                          {runLog.errorMessage}
                        </span>
                      )}
                    </p>
                  )}
                </>
              )}
              {!runLog && !timedOut && (
                <p className="text-muted-foreground text-sm">
                  No run data available. Check Run History for details.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button onClick={onClose} className="w-full">
                Done <ArrowRight />
              </Button>
            </DialogFooter>
          </>
        )}
      </Frame>
      <UpgradeRequiredDialog
        open={upgradeDialog.open}
        onOpenChange={(open) => setUpgradeDialog({ ...upgradeDialog, open })}
        message={upgradeDialog.message}
      />
    </>
  );
}
