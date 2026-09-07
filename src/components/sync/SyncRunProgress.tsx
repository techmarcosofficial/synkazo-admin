import { RefreshCw, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface SyncRunProgressProps {
  totalRecords?: number | null;
  processedRecords?: number | null;
  createdCount?: number | null;
  updatedCount?: number | null;
  skippedCount?: number | null;
  failedCount?: number | null;
  etaSeconds?: number | null;
  description?: string;
  onStop?: () => void;
  stopping?: boolean;
  className?: string;
}

/**
 * The live result of any manual sync. A limited run and an all-records run use
 * different launch settings, but both are one sync operation once they start.
 */
export default function SyncRunProgress({
  totalRecords,
  processedRecords = 0,
  createdCount = 0,
  updatedCount = 0,
  skippedCount = 0,
  failedCount = 0,
  etaSeconds,
  description,
  onStop,
  stopping = false,
  className,
}: SyncRunProgressProps) {
  const hasTotal = totalRecords != null && totalRecords > 0;
  const processed = processedRecords ?? 0;
  const created = createdCount ?? 0;
  const updated = updatedCount ?? 0;
  const skipped = skippedCount ?? 0;
  const failed = failedCount ?? 0;
  const progress = hasTotal
    ? Math.min(99, Math.round((processed / totalRecords) * 100))
    : null;
  const stats = [
    ['Processed', processed, 'text-primary'],
    ['Created', created, 'text-success'],
    ['Updated', updated, 'text-info'],
    ['Skipped', skipped, 'text-foreground'],
    ['Failed', failed, 'text-destructive'],
  ] as const;

  return (
    <section
      className={cn('bg-muted/30 space-y-4 rounded-4xl border p-4', className)}
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
          <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Sync running</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {hasTotal
              ? `${processed.toLocaleString()} of ${totalRecords.toLocaleString()} records processed`
              : description ||
                `${processed.toLocaleString()} records processed`}
          </p>
          {hasTotal && description && (
            <p className="text-muted-foreground mt-0.5 text-[10px]">
              {description}
            </p>
          )}
        </div>
        {progress != null && (
          <span className="text-primary text-sm font-bold tabular-nums">
            {progress}%
          </span>
        )}
      </div>

      {progress != null ? (
        <Progress value={progress} className="h-1.5" />
      ) : (
        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
          <div className="bg-primary/60 h-full w-1/3 animate-pulse rounded-full" />
        </div>
      )}

      {progress == null && (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Spinner className="size-3.5" />
          Preparing live progress from the source…
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stats.map(([label, value, tone]) => (
          <div
            key={label}
            className="bg-background/60 flex flex-col rounded-3xl border px-3 py-2"
          >
            <span className={cn('text-sm font-bold', tone)}>
              {value.toLocaleString()}
            </span>
            <span className="text-muted-foreground text-[10px]">{label}</span>
          </div>
        ))}
      </div>

      {etaSeconds != null && (
        <p className="text-muted-foreground text-xs">
          About {Math.max(1, Math.ceil(etaSeconds / 60))} min remaining
        </p>
      )}

      {onStop && (
        <Button
          variant="outline"
          onClick={onStop}
          disabled={stopping}
          className="border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive w-full"
        >
          {stopping ? <Spinner /> : <Square className="fill-current" />}
          {stopping ? 'Stopping…' : 'Stop sync'}
        </Button>
      )}
    </section>
  );
}
