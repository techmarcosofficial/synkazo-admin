import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarClock,
  Clock,
  FolderOpen,
  Layers3,
  Link2,
  Pause,
  Play,
  Power,
  Settings2,
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

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import ProjectSettingsNavigation from '@/features/projects/components/detail/ProjectSettingsNavigation';
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
import type {
  SuperAdminJobListItem,
  SuperAdminProjectConnection,
} from '@/types/superAdmin';

type ProjectTab = 'sync-rules' | 'settings';

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

function ConnectionsSummary({
  connections,
}: {
  connections: SuperAdminProjectConnection[];
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="px-4 py-3">
        <CardTitle>Connection status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4">
        {connections.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No connections are configured for this project. Connection setup may
            need action from the customer.
          </p>
        ) : (
          connections.map((connection) => (
            <div
              key={connection.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {connection.accountName ?? connection.platformId}
                </p>
                <p className="text-muted-foreground text-xs">
                  {connection.platformId} · {connection.environment}
                </p>
              </div>
              <Badge variant="outline">{connection.status}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
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
    searchParams.get('tab') === 'settings' ? 'settings' : 'sync-rules';

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
              action={<Button onClick={() => setCreateOpen(true)}>Create Sync Flow</Button>}
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
            {connectionsQuery.isLoading ? (
              <SkeletonList count={2} />
            ) : connectionsQuery.isError ? (
              <ErrorState
                title="Could not load connection status"
                description={errorMessage(connectionsQuery.error)}
                onRetry={() => connectionsQuery.refetch()}
              />
            ) : (
              <ConnectionsSummary connections={connectionsQuery.data ?? []} />
            )}
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
            <ProjectSettingsNavigation
              activeId="general"
              items={[
                { id: 'general', label: 'General', icon: Settings2 },
                { id: 'associations', label: 'Associations', icon: Link2 },
                { id: 'environments', label: 'Environments', icon: Layers3 },
              ]}
              onSelect={(section) => {
                if (section === 'associations')
                  navigate(`${projectPath}/associations`);
                if (section === 'environments')
                  navigate(`${projectPath}/migration`);
              }}
              renderLink={(item, children) => (
                <Link
                  to={
                    item.id === 'associations'
                      ? `${projectPath}/associations`
                      : item.id === 'environments'
                        ? `${projectPath}/migration`
                        : `${projectPath}?tab=settings`
                  }
                  aria-current={item.id === 'general' ? 'page' : undefined}
                >
                  {children}
                </Link>
              )}
            />
            <div className="space-y-4">
              <Card className="gap-0 py-0">
                <CardHeader className="px-4 py-3">
                  <CardTitle>Project information</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: 'Project status', value: project.status },
                      {
                        label: 'Sync mode',
                        value:
                          project.syncMode === 'two_way'
                            ? 'Two-way'
                            : 'One-way',
                      },
                      {
                        label: 'Scheduler mode',
                        value: project.schedulerMode || 'Not configured',
                      },
                      {
                        label: 'Active environment',
                        value: project.activeEnvironment || 'Not activated',
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="bg-muted/40 rounded-2xl border p-3"
                      >
                        <dt className="text-muted-foreground text-xs font-medium">
                          {item.label}
                        </dt>
                        <dd className="mt-1 text-sm font-semibold capitalize">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
              <Card className="gap-0 py-0">
                <CardHeader className="px-4 py-3">
                  <CardTitle>Support operations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  <p className="text-muted-foreground text-sm">
                    Hold active jobs on this project or resume jobs held by a
                    platform operator. Jobs paused by the customer are not
                    resumed.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openHoldDialog('hold')}
                      disabled={hold.isPending || resume.isPending}
                    >
                      <Pause /> Hold active jobs
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => openHoldDialog('resume')}
                      disabled={hold.isPending || resume.isPending}
                    >
                      <Play /> Resume held jobs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
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
