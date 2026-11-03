import { format, formatDistanceToNow } from 'date-fns';
import {
  Archive,
  ArrowUpRight,
  CircleStop,
  CreditCard,
  Database,
  FolderOpen,
  Pencil,
  Play,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Users,
  Workflow,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageContextAlert from '@/components/shared/PageContextAlert';
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import LifecycleConfirmDialog from '@/pages/superadmin/lifecycle/LifecycleConfirmDialog';
import EditOrganisationMetadataDialog, {
  type EditOrganisationMetadataInitial,
} from '@/pages/superadmin/organisations/EditOrganisationMetadataDialog';
import {
  useClearPaymentHoldMutation,
  useHoldOrganisationWorkMutation,
  useImposePaymentHoldMutation,
  useResumeOrganisationWorkMutation,
  useSuperAdminBillingOverviewQuery,
  useSuperAdminOrganisationQuery,
  useTransitionOrganisationStatusMutation,
  useUpdateSuperAdminOrganisationMutation,
} from '@/queries/useSuperAdmin';

function formatNumber(value: number | null | undefined): string {
  return value == null ? '—' : value.toLocaleString();
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'PP');
}

function formatRelative(value: string | null | undefined): string {
  if (!value) return 'No sync runs yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : formatDistanceToNow(date, { addSuffix: true });
}

export default function OrganisationDetailPage() {
  const { organisationId } = useParams<{ organisationId: string }>();
  const orgQuery = useSuperAdminOrganisationQuery(organisationId);
  const billingQuery = useSuperAdminBillingOverviewQuery(organisationId ?? '');
  const updateMutation = useUpdateSuperAdminOrganisationMutation(
    organisationId ?? '',
  );
  const resumeWorkMutation = useResumeOrganisationWorkMutation(
    organisationId ?? '',
  );
  const clearHoldMutation = useClearPaymentHoldMutation(organisationId ?? '');
  const holdMutation = useHoldOrganisationWorkMutation(organisationId ?? '');
  const imposeHoldMutation = useImposePaymentHoldMutation(organisationId ?? '');
  const transitionMutation = useTransitionOrganisationStatusMutation(
    organisationId ?? '',
  );

  type ActionKey =
    | 'suspend'
    | 'reactivate'
    | 'archive'
    | 'restore'
    | 'hold'
    | 'impose-payment-hold'
    | 'clear-payment-hold';

  const [openAction, setOpenAction] = useState<ActionKey | null>(null);
  const closeDialog = () => setOpenAction(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const initialMetadata = useMemo<EditOrganisationMetadataInitial>(() => {
    const org = orgQuery.data;
    return {
      name: org?.name ?? '',
      description: org?.description ?? null,
      logoUrl: org?.logoUrl ?? null,
      defaultCurrency:
        typeof org?.settings?.defaultCurrency === 'string'
          ? org.settings.defaultCurrency
          : null,
    };
  }, [
    orgQuery.data?.name,
    orgQuery.data?.description,
    orgQuery.data?.logoUrl,
    orgQuery.data?.settings?.defaultCurrency,
  ]);

  if (!organisationId) {
    return (
      <EmptyState
        icon={FolderOpen}
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
  const basePath = '/super-admin/organisations/' + org.id;
  const billing = billingQuery.data;
  const syncHealth = org.syncHealth;

  const overPlanResources = [
    org.usage.members.limit !== null &&
    org.usage.members.total > org.usage.members.limit
      ? 'members'
      : null,
    org.usage.projects.over ? 'projects' : null,
    org.usage.jobs.over ? 'sync flows' : null,
    org.usage.records.limit !== null &&
    org.usage.records.used > org.usage.records.limit
      ? 'records'
      : null,
  ].filter((value): value is string => value !== null);

  // General warnings — grouped into a single dismissible PageContextAlert
  const accountWarnings: { title: string; detail: string; to: string }[] = [];

  if (org.status === 'pending') {
    accountWarnings.push({
      title: 'Organisation is pending setup',
      detail: 'Review account provisioning and initial ownership.',
      to: basePath + '/members',
    });
  }

  if (syncHealth?.failingJobs && syncHealth.failingJobs > 0) {
    accountWarnings.push({
      title: `${syncHealth.failingJobs} failing sync flow${syncHealth.failingJobs === 1 ? '' : 's'}`,
      detail: 'Review errors and connection credentials.',
      to: basePath + '/projects',
    });
  }

  if (
    org.plan.subscriptionStatus !== 'active' &&
    org.plan.subscriptionStatus !== 'trialing'
  ) {
    accountWarnings.push({
      title: 'Subscription ' + org.plan.subscriptionStatus.replace(/_/g, ' '),
      detail: 'Review the subscription and payment method.',
      to: basePath + '/billing',
    });
  }

  if (overPlanResources.length > 0) {
    accountWarnings.push({
      title: 'Over plan: ' + overPlanResources.join(', '),
      detail: 'Review resource quotas and plan limits.',
      to: basePath + '/billing',
    });
  }

  if (!org.owner || !org.owner.isActive) {
    accountWarnings.push({
      title: org.owner ? 'Owner account is inactive' : 'No owner assigned',
      detail: 'Review workspace membership.',
      to: basePath + '/members',
    });
  }

  // Record quota calculations
  const recordLimit = org.usage.records.limit;
  const recordsUsed = org.usage.records.used;
  const recordPercent =
    recordLimit === null
      ? null
      : recordLimit === 0
        ? recordsUsed > 0
          ? 100
          : 0
        : Math.min(100, Math.round((recordsUsed / recordLimit) * 100));
  const recordOver = recordLimit !== null && recordsUsed > recordLimit;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Metadata Edit Dialog ────────────────────────────────────────── */}
      <EditOrganisationMetadataDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        isSubmitting={updateMutation.isPending}
        errorMessage={editError}
        initial={initialMetadata}
        onSubmit={async (dto) => {
          setEditError(null);
          if (Object.keys(dto).length === 0) {
            setEditOpen(false);
            return;
          }
          try {
            await updateMutation.mutateAsync(dto);
            showToast.success('Organisation metadata updated.');
            setEditOpen(false);
          } catch (error) {
            const responseError = error as {
              response?: { data?: { message?: string } };
            };
            setEditError(
              responseError?.response?.data?.message ??
                'The update failed. Try again.',
            );
          }
        }}
      />

      {/* ── 1. UNIFIED CONTEXTUAL ALERTS (Standard PageContextAlert) ────── */}
      {/* Critical Status: Suspended (Non-dismissible error) */}
      {org.status === 'suspended' && (
        <PageContextAlert
          variant="error"
          title="Organisation Suspended"
          description="Tenant logins and API sessions are completely rejected. Scheduled sync jobs are paused. Reactivate via the Organisation Management section below."
          dismissible={false}
        />
      )}

      {/* Critical Status: Archived (Non-dismissible error) */}
      {org.status === 'archived' && (
        <PageContextAlert
          variant="error"
          title="Organisation Archived"
          description="This workspace is soft-deleted and inside its recovery window. Restore via the Organisation Management section below."
          dismissible={false}
        />
      )}

      {/* Critical State: Payment Hold (Non-dismissible error) */}
      {org.paymentHoldActive && (
        <PageContextAlert
          variant="error"
          title="Payment / Billing Hold Active"
          description={
            <>
              Scheduler execution is paused
              {org.paymentHoldSince ? ` since ${formatDate(org.paymentHoldSince)}` : ''}
              {org.manualHoldReason ? `. Reason: ${org.manualHoldReason}` : '.'}
            </>
          }
          dismissible={false}
          actions={
            <Button
              size="xs"
              variant="outline"
              className="h-6 text-xs font-semibold"
              disabled={clearHoldMutation.isPending}
              onClick={() => {
                clearHoldMutation.mutate(
                  { reason: 'Cleared via Overview cockpit' },
                  {
                    onSuccess: () => {
                      showToast.success('Payment hold cleared.');
                      void orgQuery.refetch();
                    },
                    onError: () => {
                      showToast.error('Could not clear hold. Please try again.');
                    },
                  },
                );
              }}
            >
              {clearHoldMutation.isPending ? 'Clearing…' : 'Clear Payment Hold'}
            </Button>
          }
        />
      )}

      {/* Operational State: Work Held (Non-dismissible warning) */}
      {syncHealth?.isWorkHeld && (
        <PageContextAlert
          variant="warning"
          title="Operational Work Hold Active"
          description={`${syncHealth.heldJobs} sync flow${syncHealth.heldJobs === 1 ? '' : 's'} placed on hold. Future scheduler execution is paused while in-flight jobs finish gracefully.`}
          dismissible={false}
          actions={
            <Button
              size="xs"
              variant="outline"
              className="h-6 text-xs font-semibold"
              disabled={resumeWorkMutation.isPending}
              onClick={() => {
                resumeWorkMutation.mutate(undefined, {
                  onSuccess: (data) => {
                    showToast.success(
                      `Resumed ${data.resumedJobs} job${data.resumedJobs === 1 ? '' : 's'}.`,
                    );
                    void orgQuery.refetch();
                  },
                  onError: () => {
                    showToast.error('Could not resume work. Please try again.');
                  },
                });
              }}
            >
              {resumeWorkMutation.isPending ? 'Resuming…' : 'Resume Held Work'}
            </Button>
          }
        />
      )}

      {/* Grouped Account Warnings (Session-dismissible warning, reappears on refresh) */}
      {accountWarnings.length > 0 && (
        <PageContextAlert
          variant="warning"
          dismissKey={`org-overview:${org.id}:needs-attention`}
          dismissible={true}
          title="Needs attention"
          description={
            <ul className="mt-1 space-y-1">
              {accountWarnings.map((issue) => (
                <li key={issue.title} className="flex flex-wrap items-baseline gap-1 text-xs">
                  <Link
                    to={issue.to}
                    className="font-semibold underline underline-offset-2 hover:text-foreground"
                  >
                    {issue.title}
                  </Link>
                  <span className="text-muted-foreground">— {issue.detail}</span>
                </li>
              ))}
            </ul>
          }
        />
      )}

      {/* ── 2. TWO-COLUMN EXECUTIVE COCKPIT (Symmetrical, Equal Height, Zero Custom Dividers) ─── */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        {/* Left Column: Workspace Pulse */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle role="heading" aria-level={2}>Workspace Pulse</CardTitle>
            <CardDescription>
              Account identity, subscription &amp; quota limits
            </CardDescription>
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium"
                onClick={() => {
                  setEditError(null);
                  setEditOpen(true);
                }}
              >
                <Pencil className="size-3.5" aria-hidden="true" />
                Edit metadata
              </Button>
            </CardAction>
          </CardHeader>

          <CardContent className="flex-1 space-y-4">
            {/* Primary Workspace Owner */}
            <div className="rounded-xl bg-muted/40 p-3">
              <div className="text-muted-foreground text-xs font-medium">Primary Workspace Owner</div>
              <div className="mt-1">
                {org.owner ? (
                  <Link
                    to={basePath + '/members'}
                    className="flex items-baseline justify-between gap-2 hover:underline focus-visible:outline-none"
                  >
                    <span className="font-semibold text-sm truncate">
                      {org.owner.fullName ?? org.owner.email}
                      {!org.owner.isActive && (
                        <span className="text-destructive font-normal ml-1.5 text-xs">
                          (Inactive)
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground text-xs truncate">
                      {org.owner.email}
                    </span>
                  </Link>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    No primary owner assigned
                  </span>
                )}
              </div>
            </div>

            {/* Account Metadata 2x2 Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs font-medium">Plan Tier</div>
                <div className="mt-1 font-semibold text-sm truncate">{org.plan.name}</div>
              </div>

              <div>
                <div className="text-muted-foreground text-xs font-medium">Subscription Status</div>
                <div className="mt-1">
                  <StatusBadge
                    status={org.plan.subscriptionStatus}
                    label={org.plan.subscriptionStatus.replace(/_/g, ' ')}
                    className="capitalize text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="text-muted-foreground text-xs font-medium">
                  {billing?.plan.trialEndsAt ? 'Trial Ends' : 'Renewal Date'}
                </div>
                <div className="mt-1 font-medium text-xs">
                  {billingQuery.isLoading
                    ? 'Loading…'
                    : formatDate(
                        billing?.plan.trialEndsAt ?? billing?.plan.currentPeriodEnd,
                      )}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground text-xs font-medium">Workspace Created</div>
                <div className="mt-1 font-medium text-xs">{formatDate(org.createdAt)}</div>
              </div>
            </div>

            {/* Monthly Record Quota (Clean spacing, zero line dividers) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Database className="size-3.5" aria-hidden="true" />
                  Monthly Record Quota
                </span>
                <Link
                  to={basePath + '/billing?highlight=records#entitlements-usage'}
                  className="font-semibold hover:underline"
                >
                  {formatNumber(recordsUsed)}{' '}
                  <span className="text-muted-foreground font-normal">
                    / {recordLimit === null ? 'Unlimited' : formatNumber(recordLimit)}
                  </span>
                </Link>
              </div>
              {recordPercent !== null && (
                <Progress
                  value={recordPercent}
                  aria-label="Monthly record usage"
                  className={
                    'h-1.5 ' +
                    (recordOver
                      ? '[&_[data-slot=progress-indicator]]:bg-destructive'
                      : '[&_[data-slot=progress-indicator]]:bg-[var(--brand-orange)]')
                  }
                />
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {org.usage.records.periodStart
                    ? `Period started ${formatDate(org.usage.records.periodStart)}`
                    : 'Current billing window'}
                </span>
                {recordOver && (
                  <span className="text-destructive font-semibold">Over Plan Limit</span>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between text-xs">
            <Link
              to={basePath + '/members'}
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              <Users className="size-3.5" aria-hidden="true" />
              {formatNumber(org.usage.members.total)} team member{org.usage.members.total === 1 ? '' : 's'}
            </Link>
            <Link
              to={basePath + '/billing'}
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              Open billing details
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </CardFooter>
        </Card>

        {/* Right Column: Sync Engine Health Matrix */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle role="heading" aria-level={2}>Sync Engine Health</CardTitle>
            <CardDescription>
              Real-time pipeline metrics &amp; scheduling state
            </CardDescription>
            <CardAction>
              <Link
                to={basePath + '/projects'}
                className="text-primary text-xs font-medium hover:underline inline-flex items-center gap-1"
              >
                All projects
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </CardAction>
          </CardHeader>

          <CardContent className="flex-1 space-y-4">
            {/* 4 Status Tiles Grid — using DESIGN SYSTEM success token! */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-success/30 bg-success/10 p-3">
                <span className="text-success text-xs font-semibold flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-success" />
                  Active &amp; Scheduled
                </span>
                <span className="mt-2 block text-2xl font-bold tracking-tight text-foreground">
                  {formatNumber(syncHealth?.activeJobs ?? org.usage.jobs.count)}
                </span>
                <span className="text-muted-foreground text-xs">Running on schedule</span>
              </div>

              <div
                className={cn(
                  'rounded-xl border p-3',
                  syncHealth?.heldJobs
                    ? 'border-warning/40 bg-warning/15'
                    : 'border-border/70 bg-muted/30',
                )}
              >
                <span
                  className={cn(
                    'text-xs font-semibold flex items-center gap-1.5',
                    syncHealth?.heldJobs
                      ? 'text-warning-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  <CircleStop className="size-3.5" />
                  Held by Operations
                </span>
                <span className="mt-2 block text-2xl font-bold tracking-tight text-foreground">
                  {formatNumber(syncHealth?.heldJobs ?? 0)}
                </span>
                <span className="text-muted-foreground text-xs">Operator intervention</span>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                <span className="text-muted-foreground text-xs font-semibold flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-slate-400" />
                  Tenant Paused
                </span>
                <span className="mt-2 block text-2xl font-bold tracking-tight text-foreground">
                  {formatNumber(syncHealth?.pausedJobs ?? 0)}
                </span>
                <span className="text-muted-foreground text-xs">Paused by customer</span>
              </div>

              <div
                className={cn(
                  'rounded-xl border p-3',
                  syncHealth?.failingJobs
                    ? 'border-destructive/40 bg-destructive/10'
                    : 'border-border/70 bg-muted/30',
                )}
              >
                <span
                  className={cn(
                    'text-xs font-semibold flex items-center gap-1.5',
                    syncHealth?.failingJobs
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                  )}
                >
                  <TriangleAlert className="size-3.5" />
                  Failing / Error
                </span>
                <span
                  className={cn(
                    'mt-2 block text-2xl font-bold tracking-tight',
                    syncHealth?.failingJobs ? 'text-destructive' : 'text-foreground',
                  )}
                >
                  {formatNumber(syncHealth?.failingJobs ?? 0)}
                </span>
                <span className="text-muted-foreground text-xs">Requires attention</span>
              </div>
            </div>

            {/* Sync Meta Row (Clean spacing, zero line dividers) */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <FolderOpen className="size-3.5" />
                  Configured Projects
                </span>
                <Link
                  to={basePath + '/projects'}
                  className="font-semibold text-foreground hover:underline"
                >
                  {formatNumber(org.usage.projects.count)} projects
                </Link>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Workflow className="size-3.5" />
                  Total Sync Flows
                </span>
                <Link
                  to={basePath + '/billing?highlight=jobs#entitlements-usage'}
                  className="font-semibold text-foreground hover:underline"
                >
                  {formatNumber(syncHealth?.totalJobs ?? org.usage.jobs.count)} flows
                </Link>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Global Last Synced</span>
                <span className="font-medium text-foreground">
                  {formatRelative(syncHealth?.lastSyncedAt)}
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between text-xs">
            <Link
              to="/super-admin/sync-operations"
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              Queue Board &amp; Workers
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Link
              to={basePath + '/activity'}
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              View sync history
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* ── 3. ORGANISATION MANAGEMENT & GOVERNANCE CARD (Option Cards) ───── */}
      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>Organisation Management</CardTitle>
          <CardDescription>
            Super Admin operational holds, billing interventions, and workspace lifecycle transitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* Option 1: Work Execution State */}
            <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CircleStop className="size-3.5" />
                    Work Execution
                  </span>
                  {syncHealth?.isWorkHeld ? (
                    <Badge variant="secondary" className="bg-warning/20 text-warning-foreground rounded-full text-[10px] px-2 py-0 border-0">
                      Work Held ({syncHealth.heldJobs})
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-success/15 text-success rounded-full text-[10px] px-2 py-0 border-0">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {syncHealth?.isWorkHeld
                    ? 'Scheduler execution paused. Active jobs finish their current batch.'
                    : 'Jobs run automatically according to their active schedule.'}
                </p>
              </div>

              <div>
                {syncHealth?.isWorkHeld ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-medium text-success border-success/30 hover:bg-success/10"
                    disabled={resumeWorkMutation.isPending}
                    onClick={() => {
                      resumeWorkMutation.mutate(undefined, {
                        onSuccess: (data) => {
                          showToast.success(
                            `Resumed ${data.resumedJobs} job${data.resumedJobs === 1 ? '' : 's'}.`,
                          );
                          void orgQuery.refetch();
                        },
                        onError: () => {
                          showToast.error('Could not resume work. Please try again.');
                        },
                      });
                    }}
                  >
                    <Play className="size-3.5 mr-1.5" />
                    Resume held work
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-medium"
                    onClick={() => setOpenAction('hold')}
                  >
                    <CircleStop className="size-3.5 mr-1.5" />
                    Hold work
                  </Button>
                )}
              </div>
            </div>

            {/* Option 2: Commercial / Payment Hold */}
            <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="size-3.5" />
                    Commercial Hold
                  </span>
                  {org.paymentHoldActive ? (
                    <Badge variant="destructive" className="rounded-full text-[10px] px-2 py-0">
                      Hold Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-success/15 text-success rounded-full text-[10px] px-2 py-0 border-0">
                      Normal
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {org.paymentHoldActive
                    ? 'Sync execution halted due to billing intervention or dispute.'
                    : 'Commercial account is in good standing with active subscription.'}
                </p>
              </div>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={org.paymentHoldActive ? 'Clear payment hold' : 'Impose payment hold'}
                  className={cn(
                    'w-full text-xs font-medium',
                    org.paymentHoldActive &&
                      'text-success border-success/30 hover:bg-success/10',
                  )}
                  onClick={() =>
                    setOpenAction(
                      org.paymentHoldActive
                        ? 'clear-payment-hold'
                        : 'impose-payment-hold',
                    )
                  }
                >
                  <CreditCard className="size-3.5 mr-1.5" />
                  {org.paymentHoldActive ? 'Clear payment hold' : 'Impose payment hold'}
                </Button>
              </div>
            </div>

            {/* Option 3: Workspace Lifecycle */}
            <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5" />
                    Workspace Lifecycle
                  </span>
                  <StatusBadge
                    status={org.status}
                    label={org.status}
                    tone={org.status === 'pending' ? 'info' : undefined}
                    className="capitalize text-xs"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {org.status === 'active'
                    ? 'Tenant users can log in, sync, and access APIs.'
                    : org.status === 'suspended'
                      ? 'All user tokens rejected; background queues paused.'
                      : 'Soft-deleted and within 30-day recovery window.'}
                </p>
              </div>

              <div>
                {org.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-medium text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setOpenAction('suspend')}
                  >
                    <ShieldAlert className="size-3.5 mr-1.5" />
                    Suspend organisation
                  </Button>
                )}

                {org.status === 'suspended' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs font-medium text-success border-success/30 hover:bg-success/10"
                      onClick={() => setOpenAction('reactivate')}
                    >
                      <PlayCircle className="size-3.5 mr-1.5" />
                      Reactivate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs font-medium text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setOpenAction('archive')}
                    >
                      <Archive className="size-3.5 mr-1.5" />
                      Archive
                    </Button>
                  </div>
                )}

                {org.status === 'archived' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-medium text-success border-success/30 hover:bg-success/10"
                    onClick={() => setOpenAction('restore')}
                  >
                    <PlayCircle className="size-3.5 mr-1.5" />
                    Restore organisation
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lifecycle Confirmation Dialogs */}
      <LifecycleConfirmDialog
        open={openAction === 'suspend'}
        onOpenChange={(o) => (o ? setOpenAction('suspend') : closeDialog())}
        title="Suspend organisation"
        description="Reject every tenant token, cancel queued Bull runs, pause every scheduled job. Reactivating later does not automatically re-queue lost runs."
        bodyWarning="Active runs finish their current batch and stop with checkpoint preserved. Tenant users cannot sign in until the organisation is reactivated."
        actionLabel="Suspend"
        tone="warning"
        organisationName={org.name}
        requiresNameConfirm={true}
        minReasonLength={10}
        reasonPlaceholder="Why is this organisation being suspended?"
        isSubmitting={transitionMutation.isPending}
        errorMessage={
          transitionMutation.isError
            ? (transitionMutation.error as Error)?.message
            : null
        }
        onSubmit={({ reason }) => {
          transitionMutation.mutate(
            { targetStatus: 'suspended', confirmName: org.name, reason },
            {
              onSuccess: (data) => {
                showToast.success(`Organisation ${data.status}.`);
                closeDialog();
                void orgQuery.refetch();
              },
              onError: () => {
                showToast.error('Could not suspend organisation.');
              },
            },
          );
        }}
      />

      <LifecycleConfirmDialog
        open={openAction === 'reactivate'}
        onOpenChange={(o) => (o ? setOpenAction('reactivate') : closeDialog())}
        title="Reactivate organisation"
        description="Clear suspension, unpause sync schedules, and permit tenant logins again. Active Bull queues will accept new sync runs immediately."
        actionLabel="Reactivate"
        tone="warning"
        organisationName={org.name}
        requiresNameConfirm={false}
        minReasonLength={10}
        reasonPlaceholder="Why is this organisation being reactivated?"
        isSubmitting={transitionMutation.isPending}
        errorMessage={
          transitionMutation.isError
            ? (transitionMutation.error as Error)?.message
            : null
        }
        onSubmit={({ reason }) => {
          transitionMutation.mutate(
            { targetStatus: 'active', confirmName: org.name, reason },
            {
              onSuccess: (data) => {
                showToast.success(`Organisation ${data.status}.`);
                closeDialog();
                void orgQuery.refetch();
              },
              onError: () => {
                showToast.error('Could not reactivate organisation.');
              },
            },
          );
        }}
      />

      <LifecycleConfirmDialog
        open={openAction === 'archive'}
        onOpenChange={(o) => (o ? setOpenAction('archive') : closeDialog())}
        title="Archive organisation"
        description="Soft-delete the organisation and start the 30-day recovery window. Restoring within this period preserves project definitions and mapping history."
        bodyWarning="Only suspended organisations may be archived. All scheduled jobs and tokens remain disabled."
        actionLabel="Archive"
        tone="danger"
        organisationName={org.name}
        requiresNameConfirm={true}
        minReasonLength={10}
        reasonPlaceholder="Why is this organisation being archived?"
        isSubmitting={transitionMutation.isPending}
        errorMessage={
          transitionMutation.isError
            ? (transitionMutation.error as Error)?.message
            : null
        }
        onSubmit={({ reason }) => {
          transitionMutation.mutate(
            { targetStatus: 'archived', confirmName: org.name, reason },
            {
              onSuccess: (data) => {
                showToast.success(`Organisation ${data.status}.`);
                closeDialog();
                void orgQuery.refetch();
              },
              onError: () => {
                showToast.error('Could not archive organisation.');
              },
            },
          );
        }}
      />

      <LifecycleConfirmDialog
        open={openAction === 'restore'}
        onOpenChange={(o) => (o ? setOpenAction('restore') : closeDialog())}
        title="Restore from archive"
        description="Move organisation out of the recovery window back to suspended state. You can then review and reactivate."
        actionLabel="Restore"
        tone="warning"
        organisationName={org.name}
        requiresNameConfirm={false}
        minReasonLength={10}
        reasonPlaceholder="Why is this organisation being restored?"
        isSubmitting={transitionMutation.isPending}
        errorMessage={
          transitionMutation.isError
            ? (transitionMutation.error as Error)?.message
            : null
        }
        onSubmit={({ reason }) => {
          transitionMutation.mutate(
            { targetStatus: 'suspended', confirmName: org.name, reason },
            {
              onSuccess: () => {
                showToast.success(`Organisation restored.`);
                closeDialog();
                void orgQuery.refetch();
              },
              onError: () => {
                showToast.error('Could not restore organisation.');
              },
            },
          );
        }}
      />

      <LifecycleConfirmDialog
        open={openAction === 'hold'}
        onOpenChange={(o) => (o ? setOpenAction('hold') : closeDialog())}
        title="Hold all sync work"
        description="Pause every scheduled sync job across all projects in this organisation. In-flight jobs finish their current batch gracefully. Tenant users will see a support banner and cannot resume work until lifted by Super Admin."
        actionLabel="Hold work"
        tone="warning"
        organisationName={org.name}
        requiresNameConfirm={false}
        minReasonLength={5}
        reasonPlaceholder="Why is work being held for this organisation?"
        isSubmitting={holdMutation.isPending}
        errorMessage={
          holdMutation.isError ? (holdMutation.error as Error)?.message : null
        }
        onSubmit={({ reason }) => {
          holdMutation.mutate(
            { reason },
            {
              onSuccess: (data) => {
                showToast.success(
                  `Work held for ${data.heldJobs} job${data.heldJobs === 1 ? '' : 's'}.`,
                );
                closeDialog();
                void orgQuery.refetch();
              },
              onError: () => {
                showToast.error('Could not hold work. Try again.');
              },
            },
          );
        }}
      />

      <LifecycleConfirmDialog
        open={openAction === 'impose-payment-hold'}
        onOpenChange={(o) =>
          o ? setOpenAction('impose-payment-hold') : closeDialog()
        }
        title="Impose manual payment hold"
        description="Halt sync scheduler execution due to failed or overdue subscription payments. Tenant logins remain permitted, but automatic syncs pause."
        actionLabel="Impose payment hold"
        tone="warning"
        organisationName={org.name}
        requiresNameConfirm={true}
        minReasonLength={5}
        reasonPlaceholder="Why is payment hold being imposed?"
        isSubmitting={imposeHoldMutation.isPending}
        errorMessage={
          imposeHoldMutation.isError
            ? (imposeHoldMutation.error as Error)?.message
            : null
        }
        onSubmit={({ reason }) => {
          imposeHoldMutation.mutate(
            { confirmName: org.name, reason },
            {
              onSuccess: () => {
                showToast.success('Payment hold imposed.');
                closeDialog();
                void orgQuery.refetch();
              },
              onError: () => {
                showToast.error('Could not impose payment hold.');
              },
            },
          );
        }}
      />

      <LifecycleConfirmDialog
        open={openAction === 'clear-payment-hold'}
        onOpenChange={(o) =>
          o ? setOpenAction('clear-payment-hold') : closeDialog()
        }
        title="Clear payment hold"
        description="Lift the commercial hold. Scheduled sync execution will resume automatically on their next cron tick."
        actionLabel="Clear payment hold"
        tone="warning"
        organisationName={org.name}
        requiresNameConfirm={false}
        minReasonLength={5}
        reasonPlaceholder="Reason for lifting payment hold"
        isSubmitting={clearHoldMutation.isPending}
        errorMessage={
          clearHoldMutation.isError
            ? (clearHoldMutation.error as Error)?.message
            : null
        }
        onSubmit={({ reason }) => {
          clearHoldMutation.mutate(
            { reason },
            {
              onSuccess: () => {
                showToast.success('Payment hold cleared.');
                closeDialog();
                void orgQuery.refetch();
              },
              onError: () => {
                showToast.error('Could not clear payment hold.');
              },
            },
          );
        }}
      />
    </div>
  );
}
