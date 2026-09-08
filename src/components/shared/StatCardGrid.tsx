import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatCardDelta {
  value: string;
  positive: boolean;
  label: string;
}

export interface StatCardDef {
  label: string;
  value: number | string;
  tone: string;
  icon?: LucideIcon;
  delta?: StatCardDelta;
  direction?: {
    positive: boolean;
    label: string;
  };
}

const MD_COLS: Record<number, string> = {
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
};

export default function StatCardGrid({
  stats,
  columns = 4,
  appearance = 'default',
}: {
  stats: StatCardDef[];
  columns?: 3 | 4 | 5;
  appearance?: 'default' | 'dashboard';
}) {
  const dashboardAppearance = appearance === 'dashboard';

  return (
    <div className={cn('grid grid-cols-2 gap-4', MD_COLS[columns])}>
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent
            className={dashboardAppearance ? 'space-y-4' : 'space-y-1'}
          >
            {dashboardAppearance &&
              (stat.icon || stat.delta || stat.direction) && (
                <div className="flex items-center justify-between gap-3">
                  {stat.icon ? (
                    <div
                      className={cn(
                        'flex size-11 items-center justify-center rounded-3xl',
                        stat.tone,
                      )}
                    >
                      <stat.icon className="size-5" />
                    </div>
                  ) : (
                    <span />
                  )}

                  {stat.delta ? (
                    <div
                      className={cn(
                        'flex items-center gap-1 text-xs font-semibold',
                        stat.delta.positive
                          ? 'text-success'
                          : 'text-destructive',
                      )}
                      title={stat.delta.label}
                    >
                      {stat.delta.positive ? (
                        <TrendingUp className="size-3" />
                      ) : (
                        <TrendingDown className="size-3" />
                      )}
                      {stat.delta.value}
                      <span className="text-muted-foreground font-normal">
                        {stat.delta.label}
                      </span>
                    </div>
                  ) : stat.direction ? (
                    <span
                      className={cn(
                        'flex size-7 items-center justify-center rounded-full',
                        stat.direction.positive
                          ? 'bg-success/10 text-success'
                          : 'bg-destructive/10 text-destructive',
                      )}
                      title={stat.direction.label}
                      aria-label={stat.direction.label}
                    >
                      {stat.direction.positive ? (
                        <TrendingUp className="size-3.5" />
                      ) : (
                        <TrendingDown className="size-3.5" />
                      )}
                    </span>
                  ) : null}
                </div>
              )}
            {!dashboardAppearance && stat.icon && (
              <div
                className={cn(
                  'mb-1 flex size-9 items-center justify-center rounded-lg',
                  stat.tone,
                )}
              >
                <stat.icon className="size-4" />
              </div>
            )}
            <div className="space-y-1">
              <div className="text-2xl font-extrabold tracking-tight">
                {stat.value}
              </div>
              <div className="text-muted-foreground text-xs font-medium">
                {stat.label}
              </div>
            </div>
            {!dashboardAppearance && stat.delta && (
              <div
                className={cn(
                  'flex items-center gap-1 pt-1 text-xs font-semibold',
                  stat.delta.positive ? 'text-success' : 'text-destructive',
                )}
              >
                {stat.delta.positive ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {stat.delta.value}
                <span className="text-muted-foreground font-normal">
                  {stat.delta.label}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
