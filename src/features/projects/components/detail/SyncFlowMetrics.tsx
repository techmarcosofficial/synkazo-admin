import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface SyncFlowMetric {
  label: string;
  value: ReactNode;
  description: string;
  icon: LucideIcon;
}

export function syncFlowMetricCellClass(index: number): string {
  return cn(
    'flex min-w-0 items-center gap-3 px-4 py-3',
    index % 2 === 1 && 'border-l',
    index >= 2 && 'border-t md:border-t-0',
    index > 0 && 'md:border-l',
  );
}

export default function SyncFlowMetrics({
  metrics,
}: {
  metrics: readonly SyncFlowMetric[];
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4">
      {metrics.map((metric, index) => (
        <div key={metric.label} className={syncFlowMetricCellClass(index)}>
          <span className="bg-card text-card-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
            <metric.icon className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold tracking-tight">
              {metric.value}
            </div>
            <div className="text-muted-foreground truncate text-xs font-medium">
              {metric.label}
            </div>
            <div className="text-muted-foreground truncate text-[11px]">
              {metric.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
