import { useMemo, useState } from 'react';

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
  RecordsSyncedPerJobMetric,
  SyncActivityMetric,
} from '@/features/metrics/MetricCards';
import {
  getMetricsPeriodStart,
  METRICS_PERIOD_LABELS,
  unwrapOrganizationLogs,
} from '@/features/metrics/metricsData';
import type { MetricsPeriod } from '@/features/metrics/metricsData';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import {
  useDashboardSummaryQuery,
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

export default function Dashboard() {
  const { currentUser } = useSynkazoAuth();
  const [metricsPeriod, setMetricsPeriod] = useState<MetricsPeriod>('weekly');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const statsSince = useMemo(() => getMetricsPeriodStart('weekly'), []);
  const metricsSince = useMemo(
    () => getMetricsPeriodStart(metricsPeriod),
    [metricsPeriod],
  );
  const summaryQuery = useDashboardSummaryQuery();
  const jobsQuery = useJobsQuery();
  const projectsQuery = useProjectsQuery();
  const activityQuery = useOrgSyncLogsQuery(7, {
    level: activityFilter === 'all' ? undefined : activityFilter,
  });
  const statsLogsQuery = useOrgSyncLogsQuery(200, { since: statsSince });
  const metricsLogsQuery = useOrgSyncLogsQuery(200, { since: metricsSince });

  const isLoading =
    summaryQuery.isLoading ||
    jobsQuery.isLoading ||
    projectsQuery.isLoading ||
    activityQuery.isLoading ||
    statsLogsQuery.isLoading ||
    metricsLogsQuery.isLoading;
  const isError =
    summaryQuery.isError ||
    jobsQuery.isError ||
    activityQuery.isError ||
    statsLogsQuery.isError ||
    metricsLogsQuery.isError;

  const jobs = jobsQuery.data ?? [];
  const activityLogs = unwrapOrganizationLogs(activityQuery.data);
  const statsLogs = unwrapOrganizationLogs(statsLogsQuery.data);
  const metricsLogs = unwrapOrganizationLogs(metricsLogsQuery.data);
  const firstName = currentUser?.fullName?.trim().split(/\s+/)[0];
  const greeting = `${getGreeting()}${firstName ? `, ${firstName}` : ''}`;

  const header = <PageHeader title={greeting} />;

  const refetchAll = () => {
    summaryQuery.refetch();
    jobsQuery.refetch();
    projectsQuery.refetch();
    activityQuery.refetch();
    statsLogsQuery.refetch();
    metricsLogsQuery.refetch();
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
              Monitor record throughput and sync activity across your
              organization.
            </CardDescription>
            <CardAction>
              <Select
                value={metricsPeriod}
                onValueChange={(value) =>
                  setMetricsPeriod(value as MetricsPeriod)
                }
              >
                <SelectTrigger aria-label="Metrics period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(METRICS_PERIOD_LABELS) as MetricsPeriod[]).map(
                    (period) => (
                      <SelectItem key={period} value={period}>
                        {period === 'daily'
                          ? 'Daily'
                          : period === 'weekly'
                            ? 'Weekly'
                            : period === 'monthly'
                              ? 'Monthly'
                              : 'Yearly'}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              {metricsLogsQuery.isPlaceholderData ? (
                <>
                  {[0, 1].map((item) => (
                    <Card key={item} className="border">
                      <CardHeader>
                        <Skeleton className="h-5 w-48" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-[280px] w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : (
                <>
                  <RecordsSyncedPerJobMetric jobs={jobs} logs={metricsLogs} />
                  <SyncActivityMetric
                    logs={metricsLogs}
                    period={metricsPeriod}
                  />
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
