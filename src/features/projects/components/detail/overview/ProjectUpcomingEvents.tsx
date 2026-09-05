import { format, formatDistanceToNow } from 'date-fns';
import { CalendarClock, ChevronRight, Database, Repeat2 } from 'lucide-react';

import { PlatformIcon } from '@/components/platform';
import EmptyState from '@/components/shared/EmptyState';
import ListPanel from '@/components/shared/list/ListPanel';
import ListRow from '@/components/shared/list/ListRow';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { JobExt } from '@/features/projects/hooks';
import { getUpcomingScheduledJobs } from '@/features/projects/lib/projectOverview';
import { formatSchedule } from '@/features/projects/utils';

interface ProjectUpcomingEventsProps {
  destinationPlatformId: string;
  jobs: JobExt[];
  onViewScheduler: () => void;
}

function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

export default function ProjectUpcomingEvents({
  destinationPlatformId,
  jobs,
  onViewScheduler,
}: ProjectUpcomingEventsProps) {
  const upcomingJobs = getUpcomingScheduledJobs(jobs);

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-heading text-base font-medium">
              Upcoming Events
            </h3>
            <p className="text-muted-foreground text-sm">
              Next scheduled sync runs.
            </p>
          </div>
          <Button
            variant="link"
            size="sm"
            className="h-auto shrink-0 p-0"
            onClick={onViewScheduler}
          >
            View all
          </Button>
        </div>

        <ListPanel className="flex-1 border">
          {upcomingJobs.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No upcoming runs"
              description="Future scheduled sync runs will appear here."
            />
          ) : (
            upcomingJobs.map((job) => {
              const nextRun = new Date(job.nextRunAt!);
              const mapping = `${titleCase(job.sourceObject)} → ${titleCase(job.destObject)}`;

              return (
                <ListRow key={job.id} asChild className="px-4 py-3.5">
                  <button
                    type="button"
                    className="grid w-full grid-cols-[6.75rem_2.5rem_minmax(0,1fr)_auto] items-center gap-3 text-left"
                    onClick={onViewScheduler}
                    aria-label={`Open scheduled event for ${mapping}`}
                  >
                    <StatusBadge status="scheduled" size="sm" />
                    <div className="bg-muted flex size-10 items-center justify-center rounded-xl">
                      <PlatformIcon
                        platformId={destinationPlatformId}
                        variant="avatar"
                        size="lg"
                      />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-semibold"
                        title={mapping}
                      >
                        {mapping}
                      </p>
                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span
                          className="inline-flex items-center gap-1"
                          title={format(nextRun, 'PPpp')}
                        >
                          <CalendarClock
                            className="size-3.5"
                            aria-hidden="true"
                          />
                          {formatDistanceToNow(nextRun, { addSuffix: true })}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Repeat2 className="size-3.5" aria-hidden="true" />
                          {formatSchedule(job)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Database className="size-3.5" aria-hidden="true" />
                          {(job.recordsSynced ?? 0).toLocaleString()} synced
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className="text-muted-foreground size-4 shrink-0"
                      aria-hidden="true"
                    />
                  </button>
                </ListRow>
              );
            })
          )}
        </ListPanel>
      </CardContent>
    </Card>
  );
}
