import { format } from 'date-fns';
import { ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useJobDetailContext } from '../context';

import { jobsApi } from '@/api/jobs';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SyncConflict } from '@/types';

const STRATEGY_LABELS: Record<string, string> = {
  source_of_truth_wins: 'Source of truth won',
  most_recently_modified_wins: 'Most recent change won',
  field_level_rules: 'Field-level rule',
  manual_review: 'Needs manual review',
};

function ConflictRow({ conflict }: { conflict: SyncConflict }) {
  return (
    <Card className="shadow-none">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-medium">
            {conflict.fieldName}
          </span>
          <Badge variant="secondary" className="text-xs">
            {STRATEGY_LABELS[conflict.resolutionStrategy] ??
              conflict.resolutionStrategy}
          </Badge>
        </div>
        <div className="text-muted-foreground text-xs">
          Suppressed value:{' '}
          <span className="font-mono">{conflict.destValue ?? '—'}</span>
        </div>
        <div className="text-muted-foreground text-xs">
          {conflict.createdAt
            ? format(new Date(conflict.createdAt), 'MMM d, HH:mm:ss')
            : '—'}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConflictsTab() {
  const { projectId, job } = useJobDetailContext();
  const [conflicts, setConflicts] = useState<SyncConflict[] | null>(null);
  const [error, setError] = useState(false);

  const load = () => {
    setConflicts(null);
    setError(false);
    jobsApi
      .getConflicts(projectId, job.id)
      .then(setConflicts)
      .catch(() => setError(true));
  };

  useEffect(() => {
    load();
  }, [projectId, job.id]);

  if (error) return <ErrorState onRetry={load} />;

  if (conflicts === null) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No conflicts yet"
        description="When a field changes on both platforms before the next sync, the source-of-truth side wins and the suppressed value is logged here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Every time the source of truth overrode a change from the other
        platform, it's logged here — the losing value is never silently dropped.
      </p>
      {conflicts.map((c) => (
        <ConflictRow key={c.id} conflict={c} />
      ))}
    </div>
  );
}
