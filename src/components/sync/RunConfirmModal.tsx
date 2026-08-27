import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Clock,
  Database,
  GitBranch,
  Play,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { jobsApi } from '@/api/jobs';
import { ChoiceCardItem } from '@/components/form/ChoiceCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import type { InitialSyncPeriod } from '@/features/jobs/hooks';
import type { Job, SyncEstimate } from '@/types';

const INITIAL_SYNC_PERIOD_OPTIONS: Array<{
  value: InitialSyncPeriod;
  label: string;
}> = [
  { value: 'now', label: 'From now' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom date/time' },
];

function fmtDuration(sec: number | null | undefined): string {
  if (sec == null) return '—';
  if (sec < 60) return `~${Math.max(1, Math.round(sec))}s`;
  if (sec < 3600) return `~${Math.round(sec / 60)} min`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

export default function RunConfirmModal({
  projectId,
  jobId,
  job,
  mode = 'run',
  onConfirm,
  onClose,
  pipelineRequired = false,
  pipelineConfigured = true,
  onGoToPipeline,
  embedded = false,
}: {
  projectId: string;
  jobId: string;
  job?: Job;
  mode?: 'runNow' | 'resume' | 'run';
  onConfirm: (payload?: {
    initialSyncPeriod?: InitialSyncPeriod;
    customSince?: string;
    resumeMode?: 'sync_missed' | 'start_now';
  }) => void;
  onClose: () => void;
  pipelineRequired?: boolean;
  pipelineConfigured?: boolean;
  onGoToPipeline?: () => void;
  /** Render as plain tab content (no Dialog/overlay/close button) — used inside StartSyncModal. */
  embedded?: boolean;
}) {
  const pipelineBlocked = pipelineRequired && !pipelineConfigured;
  const isLimitPaused = job?.scheduleState === 'paused_limit_reached';

  const [estimate, setEstimate] = useState<SyncEstimate | null>(null);
  const [estimateLoading, setEL] = useState(true);
  const [estimateError, setEError] = useState(false);
  const [initialSyncPeriod, setInitialSyncPeriod] =
    useState<InitialSyncPeriod>('now');
  const [customSince, setCustomSince] = useState('');
  const [resumeMode, setResumeMode] = useState<'sync_missed' | 'start_now'>(
    'sync_missed',
  );

  useEffect(() => {
    // resume mode never shows the estimate card (resumeBodyNode) — skip the call.
    if (!projectId || !jobId || mode === 'resume') {
      setEL(false);
      return;
    }
    let active = true;
    jobsApi
      .getEstimate(projectId, jobId, { full: false })
      .then((res) => {
        if (active) setEstimate(res);
      })
      .catch(() => {
        if (active) setEError(true);
      })
      .finally(() => {
        if (active) setEL(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, jobId, mode]);

  const hasCheckpoint = job?.checkpointPage != null;
  const lastSyncedAt = job?.lastSyncedAt ? new Date(job.lastSyncedAt) : null;
  const lastSynced = lastSyncedAt
    ? formatDistanceToNow(lastSyncedAt, { addSuffix: true })
    : 'Never synced';
  const lastSyncedFull = lastSyncedAt
    ? format(lastSyncedAt, 'MMM d, yyyy · h:mm a')
    : null;

  const title =
    mode === 'runNow'
      ? 'Run Sync Now'
      : mode === 'resume'
        ? 'Resume Schedule'
        : 'Enable Scheduled Sync';
  const cta =
    mode === 'runNow' ? 'Run Now' : mode === 'resume' ? 'Resume' : 'Enable';

  const isFirstSync = !lastSyncedAt;
  const countAvailable = estimate?.countAvailable;

  const headerNode = (
    <div className="flex items-center gap-3">
      <div className="bg-success/10 flex size-8 items-center justify-center rounded-lg">
        <Play className="text-success size-4" />
      </div>
      <div>
        <div className="font-heading text-base font-medium">{title}</div>
        <p className="text-muted-foreground flex items-center gap-1 text-xs font-normal">
          {job?.sourceObject} <ArrowRight className="size-3" />{' '}
          {job?.destObject}
        </p>
      </div>
    </div>
  );

  const pipelineAlert = pipelineBlocked && (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertDescription className="space-y-1.5">
        <p className="font-semibold">Pipeline not configured</p>
        <p>
          This job syncs to <strong>{job?.destObject}</strong> which requires a
          HubSpot pipeline. Configure one before running the sync.
        </p>
        {onGoToPipeline && (
          <Button size="sm" onClick={onGoToPipeline}>
            <GitBranch /> Go to Pipeline tab
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );

  const resumeBodyNode = (
    <div className="space-y-4">
      {pipelineAlert}
      <p className="text-sm">
        Your schedule was last successfully synced on{' '}
        <strong className="text-foreground">
          {lastSyncedFull ?? 'an unknown date'}
        </strong>
        . Since then, records may have been created or updated. Do you want to
        sync these missed changes?
      </p>

      {isLimitPaused ? (
        <Alert className="bg-warning/10 border-warning/20">
          <AlertTriangle className="text-warning" />
          <AlertDescription>
            This schedule was paused because your plan's record limit was
            reached. Resuming will automatically catch up on everything missed
            since the last successful sync — skipping the backlog isn't
            available after a plan-limit pause.
          </AlertDescription>
        </Alert>
      ) : (
        <RadioGroup
          value={resumeMode}
          onValueChange={(v) => setResumeMode(v as 'sync_missed' | 'start_now')}
          className="gap-3"
        >
          <ChoiceCardItem
            value="sync_missed"
            id="resume-sync-missed"
            title="Yes, sync missed changes"
            description={`Next run covers ${lastSyncedFull ?? 'the last sync'} through now.`}
          />
          <ChoiceCardItem
            value="start_now"
            id="resume-start-now"
            title="No, start from now"
            description="Skip the backlog — the schedule's clock restarts at right now."
          />
        </RadioGroup>
      )}

      {hasCheckpoint && (
        <Alert className="bg-warning/10 border-warning/20">
          <Bookmark className="text-warning" />
          <AlertDescription>
            This job was stopped at batch {(job!.checkpointPage ?? 0) + 1}.
            Resuming will <strong>continue from that checkpoint</strong> rather
            than start over.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const bodyNode = (
    <div className="space-y-4">
      {pipelineAlert}

      <div className="overflow-hidden rounded-xl border">
        <div className="bg-muted/40 flex items-center gap-3 border-b px-4 py-3">
          <Clock className="text-muted-foreground size-3.5 shrink-0" />
          <span className="text-muted-foreground text-xs">Last synced</span>
          <div className="ml-auto text-right">
            <p className="text-sm font-semibold">{lastSynced}</p>
            {lastSyncedFull && (
              <p className="text-muted-foreground text-[10px]">
                {lastSyncedFull}
              </p>
            )}
          </div>
        </div>

        <div className="bg-muted/40 space-y-2 px-4 py-3">
          {!isFirstSync && lastSyncedFull && (
            <p className="text-muted-foreground text-[10px]">
              This will only sync records created or updated since the last sync
              date. Looking for changes after:{' '}
              <strong className="text-foreground">{lastSyncedFull}</strong>
            </p>
          )}
          {estimateLoading ? (
            <div className="text-muted-foreground flex items-center gap-2.5">
              <Spinner className="size-3.5" />
              <span className="text-xs">Estimating records to sync…</span>
            </div>
          ) : estimateError ? (
            <div className="text-muted-foreground flex items-center gap-2.5 text-xs">
              <Database className="size-3.5 shrink-0" />
              <span>
                Could not estimate record count — sync will proceed normally.
              </span>
            </div>
          ) : isFirstSync ? (
            <div className="flex items-start gap-2.5 text-xs">
              <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
              <span>
                No baseline yet — this will return{' '}
                <strong className="text-foreground">0 records</strong>. Run{' '}
                <strong className="text-foreground">Sync All Records</strong>{' '}
                first to establish one.
              </span>
            </div>
          ) : countAvailable ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <Row
                  label="Records to sync"
                  value={(estimate.totalRecords ?? 0).toLocaleString()}
                />
                <Row
                  label="Est. time"
                  value={fmtDuration(estimate.estimatedSeconds)}
                />
              </div>
              <p className="text-muted-foreground text-[10px]">
                Changed since last sync · {estimate.ratePerSec} rec/s
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 text-xs">
              <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
              <span>
                Exact count unavailable — will sync all records changed since
                last sync.
                {estimate?.estimatedSeconds != null && (
                  <>
                    {' '}
                    Est.{' '}
                    <strong className="text-foreground">
                      {fmtDuration(estimate.estimatedSeconds)}
                    </strong>
                    .
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {hasCheckpoint && (
        <Alert className="bg-warning/10 border-warning/20">
          <Bookmark className="text-warning" />
          <AlertDescription>
            This job was stopped at batch {(job.checkpointPage ?? 0) + 1}.
            Running now will <strong>resume from that checkpoint</strong> rather
            than start over. Use <strong>Sync All Records</strong> to restart
            from scratch.
          </AlertDescription>
        </Alert>
      )}

      {mode === 'run' && isFirstSync && (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="initial-sync-period">
              Initial Sync Period
            </FieldLabel>
            <Select
              value={initialSyncPeriod}
              onValueChange={(v) =>
                setInitialSyncPeriod(v as InitialSyncPeriod)
              }
            >
              <SelectTrigger id="initial-sync-period" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INITIAL_SYNC_PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {initialSyncPeriod === 'custom' && (
              <Input
                type="datetime-local"
                className="mt-2"
                value={customSince}
                onChange={(e) => setCustomSince(e.target.value)}
              />
            )}
          </Field>
          <Alert className="bg-warning/10 border-warning/20">
            <AlertTriangle className="text-warning" />
            <AlertDescription>
              {initialSyncPeriod === 'now'
                ? "The schedule's clock starts right now — it will not backfill older records."
                : initialSyncPeriod === 'custom'
                  ? customSince
                    ? `The schedule will start from ${format(new Date(customSince), 'MMM d, yyyy · h:mm a')}.`
                    : 'Pick a date and time to start the schedule from.'
                  : `The schedule will start from ${INITIAL_SYNC_PERIOD_OPTIONS.find((o) => o.value === initialSyncPeriod)?.label.toLowerCase()} instead of right now.`}{' '}
              For historical data, use <strong>Sync All</strong> first.
            </AlertDescription>
          </Alert>
        </FieldGroup>
      )}
    </div>
  );

  const customPeriodMissing =
    mode === 'run' &&
    isFirstSync &&
    initialSyncPeriod === 'custom' &&
    !customSince;

  const handleConfirm = () => {
    if (mode === 'resume') {
      onConfirm({ resumeMode: isLimitPaused ? 'sync_missed' : resumeMode });
    } else if (mode === 'run' && isFirstSync) {
      onConfirm({
        initialSyncPeriod,
        customSince:
          initialSyncPeriod === 'custom' && customSince
            ? new Date(customSince).toISOString()
            : undefined,
      });
    } else {
      onConfirm();
    }
  };

  const footerNode = (
    <>
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button
        onClick={handleConfirm}
        disabled={pipelineBlocked || customPeriodMissing}
        className="bg-success hover:bg-success/90"
      >
        <Play /> {cta}
      </Button>
    </>
  );

  const resolvedBodyNode = mode === 'resume' ? resumeBodyNode : bodyNode;

  if (embedded) {
    return (
      <div className="space-y-5">
        {headerNode}
        {resolvedBodyNode}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {footerNode}
        </div>
      </div>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle asChild>
            <div>{headerNode}</div>
          </DialogTitle>
        </DialogHeader>
        {resolvedBodyNode}
        <DialogFooter>{footerNode}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
