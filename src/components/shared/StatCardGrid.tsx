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
}

const MD_COLS: Record<number, string> = {
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
};

export default function StatCardGrid({
  stats,
  columns = 4,
}: {
  stats: StatCardDef[];
  columns?: 3 | 4 | 5;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-4', MD_COLS[columns])}>
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="space-y-1">
            {stat.icon && (
              <div
                className={cn(
                  'mb-1 flex size-9 items-center justify-center rounded-lg',
                  stat.tone,
                )}
              >
                <stat.icon className="size-4" />
              </div>
            )}
            <div className={cn('text-2xl font-extrabold tracking-tight')}>
              {stat.value}
            </div>
            <div className="text-muted-foreground text-xs font-medium">
              {stat.label}
            </div>
            {stat.delta && (
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
