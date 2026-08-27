import { TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import SkeletonStatGrid from '@/components/shared/skeletons/SkeletonStatGrid';
import StatCardGrid from '@/components/shared/StatCardGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrgSyncLogsQuery } from '@/queries/useDashboard';
import { useJobsQuery } from '@/queries/useJobs';
import { useProjectsQuery } from '@/queries/useProjects';

interface MetricsJob {
  name: string;
  recordsSynced?: number;
  errorCount?: number;
}

interface MetricsLog {
  createdAt?: string;
  recordsProcessed?: number;
}

function formatNum(n: number) {
  if (!n) return 0;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n;
}

const tooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--popover-foreground)',
};
const axisTick = { fill: 'var(--muted-foreground)', fontSize: 11 };

function MetricsPageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonStatGrid />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[220px] w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function MetricsPage() {
  const jobsQuery = useJobsQuery();
  const projectsQuery = useProjectsQuery();
  const logsQuery = useOrgSyncLogsQuery(100);

  const isLoading =
    jobsQuery.isLoading || projectsQuery.isLoading || logsQuery.isLoading;
  const isError =
    jobsQuery.isError || projectsQuery.isError || logsQuery.isError;

  const jobs = (jobsQuery.data ?? []) as unknown as MetricsJob[];
  const projects = projectsQuery.data ?? [];
  const logsRes = logsQuery.data;
  const logs = ((logsRes as unknown as { data?: MetricsLog[] })?.data ??
    (logsRes as unknown as MetricsLog[]) ??
    []) as MetricsLog[];

  const totalSynced = jobs.reduce((a, j) => a + (j.recordsSynced || 0), 0);
  const totalErrors = jobs.reduce((a, j) => a + (j.errorCount || 0), 0);

  const jobChartData = jobs.slice(0, 8).map((j) => ({
    name: j.name.length > 15 ? j.name.substring(0, 15) + '…' : j.name,
    records: j.recordsSynced || 0,
    errors: j.errorCount || 0,
  }));

  const logChartData = (() => {
    const byDay: Record<
      string,
      { date: string; runs: number; records: number }
    > = {};
    logs.forEach((l) => {
      if (!l.createdAt) return;
      const day = l.createdAt.substring(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, runs: 0, records: 0 };
      byDay[day].runs++;
      byDay[day].records += l.recordsProcessed || 0;
    });
    return Object.values(byDay)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  })();

  const header = (
    <PageHeader
      backTo={{ label: 'Back to Dashboard', to: '/dashboard' }}
      title="Metrics"
      description="Sync performance overview"
    />
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <MetricsPageSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <ErrorState
          onRetry={() => {
            jobsQuery.refetch();
            projectsQuery.refetch();
            logsQuery.refetch();
          }}
        />
      </div>
    );
  }

  const stats = [
    { label: 'Total Projects', value: projects.length, tone: 'text-primary' },
    { label: 'Total Jobs', value: jobs.length, tone: 'text-paused' },
    {
      label: 'Records Synced',
      value: formatNum(totalSynced),
      tone: 'text-success',
    },
    { label: 'Total Errors', value: totalErrors, tone: 'text-destructive' },
  ];

  return (
    <div className="animate-fade-in-up space-y-6">
      {header}

      <StatCardGrid stats={stats} columns={4} />

      {jobChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Records Synced per Job</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={jobChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'var(--muted)' }}
                />
                <Bar
                  dataKey="records"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {logChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sync Activity (last 14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={logChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="runs"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="records"
                  stroke="var(--success)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {logChartData.length === 0 && jobChartData.length === 0 && (
        <EmptyState
          icon={TrendingUp}
          title="No metrics yet"
          description="Charts will appear once you have sync data."
        />
      )}
    </div>
  );
}
