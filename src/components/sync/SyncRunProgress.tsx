import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CircleStop,
  Clock3,
  Database,
  Gauge,
  Pencil,
  Plus,
  RefreshCw,
  SkipForward,
  Square,
  TriangleAlert,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface SyncRunProgressProps {
  runId?: string | null;
  jobId?: string | null;
  status?: string | null;
  totalRecords?: number | null;
  processedRecords?: number | null;
  createdCount?: number | null;
  updatedCount?: number | null;
  skippedCount?: number | null;
  failedCount?: number | null;
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
  stopping?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}

type RunPresentation = {
  state: 'running' | 'completed' | 'failed' | 'stopped';
  title: string;
  badge: string;
};

function getRunPresentation(
  status?: string | null,
  failedCount = 0,
): RunPresentation {
  const normalized = (status || 'running').toLowerCase();
  if (normalized === 'running' || normalized === 'queued') {
    return { state: 'running', title: 'Sync in progress', badge: 'Running' };
  }
  if (normalized === 'failed' || normalized === 'error') {
    return { state: 'failed', title: 'Sync failed', badge: 'Failed' };
  }
  if (
    ['cancelled', 'canceled', 'paused', 'stopped'].includes(normalized) ||
    normalized === 'limit_reached' ||
    normalized === 'time_limit_reached'
  ) {
    const badge =
      normalized === 'limit_reached'
        ? 'Limit reached'
        : normalized === 'time_limit_reached'
          ? 'Time limit reached'
          : 'Stopped';
    return { state: 'stopped', title: 'Sync stopped', badge };
  }
  return {
    state: 'completed',
    title: 'Sync completed',
    badge: failedCount > 0 ? 'Completed with issues' : 'Completed',
  };
}

function isScheduledTrigger(triggeredBy?: string | null) {
  return triggeredBy === 'cron' || triggeredBy === 'schedule';
}

function triggerLabel(triggeredBy?: string | null) {
  if (isScheduledTrigger(triggeredBy)) return 'Scheduled';
  if (
    !triggeredBy ||
    ['manual', 'sync_all', 'limit_sync'].includes(triggeredBy)
  ) {
    return 'Manual';
  }
  return triggeredBy
    .split('_')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateTime(value?: string | null, fallback = 'Not available') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return hours + 'h ' + minutes + 'm ' + seconds + 's';
  if (minutes > 0) return minutes + 'm ' + seconds + 's';
  return seconds + 's';
}

function elapsedMs(
  startedAt: string | null | undefined,
  finishedAt: string | null | undefined,
  durationMs: number | null | undefined,
  now: number,
) {
  if (durationMs != null) return Math.max(0, durationMs);
  if (!startedAt) return null;
  const started = new Date(startedAt).getTime();
  const finished = finishedAt ? new Date(finishedAt).getTime() : now;
  if (Number.isNaN(started) || Number.isNaN(finished)) return null;
  return Math.max(0, finished - started);
}

function dismissalKey(jobId?: string | null) {
  return jobId ? 'synkazo:sync-summary-dismissed:' + jobId : null;
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

function StatCard({
  icon: Icon,
  label,
  value,
  valueClassName,
  iconClassName,
  compact,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  valueClassName: string;
  iconClassName: string;
  compact: boolean;
}) {
  return (
    <div
      className={cn(
        'bg-background/35 flex min-w-0 items-center justify-between gap-2 rounded-2xl border',
        compact ? 'px-2.5 py-2' : 'px-3.5 py-3',
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            'leading-none font-bold tabular-nums',
            compact ? 'text-sm' : 'text-base',
            valueClassName,
          )}
        >
          {value.toLocaleString()}
        </p>
        <p className="text-muted-foreground mt-1 text-[10px] font-medium">
          {label}
        </p>
      </div>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl',
          compact ? 'size-7' : 'size-8',
          iconClassName,
        )}
      >
        <Icon className={compact ? 'size-3.5' : 'size-4'} aria-hidden="true" />
      </span>
    </div>
  );
}

function MetadataItem({
  icon: Icon,
  label,
  value,
  children,
  compact,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  children?: ReactNode;
  compact: boolean;
}) {
  return (
    <div
      className={cn('flex min-w-0 items-center', compact ? 'gap-2' : 'gap-2.5')}
    >
      <span
        className={cn(
          'bg-muted/65 text-muted-foreground flex shrink-0 items-center justify-center rounded-xl',
          compact ? 'size-7' : 'size-8',
        )}
      >
        <Icon className={compact ? 'size-3' : 'size-3.5'} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-[10px] leading-none font-medium">
          {label}
        </p>
        {children ?? (
          <p className="mt-1 truncate text-xs leading-none font-semibold tabular-nums">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

/** Shared job-level progress and terminal summary for every sync entry point. */
export default function SyncRunProgress({
  runId,
  jobId,
  status,
  totalRecords,
  processedRecords = 0,
  createdCount = 0,
  updatedCount = 0,
  skippedCount = 0,
  failedCount = 0,
  etaSeconds,
  ratePerSec,
  startedAt,
  finishedAt,
  durationMs,
  triggeredBy,
  sourceLabel,
  destinationLabel,
  sourceStatus,
  errorMessage,
  onStop,
  onDismiss,
  stopping = false,
  variant = 'default',
  className,
}: SyncRunProgressProps) {
  const presentation = getRunPresentation(status, failedCount ?? 0);
  const terminal = presentation.state !== 'running';
  const compact = variant === 'compact';
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState(() =>
    terminal ? wasDismissed(jobId, runId) : false,
  );

  useEffect(() => {
    if (terminal) setDismissed(wasDismissed(jobId, runId));
    else setDismissed(false);
  }, [jobId, runId, terminal]);

  useEffect(() => {
    if (terminal || !startedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, terminal]);

  if (dismissed) return null;

  const processed = processedRecords ?? 0;
  const created = createdCount ?? 0;
  const updated = updatedCount ?? 0;
  const skipped = skippedCount ?? 0;
  const failed = failedCount ?? 0;
  const hasTotal = totalRecords != null && totalRecords > 0;
  const progress = hasTotal
    ? Math.min(
        terminal ? 100 : 99,
        Math.round((processed / totalRecords) * 100),
      )
    : presentation.state === 'completed' && processed > 0
      ? 100
      : null;
  const trigger = triggerLabel(triggeredBy);
  const elapsed = elapsedMs(startedAt, finishedAt, durationMs, now);
  const displayRate =
    ratePerSec != null
      ? ratePerSec * 60
      : elapsed && processed > 0
        ? (processed / elapsed) * 60_000
        : null;
  const context =
    sourceLabel && destinationLabel
      ? sourceLabel + ' to ' + destinationLabel
      : 'Syncing records for this job.';
  const progressNote =
    presentation.state === 'running'
      ? progress != null && progress >= 90
        ? 'Almost complete…'
        : etaSeconds != null
          ? 'About ' +
            Math.max(1, Math.ceil(etaSeconds / 60)) +
            ' min remaining'
          : 'Processing records…'
      : presentation.badge;
  const stateStyle = {
    running: {
      icon: RefreshCw,
      iconClass: 'border-primary/20 bg-primary/10 text-primary',
      badgeClass: 'border-success/20 bg-success/10 text-success',
      dotClass: 'bg-success',
    },
    completed: {
      icon: CheckCircle2,
      iconClass: 'border-success/20 bg-success/10 text-success',
      badgeClass: 'border-success/20 bg-success/10 text-success',
      dotClass: 'bg-success',
    },
    failed: {
      icon: XCircle,
      iconClass: 'border-destructive/20 bg-destructive/10 text-destructive',
      badgeClass: 'border-destructive/20 bg-destructive/10 text-destructive',
      dotClass: 'bg-destructive',
    },
    stopped: {
      icon: CircleStop,
      iconClass: 'border-warning/20 bg-warning/10 text-warning',
      badgeClass: 'border-warning/20 bg-warning/10 text-warning',
      dotClass: 'bg-warning',
    },
  }[presentation.state];
  const StateIcon = stateStyle.icon;
  const stats = [
    {
      label: 'Processed',
      value: processed,
      icon: Database,
      valueClassName: 'text-foreground',
      iconClassName: 'bg-muted text-muted-foreground',
    },
    {
      label: 'Created',
      value: created,
      icon: Plus,
      valueClassName: 'text-success',
      iconClassName: 'bg-success/10 text-success',
    },
    {
      label: 'Updated',
      value: updated,
      icon: Pencil,
      valueClassName: 'text-info',
      iconClassName: 'bg-info/10 text-info',
    },
    {
      label: 'Skipped',
      value: skipped,
      icon: SkipForward,
      valueClassName: 'text-muted-foreground',
      iconClassName: 'bg-muted text-muted-foreground',
    },
    {
      label: 'Failed',
      value: failed,
      icon: TriangleAlert,
      valueClassName: 'text-destructive',
      iconClassName: 'bg-destructive/10 text-destructive',
    },
  ];

  const handleDismiss = () => {
    const key = dismissalKey(jobId);
    if (key && runId) {
      try {
        window.localStorage.setItem(key, runId);
      } catch {
        // The summary still dismisses for this session when storage is unavailable.
      }
    }
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <section
      aria-live={terminal ? 'off' : 'polite'}
      aria-label={presentation.title}
      data-variant={variant}
      className={cn(
        'bg-card overflow-hidden rounded-3xl border shadow-sm',
        className,
      )}
    >
      <div className={cn(compact ? 'space-y-3 p-3.5' : 'space-y-4 p-4 sm:p-5')}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                'flex shrink-0 items-center justify-center rounded-xl border',
                compact ? 'size-8' : 'size-9',
                stateStyle.iconClass,
              )}
            >
              <StateIcon
                className={cn(
                  compact ? 'size-4' : 'size-[18px]',
                  presentation.state === 'running' &&
                    'animate-spin [animation-duration:2.5s]',
                )}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2
                  className={cn(
                    'leading-none font-bold tracking-tight',
                    compact ? 'text-sm' : 'text-base',
                  )}
                >
                  {presentation.title}
                </h2>
                <Badge
                  className={cn(
                    'gap-1 border px-2 text-[10px]',
                    stateStyle.badgeClass,
                  )}
                >
                  <span
                    className={cn('size-1.5 rounded-full', stateStyle.dotClass)}
                  />
                  {presentation.badge}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-muted-foreground px-2 text-[10px]"
                >
                  {trigger} run
                </Badge>
              </div>
              <p
                className={cn(
                  'text-muted-foreground mt-1.5 flex flex-wrap items-center gap-1.5',
                  compact ? 'text-[10px]' : 'text-xs',
                )}
              >
                {sourceLabel && destinationLabel ? (
                  <>
                    <span>{sourceLabel}</span>
                    <ArrowRight className="size-3" aria-hidden="true" />
                    <span>{destinationLabel}</span>
                  </>
                ) : (
                  context
                )}
              </p>
            </div>
          </div>

          {presentation.state === 'running' && onStop ? (
            <Button
              variant="outline"
              size={compact ? 'xs' : 'sm'}
              onClick={onStop}
              disabled={stopping}
              className="border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
            >
              {stopping ? <Spinner /> : <Square className="fill-current" />}
              {stopping ? 'Stopping…' : 'Stop sync'}
            </Button>
          ) : terminal ? (
            <Button
              variant="outline"
              size={compact ? 'xs' : 'sm'}
              onClick={handleDismiss}
              className="shrink-0"
            >
              <X /> Close
            </Button>
          ) : null}
        </div>

        <div className={cn(compact ? 'space-y-2' : 'space-y-2.5')}>
          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-3">
              <p
                className={cn(
                  'leading-none font-bold tracking-tight tabular-nums',
                  compact ? 'text-2xl' : 'text-3xl',
                )}
              >
                {progress == null ? '—' : progress + '%'}
              </p>
              <p className="text-muted-foreground truncate text-[11px] font-medium tabular-nums">
                {processed.toLocaleString()}
                {hasTotal ? ' of ' + totalRecords.toLocaleString() : ''} records
                processed
              </p>
            </div>
            <p className="text-muted-foreground hidden shrink-0 text-[11px] sm:block">
              {progressNote}
            </p>
          </div>
          {progress != null ? (
            <Progress value={progress} className={compact ? 'h-1.5' : 'h-2'} />
          ) : (
            <div
              className={cn(
                'bg-muted overflow-hidden rounded-full',
                compact ? 'h-1.5' : 'h-2',
              )}
            >
              <div
                className={cn(
                  'h-full rounded-full',
                  terminal
                    ? 'bg-muted-foreground/40 w-full'
                    : 'bg-primary/70 w-1/3 animate-pulse',
                )}
              />
            </div>
          )}
          <p className="text-muted-foreground text-right text-[10px] sm:hidden">
            {progressNote}
          </p>
        </div>

        <div
          className={cn(
            'grid grid-cols-2',
            compact ? 'gap-1.5 sm:grid-cols-3' : 'gap-2 sm:grid-cols-5',
          )}
        >
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} compact={compact} />
          ))}
        </div>

        {errorMessage && terminal && (
          <p className="bg-destructive/5 text-destructive border-destructive/15 rounded-xl border px-3 py-2 text-xs">
            {errorMessage}
          </p>
        )}
      </div>

      <div
        className={cn(
          'border-t',
          compact ? 'px-3.5 py-3' : 'px-4 py-3.5 sm:px-5',
        )}
      >
        <div
          className={cn(
            'grid gap-y-3',
            compact
              ? 'grid-cols-2 gap-x-3'
              : 'grid-cols-2 gap-x-3 sm:grid-cols-3 xl:grid-cols-5',
          )}
        >
          <MetadataItem
            icon={CalendarDays}
            label="Started at"
            value={formatDateTime(startedAt)}
            compact={compact}
          />
          {terminal ? (
            <MetadataItem
              icon={Clock3}
              label="Ended at"
              value={formatDateTime(finishedAt)}
              compact={compact}
            />
          ) : (
            <MetadataItem
              icon={Clock3}
              label="Elapsed time"
              value={elapsed == null ? 'Calculating…' : formatDuration(elapsed)}
              compact={compact}
            />
          )}
          <MetadataItem
            icon={Gauge}
            label="Processing rate"
            value={
              displayRate == null
                ? 'Calculating…'
                : Math.round(displayRate).toLocaleString() + '/min'
            }
            compact={compact}
          />
          <MetadataItem icon={Database} label="Source status" compact={compact}>
            <p className="mt-1 flex items-center gap-1.5 text-xs leading-none font-semibold">
              {sourceStatus === 'Unavailable' ? (
                <CircleAlert
                  className="text-warning size-3.5"
                  aria-hidden="true"
                />
              ) : (
                <span className="bg-success size-2 rounded-full" />
              )}
              {sourceStatus || 'Connected'}
            </p>
          </MetadataItem>
          <MetadataItem
            icon={RefreshCw}
            label="Trigger type"
            value={trigger}
            compact={compact}
          />
        </div>
      </div>
    </section>
  );
}
