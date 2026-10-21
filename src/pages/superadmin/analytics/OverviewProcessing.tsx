import { Activity, Layers, ShieldCheck } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { PlatformAnalyticsResponse } from '@/types/platformAnalytics';
import type { PlatformOverviewResponse } from '@/types/superAdmin';
import { AnalyticsSection } from './AnalyticsSection';
import {
  compactNumber,
  dateLabel,
  fullNumber,
  percentage,
} from './analyticsDisplay';

const config = {
  recordsWritten: { label: 'Records processed', color: 'var(--primary)' },
  completed: { label: 'Successful', color: 'var(--success)' },
  partial: { label: 'Partial', color: 'var(--warning)' },
  failed: { label: 'Failed', color: 'var(--destructive)' },
};
type Processing = NonNullable<
  PlatformAnalyticsResponse['sections']['processing']
>;
export function OverviewProcessing({
  processing,
  loading,
  error,
}: {
  processing?: Processing | null;
  loading: boolean;
  error?: string;
}) {
  return (
    <>
      <AnalyticsSection
        title="Processing demand"
        icon={Activity}
        description="Records created and updated in the selected period."
        loading={loading}
        error={error}
      >
        <p className="text-2xl leading-7 font-semibold tracking-tight tabular-nums">
          {processing ? fullNumber(processing.totals.recordsWritten) : '—'}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Records processed · grouped by run start date
        </p>
        {processing?.totals.terminalRuns ? (
          <ChartContainer
            config={config}
            className="mt-3 aspect-auto h-28 w-full"
            aria-label="Records processed over the selected period"
          >
            <AreaChart
              data={processing.series}
              accessibilityLayer
              margin={{ left: 0, right: 8, top: 4 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="bucket"
                tickFormatter={dateLabel}
                minTickGap={32}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={compactNumber}
                tickLine={false}
                axisLine={false}
                width={32}
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
                dataKey="recordsWritten"
                stroke="var(--color-recordsWritten)"
                fill="var(--color-recordsWritten)"
                fillOpacity={0.12}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <p className="text-muted-foreground flex h-28 items-center justify-center text-xs">
            {processing
              ? 'No completed, partial or failed runs in this period.'
              : 'Processing history unavailable.'}
          </p>
        )}
      </AnalyticsSection>
      <div id="overview-reliability" className="min-w-0 scroll-mt-4">
        <AnalyticsSection
          title="Sync reliability"
          icon={ShieldCheck}
          description="Successful, partial and failed sync runs."
          loading={loading}
          error={error}
        >
          <p className="text-2xl leading-7 font-semibold tracking-tight tabular-nums">
            {percentage(processing?.totals.successRate)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {processing
              ? `${fullNumber(processing.totals.completed)} successful / ${fullNumber(processing.totals.terminalRuns)} finished runs`
              : 'Success rate unavailable'}
          </p>
          {processing?.totals.terminalRuns ? (
            <ChartContainer
              config={config}
              className="mt-3 aspect-auto h-24 w-full"
              aria-label="Successful, partial and failed runs over the selected period"
            >
              <BarChart
                data={processing.series}
                accessibilityLayer
                margin={{ left: 0, right: 8, top: 4 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tickFormatter={dateLabel}
                  minTickGap={32}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => dateLabel(String(value))}
                    />
                  }
                />
                <Bar
                  dataKey="completed"
                  stackId="runs"
                  fill="var(--color-completed)"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="partial"
                  stackId="runs"
                  fill="var(--color-partial)"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="failed"
                  stackId="runs"
                  fill="var(--color-failed)"
                  isAnimationActive={false}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground flex h-24 items-center justify-center text-xs">
              {processing
                ? 'No finished runs in this period.'
                : 'Reliability history unavailable.'}
            </p>
          )}
          <div className="text-muted-foreground mt-1 flex flex-wrap justify-center gap-3 text-xs">
            {(['completed', 'partial', 'failed'] as const).map((key) => (
              <span key={key} className="inline-flex items-center gap-1">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: config[key].color }}
                />
                {config[key].label}
              </span>
            ))}
          </div>
        </AnalyticsSection>
      </div>
    </>
  );
}

export function OverviewQueue({
  queue,
  loading,
  error,
  generatedAt,
}: {
  queue?: PlatformOverviewResponse['jobs']['queue'];
  loading: boolean;
  error?: string;
  generatedAt?: string;
}) {
  return (
    <div id="overview-queue" className="min-w-0 scroll-mt-4">
      <AnalyticsSection
        title="Queue health"
        icon={Layers}
        description="Current background work across the platform."
        loading={loading}
        error={error}
      >
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              {
                key: 'waiting',
                label: 'Waiting',
                color: 'bg-muted-foreground',
              },
              { key: 'active', label: 'Active', color: 'bg-primary' },
              { key: 'delayed', label: 'Delayed', color: 'bg-warning' },
              { key: 'failed', label: 'Failed', color: 'bg-destructive' },
            ] as const
          ).map((item) => (
            <div
              key={item.key}
              className="bg-muted/20 flex items-center gap-2.5 rounded-2xl border p-3"
            >
              <span className={`size-2 shrink-0 rounded-full ${item.color}`} />
              <div>
                <p className="text-xl leading-6 font-semibold tabular-nums">
                  {queue ? fullNumber(queue[item.key]) : '—'}
                </p>
                <p className="text-muted-foreground text-xs">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          Live snapshot · Failed jobs are retained failures, not period totals.
        </p>
        {generatedAt && (
          <p className="text-muted-foreground mt-1 text-xs">
            Updated{' '}
            <time dateTime={generatedAt}>
              {new Date(generatedAt).toLocaleTimeString()}
            </time>
          </p>
        )}
      </AnalyticsSection>
    </div>
  );
}
