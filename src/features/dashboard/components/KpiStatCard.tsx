import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, XAxis } from 'recharts';

import type { KpiSecondaryStat, KpiSparklinePoint, KpiTrend } from '../types';

import { Card, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export type { KpiSparklinePoint, KpiTrend };

const SECONDARY_TONE_CLASSNAME: Record<
  NonNullable<KpiSecondaryStat['tone']>,
  string
> = {
  default: 'text-foreground',
  success: 'text-success',
  danger: 'text-destructive',
};

export interface KpiStatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;

  icon: LucideIcon;
  /** Tailwind text color class for the icon, e.g. "text-violet-600" */
  iconClassName?: string;
  /** Tailwind bg color class for the icon chip, e.g. "bg-violet-100" */
  iconBgClassName?: string;

  /** Omit entirely when you don't have enough history to say anything true about direction */
  trend?: KpiTrend;

  /**
   * Omit when there's no real time-series behind this metric yet.
   * The card renders without a chart section at all rather than
   * reserving space for a placeholder.
   */
  chartData?: KpiSparklinePoint[];

  chartColor?: string; // CSS color/oklch value for the chart line + fill
  chartLabel?: string;
  chartSummary?: string;

  /** Makes the whole card a link to this route. */
  href?: string;

  /** Compact extra numbers shown under the main value, e.g. success rate + error count. */
  secondaryStats?: KpiSecondaryStat[];
}

export default function KpiStatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  iconClassName,
  iconBgClassName,
  trend,
  chartData,
  chartColor = 'var(--primary)',
  chartLabel,
  chartSummary,
  href,
  secondaryStats,
}: KpiStatCardProps) {
  const hasChart = !!chartData && chartData.length > 1;
  const hasChartActivity = !!chartData?.some((point) => point.value > 0);
  const chartTicks = React.useMemo(() => {
    if (!chartData?.length) return [];

    return Array.from(
      new Set([
        chartData[0]?.date,
        chartData[Math.floor((chartData.length - 1) / 2)]?.date,
        chartData[chartData.length - 1]?.date,
      ]),
    ).filter((date): date is string => !!date);
  }, [chartData]);

  // Built per-card so ChartContainer can expose `var(--color-value)` bound to
  // this card's own color, same mechanism as the desktop/mobile config in
  // StatCard.tsx — just with a single "value" series instead of two.
  const chartConfig = React.useMemo(
    () =>
      ({
        value: {
          label: chartLabel ?? label,
          color: chartColor,
        },
      }) satisfies ChartConfig,
    [label, chartColor, chartLabel],
  );

  const gradientId = `fill-${label.replace(/\s+/g, '-')}`;

  const card = (
    <Card
      size="sm"
      className={cn(
        'h-full transition-all duration-200 ease-out',
        href &&
          'hover:shadow-primary/5 cursor-pointer hover:-translate-y-1 hover:shadow-md',
      )}
    >
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="bg-muted flex h-11 w-11 items-center justify-center rounded-3xl">
              <Icon className="text-muted-foreground h-5 w-5" />
            </div>
            <div className="flex items-center gap-1.5">
              {trend && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs font-semibold',
                    trend.positive ? 'text-success' : 'text-destructive',
                  )}
                  title={trend.label}
                >
                  {trend.positive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {trend.value}
                </div>
              )}
              {chartSummary && (
                <div className="text-muted-foreground flex items-center justify-center gap-2 text-xs">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      hasChartActivity ? 'bg-primary' : 'bg-muted-foreground',
                    )}
                  />
                  <span>{chartSummary}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-0 space-y-1">
            <div className="text-4xl font-bold tracking-tight">{value}</div>
            <div className="text-sm font-medium">{label}</div>
            {sublabel && (
              <div className="text-muted-foreground text-xs">{sublabel}</div>
            )}
          </div>

          {secondaryStats && secondaryStats.length > 0 && (
            <>
              <div className="flex items-center gap-4">
                {secondaryStats.map((stat) => (
                  <div key={stat.label}>
                    <div
                      className={cn(
                        'text-sm font-semibold',
                        SECONDARY_TONE_CLASSNAME[stat.tone ?? 'default'],
                      )}
                    >
                      {stat.value}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {hasChart && (
            <>
              <div>
                {hasChartActivity && (
                  <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[88px] w-full"
                    initialDimension={{ width: 320, height: 88 }}
                  >
                    <AreaChart
                      accessibilityLayer
                      data={chartData}
                      margin={{ top: 4, right: 8, left: 8 }}
                    >
                      <defs>
                        <linearGradient
                          id={gradientId}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--color-value)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-value)"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        ticks={chartTicks}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        tickFormatter={(dateValue) => {
                          const date = new Date(dateValue);
                          return date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          });
                        }}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            labelFormatter={(dateValue) => {
                              return new Date(
                                String(dateValue),
                              ).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              });
                            }}
                            indicator="dot"
                          />
                        }
                      />
                      <Area
                        dataKey="value"
                        type="monotone"
                        fill={`url(#${gradientId})`}
                        stroke="var(--color-value)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}

                {!hasChartActivity && (
                  <div className="text-muted-foreground flex h-[88px] items-center justify-center text-xs">
                    No activity in the last 7 days
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link to={href} className="block h-full">
      {card}
    </Link>
  ) : (
    card
  );
}
