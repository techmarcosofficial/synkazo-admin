import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CircleStop,
  Clock3,
  Database,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  SkipForward,
  Square,
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export interface SyncRunProgressProps {
  runId?: string | null;
  jobId?: string | null;
  status?: string | null;
  totalRecords?: number | null;
  processedRecords?: number | null;
  createdCount?: number | null;
  updatedCount?: number | null;
  skippedCount?: number | null;
  failedCount?: number | null;
  /** SSE page is the number of batches finished, starting at one. */
  completedBatches?: number | null;
  currentBatch?: number | null;
  batchProcessed?: number | null;
  batchTotal?: number | null;
  totalBatches?: number | null;
  etaSeconds?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  triggeredBy?: string | null;
  sourceLabel?: string | null;
  destinationLabel?: string | null;
  errorMessage?: string | null;
  onStop?: () => void;
  onDismiss?: () => void;
  stopping?: boolean;
  variant?: 'default' | 'compact';
  defaultOpen?: boolean;
  className?: string;
}

type RunState = 'waiting' | 'running' | 'completed' | 'failed' | 'stopped';

function finiteCount(value?: number | null): number | null {
  return value != null && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;
}

function presentation(status: string | null | undefined, issues: boolean) {
  const normalized = (status || 'running').toLowerCase();
  if (['queued', 'pending', 'preparing'].includes(normalized))
    return {
      state: 'waiting' as RunState,
      title: 'Sync preparing',
      detail: normalized === 'queued' ? 'Queued' : 'Preparing',
    };
  if (normalized === 'running')
    return {
      state: 'running' as RunState,
      title: 'Sync in progress',
      detail: null,
    };
  if (['failed', 'error'].includes(normalized))
    return {
      state: 'failed' as RunState,
      title: 'Sync failed',
      detail: null,
    };
  if (
    [
      'cancelled',
      'canceled',
      'paused',
      'stopped',
      'limit_reached',
      'time_limit_reached',
    ].includes(normalized)
  )
    return {
      state: 'stopped' as RunState,
      title: 'Sync stopped',
      detail:
        normalized === 'limit_reached'
          ? 'Limit reached'
          : normalized === 'time_limit_reached'
            ? 'Time limit reached'
            : 'Stopped',
    };
  return {
    state: 'completed' as RunState,
    title:
      issues || normalized === 'partial'
        ? 'Sync completed with issues'
        : 'Sync completed',
    detail: null,
  };
}

function triggerLabel(value?: string | null) {
  if (!value) return null;
  if (value === 'cron' || value === 'schedule' || value === 'scheduled')
    return 'Scheduled';
  if (['manual', 'sync_all', 'limit_sync'].includes(value)) return 'Manual';
  return value
    .split('_')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatDuration(value: number) {
  const seconds = Math.floor(Math.max(0, value) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function elapsedMs(
  startedAt: string | null | undefined,
  finishedAt: string | null | undefined,
  durationMs: number | null | undefined,
  now: number,
) {
  if (durationMs != null && Number.isFinite(durationMs) && durationMs >= 0)
    return durationMs;
  const start = startedAt ? new Date(startedAt).getTime() : NaN;
  const end = finishedAt ? new Date(finishedAt).getTime() : now;
  return Number.isFinite(start) && Number.isFinite(end)
    ? Math.max(0, end - start)
    : null;
}

function friendlyError(message?: string | null) {
  if (!message)
    return 'This run could not be completed. Review run history for details.';
  const value = message.toLowerCase();
  if (value.includes('monthly') && value.includes('limit'))
    return 'The monthly record limit was reached. Review run history for details.';
  if (value.includes('execution window'))
    return 'The execution window ended. This job will continue from its saved position.';
  if (value.includes('authentication') || value.includes('unauthorized'))
    return 'The platform connection needs attention. Reconnect it and try again.';
  if (value.includes('rate limit'))
    return 'The platform limited requests. Wait a moment and try again.';
  if (value.includes('timeout') || value.includes('network'))
    return 'The platform could not be reached reliably. Check the connection and try again.';
  if (value.includes('polling timed out'))
    return 'Live updates timed out. Check run history for the final result.';
  return 'This run could not be completed. Review run history for details.';
}

function dismissalKey(jobId?: string | null) {
  return jobId ? `synkazo:sync-summary-dismissed:${jobId}` : null;
}

function wasDismissed(jobId?: string | null, runId?: string | null) {
  const key = dismissalKey(jobId);
  if (!key || !runId || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(key) === runId;
  } catch {
    return false;
  }
}

function SyncStatusIcon({ state }: { state: RunState }) {
  const styles = {
    waiting: {
      Icon: Clock3,
      containerClass: 'bg-muted text-muted-foreground border-border/70',
      spin: false,
    },
    running: {
      Icon: RefreshCw,
      containerClass: 'bg-primary/10 text-primary border-primary/20',
      spin: true,
    },
    completed: {
      Icon: CheckCircle2,
      containerClass: 'bg-success/10 text-success border-success/20',
      spin: false,
    },
    failed: {
      Icon: XCircle,
      containerClass: 'bg-destructive/10 text-destructive border-destructive/20',
      spin: false,
    },
    stopped: {
      Icon: CircleStop,
      containerClass: 'bg-warning/10 text-warning border-warning/20',
      spin: false,
    },
  };

  const { Icon, containerClass, spin } = styles[state];

  return (
    <span
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-2xl border transition-colors',
        containerClass,
      )}
    >
      <Icon
        className={cn(
          'size-6',
          spin && 'animate-spin [animation-duration:3s]',
        )}
        aria-hidden="true"
      />
    </span>
  );
}


function SyncStats({
  values,
}: {
  values: [number, number, number, number, number];
}) {
  const stats: {
    label: string;
    icon: LucideIcon;
    color: string;
    iconColor: string;
    iconBg: string;
  }[] = [
    {
      label: 'Processed',
      icon: Database,
      color: 'text-foreground',
      iconColor: 'text-foreground',
      iconBg: 'bg-muted',
    },
    {
      label: 'Created',
      icon: Plus,
      color: 'text-success',
      iconColor: 'text-success',
      iconBg: 'bg-success/10',
    },
    {
      label: 'Updated',
      icon: Pencil,
      color: 'text-info',
      iconColor: 'text-info',
      iconBg: 'bg-info/10',
    },
    {
      label: 'Skipped',
      icon: SkipForward,
      color: 'text-muted-foreground',
      iconColor: 'text-muted-foreground',
      iconBg: 'bg-muted',
    },
    {
      label: 'Failed',
      icon: TriangleAlert,
      color: 'text-destructive',
      iconColor: 'text-destructive',
      iconBg: 'bg-destructive/10',
    },
  ];

  return (
    <div
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
      aria-label="Record statistics"
    >
      {stats.map(
        ({ label, icon: Icon, color, iconColor, iconBg }, index) => (
          <div
            key={label}
            className="bg-card border-border/60 flex min-w-0 items-center gap-2.5 rounded-2xl border px-3 py-2.5 transition-all hover:border-border/90"
          >
            <span
              className={cn(
                'flex size-8.5 shrink-0 items-center justify-center rounded-xl',
                iconBg,
                iconColor,
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-muted-foreground block text-xs leading-none">
                {label}
              </span>
              <strong
                className={cn(
                  'mt-1 block truncate text-sm font-bold tabular-nums leading-tight',
                  color,
                )}
                title={values[index].toLocaleString()}
              >
                {values[index].toLocaleString()}
              </strong>
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function MetaItem({ label, children }: { label: string; children: string }) {
  return (
    <div className="min-w-0 flex-[1_1_110px] max-w-[190px]">
      <span className="text-muted-foreground block text-xs leading-none">
        {label}
      </span>
      <strong
        className="mt-1 block truncate text-xs font-semibold tabular-nums text-foreground leading-tight"
        title={children}
      >
        {children}
      </strong>
    </div>
  );
}

function SyncRunMeta({
  state,
  startedAt,
  finishedAt,
  elapsed,
  errorMessage,
  failed,
  skipped,
  etaSeconds,
}: {
  state: RunState;
  startedAt?: string | null;
  finishedAt?: string | null;
  elapsed: number | null;
  errorMessage?: string | null;
  failed: number;
  skipped: number;
  etaSeconds?: number | null;
}) {
  const issue =
    state === 'failed' || state === 'stopped'
      ? errorMessage
        ? friendlyError(errorMessage)
        : state === 'stopped'
          ? 'Stopped before completion'
          : friendlyError(errorMessage)
      : failed > 0
        ? `${failed.toLocaleString()} failed · Review run history`
        : skipped > 0
          ? `${skipped.toLocaleString()} skipped · Review run history`
          : null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
      <MetaItem label="Started at">{formatDateTime(startedAt)}</MetaItem>
      {state !== 'running' && state !== 'waiting' && (
        <MetaItem label="Ended at">{formatDateTime(finishedAt)}</MetaItem>
      )}
      <MetaItem label="Duration">
        {elapsed == null ? '—' : formatDuration(elapsed)}
      </MetaItem>
      {state === 'running' &&
        etaSeconds != null &&
        Number.isFinite(etaSeconds) &&
        etaSeconds > 0 && (
          <MetaItem label="Estimated time left">
            {formatDuration(etaSeconds * 1000)}
          </MetaItem>
        )}
      {issue && <MetaItem label="Issue">{issue}</MetaItem>}
    </div>
  );
}

/** Shared job-level progress and terminal summary for every sync entry point. */
export default function SyncRunProgress({
  runId,
  jobId,
  status,
  totalRecords,
  processedRecords,
  createdCount,
  updatedCount,
  skippedCount,
  failedCount,
  completedBatches,
  currentBatch,
  batchProcessed,
  batchTotal,
  totalBatches,
  etaSeconds,
  startedAt,
  finishedAt,
  durationMs,
  triggeredBy,
  sourceLabel,
  destinationLabel,
  errorMessage,
  onStop,
  onDismiss,
  stopping = false,
  variant = 'default',
  defaultOpen = true,
  className,
}: SyncRunProgressProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const created = finiteCount(createdCount) ?? 0;
  const updated = finiteCount(updatedCount) ?? 0;
  const skipped = finiteCount(skippedCount) ?? 0;
  const failed = finiteCount(failedCount) ?? 0;
  const processed = Math.max(
    finiteCount(processedRecords) ?? 0,
    created + updated + skipped + failed,
  );
  const total = finiteCount(totalRecords);
  const batch = finiteCount(completedBatches);
  const activeBatch = finiteCount(currentBatch);
  const batchDone = finiteCount(batchProcessed);
  const batchSize = finiteCount(batchTotal);
  const allBatches = finiteCount(totalBatches);

  const current = presentation(status, failed > 0 || skipped > 0);
  const terminal = !['running', 'waiting'].includes(current.state);
  const active = current.state === 'running';
  const waiting = current.state === 'waiting';

  const percent =
    !waiting && total != null && total > 0
      ? Math.min(100, Math.round((processed / total) * 100))
      : null;

  const finishedBatches = waiting ? 0 : (completedBatches ?? 0);
  const knownBatchTotal =
    totalBatches != null && totalBatches > 0 ? totalBatches : null;
  const shownBatch = waiting
    ? null
    : current.state === 'completed'
      ? (knownBatchTotal ?? currentBatch ?? (finishedBatches || null))
      : (currentBatch ?? (active ? null : finishedBatches || null));

  const overallColor =
    current.state === 'completed'
      ? '[&_[data-slot=progress-indicator]]:bg-success'
      : current.state === 'failed'
        ? '[&_[data-slot=progress-indicator]]:bg-destructive'
        : '[&_[data-slot=progress-indicator]]:bg-primary';

  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState(
    () => terminal && wasDismissed(jobId, runId),
  );

  useEffect(() => {
    setDismissed(terminal && wasDismissed(jobId, runId));
  }, [jobId, runId, terminal]);

  useEffect(() => {
    if (terminal || !startedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, terminal]);

  if (dismissed) return null;

  const elapsed = elapsedMs(
    startedAt,
    terminal ? finishedAt : null,
    terminal ? durationMs : null,
    now,
  );
  const trigger = triggerLabel(triggeredBy);
  const direction =
    sourceLabel && destinationLabel
      ? `${sourceLabel} → ${destinationLabel}`
      : null;

  const handleDismiss = () => {
    const key = dismissalKey(jobId);
    if (key && runId) {
      try {
        window.localStorage.setItem(key, runId);
      } catch {
        /* session dismissal still works */
      }
    }
    setDismissed(true);
    onDismiss?.();
  };

  const handleHeaderClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, a, input, [role="button"]')) return;
    setIsOpen((prev) => !prev);
  };

  const isCompact = variant === 'compact';
  const normalizedStatus = (status || 'running').toLowerCase();
  const badgeStatus = (() => {
    if (waiting) return normalizedStatus === 'queued' ? 'queued' : 'pending';
    if (active) return 'running';
    if (current.state === 'failed') return 'failed';
    if (current.state === 'stopped') {
      if (normalizedStatus === 'limit_reached') return 'limit_reached';
      if (normalizedStatus === 'time_limit_reached') return 'time_limit_reached';
      return 'stopped';
    }
    if (failed > 0 || skipped > 0 || normalizedStatus === 'partial') return 'partial';
    return 'completed';
  })();

  const currentBatchNum =
    shownBatch ?? (finishedBatches > 0 ? finishedBatches : active ? 1 : null);

  const batchProgressText = (() => {
    if (waiting) return 'Preparing';
    if (allBatches != null && allBatches > 0) {
      if (current.state === 'completed') {
        return `${allBatches} of ${allBatches} batches`;
      }
      return `${currentBatchNum ?? 1} of ${allBatches} batches`;
    }
    if (shownBatch != null) {
      return `Batch ${shownBatch}`;
    }
    if (finishedBatches > 0) {
      return `${finishedBatches} batches`;
    }
    return null;
  })();

  const batchesFraction = (() => {
    if (allBatches != null && allBatches > 0) {
      if (current.state === 'completed') {
        return `${allBatches}/${allBatches}`;
      }
      return `${currentBatchNum ?? 1}/${allBatches}`;
    }
    if (shownBatch != null) return `${shownBatch}`;
    if (finishedBatches > 0) return `${finishedBatches}`;
    return '—';
  })();

  return (
    <Card
      size="sm"
      role="region"
      aria-live={terminal ? 'off' : 'polite'}
      aria-label={current.title}
      data-variant={variant}
      className={cn(
        'gap-0 overflow-hidden border-border/70 py-0 shadow-none',
        isCompact ? 'rounded-2xl' : 'rounded-3xl',
        className,
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header Part with Progress & Integrated Status */}
        <div
          data-slot="sync-summary-header"
          onClick={handleHeaderClick}
          className={cn(
            'hover:bg-muted/20 cursor-pointer transition-colors',
            'grid grid-cols-[1fr_auto] gap-3.5 p-4 sm:p-5',
            'lg:flex lg:flex-row lg:items-center lg:justify-between lg:gap-4',
            isCompact
              ? 'lg:min-h-[92px] lg:px-4 lg:py-2.5'
              : 'lg:min-h-[120px] lg:h-[130px] lg:px-6 lg:py-0',
          )}
        >
          {/* 1. Left: Status Icon, Header Title, Subtitle, and Pill Badges */}
          <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3 sm:gap-3.5">
            <SyncStatusIcon state={current.state} />
            <div className="min-w-0">
              <h2
                className={cn(
                  'font-bold text-foreground tracking-tight leading-tight',
                  isCompact ? 'text-sm' : 'text-base sm:text-lg',
                )}
              >
                {current.title}
              </h2>
              {direction && (
                <p
                  className="text-muted-foreground mt-0.5 truncate text-xs font-normal"
                  title={direction}
                >
                  {direction}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 sm:mt-2">
                <StatusBadge status={badgeStatus} size="sm" />
                {trigger && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-muted-foreground" />
                    {trigger}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Vertical Separator */}
          <div
            className="hidden lg:block h-12 w-px bg-border/60 shrink-0 self-center mx-1"
            aria-hidden="true"
          />

          {/* 2. Middle: Progress occupying available space */}
          <div className="col-span-2 row-start-2 flex w-full flex-col justify-center gap-2 px-0.5 lg:col-span-1 lg:row-start-auto lg:min-w-[180px] lg:flex-1 lg:px-3">
            <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
              <div className="min-w-0 truncate font-medium text-foreground">
                {batchProgressText && <span>{batchProgressText}</span>}
                {percent != null ? (
                  <>
                    {batchProgressText && (
                      <span className="text-muted-foreground/60 mx-1.5 font-normal">
                        ·
                      </span>
                    )}
                    <span
                      className={cn(
                        'font-semibold',
                        current.state === 'completed' && 'text-success',
                        current.state === 'failed' && 'text-destructive',
                        current.state === 'running' && 'text-primary',
                        current.state === 'stopped' && 'text-warning',
                      )}
                    >
                      {percent}% complete
                    </span>
                  </>
                ) : (active || waiting) && !batchProgressText ? (
                  <span className="font-semibold text-primary">In progress</span>
                ) : null}
              </div>

              <span className="text-muted-foreground shrink-0 tabular-nums text-xs">
                {processed.toLocaleString()}{' '}
                {total != null && total > 0
                  ? `of ${total.toLocaleString()} `
                  : ''}
                records processed
              </span>
            </div>

            {percent == null ? (
              <div
                role="progressbar"
                aria-label="Overall progress unknown"
                className="bg-muted h-2 w-full overflow-hidden rounded-full"
              >
                {(active || waiting) && (
                  <div className="bg-gradient-to-r from-primary to-success/70 h-full w-1/3 animate-pulse rounded-full" />
                )}
              </div>
            ) : (
              <div
                role="progressbar"
                aria-label="Overall progress"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="bg-muted h-2 w-full overflow-hidden rounded-full"
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    current.state === 'failed'
                      ? 'bg-destructive'
                      : current.state === 'stopped'
                        ? 'bg-warning'
                        : 'bg-gradient-to-r from-primary to-success',
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            )}
          </div>

          {/* 3. Right-Middle: Two equal-height compact metric cards */}
          <div className="col-span-2 row-start-3 grid grid-cols-2 gap-2.5 w-full sm:flex sm:w-auto sm:shrink-0 lg:col-span-1 lg:row-start-auto lg:gap-3">
            {/* Card 1: Completion */}
            <div className="bg-card border-border/70 flex h-14 sm:h-16 w-full sm:w-36 shrink-0 items-center gap-2.5 sm:gap-3 rounded-2xl border px-3 sm:px-3.5 py-2 transition-colors">
              <span className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                <BarChart3 className="size-4.5 sm:size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-sm font-bold tabular-nums text-foreground leading-tight">
                  {percent != null ? `${percent}%` : '—'}
                </strong>
                <span className="text-muted-foreground block truncate text-xs leading-tight">
                  Completion
                </span>
              </div>
            </div>

            {/* Card 2: Batches */}
            <div className="bg-card border-border/70 flex h-14 sm:h-16 w-full sm:w-36 shrink-0 items-center gap-2.5 sm:gap-3 rounded-2xl border px-3 sm:px-3.5 py-2 transition-colors">
              <span className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Layers className="size-4.5 sm:size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-sm font-bold tabular-nums text-foreground leading-tight">
                  {batchesFraction}
                </strong>
                <span className="text-muted-foreground block truncate text-xs leading-tight">
                  Batches
                </span>
              </div>
            </div>
          </div>

          {/* Vertical Separator */}
          <div
            className="hidden xl:block h-12 w-px bg-border/60 shrink-0 self-center mx-1"
            aria-hidden="true"
          />

          {/* 4. Far Right: Actions & Collapsible Chevron */}
          <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-2 justify-self-end self-start sm:self-center">
            {current.state === 'running' && onStop ? (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStop();
                }}
                disabled={stopping}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 h-8 rounded-xl px-3 text-xs font-semibold"
              >
                {stopping ? (
                  <Spinner className="size-3" />
                ) : (
                  <Square className="size-3" />
                )}
                {stopping ? 'Stopping…' : 'Stop sync'}
              </Button>
            ) : terminal ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss();
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/60 h-8 rounded-xl px-3 text-xs font-semibold"
              >
                Close
              </Button>
            ) : null}

            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={isOpen ? 'Collapse' : 'Expand'}
                className="bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground size-8.5 rounded-xl transition-colors"
              >
                <ChevronDown
                  className={cn(
                    'size-4 transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        {/* Collapsible Content Area */}
        <CollapsibleContent>
          <div
            className={cn(
              'border-border/60 bg-muted/15 border-t space-y-3.5',
              isCompact ? 'p-3' : 'px-5 py-4 sm:px-6',
            )}
          >
            {/* Stat Cards Grid (Responsive Wrap) */}
            <SyncStats
              values={[processed, created, updated, skipped, failed]}
            />

            {/* Footer Metadata */}
            <footer className="border-border/60 border-t pt-3">
              <SyncRunMeta
                state={current.state}
                startedAt={startedAt}
                finishedAt={finishedAt}
                elapsed={elapsed}
                errorMessage={errorMessage}
                failed={failed}
                skipped={skipped}
                etaSeconds={etaSeconds}
              />
            </footer>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
