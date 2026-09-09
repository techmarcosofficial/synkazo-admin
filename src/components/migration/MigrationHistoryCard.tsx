import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  RefreshCw,
  X,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

import type { MigrationRun, MigrationRunItem } from '@/api/migration';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function RunMetric({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {icon}
      {value} {label}
    </span>
  );
}

function RunRow({
  run,
  highlighted,
  onLoadRunItems,
}: {
  run: MigrationRun;
  highlighted: boolean;
  onLoadRunItems: (runId: string) => Promise<MigrationRunItem[]>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<MigrationRunItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await onLoadRunItems(run.id));
    } catch {
      setError('Could not load item details.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && items === null && !loading) await loadItems();
  };

  return (
    <div
      className={cn('border-t first:border-t-0', highlighted && 'bg-primary/5')}
    >
      <button
        type="button"
        className="hover:bg-muted/40 focus-visible:ring-ring grid w-full grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
        onClick={toggle}
        aria-expanded={expanded}
      >
        {loading ? (
          <RefreshCw className="text-muted-foreground mt-0.5 size-4 animate-spin sm:mt-0" />
        ) : expanded ? (
          <ChevronDown className="text-muted-foreground mt-0.5 size-4 sm:mt-0" />
        ) : (
          <ChevronRight className="text-muted-foreground mt-0.5 size-4 sm:mt-0" />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold capitalize">
              {run.fromEnvironment} <ArrowRight className="inline size-3" />{' '}
              {run.toEnvironment}
            </span>
            {highlighted && <Badge>Latest result</Badge>}
            <span className="sm:hidden">
              <StatusBadge status={run.status} size="sm" />
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {new Date(run.startedAt ?? run.createdAt).toLocaleString()}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs sm:hidden">
            <RunMetric
              icon={<Check className="size-3" />}
              label="created"
              value={run.succeeded}
              className="text-success"
            />
            <RunMetric label="skipped" value={run.skipped} icon={null} />
            <RunMetric
              icon={<X className="size-3" />}
              label="failed"
              value={run.failed}
              className="text-destructive"
            />
          </div>
        </div>
        <div className="hidden items-center justify-end gap-3 text-xs sm:flex">
          <RunMetric
            icon={<Check className="size-3" />}
            label="created"
            value={run.succeeded}
            className="text-success"
          />
          <RunMetric label="skipped" value={run.skipped} icon={null} />
          <RunMetric
            icon={<X className="size-3" />}
            label="failed"
            value={run.failed}
            className="text-destructive"
          />
          <StatusBadge status={run.status} size="sm" />
        </div>
      </button>

      {expanded && (
        <div className="bg-muted/30 border-t px-4 py-3">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={loadItems}>
                  Retry details
                </Button>
              </AlertDescription>
            </Alert>
          ) : items === null || loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No item details were recorded for this run.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-card grid gap-2 rounded-xl border px-3 py-2 text-xs sm:grid-cols-[auto_auto_minmax(0,1fr)] sm:items-center"
                >
                  <StatusBadge status={item.status} size="xs" />
                  <Badge variant="secondary" className="w-fit capitalize">
                    {item.kind.replace(/_/g, ' ')}
                  </Badge>
                  <div className="min-w-0">
                    <p className="truncate font-mono">{item.displayName}</p>
                    {item.errorMessage && (
                      <p className="text-destructive mt-1">
                        {item.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MigrationHistoryCard({
  runs,
  loading,
  error,
  latestRunId,
  onRetry,
  onLoadRunItems,
}: {
  runs: MigrationRun[];
  loading: boolean;
  error: string | null;
  latestRunId?: string;
  onRetry: () => void;
  onLoadRunItems: (runId: string) => Promise<MigrationRunItem[]>;
}) {
  return (
    <Card>
      <CardHeader className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="text-muted-foreground size-4" /> Transfer history
          </CardTitle>
          <CardDescription className="mt-1">
            Recent configuration transfers and item-level outcomes.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={loading}
        >
          <RefreshCw className={cn(loading && 'animate-spin')} /> Refresh
          history
        </Button>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {error ? (
          <div className="px-6 pb-6">
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : loading && runs.length === 0 ? (
          <div className="space-y-3 px-6 pb-6">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : runs.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState
              icon={Clock}
              title="No transfer history"
              description="Completed configuration transfers will appear here with created, skipped, and failed item counts."
            />
          </div>
        ) : (
          runs.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              highlighted={run.id === latestRunId}
              onLoadRunItems={onLoadRunItems}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
