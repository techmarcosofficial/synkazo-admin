import { AlertCircle, Check, X } from 'lucide-react';

import MigrationComparisonCard from './MigrationComparisonCard';
import MigrationHistoryCard from './MigrationHistoryCard';

import type { MigrationRun } from '@/api/migration';
import StatusBadge from '@/components/shared/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useEnvironmentMigration,
  type ConnectionExt,
} from '@/features/projects/hooks';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { cn } from '@/lib/utils';

function ComparisonSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </CardContent>
    </Card>
  );
}

function LatestResult({ run }: { run: MigrationRun }) {
  return (
    <Alert
      className={cn(
        run.failed === 0
          ? 'border-success/20 bg-success/10'
          : 'border-warning/20 bg-warning/10',
      )}
    >
      {run.failed === 0 ? <Check /> : <AlertCircle />}
      <AlertTitle className="flex flex-wrap items-center gap-2">
        Transfer finished
        <StatusBadge status={run.status} size="sm" />
      </AlertTitle>
      <AlertDescription>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-success inline-flex items-center gap-1">
            <Check className="size-3.5" /> {run.succeeded} created
          </span>
          <span className="text-muted-foreground">{run.skipped} skipped</span>
          <span className="text-destructive inline-flex items-center gap-1">
            <X className="size-3.5" /> {run.failed} failed
          </span>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Expand the highlighted history row for item-level results.
        </p>
      </AlertDescription>
    </Alert>
  );
}

export default function MigrationPanel({
  projectId,
  connections,
  onGoToConnections,
}: {
  projectId: string;
  connections?: ConnectionExt[];
  onGoToConnections: () => void;
}) {
  const { hasRole } = useSynkazoAuth();
  const canManage = hasRole('org_admin');
  const migration = useEnvironmentMigration(projectId, connections);

  return (
    <div className="space-y-4">
      {migration.diffLoading ? (
        <ComparisonSkeleton />
      ) : (
        <MigrationComparisonCard
          diff={migration.diff}
          diffError={migration.diffError}
          selected={migration.selected}
          filter={migration.filter}
          reversed={migration.reversed}
          migrating={migration.migrating}
          migrationError={migration.migrationError}
          canManage={canManage}
          onFilterChange={migration.setFilter}
          onReverse={migration.reverseDirection}
          onToggle={migration.toggle}
          onToggleAll={migration.toggleAll}
          onRefresh={() => void migration.loadDiff()}
          onTransfer={migration.transfer}
          onGoToConnections={onGoToConnections}
        />
      )}

      {migration.migrationError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Transfer failed</AlertTitle>
          <AlertDescription>
            {migration.migrationError} Your selection is still available so you
            can retry.
          </AlertDescription>
        </Alert>
      )}

      {migration.lastResult && <LatestResult run={migration.lastResult} />}

      <MigrationHistoryCard
        runs={migration.runs}
        loading={migration.runsLoading}
        error={migration.runsError}
        latestRunId={migration.lastResult?.id}
        onRetry={() => void migration.loadRuns()}
        onLoadRunItems={migration.loadRunItems}
      />
    </div>
  );
}
