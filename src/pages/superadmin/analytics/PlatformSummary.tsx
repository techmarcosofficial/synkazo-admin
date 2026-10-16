import {
  Activity,
  Building2,
  CreditCard,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { usePlatformAnalytics } from '@/queries/usePlatformAnalytics';
import type { useSuperAdminPlatformOverviewQuery } from '@/queries/useSuperAdmin';
import type { AnalyticsFilters } from '@/types/platformAnalytics';
import OverviewKpiCard from './OverviewKpiCard';
import OverviewAttention from './OverviewAttention';
import CustomerPortfolio from './CustomerPortfolio';
import { OverviewProcessing, OverviewQueue } from './OverviewProcessing';
import TopOrganisations from './TopOrganisations';
import { fullNumber, percentage } from './analyticsDisplay';

export default function PlatformSummary({
  analytics,
  live,
  filters,
  valid,
  mainError,
  refreshVersion,
  analyticsLink,
  planLink,
}: {
  analytics: ReturnType<typeof usePlatformAnalytics>;
  live: ReturnType<typeof useSuperAdminPlatformOverviewQuery>;
  filters: AnalyticsFilters;
  valid: boolean;
  mainError?: string;
  refreshVersion: number;
  analyticsLink: string;
  planLink: (planId: string) => string;
}) {
  const data = analytics.data;
  const customers =
    !mainError && !data?.errors.customers
      ? data?.sections.customers
      : undefined;
  const processing =
    !mainError && !data?.errors.processing
      ? data?.sections.processing
      : undefined;
  const queue =
    !live.isError && !live.data?.errors?.queue
      ? live.data?.jobs.queue
      : undefined;
  const paid = customers?.paidOrganisations;
  const pastDue =
    customers?.bySubscriptionStatus.find((row) => row.status === 'past_due')
      ?.count ?? 0;
  const loading = analytics.isLoading && valid;
  return (
    <>
      {mainError && (
        <p
          role="alert"
          className="bg-destructive/5 text-destructive border-destructive/20 rounded-2xl border p-3 text-sm"
        >
          {mainError}
        </p>
      )}
      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5 [&>div:last-child]:col-span-2 lg:[&>div:last-child]:col-span-1">
        <OverviewKpiCard
          title="Total organisations"
          icon={Building2}
          value={customers ? fullNumber(customers.total) : '—'}
          note={
            customers
              ? 'Current customer portfolio'
              : 'Customer data unavailable'
          }
          to="/super-admin/organisations"
          loading={loading}
        />
        <OverviewKpiCard
          title="Active paid organisations"
          icon={Users}
          tone="success"
          value={paid && !paid.unverified ? fullNumber(paid.confirmed) : '—'}
          note={
            paid
              ? paid.unverified
                ? `${fullNumber(paid.confirmed)} confirmed · ${fullNumber(paid.unverified)} unverified`
                : paid.confirmed > 0
                  ? 'Payment confirmed this billing period'
                  : 'No confirmed paid organisations'
              : 'Payment evidence unavailable'
          }
          to={analyticsLink}
          loading={loading}
        />
        <OverviewKpiCard
          title="Past-due billing"
          icon={CreditCard}
          tone={customers && pastDue > 0 ? 'destructive' : 'primary'}
          value={customers ? fullNumber(pastDue) : '—'}
          note={
            customers
              ? 'Organisations with past-due billing'
              : 'Billing status unavailable'
          }
          to="/super-admin/organisations?subscriptionStatus=past_due"
          loading={loading}
        />
        <OverviewKpiCard
          title="Workers online"
          icon={Activity}
          tone={queue?.workerOnline ? 'success' : 'warning'}
          value={queue ? (queue.workerOnline ? 'Online' : 'Not detected') : '—'}
          note={
            queue
              ? 'Heartbeat status · count unavailable'
              : 'Worker status unavailable'
          }
          to="#overview-queue"
          loading={live.isLoading}
        />
        <OverviewKpiCard
          title="Sync success rate"
          icon={ShieldCheck}
          tone="success"
          value={percentage(processing?.totals.successRate)}
          note={
            processing
              ? `${fullNumber(processing.totals.terminalRuns)} finished runs in period`
              : 'Processing data unavailable'
          }
          to="#overview-reliability"
          loading={loading}
        />
      </div>
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <OverviewAttention
          data={live.data}
          loading={live.isLoading}
          error={
            live.isError || live.data?.errors?.recentAlerts
              ? 'Recent events could not be loaded. Refresh to retry.'
              : undefined
          }
        />
        <CustomerPortfolio
          customers={customers}
          loading={loading}
          error={mainError ?? data?.errors.customers}
          planLink={planLink}
        />
      </div>
      <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <OverviewProcessing
          processing={processing}
          loading={loading}
          error={mainError ?? data?.errors.processing}
          analyticsLink={analyticsLink}
        />
        <OverviewQueue
          queue={queue}
          loading={live.isLoading}
          error={
            live.isError || live.data?.errors?.queue
              ? 'Live queue status could not be loaded. Refresh to retry.'
              : undefined
          }
          generatedAt={live.data?.generatedAt}
        />
      </div>
      <TopOrganisations
        filters={filters}
        valid={valid}
        refreshVersion={refreshVersion}
      />
      <div className="text-muted-foreground flex flex-wrap justify-between gap-2 px-1 text-xs">
        <span>
          {data
            ? `Period data updated ${new Date(data.generatedAt).toLocaleTimeString()}`
            : 'Period data unavailable'}{' '}
          · UTC
        </span>
        <span>
          Customer, billing, alerts and queue status are current snapshots.
        </span>
      </div>
    </>
  );
}
