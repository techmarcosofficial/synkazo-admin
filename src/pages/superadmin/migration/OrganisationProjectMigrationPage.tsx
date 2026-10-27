import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, ArrowRight, Database, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import LifecycleConfirmDialog from '../lifecycle/LifecycleConfirmDialog';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { showToast } from '@/lib/toast';
import { superAdminOperationsApi } from '@/api/superAdminOperations';
import type { EnvironmentSwitchPreview } from '@/api/connections';
import {
  useActivateSuperAdminProjectEnvironmentMutation,
  useRunSuperAdminMigrationMutation,
  useSuperAdminMigrationDiffQuery,
  useSuperAdminMigrationRunItemsQuery,
  useSuperAdminMigrationRunsQuery,
  useSuperAdminProjectConnectionsQuery,
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

const STANDARD_OBJECTS = new Set(['contacts', 'companies', 'deals', 'tickets']);
const canMigrateMetadata = (item: SuperAdminMigrationDiffItem) =>
  item.kind === 'property' && item.status === 'missing' &&
  !!item.objectType && STANDARD_OBJECTS.has(item.objectType);

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
  const promotable = items.filter(canMigrateMetadata);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title}
        <span className="ml-2 normal-case">
          {promotable.length} eligible · {items.length - promotable.length} manual or in sync
        </span>
      </h3>
      <div className="bg-card overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">Select</span>
              </TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Object</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const disabled = !canMigrateMetadata(item);
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
                    {item.conflictReason ?? (disabled && item.status !== 'in_sync'
                      ? 'Create manually in the target workspace' : '—')}
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
  if (!organisationId || !projectId) {
    return (
      <EmptyState
        icon={Database}
        title="Missing route parameters"
        description="Both organisation and project ids are required."
      />
    );
  }
  return (
    <OrganisationProjectMigrationPanel
      organisationId={organisationId}
      projectId={projectId}
    />
  );
}

export function OrganisationProjectMigrationPanel({
  organisationId,
  projectId,
  organisationName = '',
}: {
  organisationId: string;
  projectId: string;
  organisationName?: string;
}) {
  const projectQuery = useSuperAdminProjectQuery(organisationId, projectId);
  const connectionsQuery = useSuperAdminProjectConnectionsQuery(
    organisationId,
    projectId,
  );
  const activate = useActivateSuperAdminProjectEnvironmentMutation(
    organisationId,
    projectId,
  );
  const [activationTarget, setActivationTarget] =
    useState<SuperAdminConnectionEnvironment | null>(null);
  const [activationPreview, setActivationPreview] = useState<EnvironmentSwitchPreview | null>(null);
  const [activationPreviewing, setActivationPreviewing] = useState(false);
  const [activationPreviewError, setActivationPreviewError] = useState<string | null>(null);

  const [from, setFrom] = useState<SuperAdminConnectionEnvironment>('sandbox');
  const [to, setTo] = useState<SuperAdminConnectionEnvironment>('production');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const diffQuery = useSuperAdminMigrationDiffQuery(
    organisationId,
    projectId,
    from,
    to,
  );
  const runsQuery = useSuperAdminMigrationRunsQuery(organisationId, projectId);
  const runItemsQuery = useSuperAdminMigrationRunItemsQuery(
    organisationId,
    projectId,
    expandedRunId,
  );

  const runMutation = useRunSuperAdminMigrationMutation(
    organisationId,
    projectId,
  );

  useEffect(() => {
    setSelected(new Set());
  }, [from, to, diffQuery.dataUpdatedAt]);

  const diff = diffQuery.data;

  const allPromotable = useMemo(() => {
    if (!diff) return [] as SuperAdminMigrationDiffItem[];
    return diff.properties.filter(canMigrateMetadata);
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

  const reviewActivation = async (environment: SuperAdminConnectionEnvironment) => {
    activate.reset();
    setActivationPreviewError(null);
    setActivationPreviewing(true);
    try {
      const preview = await superAdminOperationsApi.previewProjectEnvironmentSwitch(
        organisationId, projectId, environment,
      );
      if (!preview.canSwitch) {
        const { runningJobs, runningRuns, priorityCycles, associationRuns } = preview.blockers;
        setActivationPreviewError(
          `Switch blocked: ${runningJobs} running jobs, ${runningRuns} running runs, ` +
          `${priorityCycles} priority cycles and ${associationRuns} association runs. ` +
          (preview.targetReady ? 'Wait for them to finish.' : 'Verify the target connections.'),
        );
        return;
      }
      setActivationPreview(preview);
      setActivationTarget(environment);
    } catch (error) {
      setActivationPreviewError(extractErrorMessage(error));
    } finally {
      setActivationPreviewing(false);
    }
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

  return (
    <div className="flex flex-col gap-5">
      <Card className="gap-0 py-0">
        <CardHeader className="px-4 py-3">
          <CardTitle>Active environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          <p className="text-muted-foreground text-sm">
            New sync runs use the active environment. Activation checks live
            destination credentials and a verified source connection.
          </p>
          {projectQuery.isLoading || connectionsQuery.isLoading ? (
            <SkeletonList count={2} />
          ) : projectQuery.isError || connectionsQuery.isError ? (
            <ErrorState
              title="Could not load environment status"
              description={extractErrorMessage(
                projectQuery.error ?? connectionsQuery.error,
              )}
              onRetry={() => {
                void projectQuery.refetch();
                void connectionsQuery.refetch();
              }}
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {activationPreviewError && (
                <Alert variant="destructive" className="sm:col-span-2">
                  <AlertTriangle className="size-4" />
                  <AlertDescription>{activationPreviewError}</AlertDescription>
                </Alert>
              )}
              {(['sandbox', 'production'] as const).map((environment) => {
                const active =
                  projectQuery.data?.activeEnvironment === environment;
                const connections = (connectionsQuery.data ?? []).filter(
                  (item) => item.environment === environment,
                );
                return (
                  <div
                    key={environment}
                    className="bg-card flex flex-col gap-2 rounded-xl border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm capitalize">
                        {environment}
                      </strong>
                      {active && <Badge variant="secondary">Active</Badge>}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {connections.length
                        ? connections
                            .map(
                              (item) =>
                                `${item.platformId} ${item.connectionType}: ${item.status}`,
                            )
                            .join(' · ')
                        : 'No connections configured'}
                    </p>
                    {!active && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-auto self-start"
                        disabled={activate.isPending || activationPreviewing}
                        onClick={() => void reviewActivation(environment)}
                      >
                        {activationPreviewing ? 'Reviewing…' : `Activate ${environment}`}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <section className="flex flex-col gap-3">
        <div className="bg-card flex flex-wrap items-center gap-2 rounded-xl border p-3 sm:gap-3">
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
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
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
                sandbox: {diff.sandboxConnected ? 'connected' : 'missing'} ·
                production: {diff.productionConnected ? 'connected' : 'missing'}
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
                          {run.succeeded}✓ · {run.skipped}↷ · {run.failed}✗ /{' '}
                          {run.totalItems}
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
                                    <span className="font-medium">
                                      {item.displayName}
                                    </span>
                                    <span className="text-muted-foreground">
                                      · {item.kind}
                                    </span>
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
        open={activationTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActivationTarget(null);
            setActivationPreview(null);
          }
        }}
        title={`Activate ${activationTarget ?? 'environment'}`}
        description={`Review the ${activationTarget ?? 'selected'} account and switch impact for ${organisationName || 'this organisation'} before activation.`}
        bodyWarning={`${activationPreview?.jobsToPause ?? 0} enabled jobs will pause. Target destination: ${activationPreview?.targetDestination?.accountName ?? activationPreview?.targetDestination?.accountIdentity ?? 'unlabelled account'}. Target workspace has ${activationPreview?.targetCounts?.jobs ?? 0} saved jobs and ${activationPreview?.targetCounts?.runs ?? 0} runs. ${activationPreview?.sandboxDestinationWriteSafety?.reason ?? ''} Job, priority and webhook execution need separate manual resume actions.`}
        actionLabel="Validate and activate"
        tone="warning"
        organisationName={organisationName}
        requiresNameConfirm={false}
        minReasonLength={10}
        reasonPlaceholder="Why is this environment being activated?"
        isSubmitting={activate.isPending}
        errorMessage={
          activate.isError ? extractErrorMessage(activate.error) : null
        }
        onSubmit={async ({ reason }) => {
          if (!activationTarget || !activationPreview) return;
          try {
            const result = await activate.mutateAsync({
              environment: activationTarget,
              expectedGeneration: activationPreview.expectedGeneration,
              reason,
            });
            showToast.success(result.message);
            setActivationTarget(null);
          } catch {
            // Keep the confirmation dialog open with its server validation error.
          }
        }}
      />

      <LifecycleConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Run environment migration"
        description={`Promote ${selected.size} item${selected.size === 1 ? '' : 's'} from ${from} to ${to}. This runs on behalf of the organisation and is fully audited.`}
        bodyWarning="Runs on behalf of the organisation. Every promoted item creates schema in the target environment; already-in-sync items are skipped."
        actionLabel="Run migration"
        tone="warning"
        organisationName={organisationName}
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
