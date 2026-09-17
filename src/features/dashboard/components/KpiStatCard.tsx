import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Pie, PieChart } from 'recharts';

import type {
  KpiPieStat,
  KpiSecondaryStat,
  KpiSparklinePoint,
  KpiTrend,
} from '../types';

import { Card, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

export type { KpiSparklinePoint, KpiTrend };

export interface KpiStatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  iconClassName?: string;
  iconBgClassName?: string;
  statusLabel?: string;
  statusTone?: 'success' | 'neutral';
  chartSummary?: string;
  activityActive?: boolean;
  pieData?: KpiPieStat[];
  href?: string;
  secondaryStats?: KpiSecondaryStat[];
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: value >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

export default function KpiStatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  iconClassName,
  iconBgClassName,
  statusLabel,
  statusTone = 'neutral',
  chartSummary,
  activityActive = false,
  pieData,
  href,
}: KpiStatCardProps) {
  const pieItems = pieData ?? [];
  const hasPie = pieItems.length > 0;
  const pieTotal = pieItems.reduce((total, item) => total + item.value, 0);
  const pieChartConfig = React.useMemo(
    () =>
      Object.fromEntries(
        pieItems.map((item) => [
          item.label,
          { label: item.label, color: item.color },
        ]),
      ) as ChartConfig,
    [pieItems],
  );

  const card = (
    <Card
      className={cn(
        'h-full min-h-[228px] transition-all duration-200 ease-out',
        href &&
          'hover:border-foreground/20 cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      <CardContent className="flex h-full flex-1 flex-col">
        <div className="flex items-center justify-between gap-4">
          <div
            className={cn(
              'bg-muted flex size-11 shrink-0 items-center justify-center rounded-2xl',
              iconBgClassName,
            )}
          >
            <Icon
              className={cn('text-muted-foreground size-5', iconClassName)}
            />
          </div>

          {statusLabel && (
            <span className="bg-muted text-muted-foreground inline-flex h-5.5 items-center gap-2 rounded-3xl px-3 text-xs font-medium">
              {statusTone === 'success' && (
                <span
                  aria-hidden="true"
                  className="bg-success size-2 rounded-full"
                />
              )}
              {statusLabel}
            </span>
          )}
        </div>

        {hasPie ? (
          <div className="flex flex-1 items-center justify-between gap-3 py-4">
            <div className="min-w-0 shrink-0 space-y-1">
              <div className="text-4xl font-bold tracking-tight tabular-nums">
                {value}
              </div>
              <div className="text-sm font-semibold">{label}</div>
              {sublabel && (
                <div className="text-muted-foreground text-xs">{sublabel}</div>
              )}
            </div>

            <div className="flex min-w-0 items-center justify-end gap-3">
              <ChartContainer
                config={pieChartConfig}
                className="aspect-square h-[108px] shrink-0"
                initialDimension={{ width: 108, height: 108 }}
              >
                <PieChart accessibilityLayer>
                  <Pie
                    data={[{ value: 1 }]}
                    dataKey="value"
                    innerRadius={31}
                    outerRadius={50}
                    fill="var(--muted)"
                    strokeWidth={0}
                    isAnimationActive={false}
                  />
                  {pieTotal > 0 && (
                    <Pie
                      data={pieItems.map((item) => ({
                        ...item,
                        fill: item.color,
                      }))}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={31}
                      outerRadius={50}
                      paddingAngle={1.5}
                      strokeWidth={2}
                    />
                  )}
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel nameKey="label" />}
                  />
                </PieChart>
              </ChartContainer>

              <div className="min-w-[84px] space-y-2">
                {pieItems.map((item) => {
                  const percentage =
                    pieTotal > 0
                      ? Math.round((item.value / pieTotal) * 100)
                      : 0;

                  return (
                    <div key={item.label} className="flex items-start gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-1 size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="min-w-0 leading-tight">
                        <div className="text-muted-foreground text-xs">
                          {item.label}
                        </div>
                        <div className="text-xs font-semibold tabular-nums">
                          {formatCompactNumber(item.value)} ({percentage}%)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col justify-center py-5">
              <div className="text-4xl font-bold tracking-tight tabular-nums">
                {value}
              </div>
              <div className="mt-1 text-sm font-semibold">{label}</div>
              {sublabel && (
                <div className="text-muted-foreground mt-1 text-xs">
                  {sublabel}
                </div>
              )}
            </div>

            {chartSummary && (
              <div className="border-border text-muted-foreground flex items-center gap-2 border-t pt-3 text-xs">
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full',
                    activityActive
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {activityActive ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span>{chartSummary}</span>
              </div>
            )}
          </>
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
