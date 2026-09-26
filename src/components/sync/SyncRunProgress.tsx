import {
  CheckCircle2,
  ChevronDown,
  CircleStop,
  Clock3,
  Database,
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
import { Separator } from '../ui/separator';

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

function SyncStatusIcon({
  state,
  compact = false,
}: {
  state: RunState;
  compact?: boolean;
}) {
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
      containerClass: 'bg-muted text-foreground border-border/70',
      spin: false,
    },
    failed: {
      Icon: XCircle,
      containerClass:
        'bg-destructive/10 text-destructive border-destructive/20',
      spin: false,
    },
    stopped: {
      Icon: CircleStop,
      containerClass: 'bg-muted text-muted-foreground border-border/70',
      spin: false,
    },
  };

  const { Icon, containerClass, spin } = styles[state];

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center border transition-colors',
        compact ? 'size-8 rounded-lg' : 'size-9 rounded-xl',
        containerClass,
      )}
    >
      <Icon
        className={cn(
          compact ? 'size-3.5' : 'size-4',
          spin && 'animate-spin [animation-duration:3s]',
        )}
        aria-hidden="true"
      />
    </span>
  );
}

function SyncStats({
  values,
  compact = false,
}: {
  values: [number, number, number, number, number];
  compact?: boolean;
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
      iconColor: 'text-muted-foreground',
      iconBg: 'bg-muted',
    },
    {
      label: 'Created',
      icon: Plus,
      color: 'text-foreground',
      iconColor: 'text-success',
      iconBg: 'bg-success/10',
    },
    {
      label: 'Updated',
      icon: Pencil,
      color: 'text-foreground',
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
      color: values[4] > 0 ? 'text-destructive' : 'text-muted-foreground',
      iconColor: 'text-destructive',
      iconBg: 'bg-destructive/10',
    },
  ];

  return (
    <div
      className={cn(
        'grid gap-2',
        compact
          ? 'grid-cols-2 sm:grid-cols-3'
          : 'grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5',
      )}
      aria-label="Record statistics"
    >
      {stats.map(({ label, icon: Icon, color, iconColor, iconBg }, index) => (
        <div
          key={label}
          className={cn(
            'bg-card border-border/60 hover:border-border/90 flex min-w-0 items-center border transition-all',
            compact
              ? 'gap-2 rounded-lg px-2.5 py-1.5'
              : 'gap-2.5 rounded-xl px-3 py-2',
          )}
        >
          <span
            className={cn(
              'flex shrink-0 items-center justify-center',
              compact ? 'size-6.5 rounded-md' : 'size-7.5 rounded-lg',
              iconBg,
              iconColor,
            )}
          >
            <Icon
              className={compact ? 'size-3' : 'size-3.5'}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-muted-foreground block text-[11px] leading-none">
              {label}
            </span>
            <strong
              className={cn(
                'mt-1 block truncate leading-tight font-semibold tabular-nums',
                compact ? 'text-xs sm:text-sm' : 'text-sm',
                color,
              )}
              title={values[index].toLocaleString()}
            >
              {values[index].toLocaleString()}
            </strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetaItem({ label, children }: { label: string; children: string }) {
  return (
    <div className="max-w-[190px] min-w-0 flex-[1_1_110px]">
      <span className="text-muted-foreground block text-xs leading-none">
        {label}
      </span>
      <strong
        className="text-foreground mt-1 block truncate text-xs leading-tight font-semibold tabular-nums"
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
        <>
          <Separator orientation="vertical" />
          <MetaItem label="Ended at">{formatDateTime(finishedAt)}</MetaItem>
        </>
      )}

      <Separator orientation="vertical" />
      <MetaItem label="Duration">
        {elapsed == null ? '—' : formatDuration(elapsed)}
      </MetaItem>

      {state === 'running' &&
        etaSeconds != null &&
        Number.isFinite(etaSeconds) &&
        etaSeconds > 0 && (
          <>
            <Separator orientation="vertical" />
            <MetaItem label="Estimated time left">
              {formatDuration(etaSeconds * 1000)}
            </MetaItem>
          </>
        )}
      {issue && (
        <>
          <Separator orientation="vertical" />
          <MetaItem label="Issue">{issue}</MetaItem>
        </>
      )}
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
  defaultOpen = false,
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
    if (
      (event.target as HTMLElement).closest('button, a, input, [role="button"]')
    )
      return;
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
      if (normalizedStatus === 'time_limit_reached')
        return 'time_limit_reached';
      return 'stopped';
    }
    if (failed > 0 || skipped > 0 || normalizedStatus === 'partial')
      return 'partial';
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
        'border-border/70 bg-card gap-0 overflow-hidden py-0 shadow-none transition-colors',
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
            'group/header hover:bg-muted/20 flex cursor-pointer flex-col gap-3 p-3 transition-colors sm:p-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4',
            isCompact ? 'gap-2.5 p-2.5 sm:p-3' : 'px-4 py-3',
          )}
        >
          {/* 1. Left: Status Icon, Title, Direction, and Badges */}
          <div className="flex min-w-0 items-center gap-3 shrink-0 lg:max-w-[280px] xl:max-w-[320px]">
            <SyncStatusIcon state={current.state} compact={isCompact} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  className={cn(
                    'text-foreground leading-tight font-semibold tracking-tight truncate',
                    isCompact ? 'text-xs sm:text-sm' : 'text-sm',
                  )}
                >
                  {current.title}
                </h2>
                <StatusBadge status={badgeStatus} size="sm" />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {direction && (
                  <p
                    className={cn(
                      'text-muted-foreground truncate font-normal',
                      isCompact ? 'text-[11px]' : 'text-xs',
                    )}
                    title={direction}
                  >
                    {direction}
                  </p>
                )}
                {trigger && (
                  <span
                    className={cn(
                      'border-border bg-muted/60 text-muted-foreground inline-flex items-center gap-1 rounded-full border font-medium shrink-0',
                      isCompact
                        ? 'px-1.5 py-0 text-[10px]'
                        : 'px-2 py-0 text-[11px]',
                    )}
                  >
                    <span className="bg-muted-foreground size-1 rounded-full" />
                    {trigger}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Middle: Progress occupying available space */}
          <div
            className={cn(
              'flex min-w-0 flex-1 flex-col justify-center gap-1.5',
              isCompact ? 'gap-1' : 'lg:px-2',
            )}
          >
            <div
              className={cn(
                'flex min-w-0 items-center justify-between gap-2 text-xs',
                isCompact && 'text-[11px]',
              )}
            >
              <div className="text-foreground min-w-0 truncate font-medium">
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
                  <span className="text-primary font-semibold">
                    In progress
                  </span>
                ) : null}
              </div>

              <span className="text-muted-foreground shrink-0 tabular-nums">
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
                className={cn(
                  'bg-muted w-full overflow-hidden rounded-full',
                  isCompact ? 'h-1.5' : 'h-1.5 sm:h-2',
                )}
              >
                {(active || waiting) && (
                  <div className="bg-primary/60 h-full w-1/3 animate-pulse rounded-full" />
                )}
              </div>
            ) : (
              <div
                role="progressbar"
                aria-label="Overall progress"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                className={cn(
                  'bg-muted w-full overflow-hidden rounded-full',
                  isCompact ? 'h-1.5' : 'h-1.5 sm:h-2',
                )}
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    current.state === 'failed'
                      ? 'bg-destructive'
                      : current.state === 'stopped'
                        ? 'bg-warning'
                        : current.state === 'completed'
                          ? 'bg-success'
                          : 'bg-primary',
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            )}
          </div>

          {/* 3. Right: Metrics & Actions */}
          <div className="flex shrink-0 items-center justify-between sm:justify-end gap-2 sm:gap-2.5">
            {/* Metric Chips */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Chip 1: Completion */}
              <div
                className={cn(
                  'bg-muted/40 border-border/60 flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 transition-colors',
                  isCompact && 'px-1.5 py-0.5 text-[11px]',
                )}
              >
                <span className="text-muted-foreground text-[11px]">
                  Completion
                </span>
                <strong
                  className={cn(
                    'text-foreground block truncate leading-tight font-semibold tabular-nums',
                    isCompact ? 'text-[11px]' : 'text-xs',
                  )}
                >
                  {percent != null ? `${percent}%` : '—'}
                </strong>
              </div>

              {/* Chip 2: Batches */}
              <div
                className={cn(
                  'bg-muted/40 border-border/60 flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 transition-colors',
                  isCompact && 'px-1.5 py-0.5 text-[11px]',
                )}
              >
                <span className="text-muted-foreground text-[11px]">
                  Batches
                </span>
                <strong
                  className={cn(
                    'text-foreground block truncate leading-tight font-semibold tabular-nums',
                    isCompact ? 'text-[11px]' : 'text-xs',
                  )}
                >
                  {batchesFraction}
                </strong>
              </div>
            </div>

            {/* Actions: Stop or Close */}
            {current.state === 'running' && onStop ? (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStop();
                }}
                disabled={stopping}
                className={cn(
                  'border-destructive/30 text-destructive hover:bg-destructive/10 font-semibold',
                  isCompact
                    ? 'h-7 rounded-lg px-2 text-xs'
                    : 'h-7.5 rounded-xl px-2.5 text-xs',
                )}
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
                className={cn(
                  'text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium',
                  isCompact
                    ? 'h-7 rounded-lg px-2 text-xs'
                    : 'h-7.5 rounded-xl px-2.5 text-xs',
                )}
              >
                Close
              </Button>
            ) : null}

            {/* Collapsible Trigger Chevron */}
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={isOpen ? 'Collapse' : 'Expand'}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/60 size-7.5 rounded-lg transition-colors"
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
              'bg-muted/40 border-t border-border/70 space-y-3',
              isCompact ? 'p-2.5 sm:p-3' : 'p-3.5 sm:p-4',
            )}
          >
            {/* Stat Cards Grid */}
            <SyncStats
              values={[processed, created, updated, skipped, failed]}
              compact={isCompact}
            />

            {/* Footer Metadata */}
            <footer className="border-t border-border/50 pt-2.5">
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
