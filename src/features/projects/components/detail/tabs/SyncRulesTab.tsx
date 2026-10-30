import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Database,
  Lock,
  Plus,
  Timer,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { useProjectDetailContext } from '../context';
import SyncFlowCard from '../SyncFlowCard';
import SyncFlowMetrics, { syncFlowMetricCellClass } from '../SyncFlowMetrics';
import SyncFlowPanel from '../SyncFlowPanel';

import EmptyState from '@/components/shared/EmptyState';
import { usePlanUpgradePrompt } from '@/components/shared/PlanGate';
import { Button } from '@/components/ui/button';
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
  const backTo = '/projects/' + projectId + '?tab=sync-rules';
  const linkState = { jobBackTo: backTo, jobBackLabel: 'Back to Sync Jobs' };

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
        <span className="text-foreground font-semibold">Configure Mapping</span>{' '}
        above to begin.
      </>
    );
  } else if (
    detailQuery.data?.pipelineRequired &&
    !detailQuery.data.pipelineConfigured
  ) {
    guidanceMessage =
      'Choose where this flow should place data in the destination. Open the flow to finish setup before syncing.';
  } else if (lifecycle.statusKey === 'ready_to_test') {
    guidanceMessage = (
      <>
        Everything is set for a first test. Select{' '}
        <span className="text-foreground font-semibold">
          Test &amp; Activate
        </span>{' '}
        above to check the result.
      </>
    );
  } else {
    guidanceMessage = 'Open this flow to finish setup and run a first test.';
  }

  const details = !hasAnyRun ? (
    <p className="text-muted-foreground text-xs leading-normal">
      {guidanceMessage}
    </p>
  ) : detailQuery.isLoading ? (
    <div className="grid grid-cols-2 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={syncFlowMetricCellClass(index)}>
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
    <SyncFlowMetrics metrics={metrics} />
  );

  return (
    <SyncFlowCard
      name={job.name}
      twoWay={twoWay}
      scheduleText={lifecycle.scheduleText}
      status={lifecycle.statusKey}
      open={open}
      onOpenChange={setOpen}
      hasMetrics={hasAnyRun}
      titleLink={
        <Link
          to={lifecycle.targetUrl}
          state={linkState}
          className="hover:text-primary text-foreground block truncate text-sm font-semibold transition-colors hover:underline"
        >
          {job.name}
        </Link>
      }
      subtitle={
        <>
          <span className="truncate">
            {formatEntityLabel(job.sourceObject)}
          </span>
          <DirectionIcon className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{formatEntityLabel(job.destObject)}</span>
        </>
      }
      action={
        <Button
          asChild
          variant={lifecycle.actionVariant}
          size="sm"
          data-flow-next-action={lifecycle.isActionable ? 'true' : undefined}
          className={cn(
            lifecycle.actionVariant === 'default' && 'font-medium shadow-xs',
            lifecycle.actionVariant === 'outline' &&
              lifecycle.isActionable &&
              'border-primary/30 text-primary hover:bg-primary/5 font-medium',
            lifecycle.actionVariant === 'outline' &&
              !lifecycle.isActionable &&
              'border-border/80 text-foreground hover:bg-muted/50 font-medium',
          )}
        >
          <Link to={lifecycle.targetUrl} state={linkState}>
            {lifecycle.actionLabel}
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      }
      details={details}
    />
  );
}

export default function SyncRulesTab() {
  const navigate = useNavigate();
  const { project, jobs, showCreateJob, setShowCreateJob, refetch } =
    useProjectDetailContext();
  const { hasPermission } = useSynkazoAuth();
  const canCreateJob = hasPermission('job.create');
  const { canAddJob } = useEntitlements();
  const { prompt, dialog: upgradeDialog } = usePlanUpgradePrompt();

  const isBlockedByPermission = !canCreateJob;
  const isBlockedByPlan = canCreateJob && !canAddJob;

  const tooltipExplanation = isBlockedByPermission
    ? "You don't have permission to create sync flows. Contact your administrator."
    : isBlockedByPlan
      ? "You've reached your plan's sync flow limit. Upgrade to add more."
      : undefined;

  const startCreateJob = () => {
    if (isBlockedByPermission) return;
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
      {showCreateJob && canCreateJob && canAddJob && (
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

      <SyncFlowPanel
        hasFlows={jobs.length > 0}
        action={
          <ActionTooltip
            tooltip={tooltipExplanation}
            disabled={isBlockedByPermission || isBlockedByPlan}
          >
            <Button
              variant={hasIncompleteJobs ? 'outline' : 'default'}
              className="shrink-0 self-start sm:self-auto"
              disabled={isBlockedByPermission}
              onClick={startCreateJob}
              data-flow-next-action={jobs.length === 0 ? 'true' : undefined}
            >
              {canCreateJob && canAddJob ? <Plus /> : <Lock />}
              Create Sync Flow
            </Button>
          </ActionTooltip>
        }
      >
        {jobs.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No sync flows configured yet"
            description="Create your first sync flow to automatically sync data between your connected platforms."
            // action={{
            //   label: 'Create Sync Flow',
            //   onClick: startCreateJob,
            //   disabled: isBlockedByPermission,
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
      </SyncFlowPanel>
    </div>
  );
}
