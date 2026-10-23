import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowUpRight,
  CalendarDays,
  Database,
  FolderOpen,
  Pencil,
  TriangleAlert,
  Users,
  Workflow,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getPlatform } from '@/components/platform';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { ProjectPlatformPair } from '@/features/projects/components/cards';
import { showToast } from '@/lib/toast';
import EditOrganisationMetadataDialog from '@/pages/superadmin/organisations/EditOrganisationMetadataDialog';
import OrganisationLifecycleActions from '@/pages/superadmin/lifecycle/OrganisationLifecycleActions';
import {
  useSuperAdminActivityQuery,
  useSuperAdminBillingOverviewQuery,
  useSuperAdminOrganisationQuery,
  useSuperAdminProjectsQuery,
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
  if (!value) return 'Not synced yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : formatDistanceToNow(date, { addSuffix: true });
}

function formatEventLabel(value: string): string {
  const label = value.replace(/[._-]+/g, ' ').trim();
  return label ? label[0].toUpperCase() + label.slice(1) : 'Activity recorded';
}

function UsageMetric({
  icon: Icon,
  label,
  count,
  limit,
  detail,
  to,
  over = false,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  limit: number | null;
  detail: string;
  to: string;
  over?: boolean;
}) {
  const percent =
    limit === null
      ? null
      : limit === 0
        ? count > 0
          ? 100
          : 0
        : Math.min(100, Math.round((count / limit) * 100));

  return (
    <Link
      to={to}
      className="hover:bg-muted/50 focus-visible:ring-ring block rounded-2xl p-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      aria-label={label + ': ' + formatNumber(count) + '. ' + detail}
    >
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-foreground text-2xl leading-none font-semibold tracking-tight">
          {formatNumber(count)}
        </span>
        {limit !== null && (
          <span className="text-muted-foreground text-xs">
            / {formatNumber(limit)}
          </span>
        )}
      </div>
      <div className="text-muted-foreground mt-1 min-h-4 text-xs">
        {detail}
        {over && (
          <span className="text-destructive font-semibold"> · over plan</span>
        )}
      </div>
      {percent !== null && (
        <Progress
          value={percent}
          aria-label={label + ' plan usage'}
          className={
            'mt-2 h-1.5 ' +
            (over
              ? '[&_[data-slot=progress-indicator]]:bg-destructive'
              : '[&_[data-slot=progress-indicator]]:bg-[var(--brand-orange)]')
          }
        />
      )}
    </Link>
  );
}

function SectionMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="text-muted-foreground bg-muted/40 flex min-h-20 flex-col items-start justify-center gap-2 rounded-2xl p-4 text-sm">
      <span>{message}</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export default function OrganisationDetailPage() {
  const { organisationId } = useParams<{ organisationId: string }>();
  const orgQuery = useSuperAdminOrganisationQuery(organisationId);
  const billingQuery = useSuperAdminBillingOverviewQuery(organisationId ?? '');
  const projectsQuery = useSuperAdminProjectsQuery(organisationId ?? '', {
    page: 1,
    limit: 4,
    sortBy: 'lastSyncedAt',
    sortOrder: 'desc',
  });
  const activityQuery = useSuperAdminActivityQuery(organisationId ?? '', {
    page: 1,
    limit: 4,
  });
  const updateMutation = useUpdateSuperAdminOrganisationMutation(
    organisationId ?? '',
  );
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
  const projects = projectsQuery.data?.data ?? [];
  const activity = activityQuery.data?.data ?? [];
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
  const issues: { title: string; detail: string; to: string }[] = [];

  if (org.status === 'suspended') {
    issues.push({
      title: 'Organisation is suspended',
      detail: 'Tenant access is blocked and scheduled jobs remain paused.',
      to: basePath + '/overview',
    });
  } else if (org.status === 'archived') {
    issues.push({
      title: 'Organisation is archived',
      detail: 'The workspace is in its recovery window.',
      to: basePath + '/overview',
    });
  } else if (org.status === 'pending') {
    issues.push({
      title: 'Organisation is pending',
      detail: 'Review account setup and ownership.',
      to: basePath + '/members',
    });
  }

  if (org.paymentHoldActive) {
    issues.push({
      title: 'Payment hold active',
      detail:
        'The scheduler skips this organisation' +
        (org.paymentHoldSince
          ? ' since ' + formatDate(org.paymentHoldSince)
          : '') +
        (org.manualHoldReason ? '. Reason: ' + org.manualHoldReason : '.'),
      to: basePath + '/billing',
    });
  }

  if (
    org.plan.subscriptionStatus !== 'active' &&
    org.plan.subscriptionStatus !== 'trialing'
  ) {
    issues.push({
      title: 'Subscription ' + org.plan.subscriptionStatus.replace(/_/g, ' '),
      detail: 'Review the subscription and payment state.',
      to: basePath + '/billing',
    });
  }

  if (overPlanResources.length > 0) {
    issues.push({
      title: 'Over plan: ' + overPlanResources.join(', '),
      detail: 'Review usage and plan limits.',
      to: basePath + '/billing',
    });
  }

  if (!org.owner || !org.owner.isActive) {
    issues.push({
      title: org.owner ? 'Owner is inactive' : 'No owner assigned',
      detail: 'Review the organisation membership.',
      to: basePath + '/members',
    });
  }

  return (
    <div className="flex flex-col gap-4">
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
              ? org.settings.defaultCurrency
              : null,
        }}
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

      {issues.length > 0 && (
        <Alert
          variant={
            org.status === 'suspended' ||
            org.status === 'archived' ||
            org.paymentHoldActive
              ? 'destructive'
              : 'default'
          }
          className="rounded-2xl"
        >
          <TriangleAlert className="size-4" aria-hidden="true" />
          <AlertTitle>Needs attention</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {issues.map((issue) => (
                <li key={issue.title}>
                  <Link
                    to={issue.to}
                    className="focus-visible:ring-ring rounded-sm font-semibold underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {issue.title}
                  </Link>
                  <span className="ml-1">{issue.detail}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(19rem,1fr)] xl:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Card size="sm">
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Workspace usage</h2>
                <Link
                  to={basePath + '/billing'}
                  className="text-primary focus-visible:ring-ring inline-flex shrink-0 items-center gap-1 rounded-sm text-xs font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  View limits{' '}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 xl:grid-cols-4">
                <UsageMetric
                  icon={Users}
                  label="Members"
                  count={org.usage.members.total}
                  limit={org.usage.members.limit}
                  detail={formatNumber(org.usage.members.active) + ' active'}
                  to={basePath + '/members'}
                  over={
                    org.usage.members.limit !== null &&
                    org.usage.members.total > org.usage.members.limit
                  }
                />
                <UsageMetric
                  icon={FolderOpen}
                  label="Projects"
                  count={org.usage.projects.count}
                  limit={org.usage.projects.limit}
                  detail={
                    org.usage.projects.limit === null
                      ? 'Unlimited plan'
                      : 'of ' +
                        formatNumber(org.usage.projects.limit) +
                        ' allowed'
                  }
                  to={basePath + '/projects'}
                  over={org.usage.projects.over}
                />
                <UsageMetric
                  icon={Workflow}
                  label="Sync flows"
                  count={org.usage.jobs.count}
                  limit={org.usage.jobs.limit}
                  detail={
                    org.usage.jobs.limit === null
                      ? 'Unlimited plan'
                      : 'of ' + formatNumber(org.usage.jobs.limit) + ' allowed'
                  }
                  to={basePath + '/projects'}
                  over={org.usage.jobs.over}
                />
                <UsageMetric
                  icon={Database}
                  label="Records this period"
                  count={org.usage.records.used}
                  limit={org.usage.records.limit}
                  detail={
                    org.usage.records.limit === null
                      ? 'Unlimited plan'
                      : formatNumber(org.usage.records.remaining) + ' remaining'
                  }
                  to={basePath + '/billing'}
                  over={
                    org.usage.records.limit !== null &&
                    org.usage.records.used > org.usage.records.limit
                  }
                />
              </div>
              {org.usage.records.periodStart && (
                <p className="text-muted-foreground mt-2 px-2 text-xs">
                  Record period started{' '}
                  {formatDate(org.usage.records.periodStart)}
                </p>
              )}
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Recent projects</h2>
                  <p className="text-muted-foreground text-xs">
                    Latest project sync activity
                  </p>
                </div>
                <Link
                  to={basePath + '/projects'}
                  className="text-primary focus-visible:ring-ring inline-flex shrink-0 items-center gap-1 rounded-sm text-xs font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  All projects{' '}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
              {projectsQuery.isLoading ? (
                <div className="flex min-h-28 items-center justify-center">
                  <Spinner className="size-4" />
                  <span className="sr-only">Loading projects</span>
                </div>
              ) : projectsQuery.isError ? (
                <div className="mt-3">
                  <SectionMessage
                    message="Could not load recent projects."
                    onRetry={() => void projectsQuery.refetch()}
                  />
                </div>
              ) : projects.length === 0 ? (
                <div className="mt-3">
                  <SectionMessage message="No projects yet. Open Projects to review this organisation's setup." />
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {projects.map((project) => (
                    <li key={project.id}>
                      <Link
                        to={basePath + '/projects/' + project.id}
                        className="group border-border/70 hover:border-foreground/25 hover:bg-muted/20 focus-visible:ring-ring flex min-w-0 items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <div className="shrink-0" aria-hidden="true">
                          <ProjectPlatformPair
                            sourcePlatformId={project.sourcePlatformId}
                            destPlatformId={project.destPlatformId}
                            syncMode={
                              project.syncMode === 'two_way'
                                ? 'two_way'
                                : 'one_way'
                            }
                            size="md"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <span className="truncate font-semibold">
                              {project.name}
                            </span>
                            <span className="text-muted-foreground shrink-0 text-xs">
                              {formatEventLabel(project.status)}
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {getPlatform(project.sourcePlatformId)?.name ??
                              formatEventLabel(project.sourcePlatformId)}{' '}
                            →{' '}
                            {getPlatform(project.destPlatformId)?.name ??
                              formatEventLabel(project.destPlatformId)}
                          </p>
                          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
                            <span>
                              {project.jobCount === 0
                                ? 'No sync flows'
                                : `Sync flows: ${project.enabledJobCount} enabled of ${project.jobCount}`}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Last sync: {formatRelative(project.lastSyncedAt)}
                            </span>
                          </p>
                        </div>
                        <ArrowUpRight
                          className="text-muted-foreground/70 group-hover:text-foreground size-4 shrink-0 transition-colors"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Card size="sm">
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Account & billing</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Edit organisation metadata"
                    onClick={() => {
                      setEditError(null);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit
                  </Button>
                  <OrganisationLifecycleActions organisation={org} compact />
                </div>
              </div>
              {org.description && (
                <p className="text-muted-foreground mt-2 text-xs leading-5">
                  {org.description}
                </p>
              )}
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div className="col-span-2 min-w-0">
                  <dt className="text-muted-foreground text-xs">Owner</dt>
                  <dd className="mt-0.5">
                    {org.owner ? (
                      <Link
                        to={basePath + '/members'}
                        className="focus-visible:ring-ring block min-w-0 rounded-sm hover:underline focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <span className="block truncate font-medium">
                          {org.owner.fullName ?? org.owner.email}
                          {!org.owner.isActive && (
                            <span className="text-destructive ml-1 text-xs">
                              Inactive
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {org.owner.email}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">
                        Not assigned
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Plan</dt>
                  <dd className="mt-0.5 truncate font-medium">
                    {org.plan.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">
                    Subscription
                  </dt>
                  <dd className="mt-0.5">
                    <StatusBadge status={org.plan.subscriptionStatus} label={org.plan.subscriptionStatus.replace(/_/g, ' ')} className="capitalize" />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">
                    {billing?.plan.trialEndsAt ? 'Trial ends' : 'Period ends'}
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {billingQuery.isLoading
                      ? 'Loading…'
                      : formatDate(
                          billing?.plan.trialEndsAt ??
                            billing?.plan.currentPeriodEnd,
                        )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Created</dt>
                  <dd className="mt-0.5 font-medium">
                    {formatDate(org.createdAt)}
                  </dd>
                </div>
              </dl>
              <Link
                to={basePath + '/billing'}
                className="text-primary focus-visible:ring-ring mt-3 inline-flex items-center gap-1 rounded-sm text-xs font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                Open billing{' '}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
              {billing?.plan.cancelAtPeriodEnd && (
                <p className="text-destructive mt-2 text-xs font-medium">
                  Cancellation is scheduled for period end.
                </p>
              )}
              {billingQuery.isError && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Billing dates unavailable.
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => void billingQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Recent activity</h2>
                <Link
                  to={basePath + '/activity'}
                  className="text-primary focus-visible:ring-ring inline-flex shrink-0 items-center gap-1 rounded-sm text-xs font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  All activity{' '}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
              {activityQuery.isLoading ? (
                <div className="flex min-h-28 items-center justify-center">
                  <Spinner className="size-4" />
                  <span className="sr-only">Loading activity</span>
                </div>
              ) : activityQuery.isError ? (
                <div className="mt-3">
                  <SectionMessage
                    message="Could not load recent activity."
                    onRetry={() => void activityQuery.refetch()}
                  />
                </div>
              ) : activity.length === 0 ? (
                <div className="mt-3">
                  <SectionMessage message="No recorded activity yet." />
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {activity.map((entry) => (
                    <li
                      key={entry.id}
                      className="border-border/70 min-w-0 rounded-xl border px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 text-sm leading-5 font-medium wrap-break-word">
                          {formatEventLabel(entry.action)}
                        </span>
                        {entry.severity !== 'INFO' && (
                          <StatusBadge status={entry.severity} label={entry.severity === 'ERROR' ? 'Error' : 'Warning'} />
                        )}
                      </div>
                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                        <span
                          className="min-w-0 truncate"
                          title={entry.actor?.email ?? undefined}
                        >
                          {entry.resource && (
                            <>
                              {formatEventLabel(entry.resource)}
                              <span className="mx-1.5" aria-hidden="true">
                                ·
                              </span>
                            </>
                          )}
                          {entry.actor?.email
                            ? 'by ' + entry.actor.email
                            : 'by System'}
                        </span>
                        <time
                          dateTime={entry.createdAt}
                          title={formatDate(entry.createdAt)}
                          className="shrink-0"
                        >
                          {formatRelative(entry.createdAt)}
                        </time>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
