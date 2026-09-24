import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  Lock,
  Plus,
  Timer,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { useProjectDetailContext } from '../context';

import EmptyState from '@/components/shared/EmptyState';
import { usePlanUpgradePrompt } from '@/components/shared/PlanGate';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateJobDialog } from '@/features/jobs/components/create';
import { useJobDetailQuery, type JobDetailData } from '@/features/jobs/hooks';
import SetupJourneyCard, {
  type SetupJourneyStep,
} from '@/features/onboarding/components/SetupJourneyCard';
import { selectJobOnboardingState } from '@/features/onboarding';
import type { JobExt } from '@/features/projects/hooks';
import {
  deriveSyncJobSummary,
  formatDurationMs,
  formatEntityLabel,
  hasAnySyncRun,
} from '@/features/projects/lib/syncJobSummary';
import { formatNum, formatSchedule } from '@/features/projects/utils';
import { cn } from '@/lib/utils';
import { useEntitlements } from '@/queries/useEntitlements';

function formatLastSync(value: string | null): string {
  if (!value) return 'Never';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';

  return formatDistanceToNow(date, { addSuffix: true }).replace('about ', '');
}

function formatSuccessRate(value: number | null): string {
  if (value == null) return '—';
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function jobStatus(job: JobExt): string {
  if (job.isRunning) return 'running';
  if (!job.isEnabled) return 'inactive';
  return job.status || 'active';
}

function metricCellClass(index: number): string {
  return cn(
    'flex min-w-0 items-center gap-3 px-4 py-3',
    index % 2 === 1 && 'border-l',
    index >= 2 && 'border-t md:border-t-0',
    index > 0 && 'md:border-l',
  );
}

function CollapsibleJobSetup({
  detail,
  projectId,
}: {
  detail: JobDetailData;
  projectId: string;
}) {
  const navigate = useNavigate();
  const { job } = detail;
  const state = selectJobOnboardingState({
    mappings: detail.jobFieldMappings,
    pipelineRequired: detail.pipelineRequired,
    pipelineConfigured: detail.pipelineConfigured,
    runLogs: detail.runLogs,
    lastSyncedAt: job.lastSyncedAt,
  });
  const stepStatus = (
    complete: boolean,
    stage: typeof state.stage,
  ): SetupJourneyStep['status'] =>
    complete ? 'complete' : state.stage === stage ? 'current' : 'upcoming';
  const steps: SetupJourneyStep[] = [
    {
      title: 'Mapping',
      description: 'Match source fields to destination fields.',
      status: stepStatus(state.mappingReady, 'field_mapping'),
    },
    {
      title: 'Configure',
      description: detail.pipelineRequired
        ? 'Finish the required pipeline setup.'
        : 'Required sync settings are ready.',
      status: stepStatus(state.configurationReady, 'configure'),
    },
    {
      title: 'Test & Review',
      description: 'Run once and review the result.',
      status: stepStatus(state.testComplete, 'test'),
    },
    {
      title: 'Automate (optional)',
      description: 'Add a schedule when you are ready.',
      status: 'upcoming',
      optional: true,
    },
  ];
  const targetTab =
    state.stage === 'field_mapping'
      ? 'field-mapping'
      : state.stage === 'configure'
        ? 'pipeline'
        : 'schedule';
  const content =
    state.stage === 'field_mapping'
      ? {
          title: 'Map this sync job',
          description:
            'Choose how records and fields should match before running the job.',
        }
      : state.stage === 'configure'
        ? {
            title: 'Finish the required configuration',
            description:
              'Complete the destination settings this job needs before testing.',
          }
        : {
            title: 'Test and review this sync job',
            description:
              'The required setup is ready. Run the job once and review the result.',
          };

  return (
    <SetupJourneyCard
      eyebrow="Job setup"
      title={content.title}
      description={content.description}
      steps={steps}
      onContinue={() =>
        navigate(`/projects/${projectId}/jobs/${job.id}?tab=${targetTab}`, {
          state: {
            jobBackTo: `/projects/${projectId}?tab=sync-rules`,
            jobBackLabel: 'Back to Sync Jobs',
          },
        })
      }
    />
  );
}

function SyncJobCard({ job, projectId }: { job: JobExt; projectId: string }) {
  const [open, setOpen] = useState(false);
  const detailQuery = useJobDetailQuery(projectId, job.id, open);
  const runs = detailQuery.data?.runLogs ?? [];
  const summary = deriveSyncJobSummary(job, runs);
  const hasAnyRun = hasAnySyncRun(job, runs);
  const twoWay = job.syncDirection === 'two_way';
  const DirectionIcon = twoWay ? ArrowLeftRight : ArrowRight;
  const schedule = twoWay ? 'Automatic sync' : formatSchedule(job);

  const metrics = [
    {
      label: 'Records synced',
      value: formatNum(job.recordsSynced),
      description: 'Total records synced',
      icon: Database,
    },
    {
      label: 'Avg duration',
      value: formatDurationMs(summary.averageDurationMs),
      description: 'Average time per recent run',
      icon: Timer,
    },
    {
      label: 'Last sync',
      value: formatLastSync(summary.lastSyncAt),
      description: 'Most recent run',
      icon: CalendarClock,
    },
    {
      label: 'Success rate',
      value: formatSuccessRate(summary.successRate),
      description: 'Successful recent runs',
      icon: CheckCircle2,
    },
  ];

  const handleRowClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a, button')) return;
    setOpen((current) => !current);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="gap-0 rounded-4xl border py-0">
        <div
          className="hover:bg-muted/30 flex cursor-pointer flex-col gap-4 px-4 py-4 transition-colors sm:px-5 lg:flex-row lg:items-center"
          onClick={handleRowClick}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
              <DirectionIcon className="size-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{job.name}</div>
              <p className="text-muted-foreground mt-1 flex items-center gap-1 truncate text-xs">
                <span className="truncate">
                  {formatEntityLabel(job.sourceObject)}
                </span>
                <DirectionIcon className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {formatEntityLabel(job.destObject)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:justify-end lg:flex-nowrap">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs whitespace-nowrap">
              <Clock className="size-3.5" aria-hidden="true" />
              {schedule}
            </span>
            <StatusBadge status={jobStatus(job)} size="sm" />
            <Separator
              orientation="vertical"
              className="h-6 data-vertical:self-center"
            />
            <Button asChild variant="ghost" size="sm">
              <Link
                to={`/projects/${projectId}/jobs/${job.id}`}
                state={{
                  jobBackTo: `/projects/${projectId}?tab=sync-rules`,
                  jobBackLabel: 'Back to Sync Jobs',
                }}
              >
                View
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={
                  open ? `Collapse ${job.name}` : `Expand ${job.name}`
                }
              >
                <ChevronDown
                  className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <div className="bg-muted space-y-3 border-t py-2 px-1.5">
            {detailQuery.isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className={metricCellClass(index)}>
                    <Skeleton className="size-10 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : detailQuery.isError || !detailQuery.data ? (
              <p className="text-muted-foreground px-4 text-sm" role="status">
                Job setup details are temporarily unavailable.
              </p>
            ) : !hasAnyRun ? (
              <CollapsibleJobSetup
                detail={detailQuery.data}
                projectId={projectId}
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4">
                {metrics.map((metric, index) => (
                  <div key={metric.label} className={metricCellClass(index)}>
                    <span className="bg-card text-card-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                      <metric.icon className="size-4.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-lg font-bold tracking-tight">
                        {metric.value}
                      </div>
                      <div className="text-muted-foreground truncate text-xs font-medium">
                        {metric.label}
                      </div>
                      <div className="text-muted-foreground truncate text-[11px]">
                        {metric.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function SyncRulesTab() {
  const navigate = useNavigate();
  const { project, jobs, showCreateJob, setShowCreateJob, refetch } =
    useProjectDetailContext();
  // Explain the sync-job allowance up front rather than after a 403 from the create call.
  const { canAddJob } = useEntitlements();
  const { prompt, dialog: upgradeDialog } = usePlanUpgradePrompt();
  const startCreateJob = () =>
    canAddJob
      ? setShowCreateJob(true)
      : prompt(
          "You've reached the number of sync jobs your plan allows. Upgrade to add more.",
        );

  return (
    <div className="space-y-6">
      {upgradeDialog}
      {showCreateJob && (
        <CreateJobDialog
          projectId={project.id}
          open={showCreateJob}
          onClose={() => setShowCreateJob(false)}
          onCreated={() => {
            setShowCreateJob(false);
            refetch();
            navigate(`/projects/${project.id}?tab=sync-rules`);
          }}
        />
      )}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle>Sync jobs</CardTitle>
            <CardDescription>
              View each data flow and expand a job to review its recent
              performance.
            </CardDescription>
          </div>
          <Button
            className="shrink-0 self-start sm:self-auto"
            onClick={startCreateJob}
          >
            {canAddJob ? <Plus /> : <Lock />}
            Create Sync Job
          </Button>
        </CardHeader>

        <CardContent className={jobs.length > 0 ? 'space-y-3' : undefined}>
          {jobs.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="No sync jobs yet"
              description="Create your first sync job to start syncing data between platforms."
            />
          ) : (
            jobs.map((job) => (
              <SyncJobCard key={job.id} job={job} projectId={project.id} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
