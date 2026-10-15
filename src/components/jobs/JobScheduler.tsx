import { CalendarClock } from 'lucide-react';

import IndividualSchedulerList from './IndividualSchedulerList';
import PriorityQueuePanel from './priority-queue/PriorityQueuePanel';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useProjectJobsQuery } from '@/queries/useJobs';
import { usePriorityQueueQuery } from '@/queries/usePriorityQueue';

export default function JobScheduler({ projectId }: { projectId: string }) {
  const jobsQuery = useProjectJobsQuery(projectId);
  const queueQuery = usePriorityQueueQuery(projectId);
  if (jobsQuery.isLoading || queueQuery.isLoading)
    return <Skeleton className="h-72 w-full" />;
  if (
    (jobsQuery.isError && !jobsQuery.data) ||
    (queueQuery.isError && !queueQuery.data)
  ) {
    return (
      <Alert variant="destructive">
        <CalendarClock aria-hidden="true" />
        <AlertTitle>Schedule settings could not be loaded</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          Try loading this section again.
          <Button
            size="sm"
            variant="outline"
            disabled={jobsQuery.isFetching || queueQuery.isFetching}
            onClick={() => {
              void jobsQuery.refetch();
              void queueQuery.refetch();
            }}
          >
            {(jobsQuery.isFetching || queueQuery.isFetching) && <Spinner />}{' '}
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  const jobs = jobsQuery.data ?? [];
  if (
    jobs.length > 0 &&
    jobs.every((job) => (job.syncDirection ?? 'one_way') === 'two_way')
  ) {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold">
          Manage schedules of all sync flows
        </h2>
        <IndividualSchedulerList projectId={projectId} />
      </div>
    );
  }
  return <PriorityQueuePanel key={projectId} projectId={projectId} />;
}
