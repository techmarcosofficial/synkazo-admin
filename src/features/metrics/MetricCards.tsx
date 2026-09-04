import { Activity } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';

import {
  buildSyncActivity,
  buildRecordsPerJobData,
  METRICS_PERIOD_LABELS,
} from './metricsData';
import type { MetricsPeriod } from './metricsData';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import type { OrgSyncLog } from '@/features/dashboard/types';
import type { Job } from '@/types';

const recordsChartConfig = {
  records: {
    label: 'Records synced',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

const activityChartConfig = {
  runs: {
    label: 'Sync runs',
    color: 'var(--primary)',
  },
  records: {
    label: 'Records processed',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

function MetricEmpty({ description }: { description: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Activity />
        </EmptyMedia>
        <EmptyTitle>No metrics yet</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function RecordsSyncedPerJobMetric({
  jobs,
  logs,
}: {
  jobs: Job[];
  logs: OrgSyncLog[];
}) {
  const data = buildRecordsPerJobData(jobs, logs);

  return (
    <Card className="border">
      <CardHeader>
        <CardTitle>Records Synced per Job</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <MetricEmpty description="No records were synced during this period." />
        ) : (
          <ChartContainer
            config={recordsChartConfig}
            className="h-[280px] w-full"
          >
            <BarChart accessibilityLayer data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
                tickFormatter={(value: string) =>
                  value.length > 14 ? `${value.slice(0, 14)}…` : value
                }
              />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar dataKey="records" fill="var(--color-records)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function SyncActivityMetric({
  logs,
  period,
}: {
  logs: OrgSyncLog[];
  period: MetricsPeriod;
}) {
  const data = buildSyncActivity(logs, period);
  const hasActivity = data.some((point) => point.runs > 0);

  return (
    <Card className="border">
      <CardHeader>
        <CardTitle>Sync Activity ({METRICS_PERIOD_LABELS[period]})</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasActivity ? (
          <MetricEmpty description="Activity will appear after the first sync runs." />
        ) : (
          <ChartContainer
            config={activityChartConfig}
            className="h-[280px] w-full"
          >
            <LineChart accessibilityLayer data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Line
                dataKey="runs"
                type="monotone"
                stroke="var(--color-runs)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="records"
                type="monotone"
                stroke="var(--color-records)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
