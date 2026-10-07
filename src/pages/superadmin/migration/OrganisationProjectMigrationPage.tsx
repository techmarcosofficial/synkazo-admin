import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, ArrowLeft, ArrowRight, Database, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import LifecycleConfirmDialog from '../lifecycle/LifecycleConfirmDialog';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { showToast } from '@/lib/toast';
import {
  useRunSuperAdminMigrationMutation,
  useSuperAdminMigrationDiffQuery,
  useSuperAdminMigrationRunItemsQuery,
  useSuperAdminMigrationRunsQuery,
  useSuperAdminOrganisationQuery,
  useSuperAdminProjectQuery,
} from '@/queries/useSuperAdmin';
import type {
  SuperAdminConnectionEnvironment,
  SuperAdminMigrationDiffItem,
} from '@/types';

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

function DiffSection({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: SuperAdminMigrationDiffItem[];
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  const promotable = items.filter((i) => i.status !== 'in_sync');
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
        {title}
        <span className="ml-2 normal-case">
          {promotable.length} promotable · {items.length - promotable.length} in sync
        </span>
      </h3>
      <div className="bg-card overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Object</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const disabled = item.status === 'in_sync';
              return (
                <TableRow key={item.identityKey}>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="size-4"
                      disabled={disabled}
                      checked={selected.has(item.identityKey)}
                      onChange={() => onToggle(item.identityKey)}
                      aria-label={`Select ${item.displayName}`}
                    />
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {item.displayName}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.objectType ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.status === 'missing'
                          ? 'border-amber-500 text-amber-700'
                          : item.status === 'conflict'
                            ? 'border-red-500 text-red-700'
                            : 'text-muted-foreground'
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {item.conflictReason ?? '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function OrganisationProjectMigrationPage() {
  const { organisationId, projectId } = useParams<{
    organisationId: string;
    projectId: string;
  }>();

  const orgQuery = useSuperAdminOrganisationQuery(organisationId);
  const projectQuery = useSuperAdminProjectQuery(
    organisationId ?? '',
    projectId,
  );

  const [from, setFrom] = useState<SuperAdminConnectionEnvironment>('sandbox');
  const [to, setTo] = useState<SuperAdminConnectionEnvironment>('production');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const diffQuery = useSuperAdminMigrationDiffQuery(
    organisationId ?? '',
    projectId ?? '',
    from,
    to,
  );
  const runsQuery = useSuperAdminMigrationRunsQuery(
    organisationId ?? '',
    projectId ?? '',
  );
  const runItemsQuery = useSuperAdminMigrationRunItemsQuery(
    organisationId ?? '',
    projectId ?? '',
    expandedRunId,
  );

  const runMutation = useRunSuperAdminMigrationMutation(
    organisationId ?? '',
    projectId ?? '',
  );

  useEffect(() => {
    setSelected(new Set());
  }, [from, to, diffQuery.dataUpdatedAt]);

  const diff = diffQuery.data;

  const allPromotable = useMemo(() => {
    if (!diff) return [] as SuperAdminMigrationDiffItem[];
    return [...diff.customObjects, ...diff.properties, ...diff.associations].filter(
      (i) => i.status !== 'in_sync',
    );
  }, [diff]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(allPromotable.map((i) => i.identityKey)));
  };

  const swap = () => {
    const nextFrom = to;
    const nextTo = from;
    setFrom(nextFrom);
    setTo(nextTo);
  };

  const submitRun = ({ reason }: { reason: string }) => {
    runMutation.mutate(
      {
        selectedKeys: Array.from(selected),
        from,
        to,
        reason,
      },
      {
        onSuccess: () => {
          showToast.success('Migration run queued.');
          setConfirmOpen(false);
          setSelected(new Set());
        },
      },
    );
  };

  if (!organisationId || !projectId) {
    return (
      <EmptyState
        icon={Database}
        title="Missing route parameters"
        description="Both organisation and project ids are required."
      />
    );
  }

  const project = projectQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to={`/super-admin/organisations/${organisationId}/projects/${projectId}`}
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to project
        </Link>
        <PageHeader
          title="Environment migration"
          description={
            project
              ? `${project.name} · ${orgQuery.data?.name ?? organisationId}`
              : organisationId
          }
        />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="mig-from">From</label>
            <select
              id="mig-from"
              value={from}
              onChange={(e) =>
                setFrom(e.target.value as SuperAdminConnectionEnvironment)
              }
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="sandbox">sandbox</option>
              <option value="production">production</option>
            </select>
          </div>
          <Button size="sm" variant="outline" onClick={swap}>
            <ArrowRight className="size-3.5" aria-hidden />
            Swap
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="mig-to">To</label>
            <select
              id="mig-to"
              value={to}
              onChange={(e) =>
                setTo(e.target.value as SuperAdminConnectionEnvironment)
              }
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="production">production</option>
              <option value="sandbox">sandbox</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => diffQuery.refetch()}
              disabled={diffQuery.isFetching}
            >
              {diffQuery.isFetching ? 'Refreshing…' : 'Refresh diff'}
            </Button>
            <Button
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={selected.size === 0 || !diff?.ready}
            >
              <Play className="size-3.5" aria-hidden />
              Run migration ({selected.size})
            </Button>
          </div>
        </div>

        {diff && !diff.ready ? (
          <Alert>
            <AlertTriangle className="size-4" aria-hidden />
            <AlertDescription>
              {diff.message ??
                'Both environments must be connected before a migration can run.'}
              <span className="ml-2 text-xs">
                sandbox: {diff.sandboxConnected ? 'connected' : 'missing'} · production:{' '}
                {diff.productionConnected ? 'connected' : 'missing'}
              </span>
            </AlertDescription>
          </Alert>
        ) : null}

        {diffQuery.isLoading ? (
          <SkeletonList count={4} />
        ) : diffQuery.isError ? (
          <ErrorState
            title="Could not compute diff"
            description={extractErrorMessage(diffQuery.error)}
            onRetry={() => diffQuery.refetch()}
          />
        ) : !diff ? null : allPromotable.length === 0 ? (
          <EmptyState
            icon={Database}
            title="Environments are in sync"
            description="Nothing to promote for the selected direction."
          />
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                aria-label="Select all promotable items"
                checked={
                  allPromotable.length > 0 &&
                  allPromotable.every((i) => selected.has(i.identityKey))
                }
                onChange={(e) => toggleAll(e.target.checked)}
              />
              <span className="text-muted-foreground">
                Select all promotable items ({allPromotable.length})
              </span>
            </div>
            <DiffSection
              title="Custom objects"
              items={diff.customObjects}
              selected={selected}
              onToggle={toggle}
            />
            <DiffSection
              title="Properties"
              items={diff.properties}
              selected={selected}
              onToggle={toggle}
            />
            <DiffSection
              title="Associations"
              items={diff.associations}
              selected={selected}
              onToggle={toggle}
            />
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Run history</h2>
        {runsQuery.isLoading ? (
          <SkeletonList count={2} />
        ) : runsQuery.isError ? (
          <ErrorState
            title="Could not load migration runs"
            description={extractErrorMessage(runsQuery.error)}
            onRetry={() => runsQuery.refetch()}
          />
        ) : (runsQuery.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Database}
            title="No runs yet"
            description="Trigger a migration to record the first run."
          />
        ) : (
          <div className="bg-card overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Totals</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="w-32 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runsQuery.data!.map((run) => {
                  const expanded = expandedRunId === run.id;
                  const duration = run.completedAt
                    ? Math.max(
                        0,
                        (new Date(run.completedAt).getTime() -
                          new Date(run.startedAt).getTime()) /
                          1000,
                      )
                    : null;
                  return (
                    <>
                      <TableRow key={run.id}>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(run.startedAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {run.fromEnvironment} → {run.toEnvironment}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              run.status === 'completed'
                                ? 'border-emerald-500 text-emerald-700'
                                : run.status === 'partial'
                                  ? 'border-amber-500 text-amber-700'
                                  : run.status === 'failed'
                                    ? 'border-red-500 text-red-700'
                                    : ''
                            }
                          >
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {run.succeeded}✓ · {run.skipped}↷ · {run.failed}✗ / {run.totalItems}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {duration != null ? `${duration.toFixed(1)}s` : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setExpandedRunId(expanded ? null : run.id)
                            }
                          >
                            {expanded ? 'Hide items' : 'Show items'}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expanded ? (
                        <TableRow key={`${run.id}-items`}>
                          <TableCell colSpan={6} className="bg-muted/30">
                            {runItemsQuery.isLoading ? (
                              <div className="text-muted-foreground py-3 text-sm">
                                Loading items…
                              </div>
                            ) : runItemsQuery.isError ? (
                              <div className="text-destructive py-3 text-sm">
                                {extractErrorMessage(runItemsQuery.error)}
                              </div>
                            ) : (runItemsQuery.data?.length ?? 0) === 0 ? (
                              <div className="text-muted-foreground py-3 text-sm">
                                No items recorded for this run.
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1 py-2">
                                {runItemsQuery.data!.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <Badge
                                      variant="outline"
                                      className={
                                        item.status === 'succeeded'
                                          ? 'border-emerald-500 text-emerald-700'
                                          : item.status === 'skipped'
                                            ? 'text-muted-foreground'
                                            : 'border-red-500 text-red-700'
                                      }
                                    >
                                      {item.status}
                                    </Badge>
                                    <span className="font-medium">{item.displayName}</span>
                                    <span className="text-muted-foreground">· {item.kind}</span>
                                    {item.errorMessage ? (
                                      <span className="text-destructive ml-2 truncate">
                                        {item.errorMessage}
                                      </span>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <LifecycleConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Run environment migration"
        description={`Promote ${selected.size} item${selected.size === 1 ? '' : 's'} from ${from} to ${to}. This runs on behalf of the organisation and is fully audited.`}
        bodyWarning="Runs on behalf of the organisation. Every promoted item creates schema in the target environment; already-in-sync items are skipped."
        actionLabel="Run migration"
        tone="warning"
        organisationName=""
        requiresNameConfirm={false}
        minReasonLength={10}
        reasonPlaceholder="Why is this migration being run now?"
        isSubmitting={runMutation.isPending}
        errorMessage={
          runMutation.isError ? extractErrorMessage(runMutation.error) : null
        }
        onSubmit={submitRun}
      />
    </div>
  );
}
