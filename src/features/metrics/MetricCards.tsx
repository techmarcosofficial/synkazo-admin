import { Activity, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';

import type {
  DashboardMetricBucket,
  DashboardSyncMetrics,
} from '@/api/dashboard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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

const throughputChartConfig = {
  created: { label: 'Created', color: 'var(--chart-1)' },
  updated: { label: 'Updated', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const healthChartConfig = {
  completed: { label: 'Completed', color: 'var(--chart-1)' },
  issues: { label: 'Issues', color: 'var(--chart-3)' },
  failedOrStopped: { label: 'Failed / Stopped', color: 'var(--chart-5)' },
} satisfies ChartConfig;

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: value >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

function MetricEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty className="min-h-[260px] p-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Activity />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function Comparison({
  value,
  suffix,
}: {
  value: number | null;
  suffix: string;
}) {
  if (value == null) return null;

  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  const Icon = rounded > 0 ? ArrowUp : rounded < 0 ? ArrowDown : Minus;

  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-medium">
      <Icon className="size-3" />
      {Math.abs(rounded).toFixed(1)}
      {suffix} vs previous period
    </span>
  );
}

function MetricCardHeading({
  title,
  description,
  value,
  comparison,
  details,
}: {
  title: string;
  description: string;
  value: string;
  comparison?: React.ReactNode;
  details?: React.ReactNode;
}) {
  return (
    <CardHeader className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0 space-y-1.5">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      <div className="min-w-0 sm:max-w-72 sm:text-right">
        <div className="flex flex-wrap items-end gap-x-2 gap-y-1 sm:justify-end">
          <div className="text-3xl font-bold tracking-tight tabular-nums">
            {value}
          </div>
          {comparison}
        </div>
        {details && (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs sm:justify-end">
            {details}
          </div>
        )}
      </div>
    </CardHeader>
  );
}

function ProcessedTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: DashboardMetricBucket }>;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  const created = Number(point?.created ?? 0);
  const updated = Number(point?.updated ?? 0);

  return (
    <div className="bg-popover text-popover-foreground ring-foreground/5 dark:ring-foreground/10 min-w-40 rounded-xl px-3 py-2 text-xs shadow-lg ring-1">
      <div className="mb-2 font-medium">{point?.label}</div>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground flex items-center gap-2">
            <span className="bg-chart-1 size-2 rounded-[2px]" /> Created
          </span>
          <span className="font-mono font-medium tabular-nums">
            {created.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground flex items-center gap-2">
            <span className="bg-chart-2 size-2 rounded-[2px]" /> Updated
          </span>
          <span className="font-mono font-medium tabular-nums">
            {updated.toLocaleString()}
          </span>
        </div>
        <div className="border-border mt-1 flex items-center justify-between gap-6 border-t pt-1.5">
          <span className="font-medium">Processed</span>
          <span className="font-mono font-semibold tabular-nums">
            {(created + updated).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RecordsProcessedMetric({
  metrics,
}: {
  metrics: DashboardSyncMetrics;
}) {
  const { summary, comparison, buckets } = metrics;
  const activeBucketCount = buckets.filter(
    (point) => point.created + point.updated > 0,
  ).length;
  const showDots = activeBucketCount <= 10;
  const chartData = React.useMemo(
    () =>
      buckets.map((point) => ({
        ...point,
        createdValue: point.created + point.updated > 0 ? point.created : null,
        updatedValue: point.created + point.updated > 0 ? point.updated : null,
      })),
    [buckets],
  );

  return (
    <Card size="sm" className="border">
      <MetricCardHeading
        title="Records Processed Over Time"
        description="Records created or updated at destination"
        value={summary.recordsProcessed.toLocaleString()}
        comparison={
          <Comparison value={comparison.recordsProcessedChangePct} suffix="%" />
        }
        details={
          <>
            <span>
              <span className="text-muted-foreground">Created </span>
              <strong className="font-semibold tabular-nums">
                {summary.created.toLocaleString()}
              </strong>
            </span>
            <span>
              <span className="text-muted-foreground">Updated </span>
              <strong className="font-semibold tabular-nums">
                {summary.updated.toLocaleString()}
              </strong>
            </span>
          </>
        }
      />
      <CardContent>
        {summary.recordsProcessed === 0 ? (
          <MetricEmpty
            title={
              summary.terminalRuns > 0 ? 'No records moved' : 'No sync data yet'
            }
            description={
              summary.terminalRuns > 0
                ? `${summary.terminalRuns.toLocaleString()} run${summary.terminalRuns === 1 ? '' : 's'} finished without creating or updating records.`
                : 'Record throughput will appear after the first sync run.'
            }
          />
        ) : (
          <>
            <ChartContainer
              config={throughputChartConfig}
              className="h-[260px] w-full"
              initialDimension={{ width: 520, height: 260 }}
            >
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="throughput-created"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--color-created)"
                      stopOpacity={0.72}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-created)"
                      stopOpacity={0.12}
                    />
                  </linearGradient>
                  <linearGradient
                    id="throughput-updated"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--color-updated)"
                      stopOpacity={0.66}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-updated)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => formatCompactNumber(value)}
                />
                <ChartTooltip cursor={false} content={<ProcessedTooltip />} />
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                <Area
                  dataKey="createdValue"
                  name="created"
                  type="linear"
                  stackId="processed"
                  connectNulls={false}
                  fill="url(#throughput-created)"
                  stroke="var(--color-created)"
                  strokeWidth={2}
                  dot={showDots ? { r: 2.5, strokeWidth: 0 } : false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  dataKey="updatedValue"
                  name="updated"
                  type="linear"
                  stackId="processed"
                  connectNulls={false}
                  fill="url(#throughput-updated)"
                  stroke="var(--color-updated)"
                  strokeWidth={2}
                  dot={showDots ? { r: 2.5, strokeWidth: 0 } : false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ChartContainer>
            {activeBucketCount === 1 && (
              <p className="text-muted-foreground mt-2 text-center text-xs">
                One active interval — not enough history to establish a trend.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function SyncRunHealthMetric({
  metrics,
}: {
  metrics: DashboardSyncMetrics;
}) {
  const { summary, comparison, buckets } = metrics;
  const issueRuns = summary.partial;
  const failedOrStopped = summary.failed + summary.stopped;
  const healthData = React.useMemo(
    () =>
      buckets.map((bucket) => ({
        ...bucket,
        completed: bucket.successful,
        issues: bucket.partial,
        failedOrStopped: bucket.failed + bucket.stopped,
      })),
    [buckets],
  );

  return (
    <Card size="sm" className="border">
      <MetricCardHeading
        title="Sync Run Health"
        description="Terminal run outcomes across the organization"
        value={
          summary.successRate == null
            ? '—'
            : `${summary.successRate.toFixed(1)}%`
        }
        comparison={
          <Comparison
            value={comparison.successRateChangePoints}
            suffix=" pts"
          />
        }
        details={
          <>
            <span>
              <strong className="font-semibold tabular-nums">
                {summary.successful.toLocaleString()}
              </strong>{' '}
              <span className="text-muted-foreground">completed</span>
            </span>
            <span>
              <strong className="font-semibold tabular-nums">
                {issueRuns.toLocaleString()}
              </strong>{' '}
              {issueRuns === 1 ? 'run' : 'runs'} with issues
            </span>
            <span>
              <strong className="font-semibold tabular-nums">
                {failedOrStopped.toLocaleString()}
              </strong>{' '}
              failed / stopped
            </span>
            {summary.running > 0 && (
              <span className="text-muted-foreground">
                <strong className="font-semibold tabular-nums">
                  {summary.running.toLocaleString()}
                </strong>{' '}
                running
              </span>
            )}
          </>
        }
      />
      <CardContent>
        {summary.terminalRuns === 0 ? (
          <MetricEmpty
            title={
              summary.running > 0 ? 'Syncs are running' : 'No run outcomes yet'
            }
            description={
              summary.running > 0
                ? 'Health will be calculated after a sync reaches a terminal outcome.'
                : 'Run health will appear after the first sync finishes.'
            }
          />
        ) : (
          <ChartContainer
            config={healthChartConfig}
            className="h-[260px] w-full"
            initialDimension={{ width: 520, height: 260 }}
          >
            <BarChart
              accessibilityLayer
              data={healthData}
              barGap={healthData.length > 20 ? 0 : 3}
              barCategoryGap={healthData.length > 20 ? '12%' : '24%'}
              margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
            >
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
                cursor={{ fill: 'var(--muted)', fillOpacity: 0.45 }}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="completed"
                fill="var(--color-completed)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="issues"
                fill="var(--color-issues)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="failedOrStopped"
                fill="var(--color-failedOrStopped)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
