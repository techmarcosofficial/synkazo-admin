import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, Clock3, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import ListPanel from '@/components/shared/list/ListPanel';
import ListRow from '@/components/shared/list/ListRow';
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { JobExt, ProjectActivityLog } from '@/features/projects/hooks';

interface ProjectRecentActivityProps {
  projectId: string;
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

function triggerLabel(triggeredBy?: string): string | null {
  if (!triggeredBy) return null;
  const labels: Record<string, string> = {
    cron: 'Scheduled run',
    manual: 'Manual run',
    api: 'API run',
    resume: 'Resumed run',
    sync_all: 'All records',
    limit_sync: 'Limited run',
    webhook: 'Webhook run',
  };
  return labels[triggeredBy] ?? titleCase(triggeredBy);
}

export default function ProjectRecentActivity({
  projectId,
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
              const runType = triggerLabel(log.metadata?.triggeredBy);
              const failedRecords = log.metadata?.recordsFailed ?? 0;
              const createdAt = log.createdAt ? new Date(log.createdAt) : null;
              const hasValidDate =
                createdAt && !Number.isNaN(createdAt.getTime());
              const activityHref = log.jobId
                ? `/projects/${projectId}/jobs/${log.jobId}?tab=run-history`
                : `/projects/${projectId}?tab=activity`;

              return (
                <ListRow key={log.id} asChild className="px-4 py-1.5">
                  <Link
                    to={activityHref}
                    state={
                      log.jobId
                        ? {
                            jobBackTo: `/projects/${projectId}?tab=overview`,
                            jobBackLabel: 'Back to Project Overview',
                          }
                        : undefined
                    }
                    className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-left xl:grid-cols-[6.75rem_minmax(0,1fr)_auto_auto]"
                    aria-label={`Open activity details for ${mapping}`}
                  >
                    <StatusBadge status={statusFor(log)} size="sm" />
                    <div className="col-start-2 row-start-1 min-w-0 space-y-1 xl:col-auto xl:row-auto">
                      <p
                        className="truncate text-sm font-semibold"
                        title={mapping}
                      >
                        {mapping}
                      </p>
                      <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
                        {jobName && jobName !== mapping && (
                          <span className="max-w-48 truncate">{jobName}</span>
                        )}
                        {jobName && jobName !== mapping && runType && (
                          <span aria-hidden="true">·</span>
                        )}
                        {runType && <span>{runType}</span>}
                      </div>
                    </div>
                    <div className="col-start-2 row-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 xl:col-auto xl:row-auto xl:block xl:text-right">
                      <p className="text-sm font-semibold whitespace-nowrap">
                        {(log.recordsProcessed ?? 0).toLocaleString()}
                        <span className="text-muted-foreground ml-1 font-normal">
                          synced
                        </span>
                      </p>
                      <div className="text-muted-foreground flex items-center gap-2 text-xs xl:mt-1 xl:justify-end">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3" aria-hidden="true" />
                          {hasValidDate
                            ? formatDistanceToNow(createdAt, {
                                addSuffix: true,
                              })
                            : 'Time unavailable'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Timer className="size-3" aria-hidden="true" />
                          {formatDuration(log.durationMs)}
                        </span>
                      </div>
                      {failedRecords > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-destructive mt-1 h-5 px-1.5 text-[11px]"
                        >
                          {failedRecords.toLocaleString()} failed
                        </Badge>
                      )}
                    </div>
                    <ChevronRight
                      className="text-muted-foreground col-start-3 row-start-1 size-4 shrink-0 xl:col-auto xl:row-auto"
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
