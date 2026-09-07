import { useLocation, useParams } from 'react-router-dom';

import type { JobDetailContextValue } from './context';
import { JobDetailProvider } from './context';
import JobHeader from './JobHeader';
import JobHeaderAlert from './JobHeaderAlert';
import JobTabContent from './JobTabContent';
import JobTabs from './JobTabs';

import ErrorState from '@/components/shared/ErrorState';
import { BackLink } from '@/components/shared/PageHeader';
import StickyDetailHeader from '@/components/shared/StickyDetailHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import {
  useJobDetailCacheHelpers,
  useJobDetailQuery,
  useJobDetailTabs,
  useJobRunState,
} from '@/features/jobs/hooks';

export default function JobDetailPage() {
  const { id: projectIdParam, jobId: jobIdParam } = useParams<{
    id: string;
    jobId: string;
  }>();
  const projectId = projectIdParam!;
  const jobId = jobIdParam!;
  const location = useLocation();
  const navigationState = location.state as {
    jobBackTo?: unknown;
    jobBackLabel?: unknown;
  } | null;
  const fallbackBackTo = `/projects/${projectId}?tab=sync-rules`;
  const stateBackTo = navigationState?.jobBackTo;
  const backTo =
    typeof stateBackTo === 'string' &&
    stateBackTo.startsWith('/') &&
    !stateBackTo.startsWith('//')
      ? stateBackTo
      : fallbackBackTo;
  const backLabel =
    typeof navigationState?.jobBackLabel === 'string'
      ? navigationState.jobBackLabel
      : 'Back to Sync Jobs';

  const detailQuery = useJobDetailQuery(projectId, jobId);
  const { patchJob } = useJobDetailCacheHelpers(projectId, jobId);
  const loading = detailQuery.isLoading;
  const refetch = () => {
    detailQuery.refetch();
  };

  const job = detailQuery.data?.job ?? null;
  const project = detailQuery.data?.project ?? null;
  const runLogs = detailQuery.data?.runLogs ?? [];
  const jobFieldMappings = detailQuery.data?.jobFieldMappings ?? [];
  const hasConnection = detailQuery.data?.hasConnection ?? false;
  const pipelineRequired = detailQuery.data?.pipelineRequired ?? false;
  const pipelineConfigured = detailQuery.data?.pipelineConfigured ?? true;

  const runState = useJobRunState({
    projectId,
    jobId,
    job,
    runLogs,
    patchJob,
    refetch,
  });

  const { activeTab, tabs, handleTabChange } = useJobDetailTabs({
    pipelineRequired,
    isTwoWay: job?.syncDirection === 'two_way',
  });

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="space-y-2">
          <BackLink label={backLabel} to={backTo} />
          <Card className="gap-0 overflow-hidden py-0">
            <CardContent className="space-y-5 px-6 py-5">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-28 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-7 w-64" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <div className="flex gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-24" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-4">
        <BackLink label={backLabel} to={backTo} />
        <ErrorState onRetry={() => detailQuery.refetch()} />
      </div>
    );
  }

  const contextValue: JobDetailContextValue = {
    projectId,
    jobId,
    job,
    project,
    runLogs,
    jobFieldMappings,
    hasConnection,
    pipelineRequired,
    pipelineConfigured,
    patchJob,
    refetch,
    handleTabChange,
    ...runState,
  };

  return (
    <JobDetailProvider value={contextValue}>
      <Tabs
        value={activeTab}
        onValueChange={(v) => handleTabChange(v as typeof activeTab)}
        className="gap-0"
      >
        <StickyDetailHeader
          backLabel={backLabel}
          backTo={backTo}
          header={
            <Card className="gap-0 space-y-3 overflow-hidden py-0">
              <JobHeader />
              <div className="overflow-x-auto px-5">
                <JobTabs tabs={tabs} />
              </div>
            </Card>
          }
        >
          <JobHeaderAlert />
          <JobTabContent visibleTabIds={tabs.map((t) => t.id)} />
        </StickyDetailHeader>
      </Tabs>
    </JobDetailProvider>
  );
}
