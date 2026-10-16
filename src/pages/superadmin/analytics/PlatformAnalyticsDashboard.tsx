import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  Clock3,
  Info,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import HeadingPair from '@/components/shared/HeadingPair';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { usePlatformAnalytics } from '@/queries/usePlatformAnalytics';
import { useSuperAdminPlatformOverviewQuery } from '@/queries/useSuperAdmin';
import type {
  AnalyticsFilters,
  PlatformAnalyticsResponse,
} from '@/types/platformAnalytics';
import { AnalyticsSection, EmptyChart } from './AnalyticsSection';
import OrganisationEconomics from './OrganisationEconomics';
import {
  chartMoney,
  compactNumber,
  dateLabel,
  defaultRange,
  fullNumber,
  hours,
  moneyLabel,
  percentage,
  validRange,
} from './analyticsDisplay';

const chartConfig = {
  amount: { label: 'Collected payments', color: 'var(--chart-1)' },
  payments: { label: 'Successful payments', color: 'var(--chart-1)' },
  recordsWritten: { label: 'Records written', color: 'var(--chart-2)' },
  terminalRuns: { label: 'Sync runs', color: 'var(--chart-2)' },
  runHours: { label: 'Run hours', color: 'var(--chart-2)' },
  completed: { label: 'Completed', color: 'var(--chart-2)' },
  partial: { label: 'Partial', color: 'var(--chart-4)' },
  failed: { label: 'Failed', color: 'var(--chart-5)' },
  count: { label: 'Organisations', color: 'var(--chart-3)' },
  waiting: { label: 'Waiting', color: 'var(--chart-1)' },
};

type Customers = NonNullable<
  PlatformAnalyticsResponse['sections']['customers']
>;

export default function PlatformAnalyticsDashboard() {
  const [params, setParams] = useSearchParams();
  const defaults = defaultRange();
  const requestedGranularity = params.get('granularity');
  const filters: AnalyticsFilters = {
    from: params.get('from') ?? defaults.from,
    to: params.get('to') ?? defaults.to,
    currency: /^[A-Z]{3}$/.test(params.get('currency') ?? '')
      ? params.get('currency')!
      : 'USD',
    granularity:
      requestedGranularity === 'week' || requestedGranularity === 'month'
        ? requestedGranularity
        : 'day',
    planId: params.get('planId') || undefined,
  };
  const valid = validRange(filters);
  const analytics = usePlatformAnalytics(filters, valid);
  const live = useSuperAdminPlatformOverviewQuery();
  const [processingView, setProcessingView] = useState<
    'recordsWritten' | 'terminalRuns' | 'runHours'
  >('recordsWritten');
  const [plans, setPlans] = useState<Customers['byPlan']>([]);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const data = analytics.data;
  const revenue = data?.sections.revenue,
    processing = data?.sections.processing,
    customers = data?.sections.customers;
  useEffect(() => {
    if (!filters.planId && customers) setPlans(customers.byPlan);
  }, [customers, filters.planId]);
  const update = (next: Partial<AnalyticsFilters>) =>
    setParams(
      (previous) => {
        const result = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(next)) {
          if (value) result.set(key, value);
          else result.delete(key);
        }
        return result;
      },
      { replace: true },
    );
  const refresh = () => {
    void analytics.refetch();
    void live.refetch();
    setRefreshVersion((value) => value + 1);
  };
  const loading = analytics.isLoading && valid;
  const mainError = analytics.isError
    ? 'Analytics could not be loaded. Refresh to retry; live queue status may still be available.'
    : !valid
      ? 'Choose an ordered UTC date range of at most 366 days, ending no later than tomorrow.'
      : undefined;
  const verified = revenue?.quality.status === 'reconciled';
  const cashSeries =
    revenue?.series.map((row) => ({
      ...row,
      amount: chartMoney(row.collectedMinor, filters.currency),
    })) ?? [];
  const hasUnsafeMoney =
    verified && cashSeries.some((row) => row.amount == null);
  const processingSeries =
    processing?.series.map((row) => ({
      ...row,
      runHours: row.durationMs / 3600000,
    })) ?? [];
  const queue = !live.data?.errors?.queue ? live.data?.jobs.queue : undefined;
  const queueRows = queue
    ? [
        { name: 'Waiting', count: queue.waiting },
        { name: 'Active', count: queue.active },
        { name: 'Delayed', count: queue.delayed },
        { name: 'Retained failures', count: queue.failed },
      ]
    : [];
  const currencies = [
    ...new Set([
      filters.currency,
      ...(revenue?.currencies ?? []),
      'USD',
      'INR',
      'EUR',
      'GBP',
      'CAD',
      'AUD',
      'JPY',
    ]),
  ];
  const subscriptionRows = customers?.bySubscriptionStatus ?? [];
  const pastDue =
    subscriptionRows.find((row) => row.status === 'past_due')?.count ?? 0;
  const totalMissingDuration = processing?.totals.missingDurationRuns ?? 0;

  return (
    <div className="flex min-w-0 flex-col gap-4 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <HeadingPair
          level="h1"
          title="Platform overview"
          subtitle="Understand your customers, collections and the work behind them."
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" asChild>
            <Link to="?view=classic">Classic view</Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            disabled={!valid || analytics.isFetching || live.isFetching}
          >
            <RefreshCw className={analytics.isFetching ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      <div
        data-layout-surface="outer"
        className="bg-card border-border/80 flex flex-wrap items-end gap-3 rounded-4xl border p-3 sm:p-4"
      >
        <div className="flex gap-1" aria-label="Quick date ranges">
          {[7, 30, 90].map((days) => (
            <Button
              key={days}
              size="sm"
              variant={
                filters.from === defaultRange(days).from &&
                filters.to === defaults.to
                  ? 'secondary'
                  : 'ghost'
              }
              onClick={() => update(defaultRange(days))}
            >
              {days} days
            </Button>
          ))}
        </div>
        <label className="text-muted-foreground grid gap-1 text-xs">
          From (UTC)
          <Input
            type="date"
            aria-label="From date UTC"
            className="w-36"
            value={filters.from}
            onChange={(event) => update({ from: event.target.value })}
          />
        </label>
        <label className="text-muted-foreground grid gap-1 text-xs">
          Until, exclusive (UTC)
          <Input
            type="date"
            aria-label="Until date UTC exclusive"
            className="w-36"
            max={defaults.to}
            value={filters.to}
            onChange={(event) => update({ to: event.target.value })}
          />
        </label>
        <div className="text-muted-foreground grid gap-1 text-xs">
          <span>Currency</span>
          <Select
            value={filters.currency}
            onValueChange={(currency) => update({ currency })}
          >
            <SelectTrigger aria-label="Currency" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem value={currency} key={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-muted-foreground grid gap-1 text-xs">
          <span>Group by</span>
          <Select
            value={filters.granularity}
            onValueChange={(granularity) =>
              update({
                granularity: granularity as AnalyticsFilters['granularity'],
              })
            }
          >
            <SelectTrigger aria-label="Group chart by" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-muted-foreground grid gap-1 text-xs">
          <span>Current plan cohort</span>
          <Select
            value={filters.planId ?? 'all'}
            onValueChange={(planId) =>
              update({ planId: planId === 'all' ? undefined : planId })
            }
          >
            <SelectTrigger aria-label="Current plan cohort" className="w-40">
              <SelectValue placeholder="All plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {plans
                .filter((plan) => plan.planId)
                .map((plan) => (
                  <SelectItem key={plan.planId!} value={plan.planId!}>
                    {plan.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="size-3.5" />
          {data
            ? `Period data refreshed ${new Date(data.generatedAt).toLocaleTimeString()}`
            : 'Period data updates every five minutes'}{' '}
          · UTC buckets
        </span>
        <span>Queue and customer status are current snapshots.</span>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <AnalyticsSection
          className="xl:col-span-2"
          title="Collections"
          description={
            verified
              ? `${filters.currency} · Captured payments include tax, before refunds and fees.`
              : `${filters.currency} · Successful payment activity while collection values are verified.`
          }
          loading={loading}
          error={mainError ?? data?.errors.revenue}
          action={
            <Badge variant="secondary">
              {verified ? 'Reconciled' : 'Awaiting reconciliation'}
            </Badge>
          }
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-xs">
                Collected payments
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {moneyLabel(revenue?.collectedMinor, filters.currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums">
                {revenue ? fullNumber(revenue.recordedPayments) : '—'}
              </p>
              <p className="text-muted-foreground text-xs">
                successful payments recorded
              </p>
            </div>
          </div>
          {!revenue ? (
            <EmptyChart>Collection activity is unavailable.</EmptyChart>
          ) : hasUnsafeMoney ? (
            <EmptyChart>
              Amounts exceed chart precision. The exact collection total remains
              available above.
            </EmptyChart>
          ) : !revenue.recordedPayments ? (
            <EmptyChart>
              No successful payments were recorded in this currency and period.
            </EmptyChart>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-60 w-full"
              aria-label={
                verified
                  ? 'Collected payments over time'
                  : 'Successful payment count over time'
              }
            >
              <AreaChart
                data={cashSeries}
                accessibilityLayer
                margin={{ left: 0, right: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tickFormatter={dateLabel}
                  minTickGap={30}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  width={48}
                  tickFormatter={compactNumber}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={!!verified}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => dateLabel(String(value))}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey={verified ? 'amount' : 'payments'}
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
          )}
          {revenue && (
            <p className="text-muted-foreground mt-3 flex items-start gap-1.5 text-xs">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              {revenue.quality.message}
              {!verified && ' This graph shows payment counts, not money.'}
              {revenue.unattributedPayments > 0 &&
                ` ${revenue.unattributedPayments} payments have no matching organisation.`}
            </p>
          )}
          {cashSeries.length > 0 && (
            <details className="mt-3 text-xs">
              <summary className="text-muted-foreground cursor-pointer">
                View collection series
              </summary>
              <div className="max-h-48 overflow-auto pt-2">
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th>Date (UTC)</th>
                      <th>Payments</th>
                      <th>Collections</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashSeries.map((row) => (
                      <tr key={row.bucket}>
                        <td className="py-1">{row.bucket}</td>
                        <td>{row.payments}</td>
                        <td>
                          {moneyLabel(row.collectedMinor, filters.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </AnalyticsSection>
        <AnalyticsSection
          title="Customer portfolio"
          description="Current organisations by plan. This is not historical plan mix."
          loading={loading}
          error={mainError ?? data?.errors.customers}
        >
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight tabular-nums">
              {customers ? fullNumber(customers.total) : '—'}
            </span>
            <Link
              className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs"
              to="/super-admin/organisations"
            >
              organisations
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
          {!customers?.byPlan.length ? (
            <EmptyChart>No organisations match this cohort.</EmptyChart>
          ) : (
            <>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-52 w-full"
                aria-label="Current organisations by plan"
              >
                <BarChart
                  data={customers.byPlan}
                  layout="vertical"
                  accessibilityLayer
                  margin={{ left: 0, right: 20 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={92}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill="var(--chart-3)"
                    radius={4}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ChartContainer>
              <div className="mt-3 flex flex-wrap gap-2">
                {customers.byStatus.map((row) => (
                  <Link
                    key={row.status}
                    to={`/super-admin/organisations?status=${encodeURIComponent(row.status)}`}
                    className="bg-muted/60 text-muted-foreground rounded-full px-2.5 py-1 text-xs"
                  >
                    {row.status.replace(/_/g, ' ')}{' '}
                    <span className="text-foreground font-medium">
                      {row.count}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </AnalyticsSection>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <AnalyticsSection
          title="Processing demand"
          description="Completed, failed and partial runs, grouped by their start date."
          loading={loading}
          error={mainError ?? data?.errors.processing}
          action={
            <div className="flex gap-1">
              {(['recordsWritten', 'terminalRuns', 'runHours'] as const).map(
                (view) => (
                  <Button
                    key={view}
                    size="sm"
                    variant={processingView === view ? 'secondary' : 'ghost'}
                    onClick={() => setProcessingView(view)}
                  >
                    {view === 'recordsWritten'
                      ? 'Records'
                      : view === 'terminalRuns'
                        ? 'Runs'
                        : 'Time'}
                  </Button>
                ),
              )}
            </div>
          }
        >
          <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <p className="text-xl font-semibold tabular-nums">
                {processing
                  ? fullNumber(processing.totals.recordsWritten)
                  : '—'}
              </p>
              <p className="text-muted-foreground text-xs">records written</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">
                {processing ? fullNumber(processing.totals.terminalRuns) : '—'}
              </p>
              <p className="text-muted-foreground text-xs">terminal runs</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">
                {processing ? hours(processing.totals.durationMs) : '—'}
              </p>
              <p className="text-muted-foreground text-xs">measured run time</p>
            </div>
          </div>
          {!processing?.totals.terminalRuns ? (
            <EmptyChart>No terminal sync runs in this period.</EmptyChart>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-56 w-full"
              aria-label="Processing demand over time"
            >
              <AreaChart data={processingSeries} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tickFormatter={dateLabel}
                  minTickGap={32}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  width={46}
                  tickFormatter={compactNumber}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => dateLabel(String(value))}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey={processingView}
                  stroke="var(--chart-2)"
                  fill="var(--chart-2)"
                  fillOpacity={0.1}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
          )}
          <p className="text-muted-foreground mt-3 text-xs">
            Run time includes I/O waits and overlapping work; it is not CPU time
            or infrastructure cost.
            {totalMissingDuration > 0 && (
              <span className="text-warning">
                {' '}
                {fullNumber(totalMissingDuration)} runs have no duration
                measurement.
              </span>
            )}
            {(processing?.totals.unattributedRuns ?? 0) > 0 &&
              ` ${processing?.totals.unattributedRuns} runs have no matching organisation.`}
          </p>
        </AnalyticsSection>
        <AnalyticsSection
          title="Sync reliability"
          description="Completed / (completed + failed + partial). Running work is excluded."
          loading={loading}
          error={mainError ?? data?.errors.processing}
        >
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {percentage(processing?.totals.successRate)}
              </p>
              <p className="text-muted-foreground text-xs">run success rate</p>
            </div>
            <p className="text-muted-foreground text-right text-xs">
              {processing
                ? `${fullNumber(processing.totals.failed)} failed · ${fullNumber(processing.totals.partial)} partial`
                : 'No run data'}
            </p>
          </div>
          {!processing?.totals.terminalRuns ? (
            <EmptyChart>No terminal runs to calculate reliability.</EmptyChart>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-56 w-full"
              aria-label="Run outcomes over time"
            >
              <BarChart data={processingSeries} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tickFormatter={dateLabel}
                  minTickGap={32}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  width={40}
                  allowDecimals={false}
                  tickFormatter={compactNumber}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => dateLabel(String(value))}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                {(['completed', 'partial', 'failed'] as const).map((status) => (
                  <Bar
                    key={status}
                    dataKey={status}
                    stackId="runs"
                    fill={`var(--color-${status})`}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          )}
          <details className="mt-3 text-xs">
            <summary className="text-muted-foreground cursor-pointer">
              View processing and outcome series
            </summary>
            <div className="max-h-48 overflow-auto pt-2">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th>Date (UTC)</th>
                    <th>Completed</th>
                    <th>Partial</th>
                    <th>Failed</th>
                    <th>Records</th>
                    <th>Measured time</th>
                  </tr>
                </thead>
                <tbody>
                  {processingSeries.map((row) => (
                    <tr key={row.bucket}>
                      <td className="py-1">{row.bucket}</td>
                      <td>{row.completed}</td>
                      <td>{row.partial}</td>
                      <td>{row.failed}</td>
                      <td>{row.recordsWritten}</td>
                      <td>{hours(row.durationMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </AnalyticsSection>
      </div>

      <OrganisationEconomics
        key={JSON.stringify(filters)}
        filters={filters}
        enabled={valid}
        refreshVersion={refreshVersion}
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <AnalyticsSection
          title="Queue health"
          description="Live sync queue · refreshes every 30 seconds."
          loading={live.isLoading}
          error={
            live.isError || live.data?.errors?.queue
              ? 'Live queue data is unavailable.'
              : undefined
          }
          action={
            <Badge variant="secondary">
              <Activity className="mr-1 size-3" />
              {queue
                ? queue.workerOnline
                  ? 'Worker online'
                  : 'Worker offline'
                : 'Unknown'}
            </Badge>
          }
        >
          {queue ? (
            <>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-44 w-full"
                aria-label="Current sync queue states"
              >
                <BarChart data={queueRows} layout="vertical" accessibilityLayer>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={112}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill="var(--chart-1)"
                    radius={4}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ChartContainer>
              <p className="text-muted-foreground mt-3 text-xs">
                {queue.waiting} waiting · {queue.active} active ·{' '}
                {queue.delayed} delayed · {queue.failed} retained failures.
                Queue counts are current state, not period totals.
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Updated{' '}
                {live.data &&
                  new Date(live.data.generatedAt).toLocaleTimeString()}
              </p>
            </>
          ) : (
            <EmptyChart>Waiting for live queue status.</EmptyChart>
          )}
        </AnalyticsSection>
        <AnalyticsSection
          title="Billing attention"
          description="Current billing states; amounts at risk are not yet verified."
          loading={loading}
          error={mainError ?? data?.errors.customers}
        >
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {customers ? pastDue : '—'}
          </p>
          <p className="text-muted-foreground mb-4 text-xs">
            past-due organisations
          </p>
          <div className="space-y-2">
            {(['past_due', 'unpaid', 'incomplete'] as const).map((status) => (
              <Link
                key={status}
                className="bg-muted/40 hover:bg-muted flex items-center justify-between gap-3 rounded-2xl p-2.5 text-sm"
                to={`/super-admin/organisations?subscriptionStatus=${status}`}
              >
                <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                <span className="inline-flex items-center gap-2 font-medium">
                  {customers
                    ? (subscriptionRows.find((row) => row.status === status)
                        ?.count ?? 0)
                    : '—'}
                  <ArrowUpRight className="text-muted-foreground size-3.5" />
                </span>
              </Link>
            ))}
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            Past-due MRR and outstanding invoices are different measures.
            Neither is estimated from failed-payment counts.
          </p>
        </AnalyticsSection>
        <AnalyticsSection
          title="Needs attention"
          description="Recent warning and critical events across the platform."
          loading={live.isLoading}
          error={
            live.isError || live.data?.errors?.recentAlerts
              ? 'Recent events could not be loaded.'
              : undefined
          }
        >
          {!live.data?.recentAlerts.length ? (
            <EmptyChart>No recent critical or warning events.</EmptyChart>
          ) : (
            <ul className="space-y-3">
              {live.data.recentAlerts.slice(0, 5).map((alert) => (
                <li key={alert.id}>
                  <Link
                    className="group flex items-start gap-2.5 text-sm"
                    to={
                      alert.organisationId
                        ? `/super-admin/organisations/${alert.organisationId}/activity`
                        : '/super-admin/audit-log'
                    }
                  >
                    <ShieldAlert
                      className={`mt-0.5 size-4 shrink-0 ${alert.severity === 'critical' ? 'text-destructive' : 'text-warning'}`}
                    />
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-medium group-hover:underline">
                        {alert.summary}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AnalyticsSection>
      </div>
      {data?.unavailableMetrics.length ? (
        <details className="text-muted-foreground rounded-3xl px-1 py-2 text-xs">
          <summary className="cursor-pointer">
            Metric definitions and availability
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.unavailableMetrics.map((item) => (
              <p key={item.metric}>
                <span className="text-foreground font-medium">
                  {item.metric}
                </span>
                <br />
                {item.reason}
              </p>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
