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
import { ActionTooltip } from '@/features/journey';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
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

export interface JobLifecycle {
  statusKey: string;
  scheduleText: string;
  actionLabel: string;
  actionVariant: 'default' | 'outline' | 'ghost';
  targetUrl: string;
  isActionable: boolean;
}

export function getJobLifecycle(
  job: JobExt,
  detail?: JobDetailData | null,
  projectId?: string,
): JobLifecycle {
  const mappings = detail?.jobFieldMappings ?? job.fieldMappings ?? [];
  const mappingCount = mappings.length;
  const isDraftOrUnmapped = job.status === 'draft' || mappingCount === 0;
  const twoWay = job.syncDirection === 'two_way';
  const defaultSchedule = twoWay ? 'Automatic sync' : formatSchedule(job);

  if (isDraftOrUnmapped) {
    return {
      statusKey: 'needs_mapping',
      scheduleText: 'Setup required',
      actionLabel: 'Configure Mapping',
      actionVariant: 'default',
      targetUrl: `/projects/${projectId}/jobs/${job.id}?tab=field-mapping`,
      isActionable: true,
    };
  }

  if (!job.lastSyncedAt && !job.isEnabled) {
    return {
      statusKey: 'ready_to_test',
      scheduleText: 'Test pending',
      actionLabel: 'Test & Activate',
      actionVariant: 'outline',
      targetUrl: `/projects/${projectId}/jobs/${job.id}`,
      isActionable: true,
    };
  }

  if (job.status === 'error') {
    return {
      statusKey: 'error',
      scheduleText: 'Error detected',
      actionLabel: 'Review Error',
      actionVariant: 'outline',
      targetUrl: `/projects/${projectId}/jobs/${job.id}`,
      isActionable: true,
    };
  }

  if (job.isRunning) {
    return {
      statusKey: 'running',
      scheduleText: defaultSchedule,
      actionLabel: 'View Details',
      actionVariant: 'outline',
      targetUrl: `/projects/${projectId}/jobs/${job.id}`,
      isActionable: false,
    };
  }

  if (!job.isEnabled) {
    return {
      statusKey: 'inactive',
      scheduleText: 'Paused',
      actionLabel: 'View Details',
      actionVariant: 'outline',
      targetUrl: `/projects/${projectId}/jobs/${job.id}`,
      isActionable: false,
    };
  }

  return {
    statusKey: job.status || 'active',
    scheduleText: defaultSchedule,
    actionLabel: 'View Details',
    actionVariant: 'outline',
    targetUrl: `/projects/${projectId}/jobs/${job.id}`,
    isActionable: false,
  };
}

function metricCellClass(index: number): string {
  return cn(
    'flex min-w-0 items-center gap-3 px-4 py-3',
    index % 2 === 1 && 'border-l',
    index >= 2 && 'border-t md:border-t-0',
    index > 0 && 'md:border-l',
  );
}



function SyncJobCard({
  job,
  projectId,
  defaultOpen = false,
}: {
  job: JobExt;
  projectId: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const detailQuery = useJobDetailQuery(projectId, job.id, open);
  const runs = detailQuery.data?.runLogs ?? [];
  const summary = deriveSyncJobSummary(job, runs);
  const hasAnyRun = hasAnySyncRun(job, runs);
  const twoWay = job.syncDirection === 'two_way';
  const DirectionIcon = twoWay ? ArrowLeftRight : ArrowRight;

  const lifecycle = getJobLifecycle(job, detailQuery.data, projectId);
  const isNeedsMapping = lifecycle.statusKey === 'needs_mapping';

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

  let guidanceMessage: React.ReactNode;
  if (isNeedsMapping) {
    guidanceMessage = (
      <>
        Choose which information moves between platforms so it arrives in the
        right place. Select{' '}
        <span className="font-semibold text-foreground">Configure Mapping</span>{' '}
        above to begin.
      </>
    );
  } else if (detailQuery.data?.pipelineRequired && !detailQuery.data.pipelineConfigured) {
    guidanceMessage =
      'Choose where this flow should place data in the destination. Open the flow to finish setup before syncing.';
  } else if (lifecycle.statusKey === 'ready_to_test') {
    guidanceMessage = (
      <>
        Everything is set for a first test. Select{' '}
        <span className="font-semibold text-foreground">
          Test &amp; Activate
        </span>{' '}
        above to check the result.
      </>
    );
  } else {
    guidanceMessage = 'Open this flow to finish setup and run a first test.';
  }

  const handleRowClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a, button')) return;
    setOpen((current) => !current);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card surface="inner" className="gap-0 py-0 transition-colors">
        <div
          className="hover:bg-muted/30 flex cursor-pointer flex-col gap-4 px-4 py-4 transition-colors sm:px-5 lg:flex-row lg:items-center"
          onClick={handleRowClick}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors">
              <DirectionIcon className="size-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <Link
                to={lifecycle.targetUrl}
                state={{
                  jobBackTo: `/projects/${projectId}?tab=sync-rules`,
                  jobBackLabel: 'Back to Sync Jobs',
                }}
                className="hover:text-primary hover:underline block truncate text-sm font-semibold text-foreground transition-colors"
              >
                {job.name}
              </Link>
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
              {lifecycle.scheduleText}
            </span>
            <StatusBadge status={lifecycle.statusKey} size="sm" />
            <Separator
              orientation="vertical"
              className="h-6 data-vertical:self-center"
            />
            <Button
              asChild
              variant={lifecycle.actionVariant}
              size="sm"
              data-flow-next-action={
                lifecycle.isActionable ? 'true' : undefined
              }
              className={cn(
                lifecycle.actionVariant === 'default' &&
                  'font-medium shadow-xs',
                lifecycle.actionVariant === 'outline' &&
                  lifecycle.isActionable &&
                  'font-medium border-primary/30 text-primary hover:bg-primary/5',
                lifecycle.actionVariant === 'outline' &&
                  !lifecycle.isActionable &&
                  'font-medium border-border/80 text-foreground hover:bg-muted/50',
              )}
            >
              <Link
                to={lifecycle.targetUrl}
                state={{
                  jobBackTo: `/projects/${projectId}?tab=sync-rules`,
                  jobBackLabel: 'Back to Sync Jobs',
                }}
              >
                {lifecycle.actionLabel}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                shape="pill"
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
          <div
            className={cn(
              'border-t',
              hasAnyRun
                ? 'bg-muted space-y-2 px-1.5 py-2'
                : 'bg-muted/30 px-4 py-2',
            )}
          >
            {!hasAnyRun ? (
              <p className="text-muted-foreground text-xs leading-normal">
                {guidanceMessage}
              </p>
            ) : detailQuery.isLoading ? (
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
  const { hasRole } = useSynkazoAuth();
  const canManage = hasRole('org_admin');
  const { canAddJob } = useEntitlements();
  const { prompt, dialog: upgradeDialog } = usePlanUpgradePrompt();

  const isBlockedByRole = !canManage;
  const isBlockedByPlan = canManage && !canAddJob;

  const tooltipExplanation = isBlockedByRole
    ? 'Only Organization Admins can create sync flows. Contact your administrator.'
    : isBlockedByPlan
      ? "You've reached your plan's sync flow limit. Upgrade to add more."
      : undefined;

  const startCreateJob = () => {
    if (isBlockedByRole) return;
    if (isBlockedByPlan) {
      prompt(
        "You've reached the number of sync jobs your plan allows. Upgrade to add more.",
      );
      return;
    }
    setShowCreateJob(true);
  };

  const hasIncompleteJobs = jobs.some(
    (job) =>
      job.status === 'draft' ||
      !job.fieldMappings ||
      job.fieldMappings.length === 0,
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
            <CardTitle visualLevel="section">Sync flows</CardTitle>
            <CardDescription visualLevel="section">
              View each data flow and expand a sync flow to review its recent
              performance.
            </CardDescription>
          </div>
          <ActionTooltip
            tooltip={tooltipExplanation}
            disabled={isBlockedByRole || isBlockedByPlan}
          >
            <Button
              variant={hasIncompleteJobs ? 'outline' : 'default'}
              className="shrink-0 self-start sm:self-auto"
              disabled={isBlockedByRole}
              onClick={startCreateJob}
              data-flow-next-action={jobs.length === 0 ? 'true' : undefined}
            >
              {canManage && canAddJob ? <Plus /> : <Lock />}
              Create Sync Flow
            </Button>
          </ActionTooltip>
        </CardHeader>

        <CardContent className={jobs.length > 0 ? 'space-y-3' : undefined}>
          {jobs.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="No sync flows configured yet"
              description="Create your first sync flow to automatically sync data between your connected platforms."
              // action={{
              //   label: 'Create Sync Flow',
              //   onClick: startCreateJob,
              //   disabled: isBlockedByRole,
              //   tooltip: tooltipExplanation,
              //   timeEstimate: 'Takes ~2 mins',
              //   icon: Plus,
              //   dataFlowNextAction: true,
              // }}
              helpLink={{
                label: 'Learn how sync flows work',
                href: 'https://docs.synkazo.com/sync-flows',
              }}
            />
          ) : (
            jobs.map((job) => {
              const isNeedsMapping =
                job.status === 'draft' ||
                !job.fieldMappings ||
                job.fieldMappings.length === 0;
              const shouldDefaultOpen = jobs.length === 1 || isNeedsMapping;
              return (
                <SyncJobCard
                  key={job.id}
                  job={job}
                  projectId={project.id}
                  defaultOpen={shouldDefaultOpen}
                />
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
