import { format, formatDistanceToNow } from 'date-fns';
import type { ReactNode } from 'react';

import { getProjectScheduleSummary } from './scheduleSummary';

import StatusBadge from '@/components/shared/StatusBadge';
import type { Job, PriorityQueueConfig } from '@/types';

function SummaryItem({
  label,
  children,
  description,
}: {
  label: string;
  children: ReactNode;
  description?: string;
}) {
  return (
    <div className="bg-muted/50 min-w-0 rounded-2xl p-3">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <div className="mt-1.5 min-h-5 text-sm font-semibold">{children}</div>
      {description && (
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
      )}
    </div>
  );
}

export default function ScheduleSummaryCard({
  jobs,
  config,
}: {
  jobs: Job[];
  config: PriorityQueueConfig;
}) {
  const summary = getProjectScheduleSummary(jobs, config);

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryItem
        label="Enabled / paused"
        description={
          config.schedulerMode === 'priority'
            ? 'Saved individual schedule states'
            : undefined
        }
      >
        {summary.enabledCount} enabled · {summary.pausedCount} paused
      </SummaryItem>
      <SummaryItem label="Execution mode">
        <StatusBadge
          status={
            config.schedulerMode === 'priority' ? 'priority' : 'individual'
          }
          size="sm"
        />
      </SummaryItem>
      <SummaryItem label="Timezone">{summary.timezoneLabel}</SummaryItem>
      <SummaryItem label="Next known run">
        {summary.nextRunAt ? (
          <span title={format(new Date(summary.nextRunAt), 'PPpp')}>
            {formatDistanceToNow(new Date(summary.nextRunAt), {
              addSuffix: true,
            })}
          </span>
        ) : (
          <span className="text-muted-foreground font-normal">
            Not available
          </span>
        )}
      </SummaryItem>
    </div>
  );
}
