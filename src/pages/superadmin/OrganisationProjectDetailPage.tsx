import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarClock,
  Clock,
  FolderOpen,
  Power,
} from 'lucide-react';
import { useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { toast } from 'sonner';

import LifecycleConfirmDialog from './lifecycle/LifecycleConfirmDialog';
import OrganisationCreateJobDialog from './OrganisationCreateJobDialog';
import OrganisationProjectSettings from './OrganisationProjectSettings';
import OrganisationProjectConnections from './projects/OrganisationProjectConnections';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import SyncFlowCard from '@/features/projects/components/detail/SyncFlowCard';
import SyncFlowMetrics from '@/features/projects/components/detail/SyncFlowMetrics';
import SyncFlowPanel from '@/features/projects/components/detail/SyncFlowPanel';
import {
  useHoldSuperAdminProjectMutation,
  useResumeSuperAdminProjectMutation,
  useSuperAdminJobsQuery,
  useSuperAdminOrganisationQuery,
  useSuperAdminProjectConnectionsQuery,
  useSuperAdminProjectQuery,
} from '@/queries/useSuperAdmin';
import type { SuperAdminJobListItem } from '@/types/superAdmin';

type ProjectTab = 'sync-rules' | 'settings' | 'connections';

function errorMessage(error: unknown): string {
  const response = error as { response?: { data?: { message?: string } } };
  return response.response?.data?.message ?? 'The request failed. Try again.';
}

function timeLabel(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unavailable'
    : formatDistanceToNow(date, { addSuffix: true });
}

function PlatformSyncFlow({
  job,
  detailPath,
  backTo,
}: {
  job: SuperAdminJobListItem;
  detailPath: string;
  backTo: string;
}) {
  const twoWay = job.syncDirection === 'two_way';
  const scheduleLabel =
    job.scheduleState.toLowerCase() === 'active'
      ? 'Scheduled'
      : job.scheduleState.toLowerCase() === 'held'
        ? 'On hold'
        : job.scheduleState;
  const linkState = {
    jobBackTo: backTo,
    jobBackLabel: 'Back to Sync Flows',
  };

  return (
    <SyncFlowCard
      name={job.name}
      twoWay={twoWay}
      scheduleText={scheduleLabel}
      status={job.isRunning ? 'running' : job.status}
      defaultOpen={false}
      hasMetrics
      titleLink={
        <Link
          to={detailPath}
          state={linkState}
          className="hover:text-primary text-foreground block truncate text-sm font-semibold transition-colors hover:underline"
        >
          {job.name}
        </Link>
      }
      subtitle={
        <span className="truncate">
          {twoWay ? 'Two-way sync' : 'One-way sync'}
        </span>
      }
      action={
        <Button asChild variant="outline" size="sm">
          <Link to={detailPath} state={linkState}>
            View details
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      }
      details={
        <SyncFlowMetrics
          metrics={[
            {
              label: 'Last sync',
              value: timeLabel(job.lastSyncedAt),
              description: 'Most recent sync',
              icon: Clock,
            },
            {
              label: 'Next run',
              value: job.nextRunAt ? timeLabel(job.nextRunAt) : 'Not scheduled',
              description: 'Next scheduled run',
              icon: CalendarClock,
            },
            {
              label: 'Schedule',
              value: scheduleLabel,
              description: 'Current schedule state',
              icon: CalendarClock,
            },
            {
              label: 'Enabled',
              value: job.isEnabled ? 'Yes' : 'No',
              description: 'Job enabled state',
              icon: Power,
            },
          ]}
        />
      }
    />
  );
}

export default function OrganisationProjectDetailPage() {
  const navigate = useNavigate();
  const { organisationId, projectId } = useParams<{
    organisationId: string;
    projectId: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [holdKind, setHoldKind] = useState<'hold' | 'resume' | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const orgId = organisationId ?? '';
  const id = projectId ?? '';
  const projectPath = `/super-admin/organisations/${orgId}/projects/${id}`;
  const tab: ProjectTab =
    searchParams.get('tab') === 'settings'
      ? 'settings'
      : searchParams.get('tab') === 'connections'
        ? 'connections'
        : 'sync-rules';

  const orgQuery = useSuperAdminOrganisationQuery(organisationId);
  const projectQuery = useSuperAdminProjectQuery(orgId, projectId);
  const jobsQuery = useSuperAdminJobsQuery(orgId, id);
  const connectionsQuery = useSuperAdminProjectConnectionsQuery(orgId, id);
  const hold = useHoldSuperAdminProjectMutation(orgId, id);
  const resume = useResumeSuperAdminProjectMutation(orgId, id);

  if (!organisationId || !projectId) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Missing project address"
        description="Open this project from a selected organisation."
      />
    );
  }
  if (projectQuery.isLoading) return <SkeletonList count={5} />;
  if (projectQuery.isError || !projectQuery.data) {
    return (
      <ErrorState
        title="Could not load project"
        description={errorMessage(projectQuery.error)}
        onRetry={() => projectQuery.refetch()}
      />
    );
  }

  const project = projectQuery.data;
  const organisationName = orgQuery.data?.name ?? 'Selected organisation';
  const submitHold = async ({ reason }: { reason: string }) => {
    if (!holdKind) return;
    try {
      if (holdKind === 'hold') {
        const result = await hold.mutateAsync(reason);
        toast.success(`${result.heldJobs} active jobs held.`);
      } else {
        const result = await resume.mutateAsync(reason);
        toast.success(`${result.resumedJobs} held jobs resumed.`);
      }
      setHoldKind(null);
    } catch {
      // The dialog renders the server error and stays open for correction.
    }
  };

  const openHoldDialog = (kind: 'hold' | 'resume') => {
    hold.reset();
    resume.reset();
    setHoldKind(kind);
  };

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        setSearchParams((previous) => {
          const next = new URLSearchParams(previous);
          next.set('tab', value);
          return next;
        });
      }}
      className="gap-0"
    >
      <div className="space-y-4">
        {tab === 'sync-rules' ? (
          <div className="space-y-4">
            <SyncFlowPanel
              hasFlows={(jobsQuery.data?.length ?? 0) > 0}
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  Create Sync Flow
                </Button>
              }
            >
              {jobsQuery.isLoading ? (
                <SkeletonList count={3} />
              ) : jobsQuery.isError ? (
                <ErrorState
                  title="Could not load sync flows"
                  description={errorMessage(jobsQuery.error)}
                  onRetry={() => jobsQuery.refetch()}
                />
              ) : !jobsQuery.data?.length ? (
                <EmptyState
                  icon={ArrowLeftRight}
                  title="No sync flows configured yet"
                  description="This project has no sync flows to inspect."
                />
              ) : (
                jobsQuery.data.map((job) => (
                  <PlatformSyncFlow
                    key={job.id}
                    job={job}
                    detailPath={`${projectPath}/jobs/${job.id}`}
                    backTo={`${projectPath}?tab=sync-rules`}
                  />
                ))
              )}
            </SyncFlowPanel>
          </div>
        ) : tab === 'connections' ? (
          <OrganisationProjectConnections
            organisationId={orgId}
            organisationName={organisationName}
            project={project}
            jobs={jobsQuery.data}
            onContinue={() => setCreateOpen(true)}
          />
        ) : (
          <OrganisationProjectSettings
            organisationId={orgId}
            organisationName={organisationName}
            project={project}
            onHold={() => openHoldDialog('hold')}
            onResume={() => openHoldDialog('resume')}
            operationPending={hold.isPending || resume.isPending}
          />
        )}
      </div>
      {createOpen && (
        <OrganisationCreateJobDialog
          organisationId={orgId}
          project={project}
          connections={connectionsQuery.data ?? []}
          jobs={jobsQuery.data ?? []}
          onClose={() => setCreateOpen(false)}
          onCreated={(jobId) => {
            setCreateOpen(false);
            navigate(`${projectPath}/jobs/${jobId}`, {
              state: {
                jobBackTo: `${projectPath}?tab=sync-rules`,
                jobBackLabel: 'Back to Sync Flows',
              },
            });
          }}
        />
      )}

      <LifecycleConfirmDialog
        open={holdKind !== null}
        onOpenChange={(open) => {
          if (!open) setHoldKind(null);
        }}
        title={
          holdKind === 'hold'
            ? 'Hold active project jobs'
            : 'Resume held project jobs'
        }
        description={`${organisationName} · ${project.name}`}
        bodyWarning={
          holdKind === 'hold'
            ? 'Future scheduled runs for active jobs on this project will stop. Runs already queued or running are not cancelled.'
            : 'Only jobs held by a platform operator will resume. Customer-paused jobs remain paused.'
        }
        actionLabel={holdKind === 'hold' ? 'Hold jobs' : 'Resume jobs'}
        tone="warning"
        organisationName={organisationName}
        requiresNameConfirm={false}
        minReasonLength={10}
        isSubmitting={hold.isPending || resume.isPending}
        errorMessage={
          hold.isError
            ? errorMessage(hold.error)
            : resume.isError
              ? errorMessage(resume.error)
              : null
        }
        onSubmit={submitHold}
      />
    </Tabs>
  );
}
