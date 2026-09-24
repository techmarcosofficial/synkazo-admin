import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  CreditCard,
  Database,
  ExternalLink,
  FolderOpen,
  Package,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import SubscriptionActions from '@/pages/superadmin/billing/SubscriptionActions';
import {
  useSuperAdminBillingOverviewQuery,
  useSuperAdminInvoicesQuery,
  useSuperAdminOrganisationQuery,
} from '@/queries/useSuperAdmin';
import type { SuperAdminBillingOverview } from '@/types';

// SA-700 read-only billing surface for a selected organisation.
// Zero-write — opening this page must never create or update provider
// objects (SA-701). Card details never displayed (SA-707).

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  over,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  over?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        over ? 'border-amber-200 bg-amber-50' : 'bg-card'
      }`}
    >
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

function BillingOverviewSection({
  overview,
}: {
  overview: SuperAdminBillingOverview;
}) {
  const { plan, usage } = overview;
  const limitLabel = (n: number | null) =>
    n == null ? 'Unlimited' : n.toLocaleString();

  return (
    <>
      <section className="bg-card rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-semibold">Subscription</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs">Plan</dt>
            <dd className="font-medium">{plan.planName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Status</dt>
            <dd>
              <Badge variant="outline">{plan.subscriptionStatus}</Badge>
            </dd>
          </div>
          {plan.billingInterval ? (
            <div>
              <dt className="text-muted-foreground text-xs">
                Billing interval
              </dt>
              <dd className="font-medium">{plan.billingInterval}</dd>
            </div>
          ) : null}
          {plan.trialEndsAt ? (
            <div>
              <dt className="text-muted-foreground text-xs">Trial ends</dt>
              <dd>
                {format(new Date(plan.trialEndsAt), 'PP')} (
                {formatDistanceToNow(new Date(plan.trialEndsAt), {
                  addSuffix: true,
                })}
                )
              </dd>
            </div>
          ) : null}
          {plan.currentPeriodEnd ? (
            <div>
              <dt className="text-muted-foreground text-xs">
                Current period ends
              </dt>
              <dd>
                {format(new Date(plan.currentPeriodEnd), 'PP')} (
                {formatDistanceToNow(new Date(plan.currentPeriodEnd), {
                  addSuffix: true,
                })}
                )
              </dd>
            </div>
          ) : null}
          {plan.cancelAtPeriodEnd ? (
            <div>
              <dt className="text-muted-foreground text-xs">
                Cancel scheduled
              </dt>
              <dd className="text-amber-800">
                Subscription will cancel at period end.
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {plan.overLimit.isOverLimit ? (
        <Alert variant="destructive">
          <AlertTitle>Over-plan resources</AlertTitle>
          <AlertDescription>
            One or more resource counts exceed this plan&rsquo;s limits.
            Scheduled runs may fail until the plan is upgraded or the count
            reduces.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FolderOpen}
          label="Projects"
          value={plan.overLimit.projects.count}
          hint={`of ${limitLabel(plan.overLimit.projects.limit)} allowed`}
          over={plan.overLimit.projects.over}
        />
        <StatCard
          icon={Package}
          label="Jobs"
          value={plan.overLimit.jobs.count}
          hint={`of ${limitLabel(plan.overLimit.jobs.limit)} allowed`}
          over={plan.overLimit.jobs.over}
        />
        <StatCard
          icon={Users}
          label="Members"
          value={plan.overLimit.teamMembers.count}
          hint={`of ${limitLabel(plan.overLimit.teamMembers.limit)} allowed`}
          over={plan.overLimit.teamMembers.over}
        />
        <StatCard
          icon={Database}
          label="Records this period"
          value={usage.recordsSynced.toLocaleString()}
          hint={
            usage.maxRecordsPerMonth == null
              ? 'Unlimited'
              : `${(usage.remaining ?? 0).toLocaleString()} left of ${usage.maxRecordsPerMonth.toLocaleString()}`
          }
          over={plan.overLimit.records.over}
        />
      </div>
    </>
  );
}

export default function OrganisationBillingPage() {
  const { organisationId } = useParams<{ organisationId: string }>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const orgQuery = useSuperAdminOrganisationQuery(organisationId);
  const overviewQuery = useSuperAdminBillingOverviewQuery(organisationId ?? '');
  const invoicesQuery = useSuperAdminInvoicesQuery(
    organisationId ?? '',
    page,
    pageSize,
  );

  if (!organisationId) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Missing organisation id"
        description="This route requires an organisation identifier in the URL."
      />
    );
  }

  const invoices = invoicesQuery.data?.data ?? [];
  const totalInvoices = invoicesQuery.data?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to={`/super-admin/organisations/${organisationId}/overview`}
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to organisation
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            title="Billing"
            description={orgQuery.data?.name ?? organisationId}
          />
          {orgQuery.data && overviewQuery.data ? (
            <SubscriptionActions
              organisation={orgQuery.data}
              subscriptionStatus={overviewQuery.data.plan.subscriptionStatus}
              cancelAtPeriodEnd={overviewQuery.data.plan.cancelAtPeriodEnd}
            />
          ) : null}
        </div>
      </div>

      {overviewQuery.isLoading ? (
        <SkeletonList count={3} />
      ) : overviewQuery.isError ? (
        <ErrorState
          title="Could not load billing overview"
          description={extractErrorMessage(overviewQuery.error)}
          onRetry={() => overviewQuery.refetch()}
        />
      ) : overviewQuery.data ? (
        <BillingOverviewSection overview={overviewQuery.data} />
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Invoices</h2>
        {invoicesQuery.isLoading ? (
          <SkeletonList count={3} />
        ) : invoicesQuery.isError ? (
          <ErrorState
            title="Could not load invoices"
            description={extractErrorMessage(invoicesQuery.error)}
            onRetry={() => invoicesQuery.refetch()}
          />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No invoices yet"
            description="Invoices will appear once Stripe generates the first billing period."
          />
        ) : (
          <div className="bg-card overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount due</TableHead>
                  <TableHead>Amount paid</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">
                      {invoice.invoiceNumber ?? invoice.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{invoice.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(invoice.amountDue, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(invoice.amountPaid, invoice.currency)}
                    </TableCell>
                    {/* Temp comment before  uncomment this please veryfiy the sape of api response
                      RangeError: Invalid time value
                      at OrganisationBillingPage.tsx:312:24
                      at Array.map
                    */}
                    {/* <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(invoice.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell> */}
                    <TableCell className="text-muted-foreground text-sm">
                      {invoice.paidAt
                        ? formatDistanceToNow(new Date(invoice.paidAt), {
                            addSuffix: true,
                          })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.hostedInvoiceUrl ? (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                        >
                          Open <ExternalLink className="size-3" aria-hidden />
                        </a>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <PaginationBar
          page={page}
          totalPages={Math.max(1, Math.ceil(totalInvoices / pageSize))}
          total={totalInvoices}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>

      <Alert>
        <AlertTitle>Read-only</AlertTitle>
        <AlertDescription>
          Plan assignment, cancel/resume, and manual retry actions are managed
          through separate audited commands (SA-702..SA-706), delivered
          alongside the payment-recovery queue in a follow-up.
        </AlertDescription>
      </Alert>
    </div>
  );
}
