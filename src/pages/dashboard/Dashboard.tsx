import { format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';

import type { DashboardMetricsPeriod } from '@/api/dashboard';
import DateRangePicker from '@/components/shared/DateRangePicker';
import type { DateRangeValue } from '@/components/shared/DateRangePicker';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  computeDashboardStats,
  DashboardSkeleton,
  KpiStatCard,
  RecentActivityCard,
} from '@/features/dashboard';
import type { ActivityFilter } from '@/features/dashboard';
import {
  RecordsProcessedMetric,
  SyncRunHealthMetric,
} from '@/features/metrics/MetricCards';
import {
  getMetricsPeriodStart,
  METRICS_PERIOD_LABELS,
  unwrapOrganizationLogs,
} from '@/features/metrics/metricsData';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import {
  useDashboardSummaryQuery,
  useDashboardSyncMetricsQuery,
  useOrgSyncLogsQuery,
} from '@/queries/useDashboard';
import { useJobsQuery } from '@/queries/useJobs';
import { useProjectsQuery } from '@/queries/useProjects';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

type DashboardPresetPeriod = Exclude<DashboardMetricsPeriod, 'custom'>;

const DASHBOARD_PRESET_PERIODS: DashboardPresetPeriod[] = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
];

function formatRangeLabel(start: string, end: string, timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  });
  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`;
}

function formatSelectedRange(range: DateRangeValue): string | null {
  if (!range.from || !range.to) return null;
  const from = parseISO(range.from);
  const to = parseISO(range.to);
  return `${format(from, 'MMM d, yyyy')} – ${format(to, 'MMM d, yyyy')}`;
}

export default function Dashboard() {
  const { currentUser } = useSynkazoAuth();
  const [metricsPeriod, setMetricsPeriod] =
    useState<DashboardMetricsPeriod>('weekly');
  const [customRange, setCustomRange] = useState<DateRangeValue>({});
  const [appliedCustomRange, setAppliedCustomRange] = useState<DateRangeValue>(
    {},
  );
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const metricsTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  );
  const statsSince = useMemo(() => getMetricsPeriodStart('weekly'), []);
  const summaryQuery = useDashboardSummaryQuery();
  const jobsQuery = useJobsQuery();
  const projectsQuery = useProjectsQuery();
  const activityQuery = useOrgSyncLogsQuery(7, {
    level: activityFilter === 'all' ? undefined : activityFilter,
  });
  const statsLogsQuery = useOrgSyncLogsQuery(200, { since: statsSince });
  const metricsParams = useMemo(
    () => ({
      period: metricsPeriod,
      timezone: metricsTimezone,
      ...(metricsPeriod === 'custom' && appliedCustomRange.from
        ? {
            start: appliedCustomRange.from,
            end: appliedCustomRange.to ?? appliedCustomRange.from,
          }
        : {}),
    }),
    [
      appliedCustomRange.from,
      appliedCustomRange.to,
      metricsPeriod,
      metricsTimezone,
    ],
  );
  const metricsQuery = useDashboardSyncMetricsQuery(metricsParams);

  const isLoading =
    summaryQuery.isLoading ||
    jobsQuery.isLoading ||
    projectsQuery.isLoading ||
    activityQuery.isLoading ||
    statsLogsQuery.isLoading;
  const isError =
    summaryQuery.isError ||
    jobsQuery.isError ||
    activityQuery.isError ||
    statsLogsQuery.isError;

  const jobs = jobsQuery.data ?? [];
  const activityLogs = unwrapOrganizationLogs(activityQuery.data);
  const statsLogs = unwrapOrganizationLogs(statsLogsQuery.data);
  const firstName = currentUser?.fullName?.trim().split(/\s+/)[0];
  const greeting = `${getGreeting()}${firstName ? `, ${firstName}` : ''}`;
  const metricsRangeLabel =
    metricsQuery.data?.period === metricsPeriod
      ? formatRangeLabel(
          metricsQuery.data.range.start,
          metricsQuery.data.range.end,
          metricsQuery.data.timezone,
        )
      : metricsPeriod === 'custom'
        ? (formatSelectedRange(appliedCustomRange) ?? 'Custom Range')
        : METRICS_PERIOD_LABELS[metricsPeriod];

  const handlePresetChange = (period: DashboardPresetPeriod) => {
    setMetricsPeriod(period);
  };

  const handleCustomRangeChange = (range: DateRangeValue) => {
    setCustomRange(range);

    // Selecting the first date only updates the picker draft. Metrics refresh
    // once the second date completes the range.
    if (range.from && range.to) {
      setAppliedCustomRange(range);
      setMetricsPeriod('custom');
    }
  };

  const header = <PageHeader title={greeting} />;

  const refetchAll = () => {
    summaryQuery.refetch();
    jobsQuery.refetch();
    projectsQuery.refetch();
    activityQuery.refetch();
    statsLogsQuery.refetch();
    metricsQuery.refetch();
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        {header}
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError || !summaryQuery.data) {
    return (
      <div className="w-full space-y-6">
        {header}
        <ErrorState onRetry={refetchAll} />
      </div>
    );
  }

  const stats = computeDashboardStats({
    summary: summaryQuery.data,
    projects: projectsQuery.data,
    jobs,
    logs: statsLogs,
  });

  return (
    <div className="w-full space-y-6">
      {header}

      <section aria-label="Organization statistics">
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <KpiStatCard key={stat.id} {...stat} />
          ))}
        </div>
      </section>

      <section aria-label="Sync metrics">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Sync Metrics
            </CardTitle>
            <CardDescription>
              Organization-wide throughput and run health · {metricsRangeLabel}
            </CardDescription>
            <CardAction className="col-span-2 col-start-1 row-start-3 mt-2 flex w-full flex-col gap-2 justify-self-stretch sm:col-span-1 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:w-auto sm:flex-row sm:justify-self-end">
              <Select
                value={metricsPeriod === 'custom' ? '' : metricsPeriod}
                onValueChange={(value) =>
                  handlePresetChange(value as DashboardPresetPeriod)
                }
              >
                <SelectTrigger
                  aria-label="Metrics preset period"
                  className="w-full sm:w-32"
                >
                  <SelectValue placeholder="Preset range" />
                </SelectTrigger>
                <SelectContent>
                  {DASHBOARD_PRESET_PERIODS.map((period) => (
                    <SelectItem key={period} value={period}>
                      {period === 'daily'
                        ? 'Daily'
                        : period === 'weekly'
                          ? 'Weekly'
                          : period === 'monthly'
                            ? 'Monthly'
                            : 'Yearly'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DateRangePicker
                value={customRange}
                onChange={handleCustomRangeChange}
                placeholder="Date range"
                closeOnComplete
                className={
                  metricsPeriod === 'custom'
                    ? 'border-primary bg-primary/5 text-primary w-full sm:w-auto'
                    : 'w-full sm:w-auto'
                }
                disabled={[
                  { after: new Date() },
                  ...(metricsQuery.data?.retention.availableFrom
                    ? [
                        {
                          before: new Date(
                            metricsQuery.data.retention.availableFrom,
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            {metricsQuery.data?.retention.limited &&
              metricsQuery.data.retention.availableFrom && (
                <p className="text-muted-foreground mb-4 text-xs">
                  Showing available history since{' '}
                  {new Date(
                    metricsQuery.data.retention.availableFrom,
                  ).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  .
                </p>
              )}
            <div className="grid gap-6 lg:grid-cols-2">
              {metricsQuery.isLoading || metricsQuery.isPlaceholderData ? (
                <>
                  {[0, 1].map((item) => (
                    <Card key={item} size="sm" className="border">
                      <CardHeader className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-48 max-w-full" />
                          <Skeleton className="h-4 w-64 max-w-full" />
                        </div>
                        <div className="space-y-2 sm:text-right">
                          <Skeleton className="h-9 w-24 sm:ml-auto" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-[260px] w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : metricsQuery.isError || !metricsQuery.data ? (
                <div className="lg:col-span-2">
                  <ErrorState onRetry={() => metricsQuery.refetch()} />
                </div>
              ) : (
                <>
                  <RecordsProcessedMetric metrics={metricsQuery.data} />
                  <SyncRunHealthMetric metrics={metricsQuery.data} />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-label="Recent Activity">
        <RecentActivityCard
          logs={activityLogs}
          filter={activityFilter}
          onFilterChange={setActivityFilter}
          isLoading={activityQuery.isPlaceholderData}
        />
      </section>
    </div>
  );
}
