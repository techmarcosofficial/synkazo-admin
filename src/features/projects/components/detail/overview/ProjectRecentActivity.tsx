import { formatDistanceToNow } from 'date-fns';
import { Activity } from 'lucide-react';

import EmptyState from '@/components/shared/EmptyState';
import ListRow from '@/components/shared/list/ListRow';
import { statusDot, type Tone } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import type { JobExt, ProjectActivityLog } from '@/features/projects/hooks';

interface ProjectRecentActivityProps {
  logs: ProjectActivityLog[];
  jobs: JobExt[];
  onViewAll: () => void;
}

const STATUS_TONE: Record<string, Tone> = {
  success: 'success',
  partial: 'warning',
  failed: 'danger',
  cancelled: 'muted',
};

function formatDuration(durationMs?: number | null): string | null {
  if (!durationMs) return null;
  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

export default function ProjectRecentActivity({
  logs,
  jobs,
  onViewAll,
}: ProjectRecentActivityProps) {
  const rows = logs.slice(0, 6);

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Sync activity will appear here once a sync rule runs."
          viewMode="list"
        />
      ) : (
        <div className="bg-card overflow-hidden rounded-4xl border">
          <div className="bg-muted flex flex-row items-center justify-between border-b px-3 py-2">
            <h3 className="text-md font-semibold">Recent Activity</h3>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={onViewAll}
            >
              View all
            </Button>
          </div>
          {rows.map((log) => {
            const status = log.metadata?.status;
            const tone = (status && STATUS_TONE[status]) || 'muted';
            const jobName =
              log.metadata?.jobName ??
              jobs.find((j) => j.id === log.jobId)?.name;
            const duration = formatDuration(log.durationMs);

            return (
              <ListRow key={log.id}>
                <span className={statusDot({ tone, size: 'md' })} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{jobName ?? log.message}</p>
                  <p className="text-muted-foreground text-xs">
                    {log.createdAt
                      ? formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                        })
                      : ''}
                    {typeof log.recordsProcessed === 'number' &&
                      ` · ${log.recordsProcessed} records`}
                    {duration && ` · ${duration}`}
                  </p>
                </div>
              </ListRow>
            );
          })}
        </div>
      )}
    </>
  );
}
