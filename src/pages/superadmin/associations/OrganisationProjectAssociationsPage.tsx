import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Link2, PlusCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import AssociationRuleFormDialog from './AssociationRuleFormDialog';
import LifecycleConfirmDialog from '../lifecycle/LifecycleConfirmDialog';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
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
  useCreateSuperAdminAssociationRuleMutation,
  useDeleteSuperAdminAssociationRuleMutation,
  useSuperAdminAssociationRulesQuery,
  useSuperAdminOrganisationQuery,
  useSuperAdminPendingAssociationsQuery,
  useSuperAdminProjectQuery,
  useUpdateSuperAdminAssociationRuleMutation,
} from '@/queries/useSuperAdmin';
import type {
  SuperAdminAssociationRule,
  SuperAdminCreateAssociationRuleDto,
  SuperAdminUpdateAssociationRuleDto,
} from '@/types';

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

const PAGE_LIMIT = 25;

export default function OrganisationProjectAssociationsPage() {
  const { organisationId, projectId } = useParams<{
    organisationId: string;
    projectId: string;
  }>();

  const orgQuery = useSuperAdminOrganisationQuery(organisationId);
  const projectQuery = useSuperAdminProjectQuery(
    organisationId ?? '',
    projectId,
  );
  const rulesQuery = useSuperAdminAssociationRulesQuery(
    organisationId ?? '',
    projectId ?? '',
  );

  const [pendingPage, setPendingPage] = useState(1);
  const pendingQuery = useSuperAdminPendingAssociationsQuery(
    organisationId ?? '',
    projectId ?? '',
    pendingPage,
    PAGE_LIMIT,
  );

  const createMutation = useCreateSuperAdminAssociationRuleMutation(
    organisationId ?? '',
    projectId ?? '',
  );
  const updateMutation = useUpdateSuperAdminAssociationRuleMutation(
    organisationId ?? '',
    projectId ?? '',
  );
  const deleteMutation = useDeleteSuperAdminAssociationRuleMutation(
    organisationId ?? '',
    projectId ?? '',
  );

  const [dialogState, setDialogState] = useState<{
    mode: 'create' | 'edit';
    rule: SuperAdminAssociationRule | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<SuperAdminAssociationRule | null>(null);

  const rules = useMemo(() => rulesQuery.data ?? [], [rulesQuery.data]);

  if (!organisationId || !projectId) {
    return (
      <EmptyState
        icon={Link2}
        title="Missing route parameters"
        description="Both organisation and project ids are required."
      />
    );
  }

  const project = projectQuery.data;

  const handleCreate = (dto: SuperAdminCreateAssociationRuleDto) => {
    createMutation.mutate(dto, {
      onSuccess: () => {
        showToast.success('Association rule created.');
        setDialogState(null);
      },
    });
  };

  const handleUpdate = (
    ruleId: string,
    dto: SuperAdminUpdateAssociationRuleDto,
  ) => {
    updateMutation.mutate(
      { ruleId, dto },
      {
        onSuccess: () => {
          showToast.success('Association rule updated.');
          setDialogState(null);
        },
      },
    );
  };

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
          title="Association rules"
          description={
            project
              ? `${project.name} · ${orgQuery.data?.name ?? organisationId}`
              : organisationId
          }
        />
      </div>

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
                      <span className="text-muted-foreground"> · {rule.sourceMatchField}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {rule.targetObject}
                      <span className="text-muted-foreground"> · {rule.targetMatchField}</span>
                    </TableCell>
                    <TableCell>
                      {rule.isEnabled ? (
                        <Badge className="bg-emerald-100 text-emerald-900">Enabled</Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {(rule.conditions?.length ?? 0)} · {rule.conditionLogic ?? 'AND'}
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
                          <div className="text-muted-foreground text-xs">HS: {row.sourceHsId}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">{row.targetMatchValue}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{row.retryCount}</TableCell>
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
                {pendingQuery.data!.total} total · page {pendingQuery.data!.page}
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

      <AssociationRuleFormDialog
        open={dialogState !== null}
        onOpenChange={(o) => (o ? undefined : setDialogState(null))}
        mode={dialogState?.mode ?? 'create'}
        rule={dialogState?.rule ?? null}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        errorMessage={
          createMutation.isError
            ? extractErrorMessage(createMutation.error)
            : updateMutation.isError
              ? extractErrorMessage(updateMutation.error)
              : null
        }
        onCreate={handleCreate}
        onUpdate={handleUpdate}
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
          deleteMutation.isError ? extractErrorMessage(deleteMutation.error) : null
        }
        onSubmit={handleDelete}
      />
    </div>
  );
}
