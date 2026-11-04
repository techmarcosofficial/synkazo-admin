import { format } from 'date-fns';
import { Link2Off, RefreshCw, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import { useJobDetailContext } from '../context';

import type { ConflictRunResponse } from '@/api/jobs';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import {
  useConflictActionMutation,
  useJobConflictsQuery,
} from '@/queries/useJobs';
import type {
  SyncConflict,
  SyncConflictCode,
  SyncConflictStatus,
} from '@/types';

const PAGE_SIZE = 25;

const STRATEGY_LABELS: Record<string, string> = {
  source_of_truth_wins: 'Source of truth won',
  most_recently_modified_wins: 'Most recent change won',
  field_level_rules: 'Field-level rule',
  manual_review: 'Needs manual review',
};

const STATUS_LABELS: Record<SyncConflictStatus, string> = {
  pending_review: 'Needs review',
  auto_resolved: 'Resolved automatically',
  resolved_manually: 'Resolved',
};

type Action = 'resolve' | 'triggerParentSync' | 'retryRecord';

function when(value: string | null | undefined) {
  return value ? format(new Date(value), 'MMM d, HH:mm:ss') : '—';
}

function Value({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-[11px] font-medium uppercase">
        {label}
      </p>
      <p className="truncate font-mono text-xs" title={value ?? undefined}>
        {value ?? '—'}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: SyncConflictStatus }) {
  return (
    <Badge
      variant={status === 'pending_review' ? 'destructive' : 'secondary'}
      className="text-xs"
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// A record the reverse leg skipped because its parent has no counterpart on
// the platform being written to. The fix is to sync that parent first (via
// the parent object's own job), then retry the record.
function MissingParentCard({
  conflict,
  canRun,
  canEdit,
  pending,
  onAction,
}: {
  conflict: SyncConflict;
  canRun: boolean;
  canEdit: boolean;
  pending: Action | null;
  onAction: (action: Action) => void;
}) {
  const open = conflict.status === 'pending_review';
  return (
    <Alert variant={open ? 'destructive' : 'default'}>
      <Link2Off />
      <AlertTitle className="flex flex-wrap items-center gap-2">
        Missing parent record
        <StatusBadge status={conflict.status} />
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          Record <span className="font-mono">{conflict.recordId ?? '—'}</span>{' '}
          was skipped: its{' '}
          <span className="font-mono">{conflict.fieldName}</span> points to{' '}
          {conflict.parentObject} record{' '}
          <span className="font-mono">{conflict.parentRecordId}</span>, which
          hasn&apos;t been synced across yet. Sync the parent, then retry the
          record.
        </p>
        <p className="text-muted-foreground text-xs">
          First seen {when(conflict.createdAt)}
          {conflict.parentSyncRequestedAt &&
            ` · Parent sync requested ${when(conflict.parentSyncRequestedAt)}`}
        </p>
        {open && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => onAction('triggerParentSync')}
              disabled={!canRun || pending !== null}
            >
              {pending === 'triggerParentSync' && (
                <RefreshCw className="animate-spin" />
              )}
              Trigger Parent Object Sync
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction('retryRecord')}
              disabled={!canRun || pending !== null}
            >
              {pending === 'retryRecord' && (
                <RefreshCw className="animate-spin" />
              )}
              Retry record
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAction('resolve')}
              disabled={!canEdit || pending !== null}
            >
              Mark resolved
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

function FieldConflictCard({
  conflict,
  canEdit,
  pending,
  onAction,
}: {
  conflict: SyncConflict;
  canEdit: boolean;
  pending: Action | null;
  onAction: (action: Action) => void;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-sm font-medium">
            {conflict.fieldName}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {STRATEGY_LABELS[conflict.resolutionStrategy] ??
                conflict.resolutionStrategy}
            </Badge>
            <StatusBadge status={conflict.status} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Value label="Incoming" value={conflict.sourceValue} />
          <Value label="Existing" value={conflict.destValue} />
          <Value label="Kept" value={conflict.resolvedValue} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs">
            {when(conflict.createdAt)}
          </span>
          {conflict.status === 'pending_review' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction('resolve')}
              disabled={!canEdit || pending !== null}
            >
              Mark resolved
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConflictsTab() {
  const { projectId, job } = useJobDetailContext();
  const { hasPermission } = useSynkazoAuth();
  const canRun = hasPermission('job.run');
  const canEdit = hasPermission('job.edit');
  const [status, setStatus] = useState<SyncConflictStatus | 'all'>('all');
  const [errorCode, setErrorCode] = useState<SyncConflictCode | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<{
    id: string;
    action: Action;
  } | null>(null);

  const query = useJobConflictsQuery(projectId, job.id, {
    status: status === 'all' ? undefined : status,
    errorCode: errorCode === 'all' ? undefined : errorCode,
    page,
    limit: PAGE_SIZE,
  });
  const mutation = useConflictActionMutation(projectId, job.id);

  const run = async (conflict: SyncConflict, action: Action) => {
    setPending({ id: conflict.id, action });
    try {
      const result = await mutation.mutateAsync({
        action,
        conflictId: conflict.id,
      });
      const runOutcome =
        action === 'resolve' ? null : (result as ConflictRunResponse);
      if (!runOutcome) {
        showToast.success('Conflict marked resolved.');
      } else if (runOutcome.alreadyRunning || !runOutcome.success) {
        showToast.error(
          runOutcome.message ?? 'A sync is already running. Try again shortly.',
        );
      } else {
        showToast.success(
          action === 'triggerParentSync'
            ? 'Parent sync started. Retry the record once it finishes.'
            : 'Record retry started.',
        );
      }
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      showToast.error(message ?? 'Something went wrong. Please try again.');
    } finally {
      setPending(null);
    }
  };

  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const filtered = status !== 'all' || errorCode !== 'all';

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Every two-way conflict is logged here: fields where both platforms
        changed (with both values and the one kept), and records skipped because
        a parent record they point to hasn&apos;t synced yet.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as SyncConflictStatus | 'all');
            setPage(1);
          }}
        >
          <SelectTrigger size="sm" className="w-44" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending_review">Needs review</SelectItem>
            <SelectItem value="auto_resolved">
              Resolved automatically
            </SelectItem>
            <SelectItem value="resolved_manually">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={errorCode}
          onValueChange={(v) => {
            setErrorCode(v as SyncConflictCode | 'all');
            setPage(1);
          }}
        >
          <SelectTrigger size="sm" className="w-48" aria-label="Type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All conflicts</SelectItem>
            <SelectItem value="MISSING_PARENT_MAPPING">
              Missing parent records
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : !data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title={filtered ? 'No matching conflicts' : 'No conflicts yet'}
          description={
            filtered
              ? 'Try another status or type.'
              : 'When a field changes on both platforms, or a record is skipped because its parent hasn’t synced, it shows up here.'
          }
        />
      ) : (
        <>
          {data.items.map((conflict) => {
            const busy = pending?.id === conflict.id ? pending.action : null;
            return conflict.errorCode === 'MISSING_PARENT_MAPPING' ? (
              <MissingParentCard
                key={conflict.id}
                conflict={conflict}
                canRun={canRun}
                canEdit={canEdit}
                pending={busy}
                onAction={(action) => void run(conflict, action)}
              />
            ) : (
              <FieldConflictCard
                key={conflict.id}
                conflict={conflict}
                canEdit={canEdit}
                pending={busy}
                onAction={(action) => void run(conflict, action)}
              />
            );
          })}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-muted-foreground text-xs">
                Page {data.page} of {totalPages} · {data.total} conflicts
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
