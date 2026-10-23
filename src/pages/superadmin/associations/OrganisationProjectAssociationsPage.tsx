import { formatDistanceToNow } from 'date-fns';
import { Link2, PlusCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import LifecycleConfirmDialog from '../lifecycle/LifecycleConfirmDialog';

import AssociationRuleFormDialog, {
  type AssociationRuleFormOperations,
} from '@/components/associations/AssociationRuleFormDialog';
import { superAdminAssociationsApi } from '@/api/superAdminAssociations';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import StatusBadge from '@/components/shared/StatusBadge';
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
import {
  useCreateSuperAdminAssociationRuleMutation,
  useDeleteSuperAdminAssociationRuleMutation,
  useRetrySuperAdminAssociationRuleMutation,
  useRunSuperAdminAssociationRuleMutation,
  useSuperAdminAssociationRulesQuery,
  useSuperAdminAssociationRuleRecordsQuery,
  useSuperAdminAssociationRuleStatsQuery,
  useSuperAdminAssociationRunsQuery,
  useSuperAdminOrganisationQuery,
  useSuperAdminPendingAssociationsQuery,
  useUpdateSuperAdminAssociationRuleMutation,
} from '@/queries/useSuperAdmin';
import type { SuperAdminAssociationRule } from '@/types';

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

const PAGE_LIMIT = 25;

function AssociationRuleDetails({
  organisationId,
  projectId,
  rule,
}: {
  organisationId: string;
  projectId: string;
  rule: SuperAdminAssociationRule;
}) {
  const stats = useSuperAdminAssociationRuleStatsQuery(
    organisationId,
    projectId,
    rule.id,
  );
  const [runPage, setRunPage] = useState(1);
  const [recordPage, setRecordPage] = useState(1);
  const runs = useSuperAdminAssociationRunsQuery(
    organisationId,
    projectId,
    rule.id,
    runPage,
  );
  const records = useSuperAdminAssociationRuleRecordsQuery(
    organisationId,
    projectId,
    rule.id,
    recordPage,
  );
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="px-4 py-3">
        <CardTitle>Rule activity: {rule.name ?? rule.id}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        {stats.isError ? (
          <ErrorState
            title="Could not load rule statistics"
            description={extractErrorMessage(stats.error)}
            onRetry={() => stats.refetch()}
          />
        ) : stats.isLoading ? (
          <SkeletonList count={1} />
        ) : stats.data ? (
          <dl className="grid gap-2 sm:grid-cols-4">
            {(
              [
                ['Source records', stats.data.total],
                ['Resolved', stats.data.resolved],
                ['Pending', stats.data.pending],
                ['Failed', stats.data.failed],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="bg-muted/25 rounded-xl border p-3">
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        <section className="space-y-2" aria-label="Association runs">
          <h3 className="text-sm font-semibold">Recent runs</h3>
          {runs.isError ? (
            <ErrorState
              title="Could not load association runs"
              description={extractErrorMessage(runs.error)}
              onRetry={() => runs.refetch()}
            />
          ) : runs.isLoading ? (
            <SkeletonList count={2} />
          ) : !runs.data?.data.length ? (
            <p className="text-muted-foreground text-sm">
              This rule has not run yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Resolved</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Failed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.data.data.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        {run.startedAt
                          ? formatDistanceToNow(new Date(run.startedAt), {
                              addSuffix: true,
                            })
                          : '—'}
                      </TableCell>
                      <TableCell>
                <StatusBadge status={run.status} label={run.status} />
                      </TableCell>
                      <TableCell>{run.succeeded}</TableCell>
                      <TableCell>{run.pendingCreated}</TableCell>
                      <TableCell>{run.failed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {(runs.data?.total ?? 0) > 10 && (
            <div className="flex items-center justify-end gap-2 text-xs">
              <Button
                size="sm"
                variant="outline"
                disabled={runPage === 1}
                onClick={() => setRunPage((page) => page - 1)}
              >
                Previous
              </Button>
              <span>Page {runPage}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={runPage * 10 >= runs.data!.total}
                onClick={() => setRunPage((page) => page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </section>
        <section className="space-y-2" aria-label="Association records">
          <h3 className="text-sm font-semibold">Records</h3>
          {records.isError ? (
            <ErrorState
              title="Could not load association records"
              description={extractErrorMessage(records.error)}
              onRetry={() => records.refetch()}
            />
          ) : records.isLoading ? (
            <SkeletonList count={2} />
          ) : !records.data?.data.length ? (
            <p className="text-muted-foreground text-sm">
              No records have been processed for this rule.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source record</TableHead>
                    <TableHead>Target lookup</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.data.data.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.sourceId}</TableCell>
                      <TableCell>{record.targetMatchValue}</TableCell>
                      <TableCell>
                        <StatusBadge status={record.status} label={record.status} />
                      </TableCell>
                      <TableCell>{record.retryCount}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs">
                        {record.errorMessage ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {(records.data?.total ?? 0) > 10 && (
            <div className="flex items-center justify-end gap-2 text-xs">
              <Button
                size="sm"
                variant="outline"
                disabled={recordPage === 1}
                onClick={() => setRecordPage((page) => page - 1)}
              >
                Previous
              </Button>
              <span>Page {recordPage}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={recordPage * 10 >= records.data!.total}
                onClick={() => setRecordPage((page) => page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

export default function OrganisationProjectAssociationsPage() {
  const { organisationId, projectId } = useParams<{
    organisationId: string;
    projectId: string;
  }>();
  if (!organisationId || !projectId) {
    return (
      <EmptyState
        icon={Link2}
        title="Missing route parameters"
        description="Both organisation and project ids are required."
      />
    );
  }
  return (
    <OrganisationProjectAssociationsPanel
      organisationId={organisationId}
      projectId={projectId}
    />
  );
}

export function OrganisationProjectAssociationsPanel({
  organisationId,
  projectId,
}: {
  organisationId: string;
  projectId: string;
}) {
  const orgQuery = useSuperAdminOrganisationQuery(organisationId);
  const rulesQuery = useSuperAdminAssociationRulesQuery(
    organisationId,
    projectId,
  );

  const [pendingPage, setPendingPage] = useState(1);
  const pendingQuery = useSuperAdminPendingAssociationsQuery(
    organisationId,
    projectId,
    pendingPage,
    PAGE_LIMIT,
  );

  const createMutation = useCreateSuperAdminAssociationRuleMutation(
    organisationId,
    projectId,
  );
  const updateMutation = useUpdateSuperAdminAssociationRuleMutation(
    organisationId,
    projectId,
  );
  const deleteMutation = useDeleteSuperAdminAssociationRuleMutation(
    organisationId,
    projectId,
  );

  const [dialogState, setDialogState] = useState<{
    mode: 'create' | 'edit';
    rule: SuperAdminAssociationRule | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<SuperAdminAssociationRule | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{
    rule: SuperAdminAssociationRule;
    kind: 'run' | 'retry';
  } | null>(null);
  const runRule = useRunSuperAdminAssociationRuleMutation(
    organisationId,
    projectId,
  );
  const retryFailed = useRetrySuperAdminAssociationRuleMutation(
    organisationId,
    projectId,
  );

  const rules = useMemo(() => rulesQuery.data ?? [], [rulesQuery.data]);
  const selectedRule = rules.find((rule) => rule.id === selectedRuleId);
  const formOperations = useMemo<AssociationRuleFormOperations>(
    () => ({
      getProjectObjects: async () =>
        (
          await superAdminAssociationsApi.getObjects(organisationId, projectId)
        ).map((object) => ({
          sourceObject: object.sourceObject,
          hsObjectType: object.destObjectType,
        })),
      getAssociationFields: (_projectId, sourceObject) =>
        superAdminAssociationsApi.getObjectFields(
          organisationId,
          projectId,
          sourceObject,
        ),
      getOwnerFields: () =>
        superAdminAssociationsApi.getOwnerFields(organisationId, projectId),
      getAssociationTypes: (_projectId, from, to) =>
        superAdminAssociationsApi.getAssociationTypes(
          organisationId,
          projectId,
          from,
          to,
        ),
      createRule: async (_projectId, input, reason) => {
        if (
          !input.name ||
          !input.sourceObject ||
          !input.sourceMatchField ||
          !input.destSourceObjectType ||
          !input.targetObject ||
          !input.targetMatchField ||
          !input.destTargetObjectType ||
          input.assocTypeId == null
        )
          throw new Error('Complete the required association fields.');
        return createMutation.mutateAsync({
          name: input.name,
          sourceObject: input.sourceObject,
          sourceMatchField: input.sourceMatchField,
          destSourceObjectType: input.destSourceObjectType,
          targetObject: input.targetObject,
          targetMatchField: input.targetMatchField,
          destTargetObjectType: input.destTargetObjectType,
          assocTypeId: input.assocTypeId,
          assocCategory: input.assocCategory,
          assocLabel: input.assocLabel ?? undefined,
          cardinality: input.cardinality,
          conditions: input.conditions ?? undefined,
          conditionLogic: input.conditionLogic,
          reason,
        });
      },
      updateRule: async (_projectId, ruleId, input, reason) =>
        updateMutation.mutateAsync({
          ruleId,
          dto: {
            name: input.name,
            conditions: input.conditions ?? undefined,
            conditionLogic: input.conditionLogic,
            reason,
          },
        }),
    }),
    [
      organisationId,
      projectId,
      createMutation.mutateAsync,
      updateMutation.mutateAsync,
    ],
  );

  const handleDelete = ({ reason }: { reason: string }) => {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      {
        ruleId: deleteTarget.id,
        dto: { reason, confirmName: deleteTarget.name ?? '' },
      },
      {
        onSuccess: () => {
          showToast.success('Association rule deleted.');
          setDeleteTarget(null);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Rules</h2>
          <Button
            size="sm"
            onClick={() => setDialogState({ mode: 'create', rule: null })}
          >
            <PlusCircle className="size-3.5" aria-hidden />
            New rule
          </Button>
        </div>
        {rulesQuery.isLoading ? (
          <SkeletonList count={3} />
        ) : rulesQuery.isError ? (
          <ErrorState
            title="Could not load association rules"
            description={extractErrorMessage(rulesQuery.error)}
            onRetry={() => rulesQuery.refetch()}
          />
        ) : rules.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No association rules"
            description="Create a rule to link source records to their targets."
          />
        ) : (
          <div className="bg-card overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-40 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      {rule.name ?? rule.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {rule.sourceObject}
                      <span className="text-muted-foreground">
                        {' '}
                        · {rule.sourceMatchField}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {rule.targetObject}
                      <span className="text-muted-foreground">
                        {' '}
                        · {rule.targetMatchField}
                      </span>
                    </TableCell>
                    <TableCell>
                      {rule.isEnabled ? (
                          <StatusBadge status="enabled" label="Enabled" />
                      ) : (
                          <StatusBadge status="disabled" label="Disabled" />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {rule.conditions?.length ?? 0} ·{' '}
                      {rule.conditionLogic === 'OR' ? 'Match Any' : 'Match All'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {rule.updatedAt
                        ? formatDistanceToNow(new Date(rule.updatedAt), {
                            addSuffix: true,
                          })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-expanded={selectedRuleId === rule.id}
                        onClick={() =>
                          setSelectedRuleId(
                            selectedRuleId === rule.id ? null : rule.id,
                          )
                        }
                      >
                        {selectedRuleId === rule.id
                          ? 'Hide details'
                          : 'Inspect'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDialogState({ mode: 'edit', rule })}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive ml-1"
                        onClick={() => setDeleteTarget(rule)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {selectedRule ? (
        <AssociationRuleDetails
          key={selectedRule.id}
          organisationId={organisationId}
          projectId={projectId}
          rule={selectedRule}
        />
      ) : null}

      {selectedRule ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setActionTarget({
                rule: selectedRule,
                kind: 'run',
              })
            }
          >
            Run selected rule
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setActionTarget({
                rule: selectedRule,
                kind: 'retry',
              })
            }
          >
            Retry failed records
          </Button>
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Pending associations</h2>
        {pendingQuery.isLoading ? (
          <SkeletonList count={3} />
        ) : pendingQuery.isError ? (
          <ErrorState
            title="Could not load pending associations"
            description={extractErrorMessage(pendingQuery.error)}
            onRetry={() => pendingQuery.refetch()}
          />
        ) : (pendingQuery.data?.data.length ?? 0) === 0 ? (
          <EmptyState
            icon={Link2}
            title="No pending items"
            description="Every source record has a resolved target."
          />
        ) : (
          <>
            <div className="bg-card overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Target lookup</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Last attempt</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingQuery.data!.data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm">
                        <div>{row.sourceId}</div>
                        {row.sourceHsId ? (
                          <div className="text-muted-foreground text-xs">
                            HS: {row.sourceHsId}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.targetMatchValue}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} label={row.status} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.retryCount}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {row.lastAttemptedAt
                          ? formatDistanceToNow(new Date(row.lastAttemptedAt), {
                              addSuffix: true,
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate text-xs">
                        {row.errorMessage ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {pendingQuery.data!.total} total · page{' '}
                {pendingQuery.data!.page}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendingPage <= 1}
                  onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    pendingQuery.data!.page * pendingQuery.data!.limit >=
                    pendingQuery.data!.total
                  }
                  onClick={() => setPendingPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </section>

      {dialogState?.mode === 'create' && (
        <AssociationRuleFormDialog
          mode="create"
          projectId={projectId}
          operations={formOperations}
          onSuccess={() => {
            setDialogState(null);
          }}
          onClose={() => setDialogState(null)}
        />
      )}
      {dialogState?.mode === 'edit' && dialogState.rule && (
        <AssociationRuleFormDialog
          mode="edit"
          projectId={projectId}
          rule={dialogState.rule}
          operations={formOperations}
          onSuccess={() => {
            setDialogState(null);
          }}
          onClose={() => setDialogState(null)}
        />
      )}

      <LifecycleConfirmDialog
        open={actionTarget !== null}
        onOpenChange={(open) => {
          if (!open) setActionTarget(null);
        }}
        title={
          actionTarget?.kind === 'run'
            ? 'Run association rule'
            : 'Retry failed associations'
        }
        description={
          actionTarget
            ? `${actionTarget.rule.name ?? actionTarget.rule.id} · ${orgQuery.data?.name ?? 'Selected organisation'}`
            : ''
        }
        bodyWarning={
          actionTarget?.kind === 'run'
            ? 'This may create new associations for matching synced records.'
            : 'Failed records will be processed again.'
        }
        actionLabel={actionTarget?.kind === 'run' ? 'Run rule' : 'Retry failed'}
        tone="warning"
        organisationName={orgQuery.data?.name ?? ''}
        requiresNameConfirm={false}
        minReasonLength={10}
        reasonPlaceholder="Why is this operation needed?"
        isSubmitting={runRule.isPending || retryFailed.isPending}
        errorMessage={
          runRule.isError
            ? extractErrorMessage(runRule.error)
            : retryFailed.isError
              ? extractErrorMessage(retryFailed.error)
              : null
        }
        onSubmit={async ({ reason }) => {
          if (!actionTarget) return;
          try {
            if (actionTarget.kind === 'run') {
              await runRule.mutateAsync({
                ruleId: actionTarget.rule.id,
                reason,
              });
              showToast.success('Association rule run completed.');
            } else {
              await retryFailed.mutateAsync({
                ruleId: actionTarget.rule.id,
                reason,
              });
              showToast.success('Failed associations queued for retry.');
            }
            setActionTarget(null);
          } catch {
            // Keep the dialog open with the server error.
          }
        }}
      />

      <LifecycleConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => (o ? undefined : setDeleteTarget(null))}
        title="Delete association rule"
        description="This deletes the rule and stops all future association resolution for it. Existing associations already resolved are not reversed."
        actionLabel="Delete rule"
        tone="danger"
        organisationName={deleteTarget?.name ?? ''}
        requiresNameConfirm={!!deleteTarget?.name}
        minReasonLength={10}
        reasonPlaceholder="Why is this rule being removed?"
        isSubmitting={deleteMutation.isPending}
        errorMessage={
          deleteMutation.isError
            ? extractErrorMessage(deleteMutation.error)
            : null
        }
        onSubmit={handleDelete}
      />
    </div>
  );
}
