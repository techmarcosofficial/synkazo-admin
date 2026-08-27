import { formatDistanceToNow } from 'date-fns';

import { StatCardGrid } from '../shared';

import type { JobExt, ProjectActivityLog } from '@/features/projects/hooks';
import { formatNum } from '@/features/projects/utils';

interface ProjectKeyMetricsProps {
  totalRecordsSynced: number;
  totalErrors: number;
  jobs: JobExt[];
  logs: ProjectActivityLog[];
  lastSyncedAt?: string | null;
}

function computeSuccessRate(logs: ProjectActivityLog[]): string {
  let success = 0;
  let failed = 0;
  for (const log of logs) {
    const status = log.metadata?.status;
    if (status === 'success' || status === 'partial') success += 1;
    else if (status === 'failed') failed += 1;
  }
  const denominator = success + failed;
  if (denominator === 0) return '—';
  return `${Math.round((success / denominator) * 100)}%`;
}

export default function ProjectKeyMetrics({
  totalRecordsSynced,
  totalErrors,
  jobs,
  logs,
  lastSyncedAt,
}: ProjectKeyMetricsProps) {
  const enabledJobCount = jobs.filter((j) => j.isEnabled).length;

  return (
    <StatCardGrid
      stats={[
        {
          label: 'Records synced',
          value: formatNum(totalRecordsSynced),
          tone: 'text-primary',
        },
        {
          label: 'Success rate',
          value: computeSuccessRate(logs),
          tone: 'text-success',
        },
        {
          label: 'Active sync jobs',
          value: `${enabledJobCount} of ${jobs.length}`,
          tone: 'text-info',
        },
        {
          label: 'Errors',
          value: formatNum(totalErrors),
          tone: totalErrors > 0 ? 'text-destructive' : 'text-muted-foreground',
        },
        {
          label: 'Last synced',
          value: lastSyncedAt
            ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })
            : 'Never',
          tone: 'text-foreground',
        },
      ]}
      columns={5}
    />
  );
}
