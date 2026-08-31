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
import { Spinner } from '@/components/ui/spinner';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  useProjectConnectionsQuery,
  useWebhookEventsQuery,
} from '@/queries/useConnections';
import type {
  Connection,
  DataCheckupResult,
  WebhookEvent,
  WebhookEventStatus,
  WebhookPropertyChange,
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
function describeSource(change: WebhookPropertyChange): string {
  if (change.isOwnWrite) return 'synkazo';
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

function ChangedProperties({ changes }: { changes: WebhookPropertyChange[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1 pr-3 font-medium">Property</th>
            <th className="py-1 pr-3 font-medium">Previous</th>
            <th className="py-1 pr-3 font-medium">New</th>
            <th className="py-1 font-medium">Changed by</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c) => (
            <tr
              key={c.property}
              className="border-border/60 border-t align-top"
            >
              <td className="py-1.5 pr-3 font-mono">{c.property}</td>
              <td className="text-muted-foreground py-1.5 pr-3 font-mono">
                {c.oldValue ?? <span className="italic">empty</span>}
              </td>
              <td className="py-1.5 pr-3 font-mono">
                {c.newValue ?? <span className="italic">empty</span>}
              </td>
              <td className="py-1.5">
                <span className={cn(c.isOwnWrite && 'text-muted-foreground')}>
                  {describeSource(c)}
                </span>
                {c.changedAt && (
                  <span className="text-muted-foreground block">
                    {format(new Date(c.changedAt), 'MMM d, HH:mm:ss')}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

function EventRow({ event }: { event: WebhookEvent }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const label = statusLabel(event, cfg.label);

  const hubspotPayloadText = formatPayload(event.payload);
  const mappedPayloadText = formatPayload(event.mappedPayload);
  const destResponseText = formatPayload(event.destResponse);
  // A merged event carries the same outcome as the event it merged into
  // (including a failure) — treat it like the real underlying result rather
  // than a distinct "nothing happened here" state.
  const isFailedLike =
    event.status === 'failed' ||
    (event.status === 'coalesced' && !!event.failReason);
  const changes = event.propertyChanges ?? [];
  const related = event.relatedEvents ?? [];
  const hasDetail =
    changes.length > 0 ||
    related.length > 0 ||
    !!event.stObjectType ||
    !!hubspotPayloadText ||
    !!mappedPayloadText ||
    !!destResponseText ||
    !!event.errorMessage ||
    event.attempts > 0;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        'bg-card ring-foreground/10 overflow-hidden rounded-2xl ring-1',
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
          {event.propertyName && (
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
          {changes.length > 0 && (
            <div>
              <div className="text-muted-foreground mb-1 font-medium">
                What changed in HubSpot
              </div>
              <ChangedProperties changes={changes} />
            </div>
          )}
          {related.length > 0 && (
            <div>
              <div className="text-muted-foreground mb-1 font-medium">
                Other events HubSpot sent for this change ({related.length})
              </div>
              <ul className="space-y-1">
                {related.map((r) => (
                  <li
                    key={r.id}
                    className="text-muted-foreground flex flex-wrap gap-x-2"
                  >
                    <span className="font-mono">{r.eventType}</span>
                    {r.propertyName && (
                      <span className="font-mono">· {r.propertyName}</span>
                    )}
                    <span>
                      ·{' '}
                      {r.receivedAt
                        ? format(new Date(r.receivedAt), 'HH:mm:ss')
                        : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hubspotPayloadText && (
            <div>
              <div className="text-muted-foreground mb-1 font-medium">
                Raw HubSpot notification
              </div>
              <pre className="bg-muted/50 overflow-x-auto rounded-md p-2 font-mono">
                {hubspotPayloadText}
              </pre>
            </div>
          )}
          {mappedPayloadText && (
            <div>
              <div className="text-muted-foreground mb-1 font-medium">
                Payload sent
              </div>
              <pre className="bg-muted/50 overflow-x-auto rounded-md p-2 font-mono">
                {mappedPayloadText}
              </pre>
            </div>
          )}
          {destResponseText && (
            <div>
              <div className="text-muted-foreground mb-1 font-medium">
                Destination response
              </div>
              <pre className="bg-muted/50 overflow-x-auto rounded-md p-2 font-mono">
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
    <div className="bg-card ring-foreground/10 space-y-3 rounded-2xl p-4 ring-1">
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
              <div key={s.label} className="bg-muted/40 rounded-xl p-3">
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
          <EventRow key={e.id} event={e} />
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
