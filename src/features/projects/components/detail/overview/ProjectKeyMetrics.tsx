import { formatDistanceToNow } from 'date-fns';
import { BriefcaseBusiness, CircleAlert, Clock3, Database } from 'lucide-react';

import { StatCardGrid } from '../shared';

import type { JobExt } from '@/features/projects/hooks';
import { formatNum } from '@/features/projects/utils';

interface ProjectKeyMetricsProps {
  totalRecordsSynced: number;
  totalErrors: number;
  jobs: JobExt[];
  lastSyncedAt?: string | null;
}

export default function ProjectKeyMetrics({
  totalRecordsSynced,
  totalErrors,
  jobs,
  lastSyncedAt,
}: ProjectKeyMetricsProps) {
  const enabledJobCount = jobs.filter((j) => j.isEnabled).length;

  return (
    <StatCardGrid
      stats={[
        {
          label: 'Records synced',
          value: formatNum(totalRecordsSynced),
          tone: 'bg-muted text-muted-foreground',
          icon: Database,
          direction: {
            positive: totalRecordsSynced > 0,
            label:
              totalRecordsSynced > 0
                ? 'Records have synced'
                : 'No records synced yet',
          },
        },
        {
          label: 'Active sync jobs',
          value: `${enabledJobCount} of ${jobs.length}`,
          tone: 'bg-muted text-muted-foreground',
          icon: BriefcaseBusiness,
          direction: {
            positive: enabledJobCount > 0,
            label:
              enabledJobCount > 0
                ? 'Sync jobs are active'
                : 'No active sync jobs',
          },
        },
        {
          label: 'Errors',
          value: formatNum(totalErrors),
          tone: 'bg-muted text-muted-foreground',
          icon: CircleAlert,
          direction: {
            positive: totalErrors === 0,
            label: totalErrors === 0 ? 'No errors' : 'Errors need review',
          },
        },
        {
          label: 'Last synced',
          value: lastSyncedAt
            ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })
            : 'Never',
          tone: 'bg-muted text-muted-foreground',
          icon: Clock3,
          direction: {
            positive: Boolean(lastSyncedAt),
            label: lastSyncedAt
              ? 'Project has synced'
              : 'Project has not synced',
          },
        },
      ]}
      columns={4}
      appearance="dashboard"
    />
  );
}
