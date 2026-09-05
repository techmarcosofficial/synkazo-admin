import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, Clock3, Database, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PlatformIcon } from '@/components/platform';
import EmptyState from '@/components/shared/EmptyState';
import ListPanel from '@/components/shared/list/ListPanel';
import ListRow from '@/components/shared/list/ListRow';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { JobExt, ProjectActivityLog } from '@/features/projects/hooks';

interface ProjectRecentActivityProps {
  projectId: string;
  destinationPlatformId: string;
  logs: ProjectActivityLog[];
  jobs: JobExt[];
  onViewAll: () => void;
}

function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function statusFor(log: ProjectActivityLog): string {
  if (log.metadata?.status) return log.metadata.status;
  if (log.level === 'success') return 'success';
  if (log.level === 'warn') return 'partial';
  if (log.level === 'error') return 'failed';
  return 'pending';
}

function formatDuration(durationMs?: number | null): string {
  if (durationMs == null) return '—';
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export default function ProjectRecentActivity({
  projectId,
  destinationPlatformId,
  logs,
  jobs,
  onViewAll,
}: ProjectRecentActivityProps) {
  const rows = logs.slice(0, 6);

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-heading text-base font-medium">
              Recent Activity
            </h3>
            <p className="text-muted-foreground text-sm">
              Latest sync runs and project events.
            </p>
          </div>
          <Button
            variant="link"
            size="sm"
            className="h-auto shrink-0 p-0"
            onClick={onViewAll}
          >
            View all
          </Button>
        </div>

        <ListPanel className="flex-1 border">
          {rows.length === 0 ? (
            <EmptyState
              icon={Clock3}
              title="No activity yet"
              description="Sync activity will appear here once a sync job runs."
            />
          ) : (
            rows.map((log) => {
              const job = jobs.find((candidate) => candidate.id === log.jobId);
              const jobName = log.metadata?.jobName ?? job?.name;
              const sourceObject =
                log.metadata?.sourceObject ?? job?.sourceObject;
              const destinationObject =
                log.metadata?.destObject ?? job?.destObject;
              const mapping =
                sourceObject && destinationObject
                  ? `${titleCase(sourceObject)} → ${titleCase(destinationObject)}`
                  : (jobName ?? log.message);
              const platformId =
                log.metadata?.destPlatformId ?? destinationPlatformId;
              const activityHref = log.jobId
                ? `/projects/${projectId}/jobs/${log.jobId}?tab=run-history`
                : `/projects/${projectId}?tab=activity`;

              return (
                <ListRow key={log.id} asChild className="px-3 py-2">
                  <Link
                    to={activityHref}
                    className="grid w-full grid-cols-[6.75rem_2.5rem_minmax(0,1fr)_auto] items-center gap-3 text-left"
                    aria-label={`Open activity details for ${mapping}`}
                  >
                    <StatusBadge status={statusFor(log)} size="sm" />
                    <PlatformIcon
                      platformId={platformId}
                      variant="avatar"
                      size="lg"
                    />
                    <div className="min-w-0 space-y-1">
                      <p
                        className="truncate text-sm font-semibold"
                        title={mapping}
                      >
                        {mapping}
                      </p>
                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3.5" aria-hidden="true" />
                          {log.createdAt
                            ? formatDistanceToNow(new Date(log.createdAt), {
                                addSuffix: true,
                              })
                            : 'Time unavailable'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Database className="size-3.5" aria-hidden="true" />
                          {(log.recordsProcessed ?? 0).toLocaleString()} records
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Timer className="size-3.5" aria-hidden="true" />
                          {formatDuration(log.durationMs)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className="text-muted-foreground size-4 shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </ListRow>
              );
            })
          )}
        </ListPanel>
      </CardContent>
    </Card>
  );
}
