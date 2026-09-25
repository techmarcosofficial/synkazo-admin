import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CircleStop,
  Clock3,
  Database,
  Pencil,
  Plus,
  RefreshCw,
  SkipForward,
  Square,
  Timer,
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface SyncRunProgressProps {
  runId?: string | null;
  jobId?: string | null;
  jobName?: string | null;
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
  ratePerSec?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  triggeredBy?: string | null;
  sourceLabel?: string | null;
  destinationLabel?: string | null;
  sourceStatus?: string | null;
  errorMessage?: string | null;
  onStop?: () => void;
  onDismiss?: () => void;
  onViewHistory?: () => void;
  stopping?: boolean;
  variant?: 'default' | 'compact';
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
      badge: normalized === 'queued' ? 'Queued' : 'Preparing',
    };
  if (normalized === 'running')
    return {
      state: 'running' as RunState,
      title: 'Sync in progress',
      badge: 'Running',
    };
  if (['failed', 'error'].includes(normalized))
    return {
      state: 'failed' as RunState,
      title: 'Sync failed',
      badge: 'Failed',
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
      badge:
        normalized === 'limit_reached'
          ? 'Limit reached'
          : normalized === 'time_limit_reached'
            ? 'Time limit reached'
            : 'Stopped',
    };
  return {
    state: 'completed' as RunState,
    title: 'Sync completed',
    badge:
      issues || normalized === 'partial'
        ? 'Completed with issues'
        : 'Completed',
  };
}

function triggerLabel(value?: string | null) {
  if (value === 'cron' || value === 'schedule' || value === 'scheduled')
    return 'Scheduled';
  if (!value || ['manual', 'sync_all', 'limit_sync'].includes(value))
    return 'Manual';
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

function SyncStatusHeader({
  state,
  title,
  badge,
  trigger,
  subtitle,
  compact,
}: {
  state: RunState;
  title: string;
  badge: string;
  trigger: string;
  subtitle: string;
  compact: boolean;
}) {
  const styles = {
    waiting: [
      'border-muted bg-muted/60 text-muted-foreground',
      'border-border bg-muted/60 text-muted-foreground',
      Clock3,
    ],
    running: [
      'border-primary/20 bg-primary/10 text-primary',
      'border-primary/20 bg-primary/10 text-primary',
      RefreshCw,
    ],
    completed: [
      'border-success/20 bg-success/10 text-success',
      'border-success/20 bg-success/10 text-success',
      CheckCircle2,
    ],
    failed: [
      'border-destructive/20 bg-destructive/10 text-destructive',
      'border-destructive/20 bg-destructive/10 text-destructive',
      XCircle,
    ],
    stopped: [
      'border-warning/20 bg-warning/10 text-warning',
      'border-warning/20 bg-warning/10 text-warning',
      CircleStop,
    ],
  } as const;
  const [iconStyle, badgeStyle, Icon] = styles[state];
  return (
    <header className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl border',
            compact && 'size-8 rounded-lg',
            iconStyle,
          )}
        >
          <Icon
            className={cn(
              compact ? 'size-4' : 'size-5',
              state === 'running' && 'animate-spin [animation-duration:3s]',
            )}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2
              className={cn(
                'leading-5 font-semibold',
                compact ? 'text-sm' : 'text-lg',
              )}
            >
              {title}
            </h2>
            <Badge
              variant="outline"
              className={cn('px-1.5 py-0 text-[11px]', badgeStyle)}
            >
              {badge}
            </Badge>
            <Badge
              variant="outline"
              className="text-muted-foreground px-1.5 py-0 text-[11px]"
            >
              {trigger} run
            </Badge>
          </div>
          <p
            className={cn(
              'text-muted-foreground min-w-0 truncate',
              compact ? 'text-xs' : 'text-sm',
            )}
            title={subtitle}
          >
            {subtitle}
          </p>
        </div>
      </div>
    </header>
  );
}

function SyncProgressBars({
  state,
  processed,
  total,
  completedBatches,
  currentBatch,
  batchProcessed,
  batchTotal,
  totalBatches,
  note,
  compact,
}: {
  state: RunState;
  processed: number;
  total: number | null;
  completedBatches: number | null;
  currentBatch: number | null;
  batchProcessed: number | null;
  batchTotal: number | null;
  totalBatches: number | null;
  note?: string;
  compact: boolean;
}) {
  const active = state === 'running';
  const waiting = state === 'waiting';
  const percent =
    !waiting && total != null && total > 0
      ? Math.min(100, Math.round((processed / total) * 100))
      : null;
  const finishedBatches = waiting ? 0 : (completedBatches ?? 0);
  const knownBatchTotal =
    totalBatches != null && totalBatches > 0 ? totalBatches : null;
  const shownBatch = waiting
    ? null
    : state === 'completed'
      ? (knownBatchTotal ?? currentBatch ?? (finishedBatches || null))
      : (currentBatch ?? (active ? null : finishedBatches || null));
  const batchPercent = waiting
    ? null
    : state === 'completed' && shownBatch != null
      ? 100
      : batchTotal != null && batchTotal > 0 && batchProcessed != null
        ? Math.min(100, Math.round((batchProcessed / batchTotal) * 100))
        : null;
  const overallColor =
    state === 'completed'
      ? '[&_[data-slot=progress-indicator]]:bg-success'
      : state === 'failed'
        ? '[&_[data-slot=progress-indicator]]:bg-destructive'
        : '[&_[data-slot=progress-indicator]]:bg-primary';
  const batchColor =
    state === 'completed' || (active && batchPercent === 100)
      ? '[&_[data-slot=progress-indicator]]:bg-success'
      : state === 'failed'
        ? '[&_[data-slot=progress-indicator]]:bg-destructive'
        : '[&_[data-slot=progress-indicator]]:bg-info';
  return (
    <div
      className={cn('min-w-0 space-y-2', compact && 'space-y-1.5')}
      aria-label="Sync progress"
    >
      <div className="space-y-1">
        <div className="flex min-h-6 min-w-0 items-center justify-between gap-3">
          <span className="text-muted-foreground min-w-0 text-sm tabular-nums">
            {processed.toLocaleString()}{' '}
            {total != null && total > 0 ? `of ${total.toLocaleString()}` : ''}{' '}
            records processed
          </span>
          <strong className="shrink-0 text-xl leading-none font-bold tabular-nums">
            {percent == null ? '—' : `${percent}%`}
          </strong>
        </div>
        {percent == null ? (
          <div
            role="progressbar"
            aria-label="Overall progress unknown"
            className="bg-muted h-2 overflow-hidden rounded-full"
          >
            {(active || waiting) && (
              <div className="bg-primary/60 h-full w-1/3 animate-pulse rounded-full" />
            )}
          </div>
        ) : (
          <Progress
            value={percent}
            aria-label="Overall progress"
            className={cn('h-1.5', overallColor)}
          />
        )}
      </div>
      <div className="space-y-1" title={note}>
        {batchPercent == null ? (
          <div
            role="progressbar"
            aria-label="Batch progress unknown"
            className="bg-muted h-1.5 overflow-hidden rounded-full"
          >
            {(active || waiting) && (
              <div className="bg-info/60 h-full w-1/3 animate-pulse rounded-full" />
            )}
          </div>
        ) : (
          <Progress
            key={shownBatch ?? 'batch'}
            value={batchPercent}
            aria-label="Batch progress"
            className={cn('h-1.5', batchColor)}
          />
        )}
        <div className="flex min-h-6 min-w-0 items-center justify-between gap-3">
          <span className="text-muted-foreground min-w-0 text-sm font-medium tabular-nums">
            {shownBatch != null
              ? `Batch ${shownBatch.toLocaleString()}${knownBatchTotal != null ? ` / ${knownBatchTotal.toLocaleString()}` : ''}`
              : 'Batch progress'}
          </span>
          <strong className="shrink-0 text-sm font-semibold tabular-nums">
            {batchPercent == null ? '—' : `${batchPercent}%`}
          </strong>
        </div>
      </div>
    </div>
  );
}

function SyncStats({
  values,
  compact,
}: {
  values: [number, number, number, number, number];
  compact: boolean;
}) {
  const stats: {
    label: string;
    icon: LucideIcon;
    color: string;
    iconColor: string;
  }[] = [
    {
      label: 'Processed',
      icon: Database,
      color: 'text-foreground',
      iconColor: 'text-muted-foreground',
    },
    {
      label: 'Created',
      icon: Plus,
      color: 'text-success',
      iconColor: 'text-success',
    },
    {
      label: 'Updated',
      icon: Pencil,
      color: 'text-info',
      iconColor: 'text-info',
    },
    {
      label: 'Skipped',
      icon: SkipForward,
      color: 'text-foreground',
      iconColor: 'text-muted-foreground',
    },
    {
      label: 'Failed',
      icon: TriangleAlert,
      color: 'text-destructive',
      iconColor: 'text-destructive',
    },
  ];
  return (
    <div
      className={cn(
        'grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-6',
        !compact && 'lg:grid-cols-5',
      )}
      aria-label="Record statistics"
    >
      {stats.map(({ label, icon: Icon, color, iconColor }, index) => (
        <div
          key={label}
          className={cn(
            'bg-card flex min-w-0 items-center gap-2 rounded-3xl border p-1',
            index < 3 ? 'sm:col-span-2' : 'sm:col-span-3',
            index === 4 && 'col-span-2',
            !compact && 'lg:col-span-1',
            compact && 'py-2',
          )}
        >
          <span
            className={cn(
              'bg-muted flex size-8 shrink-0 items-center justify-center rounded-xl',
              compact && 'size-7',
              iconColor,
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="text-muted-foreground block text-xs leading-4">
              {label}
            </span>
            <strong
              className={cn(
                'block truncate text-base leading-5 font-semibold tabular-nums',
                compact && 'text-sm leading-4',
                color,
              )}
              title={values[index].toLocaleString()}
            >
              {values[index].toLocaleString()}
            </strong>
          </span>
        </div>
      ))}
    </div>
  );
}

function SyncIssueBanner({
  state,
  failed,
  skipped,
  errorMessage,
  onViewHistory,
}: {
  state: RunState;
  failed: number;
  skipped: number;
  errorMessage?: string | null;
  onViewHistory?: () => void;
}) {
  if (state === 'running' || state === 'waiting') return null;
  let message: string | null = null;
  let tone = 'bg-muted/50 text-muted-foreground';
  let Icon: LucideIcon = CircleAlert;
  if (state === 'failed') {
    message = `${failed > 0 ? `${failed.toLocaleString()} record${failed === 1 ? '' : 's'} failed. ` : ''}${friendlyError(errorMessage)}`;
    tone = 'bg-destructive/10 text-destructive';
    Icon = TriangleAlert;
  } else if (state === 'stopped') {
    message = errorMessage
      ? friendlyError(errorMessage)
      : 'This sync stopped before completion.';
    tone = 'bg-warning/10 text-warning';
  } else if (failed > 0) {
    message = `${failed.toLocaleString()} record${failed === 1 ? '' : 's'} failed — review failed-record history for details or retry`;
    tone = 'bg-destructive/10 text-destructive';
    Icon = TriangleAlert;
  } else if (skipped > 0) {
    message = `${skipped.toLocaleString()} record${skipped === 1 ? '' : 's'} skipped — review run history for details`;
    tone = 'bg-warning/10 text-warning';
  }
  if (!message) return null;
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs',
        tone,
      )}
      role={failed > 0 || state === 'failed' ? 'alert' : 'status'}
    >
      {onViewHistory ? (
        <button
          type="button"
          onClick={onViewHistory}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left underline-offset-2 hover:underline focus-visible:underline"
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{message}</span>
          <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
        </button>
      ) : (
        <>
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{message}</span>
        </>
      )}
    </div>
  );
}

function MetaItem({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-card flex min-w-[130px] flex-[1_1_130px] items-center gap-2 rounded-3xl border p-1">
      <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="text-muted-foreground block text-xs leading-4">
          {label}
        </span>
        <strong
          className="block truncate text-sm leading-5 font-medium tabular-nums"
          title={typeof children === 'string' ? children : undefined}
        >
          {children}
        </strong>
      </span>
    </div>
  );
}

function SyncRunMeta({
  state,
  startedAt,
  finishedAt,
  elapsed,
  compact,
}: {
  state: RunState;
  startedAt?: string | null;
  finishedAt?: string | null;
  elapsed: number | null;
  compact: boolean;
}) {
  return (
    <div className={cn('flex min-w-0 flex-wrap gap-2', compact && 'gap-1.5')}>
      <MetaItem icon={CalendarDays} label="Started at">
        {formatDateTime(startedAt)}
      </MetaItem>
      {state !== 'running' && state !== 'waiting' && (
        <MetaItem icon={Clock3} label="Ended at">
          {formatDateTime(finishedAt)}
        </MetaItem>
      )}
      <MetaItem icon={Timer} label="Duration">
        {elapsed == null ? '—' : formatDuration(elapsed)}
      </MetaItem>
    </div>
  );
}

function SyncRunActions({
  state,
  onStop,
  onDismiss,
  onViewHistory,
  stopping,
}: {
  state: RunState;
  onStop?: () => void;
  onDismiss: () => void;
  onViewHistory?: () => void;
  stopping: boolean;
}) {
  if (state === 'waiting' || (state === 'running' && !onStop)) return null;
  return (
    <div className="ml-auto flex shrink-0 items-center justify-end gap-2 max-sm:w-full">
      {state === 'running' ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onStop}
          disabled={stopping}
          className="border-destructive/30 text-destructive"
        >
          {stopping ? <Spinner /> : <Square className="size-3" />}
          {stopping ? 'Stopping…' : 'Stop sync'}
        </Button>
      ) : (
        <>
          {onViewHistory && (
            <Button size="sm" onClick={onViewHistory}>
              View details <ArrowRight className="size-3" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onDismiss}>
            Close
          </Button>
        </>
      )}
    </div>
  );
}

/** Shared job-level progress and terminal summary for every sync entry point. */
export default function SyncRunProgress({
  runId,
  jobId,
  jobName,
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
  onViewHistory,
  stopping = false,
  variant = 'default',
  className,
}: SyncRunProgressProps) {
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
  const identity =
    jobName ||
    (jobId ? `Job ${jobId}` : runId ? `Run ${runId}` : direction || 'Sync run');
  const subtitle =
    direction && identity !== direction
      ? `${direction} · ${identity}`
      : direction || identity;
  const note =
    current.state === 'running' &&
    etaSeconds != null &&
    Number.isFinite(etaSeconds) &&
    etaSeconds > 0
      ? `About ${Math.ceil(etaSeconds / 60)} min remaining`
      : undefined;
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
  return (
    <Card
      size="sm"
      role="region"
      aria-live={terminal ? 'off' : 'polite'}
      aria-label={current.title}
      data-variant={variant}
      className={cn('gap-0 py-0', className)}
    >
      <div className="space-y-2 p-3">
        <div
          data-slot="sync-summary-header"
          className={cn(
            'flex min-w-0 flex-wrap items-start justify-between gap-2 max-sm:flex-col',
            variant === 'compact' && 'flex-col',
          )}
        >
          <SyncStatusHeader
            state={current.state}
            title={current.title}
            badge={current.badge}
            trigger={trigger}
            subtitle={subtitle}
            compact={variant === 'compact'}
          />
          <SyncRunActions
            state={current.state}
            onStop={onStop}
            onDismiss={handleDismiss}
            onViewHistory={onViewHistory}
            stopping={stopping}
          />
        </div>
        <div className="bg-muted/30 rounded-3xl border p-2">
          <SyncProgressBars
            state={current.state}
            processed={processed}
            total={total}
            completedBatches={batch}
            currentBatch={activeBatch}
            batchProcessed={batchDone}
            batchTotal={batchSize}
            totalBatches={allBatches}
            note={note}
            compact={variant === 'compact'}
          />
        </div>
        <SyncStats
          values={[processed, created, updated, skipped, failed]}
          compact={variant === 'compact'}
        />
        <SyncIssueBanner
          state={current.state}
          failed={failed}
          skipped={skipped}
          errorMessage={errorMessage}
          onViewHistory={onViewHistory}
        />
        <footer>
          <SyncRunMeta
            state={current.state}
            startedAt={startedAt}
            finishedAt={finishedAt}
            elapsed={elapsed}
            compact={variant === 'compact'}
          />
        </footer>
      </div>
    </Card>
  );
}
