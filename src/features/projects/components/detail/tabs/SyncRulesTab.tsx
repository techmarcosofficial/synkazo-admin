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
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { useProjectDetailContext } from '../context';

import { projectsApi } from '@/api/projects';
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
import type { JobExt } from '@/features/projects/hooks';
import {
  deriveSyncJobSummary,
  formatDurationMs,
  formatEntityLabel,
} from '@/features/projects/lib/syncJobSummary';
import { formatNum, formatSchedule } from '@/features/projects/utils';
import { useHeaderPrimaryAction } from '@/hooks/useHeaderPrimaryAction';
import { cn } from '@/lib/utils';
import { useEntitlements } from '@/queries/useEntitlements';
import { useRunLogsQuery } from '@/queries/useJobs';
import type { ProjectStatus } from '@/types';

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

function SyncJobCard({ job, projectId }: { job: JobExt; projectId: string }) {
  const [open, setOpen] = useState(false);
  const runLogsQuery = useRunLogsQuery(projectId, job.id, 1, 100, open);
  const runs = runLogsQuery.data?.data ?? [];
  const summary = deriveSyncJobSummary(job, runs);
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
              <Link to={`/projects/${projectId}/jobs/${job.id}`}>
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
          <div className="bg-muted space-y-3 border-t px-3 py-4 sm:px-4">
            {runLogsQuery.isError && (
              <p className="text-muted-foreground px-4 text-sm" role="status">
                Recent performance data is temporarily unavailable.
              </p>
            )}

            {runLogsQuery.isLoading ? (
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
  const {
    project,
    jobs,
    showCreateJob,
    setShowCreateJob,
    patchProject,
    refetch,
  } = useProjectDetailContext();
  // Explain the sync-job allowance up front rather than after a 403 from the create call.
  const { canAddJob } = useEntitlements();
  const { prompt, dialog: upgradeDialog } = usePlanUpgradePrompt();
  const startCreateJob = () =>
    canAddJob
      ? setShowCreateJob(true)
      : prompt(
          "You've reached the number of sync jobs your plan allows. Upgrade to add more.",
        );

  useHeaderPrimaryAction({
    label: 'New Sync Job',
    icon: canAddJob ? Plus : Lock,
    onClick: startCreateJob,
  });

  const handleActivateProject = async () => {
    try {
      await projectsApi.updateProject(project.id, {
        status: 'active' as ProjectStatus,
      });
      patchProject({ status: 'active' as ProjectStatus });
      toast.success('Project activated!');
    } catch {
      toast.error('Could not activate project — check connections first.');
    }
  };

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
            toast.success('Job created successfully', {
              description: 'Activate your project to start syncing data.',
              action:
                project.status !== 'active'
                  ? {
                      label: 'Activate project',
                      onClick: handleActivateProject,
                    }
                  : undefined,
            });
          }}
        />
      )}

      {jobs.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No sync jobs yet"
          description="Create your first sync job to start syncing data between platforms."
          action={{
            label: 'Create Sync Job',
            icon: canAddJob ? Plus : Lock,
            onClick: startCreateJob,
          }}
        />
      ) : (
        <Card>
          <CardHeader className="gap-0 space-y-1">
            <CardTitle>Sync jobs</CardTitle>
            <CardDescription>
              View each data flow and expand a job to review its recent
              performance.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {jobs.map((job) => (
              <SyncJobCard key={job.id} job={job} projectId={project.id} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
