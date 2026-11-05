import { format } from 'date-fns';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  GitMerge,
  Radio,
  SearchCheck,
  SkipForward,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

import { useJobDetailContext } from '../context';

import { jobsApi } from '@/api/jobs';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PaginationBar from '@/components/shared/PaginationBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  useProjectConnectionsQuery,
  useWebhookEventChangesQuery,
  useWebhookEventsQuery,
} from '@/queries/useConnections';
import type {
  Connection,
  DataCheckupResult,
  WebhookEvent,
  WebhookEventStatus,
  WebhookPropertyChange,
  WebhookValueChange,
} from '@/types';

const STATUS_CONFIG: Record<
  WebhookEventStatus,
  { label: string; iconClassName: string; icon: typeof Clock }
> = {
  pending: { label: 'Pending', iconClassName: 'text-info', icon: Clock },
  processed: {
    label: 'Processed',
    iconClassName: 'text-success',
    icon: CheckCircle2,
  },
  skipped: {
    label: 'Skipped',
    iconClassName: 'text-muted-foreground',
    icon: SkipForward,
  },
  suppressed_echo: {
    label: 'Skipped — changed by synkazo',
    iconClassName: 'text-muted-foreground',
    icon: Radio,
  },
  failed: {
    label: 'Failed',
    iconClassName: 'text-destructive',
    icon: XCircle,
  },
  coalesced: {
    label: 'Part of the same change',
    iconClassName: 'text-muted-foreground',
    icon: GitMerge,
  },
};

function formatPayload(
  payload: Record<string, unknown> | string | null,
): string | null {
  if (!payload) return null;
  if (typeof payload === 'string') {
    try {
      return JSON.stringify(JSON.parse(payload), null, 2);
    } catch {
      return payload;
    }
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return null;
  }
}

// HubSpot records attribution as a source type plus an opaque source id
// ('userId:82913505' for a person, an app id for an integration). Render the
// part a human can act on.
function describeSource(
  change: Pick<WebhookPropertyChange, 'isOwnWrite' | 'sourceType' | 'sourceId'>,
): string {
  if (change.isOwnWrite) return 'Synkazo';
  switch (change.sourceType) {
    case 'CRM_UI':
      return change.sourceId?.startsWith('userId:')
        ? `HubSpot user ${change.sourceId.slice('userId:'.length)}`
        : 'HubSpot user';
    case 'INTEGRATION':
      return `Another integration (app ${change.sourceId ?? 'unknown'})`;
    case 'IMPORT':
      return 'HubSpot import';
    case 'AUTOMATION_PLATFORM':
      return 'HubSpot workflow';
    case null:
    case undefined:
      return 'Unknown';
    default:
      return change.sourceType;
  }
}

// null and '' are empty; "0" and "false" are real values and show as-is.
function ChangeValue({ value }: { value: string | null }) {
  return value === null || value === '' ? (
    <span className="text-muted-foreground italic">Empty</span>
  ) : (
    <>{value}</>
  );
}

// One line under the table: who made the change and when. Every row of one
// burst usually shares this, so it isn't repeated per property.
function changeAttribution(changes: WebhookValueChange[]): string {
  const sources = [...new Set(changes.map(describeSource))];
  const times = changes
    .map((c) => (c.changedAt ? new Date(c.changedAt).getTime() : NaN))
    .filter(Number.isFinite);
  const when =
    times.length > 0
      ? ` · ${format(Math.max(...times), 'MMM d, HH:mm:ss')}`
      : '';
  return `Changed by ${sources.join(', ')}${when}`;
}

// What changed, read live from HubSpot's property history when the event is
// opened: property, previous value, new value. Nothing else.
function ValueChanges({
  projectId,
  connId,
  eventId,
}: {
  projectId: string;
  connId: string;
  eventId: string;
}) {
  const query = useWebhookEventChangesQuery(projectId, connId, eventId, true);

  if (query.isLoading) {
    return (
      <div className="space-y-2" aria-label="Loading changed values">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <p className="text-muted-foreground">
        Values could not be loaded from HubSpot right now.
      </p>
    );
  }
  const changes = query.data?.changes ?? [];
  if (query.data?.unavailableReason) {
    return (
      <p className="text-muted-foreground">{query.data.unavailableReason}</p>
    );
  }
  if (changes.length === 0) {
    return <p className="text-muted-foreground">No property values changed.</p>;
  }

  return (
    <div className="space-y-1.5">
      <div className="overflow-x-auto">
        <Table className="w-full text-left text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="px-2 py-1.5">Property</TableHead>
              <TableHead className="px-2 py-1.5">Previous value</TableHead>
              <TableHead className="px-2 py-1.5">New value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {changes.map((c) => (
              <TableRow key={c.property} className="align-top">
                <TableCell
                  className="px-2 py-1.5 font-medium break-words whitespace-normal"
                  title={c.property}
                >
                  {c.label}
                </TableCell>
                <TableCell className="text-muted-foreground px-2 py-1.5 break-words whitespace-normal">
                  <ChangeValue value={c.oldValue} />
                </TableCell>
                <TableCell className="px-2 py-1.5 break-words whitespace-normal">
                  <ChangeValue value={c.newValue} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-muted-foreground">{changeAttribution(changes)}</p>
    </div>
  );
}

// suppressed_echo covers two genuinely different outcomes and they must not
// read the same: the change was ours coming back around, or the source platform
// already held these values so there was nothing to write. The property
// attribution is what separates them.
function statusLabel(event: WebhookEvent, fallback: string): string {
  if (event.status !== 'suppressed_echo') return fallback;
  const attributed = (event.propertyChanges ?? []).filter(
    (c) => c.sourceType !== null,
  );
  if (attributed.length > 0 && attributed.every((c) => c.isOwnWrite)) {
    return 'Skipped — changed by synkazo';
  }
  return 'Already in sync';
}

function EventRow({
  event,
  projectId,
  connId,
}: {
  event: WebhookEvent;
  projectId: string;
  connId: string;
}) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const label = statusLabel(event, cfg.label);

  const destResponseText = formatPayload(event.destResponse);
  // A merged event carries the same outcome as the event it merged into
  // (including a failure) — treat it like the real underlying result rather
  // than a distinct "nothing happened here" state.
  const isFailedLike =
    event.status === 'failed' ||
    (event.status === 'coalesced' && !!event.failReason);
  const related = event.relatedEvents ?? [];
  // Values are only worth fetching when the event reported property changes;
  // a deletion has none.
  const hasPropertyChanges =
    (event.propertyChanges?.length ?? 0) > 0 ||
    !!event.propertyName ||
    related.some((r) => !!r.propertyName);
  // The destination's response only explains something when the write failed
  // or is being retried.
  const showDestResponse =
    !!destResponseText && (isFailedLike || event.status === 'pending');
  const hasDetail =
    hasPropertyChanges || !!event.errorMessage || showDestResponse;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        'bg-card border-border overflow-hidden rounded-4xl border shadow-none',
        isFailedLike && 'ring-destructive/30',
      )}
    >
      <CollapsibleTrigger
        disabled={!hasDetail}
        className={cn(
          'flex w-full flex-col gap-2 p-4 text-left',
          hasDetail && 'hover:bg-muted/40 transition-colors',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {hasDetail &&
              (open ? (
                <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
              ) : (
                <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
              ))}
            <span className="font-mono text-sm font-medium">
              {event.eventType}
            </span>
          </div>
          <Badge className="bg-muted text-muted-foreground shrink-0 gap-1">
            <Icon className={cn('size-3', cfg.iconClassName)} />
            {label}
            {event.attempts > 1 && ` · attempt ${event.attempts}`}
          </Badge>
        </div>
        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>
            Object: <span className="font-mono">{event.objectType}</span> #
            {event.objectId}
          </span>
          {event.propertyName && related.length === 0 && (
            <span>
              Property: <span className="font-mono">{event.propertyName}</span>
            </span>
          )}
          {event.stObjectType && (
            <span>
              → <span className="font-mono">{event.stObjectType}</span>
              {event.stRecordId && <> #{event.stRecordId}</>}
            </span>
          )}
        </div>
        <div className="text-muted-foreground text-xs">
          Received{' '}
          {event.receivedAt
            ? format(new Date(event.receivedAt), 'MMM d, HH:mm:ss')
            : '—'}
          {event.processedAt && (
            <> · Resolved {format(new Date(event.processedAt), 'HH:mm:ss')}</>
          )}
          {event.status === 'pending' && event.nextAttemptAt && (
            <>
              {' '}
              · Next retry {format(new Date(event.nextAttemptAt), 'HH:mm:ss')}
            </>
          )}
          {related.length > 0 && (
            <> · {related.length + 1} events for this change</>
          )}
        </div>
      </CollapsibleTrigger>

      {hasDetail && (
        <CollapsibleContent className="border-border/60 space-y-3 border-t px-4 py-3 text-xs">
          {event.errorMessage && (
            <div>
              <div className="text-muted-foreground mb-1 font-medium">
                {isFailedLike
                  ? 'Error'
                  : event.status === 'skipped'
                    ? 'Reason'
                    : 'Detail'}
                {event.failReason && (
                  <span className="ml-1 font-mono">({event.failReason})</span>
                )}
              </div>
              <p
                className={cn(
                  'font-mono whitespace-pre-wrap',
                  isFailedLike ? 'text-destructive' : 'text-foreground',
                )}
              >
                {event.errorMessage}
              </p>
            </div>
          )}
          {hasPropertyChanges && open && (
            <ValueChanges
              projectId={projectId}
              connId={connId}
              eventId={event.id}
            />
          )}
          {showDestResponse && (
            <div>
              <div className="text-muted-foreground mb-1 font-medium">
                Destination response
              </div>
              <pre className="bg-muted/50 overflow-x-auto rounded-4xl border p-2 font-mono">
                {destResponseText}
              </pre>
            </div>
          )}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

// Read-only "how do source & destination compare right now" check. Runs on
// demand, never writes/syncs — the sanctioned way to inspect pre-existing data
// now that first-connection auto-backsync is off (items 3 + 4).
function DataCheckupPanel({
  projectId,
  jobId,
}: {
  projectId: string;
  jobId: string;
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DataCheckupResult | null>(null);

  const run = () => {
    setRunning(true);
    jobsApi
      .dataCheckup(projectId, jobId)
      .then(setResult)
      .catch((err) => {
        const e = err as { response?: { data?: { message?: string } } };
        showToast.error(
          e.response?.data?.message ?? 'Data checkup failed. Please try again.',
        );
      })
      .finally(() => setRunning(false));
  };

  const stats: { label: string; value: number; className: string }[] = result
    ? [
        { label: 'Matched', value: result.matched, className: 'text-success' },
        {
          label: 'Differing',
          value: result.differing,
          className: 'text-warning',
        },
        {
          label: `Only in ${result.sourcePlatform}`,
          value: result.sourceOnly,
          className: 'text-foreground',
        },
        {
          label: `Only in ${result.destPlatform}`,
          value: result.destOnly,
          className: 'text-foreground',
        },
      ]
    : [];

  return (
    <div className="bg-card border-border space-y-3 rounded-4xl border p-4 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Data Checkup</p>
          <p className="text-muted-foreground text-xs">
            Compare source and destination records. Read-only — this never
            creates, updates, or syncs anything.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={running}>
          {running ? <Spinner /> : <SearchCheck />}
          {running ? 'Checking…' : 'Data Checkup'}
        </Button>
      </div>

      {result && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-muted/40 rounded-4xl border p-3">
                <div
                  className={cn(
                    'text-xl font-semibold tabular-nums',
                    s.className,
                  )}
                >
                  {s.value}
                </div>
                <div className="text-muted-foreground text-xs">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            Compared {result.sourceSampled} {result.sourcePlatform} and{' '}
            {result.destSampled} {result.destPlatform} records
            {result.capped
              ? ` (sampled — first ${result.cap} per side; counts are a lower bound)`
              : ''}
            . Matched on{' '}
            {result.matchFields.map((m) => m.sourceField).join(', ') || '—'}.
            Checked {format(new Date(result.checkedAt), 'MMM d, HH:mm:ss')}.
          </p>
        </div>
      )}
    </div>
  );
}

export default function WebhookEventsTab() {
  const { projectId, job } = useJobDetailContext();
  const connectionsQuery = useProjectConnectionsQuery(projectId);
  const connections: Connection[] = connectionsQuery.data ?? [];
  const hubspotConnection = connections.find((c) => c.platformId === 'hubspot');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const eventsQuery = useWebhookEventsQuery(
    projectId,
    hubspotConnection?.id,
    page,
    pageSize,
  );

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  if (connectionsQuery.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!hubspotConnection) {
    return (
      <EmptyState
        icon={Radio}
        title="No HubSpot connection"
        description="This project doesn't have a HubSpot connection yet — webhook events are tracked per HubSpot connection."
      />
    );
  }

  if (eventsQuery.isError) {
    return <ErrorState onRetry={() => eventsQuery.refetch()} />;
  }

  if (eventsQuery.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const events = eventsQuery.data?.data ?? [];
  const total = eventsQuery.data?.total ?? events.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (events.length === 0) {
    return (
      <div className="space-y-4">
        <DataCheckupPanel projectId={projectId} jobId={job.id} />
        <EmptyState
          icon={Radio}
          title="No webhook events yet"
          description="Inbound HubSpot webhook events (property changes, creations, deletions) will show up here once a subscription is registered and something changes in HubSpot."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DataCheckupPanel projectId={projectId} jobId={job.id} />
      <div className="space-y-3">
        <p className="text-muted-foreground text-xs">
          Every inbound HubSpot webhook event lands here — nothing is dropped.
          Expand a row to see exactly which properties changed, their previous
          and new values, and who made each change. "Processed" means it was
          written to the other platform. "Skipped — changed by synkazo" means
          the change was this integration's own write coming back, so writing it
          again would just echo; "Already in sync" means the other platform
          already held these values. "Pending" events keep retrying
          automatically and are never given up on. HubSpot sends one event per
          property, so a single edit is grouped into one row here with the rest
          listed inside.
        </p>
        {events.map((e) => (
          <EventRow
            key={e.id}
            event={e}
            projectId={projectId}
            connId={hubspotConnection.id}
          />
        ))}
        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[20, 50, 100]}
        />
      </div>
    </div>
  );
}
