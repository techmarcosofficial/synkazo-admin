import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import type { KpiSecondaryStat, KpiSparklinePoint, KpiTrend } from '../types';

import { Card, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
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
  href,
  secondaryStats,
}: KpiStatCardProps) {
  const hasChart = !!chartData && chartData.length > 1;

  // Built per-card so ChartContainer can expose `var(--color-value)` bound to
  // this card's own color, same mechanism as the desktop/mobile config in
  // StatCard.tsx — just with a single "value" series instead of two.
  const chartConfig = React.useMemo(
    () =>
      ({
        value: {
          label,
          color: chartColor,
        },
      }) satisfies ChartConfig,
    [label, chartColor],
  );

  const gradientId = `fill-${label.replace(/\s+/g, '-')}`;

  const card = (
    <Card
      className={cn(
        'h-full',
        href && 'hover:border-primary/40 transition-colors',
      )}
    >
      <CardContent>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'bg-muted flex h-9 w-9 items-center justify-center rounded-[8px]',
            )}
          >
            <Icon className={cn('text-muted-foreground h-5 w-5')} />
          </div>
        </div>

        <div className="mt-4 text-4xl font-bold tracking-tight">{value}</div>

        <div className="mt-2 space-y-1">
          {trend ? (
            <>
              <div
                className={cn(
                  'flex items-center gap-1 text-xs font-semibold',
                  trend.positive ? 'text-success' : 'text-destructive',
                )}
              >
                {trend.positive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.value}
              </div>
              <div className="text-muted-foreground text-xs">{trend.label}</div>
            </>
          ) : (
            sublabel && (
              <>
                <span className="text-sm font-medium">{label}</span>
                <div className="text-muted-foreground text-xs">{sublabel}</div>
              </>
            )
          )}
        </div>

        {secondaryStats && secondaryStats.length > 0 && (
          <div className="mt-3 flex items-center gap-4 border-t pt-3">
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
        )}

        {hasChart && (
          <ChartContainer
            config={chartConfig}
            className="mt-2 aspect-auto h-[120px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
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
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
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
                    labelFormatter={(value) => {
                      return new Date(String(value)).toLocaleDateString('en-US', {
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
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
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
