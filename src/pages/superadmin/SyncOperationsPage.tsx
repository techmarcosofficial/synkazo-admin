import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CircleStop,
  Clock3,
  Cpu,
  RefreshCw,
  Server,
} from 'lucide-react';
import ManagementCardHeader from '@/components/shared/ManagementCardHeader';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import StatusBadge from '@/components/shared/StatusBadge';
import SyncRunProgress from '@/components/sync/SyncRunProgress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useMonitorVisibility,
  useSyncOperationRun,
  useSyncOperations,
} from '@/queries/useSyncOperations';
import type {
  MonitorProcess,
  MonitorRun,
  MonitorRunStatus,
} from '@/types/syncOperations';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const count = (value: number | null | undefined) =>
  value == null ? '—' : value.toLocaleString();
const label = (value: string) => value.replace(/_/g, ' ');
export function progressLabel(run: MonitorRun) {
  const p = run.progress;
  if (p.attempted == null) return 'Waiting for progress';
  return `${count(p.attempted)}${p.total == null ? '' : ` / ${count(p.total)}`} attempted`;
}
const date = (value: string) => new Date(value).toLocaleTimeString();
function originLabel(value: string) {
  const origin = value.split(':', 1)[0].toLowerCase();
  if (['manual', 'sync_all', 'limit_sync'].includes(origin)) return 'Manual';
  if (['cron', 'schedule', 'scheduled'].includes(origin)) return 'Scheduled';
  if (origin === 'webhook') return 'Webhook';
  if (origin === 'api') return 'API';
  if (origin === 'priority_queue') return 'Priority queue';
  if (['resume', 'resumed'].includes(origin)) return 'Resumed';
  if (['retry', 'retried'].includes(origin)) return 'Retry';
  return 'Other';
}
function elapsed(run: MonitorRun) {
  const seconds = Math.max(
    0,
    Math.round(
      (Date.parse(run.finishedAt ?? new Date().toISOString()) -
        Date.parse(run.startedAt)) /
        1000,
    ),
  );
  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function ProcessResourceCard({
  role,
  processes,
  loading,
}: {
  role: MonitorProcess['role'];
  processes: MonitorProcess[];
  loading: boolean;
}) {
  const worker = role === 'queue_worker';
  const title = worker ? 'Sync workers' : 'API servers';
  return (
    <Card
      surface="outer"
      size="sm"
      role="region"
      aria-label={title}
      data-resource-card={role}
      className="min-w-0 gap-2 py-2.5"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg">
              <Server className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="text-muted-foreground text-[11px]">
                {worker
                  ? 'Queued and scheduled syncs'
                  : 'API requests and webhook syncs'}
              </p>
            </div>
          </div>
          <Badge variant="secondary">
            {loading
              ? 'Loading…'
              : processes.length
                ? `${processes.length} ${processes.length === 1 ? 'process' : 'processes'}`
                : 'Unavailable'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!processes.length ? (
          <p className="text-muted-foreground py-1 text-sm">
            {loading
              ? 'Loading resource usage…'
              : 'No recent measurements available.'}
          </p>
        ) : (
          <div className="divide-border/60 divide-y">
            {processes.map((process) => {
              const stale = Date.now() - Date.parse(process.sampledAt) > 15000;
              return (
                <div
                  key={process.id}
                  className="space-y-2 py-2 first:pt-0 last:pb-0"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <p className="text-muted-foreground text-xs">
                          Memory in use
                        </p>
                        <p className="text-lg font-semibold tabular-nums">
                          {count(Math.round(process.rssMb))}{' '}
                          <span className="text-muted-foreground text-xs font-normal">
                            MB
                          </span>
                        </p>
                      </div>
                      {process.memoryLimitMb != null &&
                        process.memoryLimitMb > 0 && (
                          <Progress
                            value={Math.min(
                              100,
                              (process.rssMb / process.memoryLimitMb) * 100,
                            )}
                            aria-label={`Memory usage for ${process.id}`}
                            className="h-[3px]"
                          />
                        )}
                      <p className="text-muted-foreground text-[11px]">
                        {process.memoryLimitMb == null
                          ? 'Container limit unknown'
                          : `Container limit ${count(Math.round(process.memoryLimitMb))} MB`}
                      </p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <p className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                          <Cpu className="size-3" aria-hidden="true" />
                          CPU usage
                        </p>
                        <p className="text-lg font-semibold tabular-nums">
                          {count(process.cpuCorePercent)}
                          <span className="text-muted-foreground ml-0.5 text-xs font-normal">
                            %
                          </span>
                        </p>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        100% = one full CPU core
                      </p>
                    </div>
                  </div>
                  <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]">
                    <span>
                      {process.executions.length}
                      {process.truncated ? '+' : ''} observed{' '}
                      {process.executions.length === 1 && !process.truncated
                        ? 'sync'
                        : 'syncs'}{' '}
                      <span className="text-muted-foreground/60">·</span>{' '}
                      <span title={process.id}>{process.id.slice(0, 8)}</span>
                    </span>
                    {stale ? (
                  <StatusBadge status="stale" label="Sample outdated" />
                    ) : (
                      <span>Updated {date(process.sampledAt)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SyncRunListItem({
  run,
  onDetails,
}: {
  run: MonitorRun;
  onDetails: (id: string) => void;
}) {
  const failed = ['failed', 'error'].includes(run.status);
  const stopped = [
    'cancelled',
    'canceled',
    'paused',
    'stopped',
    'limit_reached',
    'time_limit_reached',
  ].includes(run.status);
  const completed = run.status === 'completed';
  const waiting = ['queued', 'pending', 'preparing'].includes(run.status);
  const issues =
    run.status === 'partial' ||
    (completed &&
      ((run.progress.failed ?? 0) > 0 || (run.progress.skipped ?? 0) > 0));
  const finished = completed || run.status === 'partial';
  const Icon = failed
    ? CircleAlert
    : stopped
      ? CircleStop
      : finished
        ? CheckCircle2
        : waiting
          ? Clock3
          : RefreshCw;
  const tone = failed
    ? 'text-destructive bg-destructive/10 border-destructive/20'
    : finished || stopped || waiting
      ? 'text-foreground bg-muted border-border/70'
      : 'text-primary bg-primary/10 border-primary/20';
  const progressTone = failed
    ? 'text-destructive'
    : stopped
      ? 'text-warning'
      : finished
        ? 'text-success'
        : 'text-primary';
  const percent =
    run.progress.attempted != null &&
    run.progress.total != null &&
    run.progress.total > 0
      ? Math.min(
          100,
          Math.round((run.progress.attempted / run.progress.total) * 100),
        )
      : null;
  const batch = run.progress.currentBatch ?? run.progress.completedBatches;
  const batches =
    batch == null
      ? '—'
      : `${count(batch)}${run.progress.totalBatches == null ? '' : `/${count(run.progress.totalBatches)}`}`;
  const batchLabel =
    batch == null
      ? 'Batch progress unavailable'
      : run.progress.totalBatches == null
        ? `Batch ${count(batch)}`
        : `${count(batch)} of ${count(run.progress.totalBatches)} batches`;
  return (
    <li
      data-sync-run-card={run.id}
      className="bg-card border-border/70 @container overflow-hidden rounded-2xl border"
    >
      <div
        data-slot="monitor-run-header"
        className="grid min-w-0 items-center gap-2 px-3 py-2 @min-[38rem]:grid-cols-[minmax(0,1fr)_auto] @min-[56rem]:grid-cols-[minmax(0,320px)_minmax(0,1fr)_auto] @min-[56rem]:gap-3"
      >
        <div
          data-slot="monitor-run-identity"
          className="flex min-w-0 items-center gap-3"
        >
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${tone}`}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h3
                title={run.jobName}
                className="text-foreground min-w-0 text-sm leading-tight font-semibold break-words"
              >
                {run.jobName}
              </h3>
              <StatusBadge status={issues ? 'partial' : run.status} size="sm" />
            </div>
            <p
              title={`${run.source ?? 'Direction unavailable'}${run.destination ? ` → ${run.destination}` : ''}`}
              className="text-muted-foreground mt-0.5 truncate text-xs"
            >
              {run.source ?? 'Direction unavailable'}
              {run.destination && ` → ${run.destination}`}
            </p>
          </div>
        </div>
        <div
          data-slot="monitor-run-progress"
          className="min-w-0 space-y-1.5 @min-[38rem]:col-span-2 @min-[38rem]:row-start-2 @min-[56rem]:col-span-1 @min-[56rem]:col-start-2 @min-[56rem]:row-start-1"
        >
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5">
              <span className="text-foreground font-medium">{batchLabel}</span>
              <span aria-hidden="true" className="text-muted-foreground/60">
                ·
              </span>
              <span className={`font-semibold ${progressTone}`}>
                {percent == null ? 'Total unknown' : `${percent}% complete`}
              </span>
            </div>
            <span className="text-muted-foreground tabular-nums">
              {progressLabel(run)}
            </span>
          </div>
          <Progress
            value={percent}
            aria-label={`Overall progress for ${run.jobName}`}
            className={`h-[4px] ${failed ? '[&_[data-slot=progress-indicator]]:bg-destructive' : stopped ? '[&_[data-slot=progress-indicator]]:bg-warning' : finished ? '[&_[data-slot=progress-indicator]]:bg-success' : ''}`}
          />
        </div>
        <div
          data-slot="monitor-run-actions"
          className="flex flex-wrap items-center justify-between gap-2 @min-[38rem]:col-start-2 @min-[38rem]:row-start-1 @min-[38rem]:justify-end @min-[56rem]:col-start-3"
        >
          <div className="flex items-center gap-1.5">
            <div className="bg-muted/40 border-border/60 hidden items-center gap-1.5 rounded-lg border px-2 py-1 @min-[24rem]:flex">
              <span className="text-muted-foreground text-[11px]">
                Completion
              </span>
              <strong className="text-foreground text-xs font-semibold tabular-nums">
                {percent == null ? '—' : `${percent}%`}
              </strong>
            </div>
            <div className="bg-muted/40 border-border/60 flex items-center gap-1.5 rounded-lg border px-2 py-1">
              <span className="text-muted-foreground text-[11px]">Batches</span>
              <strong className="text-foreground text-xs font-semibold tabular-nums">
                {batches}
              </strong>
            </div>
          </div>
          <Button
            variant="outline"
            size="xs"
            onClick={() => onDetails(run.id)}
            aria-label={`View details for ${run.jobName}`}
          >
            View details
          </Button>
        </div>
      </div>
      <div className="bg-muted/40 border-border/60 text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t px-3 py-1.5 text-xs">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
          <span className="min-w-0 break-words">
            Organisation:{' '}
            <span className="text-foreground font-medium">
              {run.organisationName}
            </span>
          </span>
          <span className="min-w-0 break-words">
            Project:{' '}
            <span className="text-foreground font-medium">
              {run.projectName}
            </span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
          <span>{originLabel(run.trigger)}</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3" aria-hidden="true" />
            {elapsed(run)}
          </span>
          {run.progress.failed != null && run.progress.failed > 0 && (
            <span className="text-destructive">
              {count(run.progress.failed)} failed
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function RunDrawer({
  id,
  visible,
  close,
}: {
  id: string | null;
  visible: boolean;
  close: () => void;
}) {
  const query = useSyncOperationRun(id, visible);
  const run = query.data?.data[0];
  const p = run?.progress;
  const jobPath = run
    ? `/super-admin/organisations/${run.organisationId}/projects/${run.projectId}/jobs/${run.jobId}`
    : '';
  return (
    <Sheet
      open={!!id}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Sync run progress</SheetTitle>
          <SheetDescription>
            {run
              ? `${run.organisationName} · ${run.projectName} · ${run.jobName}`
              : 'Execution details and latest available progress.'}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          {query.isLoading && <p role="status">Loading run progress…</p>}
          {query.isError && (
            <p role="alert">
              Run details could not be loaded.{' '}
              <Button variant="link" onClick={() => void query.refetch()}>
                Retry
              </Button>
            </p>
          )}
          {run && p && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={run.status} label={label(run.status)} />
                <span className="text-muted-foreground text-xs">
                  {run.status !== 'running' && !run.executionObserved
                    ? 'Final snapshot'
                    : visible && query.connected
                      ? 'Live connection'
                      : 'Snapshot · live connection unavailable'}
                </span>
              </div>
              {!visible ? (
                <p>Live updates are suspended while this tab is hidden.</p>
              ) : p.source === 'unavailable' ? (
                <p>Progress measurements are not available yet.</p>
              ) : (
                <SyncRunProgress
                  embedded
                  key={run.id}
                  runId={run.syncRunLogId ?? run.id}
                  variant="compact"
                  statsColumns={3}
                  status={run.status}
                  totalRecords={p.total}
                  processedRecords={p.attempted}
                  completedBatches={p.completedBatches}
                  currentBatch={p.currentBatch}
                  batchProcessed={p.batchProcessed}
                  batchTotal={p.batchTotal}
                  totalBatches={p.totalBatches}
                  createdCount={p.created}
                  updatedCount={p.updated}
                  skippedCount={p.skipped}
                  failedCount={p.failed}
                  startedAt={run.startedAt}
                  finishedAt={run.finishedAt}
                  triggeredBy={originLabel(run.trigger)}
                  sourceLabel={run.source}
                  destinationLabel={run.destination}
                  defaultOpen
                />
              )}
              {run.status === 'running' && (
                <div className="space-y-2 rounded-2xl border p-3">
                  <div className="flex flex-wrap justify-between gap-2 text-xs">
                    <span className="font-medium">
                      Current batch
                      {p.currentBatch == null ? '' : ` ${p.currentBatch}`}
                    </span>
                    <span className="text-muted-foreground">
                      {p.batchProcessed == null || p.batchTotal == null
                        ? 'Measurement unavailable'
                        : `${count(p.batchProcessed)} of ${count(p.batchTotal)} records attempted`}
                    </span>
                  </div>
                  {p.batchProcessed != null &&
                    p.batchTotal != null &&
                    p.batchTotal > 0 && (
                      <Progress
                        aria-label="Current batch progress"
                        value={Math.min(
                          100,
                          Math.round((p.batchProcessed / p.batchTotal) * 100),
                        )}
                      />
                    )}
                </div>
              )}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">
                    Progress source
                  </dt>
                  <dd>
                    {p.source === 'live'
                      ? 'Live observation'
                      : p.source === 'checkpoint'
                        ? 'Saved batch checkpoint'
                        : 'Unavailable'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">
                    Last progress
                  </dt>
                  <dd>{date(p.observedAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Elapsed</dt>
                  <dd>{elapsed(run)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">
                    Processing rate
                  </dt>
                  <dd>
                    {p.ratePerSec == null
                      ? 'Unavailable'
                      : `${count(p.ratePerSec)} records/s`}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">
                    Origin / mode
                  </dt>
                  <dd>
                    {originLabel(run.trigger)} / {run.mode ?? 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Process</dt>
                  <dd>
                    {run.processId
                      ? `${run.processId.slice(0, 8)} · ${run.executionObserved ? 'Observed' : 'Sample stale'}`
                      : 'Not observed'}
                  </dd>
                </div>
              </dl>
              {Date.now() - Date.parse(p.observedAt) > 15000 &&
                run.status === 'running' && (
                  <p className="text-warning text-xs">
                    No recent progress observation. The integration may be
                    waiting; this does not confirm a failed run.
                  </p>
                )}
              {run.executionObserved && run.status !== 'running' && (
                <p className="text-warning text-xs">
                  The execution process still reports this run. Its final exit
                  is not yet confirmed.
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Process memory is shared by concurrent work. Progress does not
                measure this run’s RAM usage.
              </p>
            </>
          )}
        </div>
        <SheetFooter>
          {run && (
            <Button variant="outline" asChild>
              <Link to={jobPath}>
                Open Sync Flow <ArrowRight />
              </Link>
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function SyncOperationsPage() {
  const visible = useMonitorVisibility();
  const [params] = useSearchParams();
  const organisationId = params.get('organisationId') ?? undefined;
  const [recent, setRecent] = useState(false);
  const [status, setStatus] = useState<MonitorRunStatus | 'all'>('all');
  const [trigger, setTrigger] = useState('all');
  const [integrationDraft, setIntegrationDraft] = useState('');
  const [integration, setIntegration] = useState('');
  const debouncedIntegration = useDebouncedValue(integrationDraft.trim(), 400);
  const invalidIntegration =
    integrationDraft.trim().length > 100 ||
    !/^[a-zA-Z0-9_-]*$/.test(integrationDraft.trim());
  const [sort, setSort] = useState<'oldest' | 'newest'>();
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (
      debouncedIntegration.length > 100 ||
      !/^[a-zA-Z0-9_-]*$/.test(debouncedIntegration) ||
      debouncedIntegration === integration
    )
      return;
    setIntegration(debouncedIntegration);
    setCursors([undefined]);
  }, [debouncedIntegration, integration]);
  const query = useSyncOperations(
    {
      organisationId,
      trigger: trigger === 'all' ? undefined : trigger,
      integration: integration || undefined,
      sort,
      status: recent && status !== 'all' ? status : undefined,
      cursor: cursors[cursors.length - 1],
    },
    recent,
    visible,
  );
  const data = query.data;
  const reset = () => setCursors([undefined]);
  const stale =
    data &&
    Date.now() - Date.parse(data.generatedAt) > (recent ? 30000 : 15000);
  const hasFilters =
    trigger !== 'all' || integration !== '' || (recent && status !== 'all');
  return (
    <div className="flex min-w-0 flex-col gap-3 pb-3">
      <div id="processes" className="grid gap-2.5 lg:grid-cols-2">
        <ProcessResourceCard
          role="queue_worker"
          processes={
            data?.processes.filter(
              (process) => process.role === 'queue_worker',
            ) ?? []
          }
          loading={query.isLoading}
        />
        <ProcessResourceCard
          role="api"
          processes={
            data?.processes.filter((process) => process.role === 'api') ?? []
          }
          loading={query.isLoading}
        />
      </div>
      <ManagementCardHeader
        title="Platform sync activity"
        subtitle="Short runs may finish between refreshes; find them in Recent results."
        icon={Activity}
        count={data?.data.length ?? 0}
        countLabel="runs on this page"
        isLoading={query.isLoading || query.isError}
      >
        <ManagementToolbar
          directoryLayout
          filterCount={2}
          searchValue={integrationDraft}
          onSearchChange={setIntegrationDraft}
          searchPlaceholder="Search integration ID…"
          searchLabel="Search by integration ID"
          filters={
            <>
              <Select
                value={recent ? status : 'running'}
                onValueChange={(value: MonitorRunStatus | 'all') => {
                  setRecent(value !== 'running');
                  setStatus(value === 'running' ? 'all' : value);
                  reset();
                }}
              >
                <SelectTrigger
                  size="sm"
                  aria-label="Run status"
                  className="border-border/80 bg-card hover:border-foreground/25 dark:bg-card w-full min-w-0 [&_[data-slot=select-value]]:truncate"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ['running', 'Running'],
                    ['all', 'All recent outcomes'],
                    ['completed', 'Completed'],
                    ['partial', 'Partial'],
                    ['failed', 'Failed'],
                    ['cancelled', 'Cancelled'],
                    ['limit_reached', 'Limit reached'],
                    ['time_limit_reached', 'Time limit reached'],
                  ].map(([value, text]) => (
                    <SelectItem key={value} value={value}>
                      {text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={trigger}
                onValueChange={(value) => {
                  setTrigger(value);
                  reset();
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="border-border/80 bg-card hover:border-foreground/25 dark:bg-card w-full min-w-0 [&_[data-slot=select-value]]:truncate"
                  aria-label="Run origin"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ['all', 'All origins'],
                    ['cron', 'Scheduled / priority queue'],
                    ['manual', 'Manual'],
                    ['api', 'API'],
                    ['resume', 'Resumed'],
                    ['sync_all', 'Full sync'],
                    ['limit_sync', 'Limited sync'],
                    ['webhook', 'Webhook'],
                  ].map(([value, text]) => (
                    <SelectItem key={value} value={value}>
                      {text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          }
          sort={
            <Select
              value={sort ?? (recent ? 'newest' : 'oldest')}
              onValueChange={(value: 'oldest' | 'newest') => {
                setSort(value);
                reset();
              }}
            >
              <SelectTrigger
                size="sm"
                className="border-border/80 bg-card hover:border-foreground/25 dark:bg-card w-full min-w-0 [&_[data-slot=select-value]]:truncate"
                aria-label="Sort sync runs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="newest">Newest first</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </ManagementCardHeader>
      {invalidIntegration && (
        <p role="alert" className="text-destructive text-sm">
          Use an integration ID with letters, numbers, underscores or hyphens,
          up to 100 characters. The last valid filter remains applied.
        </p>
      )}
      {!visible && (
        <p role="status" className="text-muted-foreground text-xs">
          Updates suspended while this tab is hidden
        </p>
      )}
      {stale && (
        <p role="status" className="text-warning text-xs">
          Displayed activity is out of date. Refresh to check for updates.
        </p>
      )}
      {query.isError && (
        <p role="alert" className="text-destructive">
          Sync activity could not be loaded. Refresh to retry.
        </p>
      )}
      {data?.errors &&
        Object.entries(data.errors)
          .filter(([section]) => section !== 'queue')
          .map(([, error]) => (
            <p key={error} role="alert" className="text-warning text-sm">
              {error}
            </p>
          ))}
      <section aria-label="Sync activity" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs
            value={recent ? 'recent' : 'active'}
            onValueChange={(value) => {
              setRecent(value === 'recent');
              if (value === 'active') setStatus('all');
              reset();
            }}
          >
            <TabsList aria-label="Sync activity view">
              <TabsTrigger value="active">Active runs</TabsTrigger>
              <TabsTrigger value="recent">Recent results</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            disabled={query.isFetching || !visible}
            onClick={() => void query.refetch()}
          >
            <RefreshCw className={query.isFetching ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
        {query.isLoading ? (
          <p role="status" className="py-10 text-center">
            Loading sync activity…
          </p>
        ) : !data?.errors.runs && !data?.data.length && !query.isError ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
              <CheckCircle2 className="size-6" aria-hidden="true" />
            </span>
            <div className="max-w-md space-y-1">
              <h2 className="text-foreground text-sm font-semibold">
                {hasFilters
                  ? 'No syncs match these filters'
                  : recent
                    ? 'No recent sync results'
                    : 'No syncs are running right now'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {hasFilters
                  ? 'Try a different status, origin or integration, or clear your filters.'
                  : recent
                    ? 'Completed and failed syncs from the last 24 hours will appear here.'
                    : 'New runs will appear here automatically. Review recent results to see completed or failed syncs.'}
              </p>
            </div>
            {hasFilters ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setStatus('all');
                  setTrigger('all');
                  setIntegrationDraft('');
                  reset();
                }}
              >
                Clear filters
              </Button>
            ) : (
              !recent && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRecent(true);
                    setStatus('all');
                    reset();
                  }}
                >
                  View recent results <ArrowRight />
                </Button>
              )
            )}
          </div>
        ) : (
          !!data?.data.length && (
            <ul aria-label="Sync runs" className="space-y-2">
              {data.data.map((run) => (
                <SyncRunListItem
                  key={run.id}
                  run={run}
                  onDetails={setSelected}
                />
              ))}
            </ul>
          )
        )}
        {(!!data?.data.length || cursors.length > 1) && (
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={cursors.length === 1}
              onClick={() => setCursors((current) => current.slice(0, -1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!data?.nextCursor}
              onClick={() =>
                setCursors((current) => [
                  ...current,
                  data?.nextCursor ?? undefined,
                ])
              }
            >
              Next
            </Button>
          </div>
        )}
      </section>
      <RunDrawer
        id={selected}
        visible={visible}
        close={() => setSelected(null)}
      />
    </div>
  );
}
