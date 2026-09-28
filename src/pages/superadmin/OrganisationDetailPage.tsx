import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  Database,
  FolderOpen,
  Package,
  Pencil,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { showToast } from '@/lib/toast';
import EditOrganisationMetadataDialog from '@/pages/superadmin/organisations/EditOrganisationMetadataDialog';
import OrganisationLifecycleActions from '@/pages/superadmin/lifecycle/OrganisationLifecycleActions';
import {
  useSuperAdminActivityQuery,
  useSuperAdminOrganisationQuery,
  useUpdateSuperAdminOrganisationMutation,
} from '@/queries/useSuperAdmin';

// SA-405 / SA-406 Phase 4 organisation detail view. Read-only for now;
// suspend / reactivate / archive controls (SA-408..411) land in a follow-
// up once the Phase 0 lifecycle backend enum and cascade endpoints exist.
// Nothing here mutates.

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

function formatLimit(n: number | null): string {
  return n == null ? 'Unlimited' : formatNumber(n);
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Icon className="size-3.5" aria-hidden />
        <span>{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint ? (
        <div className="text-muted-foreground mt-1 text-xs">{hint}</div>
      ) : null}
    </div>
  );
}

export default function OrganisationDetailPage() {
  const { organisationId } = useParams<{ organisationId: string }>();
  const orgQuery = useSuperAdminOrganisationQuery(organisationId);
  const activityQuery = useSuperAdminActivityQuery(organisationId ?? '', {
    page: 1,
    limit: 5,
  });
  const updateMutation = useUpdateSuperAdminOrganisationMutation(
    organisationId ?? '',
  );
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  if (!organisationId) {
    return (
      <EmptyState
        icon={Building2}
        title="Missing organisation id"
        description="This route requires an organisation identifier in the URL."
      />
    );
  }

  if (orgQuery.isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (orgQuery.isError) {
    return (
      <ErrorState
        title="Could not load this organisation"
        description={
          (orgQuery.error as Error)?.message ??
          'The Super Admin overview endpoint returned an error.'
        }
        onRetry={() => orgQuery.refetch()}
      />
    );
  }

  const org = orgQuery.data!;
  const activity = activityQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/super-admin/organisations"
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All organisations
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <PageHeader title={org.name} description={org.slug} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{org.status}</Badge>
              <Badge variant="outline">{org.plan.name}</Badge>
              <Badge variant="outline">{org.plan.subscriptionStatus}</Badge>
              {org.paymentHoldActive ? (
                <Badge className="bg-red-100 text-red-900">Payment hold</Badge>
              ) : null}
              {org.manualHoldReason ? (
                <Badge className="bg-amber-100 text-amber-900">Manual hold</Badge>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditError(null);
                setEditOpen(true);
              }}
            >
              <Pencil className="size-4" aria-hidden />
              Edit metadata
            </Button>
            <OrganisationLifecycleActions organisation={org} />
          </div>
        </div>
      </div>

      <EditOrganisationMetadataDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        isSubmitting={updateMutation.isPending}
        errorMessage={editError}
        initial={{
          name: org.name,
          description: org.description ?? null,
          logoUrl: org.logoUrl ?? null,
          defaultCurrency:
            typeof org.settings?.defaultCurrency === 'string'
              ? (org.settings.defaultCurrency as string)
              : null,
        }}
        onSubmit={async (dto) => {
          setEditError(null);
          if (Object.keys(dto).length === 0) {
            // No changes — just close without a server round-trip.
            setEditOpen(false);
            return;
          }
          try {
            await updateMutation.mutateAsync(dto);
            showToast.success('Organisation metadata updated.');
            setEditOpen(false);
          } catch (err) {
            const e = err as {
              response?: { data?: { message?: string } };
            };
            setEditError(
              e?.response?.data?.message ?? 'The update failed. Try again.',
            );
          }
        }}
      />

      {org.status === 'suspended' ? (
        <Alert variant="destructive">
          <ShieldCheck className="size-4" />
          <AlertTitle>Organisation is suspended</AlertTitle>
          <AlertDescription>
            All tenant access is rejected. Scheduled jobs are paused and queued
            runs were cancelled at the suspension moment. Use the Reactivate
            action to lift the suspension — jobs stay paused until members
            re-enable them.
          </AlertDescription>
        </Alert>
      ) : null}

      {org.status === 'archived' ? (
        <Alert variant="destructive">
          <ShieldCheck className="size-4" />
          <AlertTitle>Organisation is archived</AlertTitle>
          <AlertDescription>
            Soft-deleted. Retained for the recovery window then hard-deleted by
            the reaper. Unarchive routes through suspended first — you cannot
            go straight back to active.
          </AlertDescription>
        </Alert>
      ) : null}

      {org.paymentHoldActive ? (
        <Alert variant="destructive">
          <ShieldCheck className="size-4" />
          <AlertTitle>Payment hold active</AlertTitle>
          <AlertDescription>
            Scheduler skipped for this organisation.
            {org.manualHoldReason ? ` Reason: "${org.manualHoldReason}"` : ''}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to={`/super-admin/organisations/${org.id}/members`}
          className="block"
          aria-label="Manage members"
        >
          <StatCard
            icon={Users}
            label="Members"
            value={org.usage.members.active}
            hint={`of ${formatLimit(org.usage.members.limit)} allowed · ${org.usage.members.total} total`}
          />
        </Link>
        <Link
          to={`/super-admin/organisations/${org.id}/projects`}
          className="block"
          aria-label="Manage projects"
        >
          <StatCard
            icon={FolderOpen}
            label="Projects"
            value={org.usage.projects.count}
            hint={`of ${formatLimit(org.usage.projects.limit)} allowed${org.usage.projects.over ? ' · over plan' : ''}`}
          />
        </Link>
        <StatCard
          icon={Package}
          label="Jobs"
          value={org.usage.jobs.count}
          hint={`of ${formatLimit(org.usage.jobs.limit)} allowed${org.usage.jobs.over ? ' · over plan' : ''}`}
        />
        <StatCard
          icon={Database}
          label="Records this period"
          value={formatNumber(org.usage.records.used)}
          hint={
            org.usage.records.limit == null
              ? 'Unlimited'
              : `${formatNumber(org.usage.records.remaining)} left of ${formatNumber(org.usage.records.limit)}`
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-card rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-semibold">Owner</h2>
          {org.owner ? (
            <div className="flex items-start gap-3">
              <div className="bg-muted flex size-10 items-center justify-center rounded-full">
                <User className="size-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {org.owner.fullName ?? org.owner.email}
                </div>
                <div className="text-muted-foreground truncate text-sm">
                  {org.owner.email}
                </div>
                <div className="mt-1 text-xs">
                  {org.owner.isActive ? (
                    <span className="text-emerald-700">Active user</span>
                  ) : (
                    <span className="text-amber-700">Deactivated user</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No owner assigned. The organisation is likely in the pending
              registration window.
            </p>
          )}
        </section>

        <section className="bg-card rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-semibold">Billing</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground flex items-center gap-1">
                <CreditCard className="size-3.5" aria-hidden />
                Plan
              </dt>
              <dd className="font-medium">{org.plan.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subscription</dt>
              <dd className="font-medium">{org.plan.subscriptionStatus}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground flex items-center gap-1">
                <Calendar className="size-3.5" aria-hidden />
                Created
              </dt>
              <dd>{format(new Date(org.createdAt), 'PP')}</dd>
            </div>
            {org.updatedAt ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last updated</dt>
                <dd>
                  {formatDistanceToNow(new Date(org.updatedAt), {
                    addSuffix: true,
                  })}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link to={`/super-admin/organisations/${org.id}/billing`}>
                Open billing
              </Link>
            </Button>
          </div>
        </section>
      </div>

      <section className="bg-card rounded-lg border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <Link
            to={`/super-admin/organisations/${org.id}/activity`}
            className="text-primary text-xs hover:underline"
          >
            See all →
          </Link>
        </div>
        {activityQuery.isLoading ? (
          <div className="flex items-center justify-center p-6">
            <Spinner className="size-4" />
          </div>
        ) : activityQuery.isError ? (
          <p className="text-muted-foreground p-4 text-sm">
            Could not load activity for this organisation.
          </p>
        ) : activity.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">
            No recorded activity yet.
          </p>
        ) : (
          <ul className="divide-y">
            {activity.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{entry.action}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {entry.userEmail ?? 'system'}
                    {' · '}
                    {formatDistanceToNow(new Date(entry.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {entry.severity}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
