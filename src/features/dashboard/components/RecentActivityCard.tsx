import { formatDistanceToNow } from 'date-fns';
import { Activity, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { ActivityFilter, OrgSyncLog } from '../types';
import {
  getActivityGroup,
  getActivityStatus,
  getActivityTitle,
  shortenActivityMessage,
} from '../utils';
import type { ActivityGroup, ActivityStatus } from '../utils';

import { PlatformPair } from '@/components/platform';
import ListRow from '@/components/shared/list/ListRow';
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const ACTIVITY_FILTERS: Array<{ value: ActivityFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'success', label: 'Success' },
  { value: 'warn', label: 'Warnings' },
  { value: 'error', label: 'Failed' },
];

const ACTIVITY_GROUPS: ActivityGroup[] = [
  'Today',
  'Yesterday',
  'Earlier this week',
  'Earlier',
];

export interface RecentActivityCardProps {
  logs: OrgSyncLog[];
  filter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
  isLoading?: boolean;
}

function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function getBadgeStatus(log: OrgSyncLog, status: ActivityStatus): string {
  if (log.metadata?.status) return log.metadata.status;
  if (status === 'warning') return 'partial';
  if (status === 'stopped') return 'paused';
  if (status === 'info') return 'pending';
  return status;
}

function getTriggerLabel(triggeredBy?: string): string | null {
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

function formatDuration(durationMs?: number | null): string | null {
  if (!durationMs) return null;
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function getUsefulActivityDetail(
  message: string | undefined,
  status: ActivityStatus,
): string | null {
  if (!message || !['failed', 'stopped'].includes(status)) return null;
  const marker = status === 'failed' ? /failed:\s*/i : /stopped early:\s*/i;
  const detail = message.split(marker)[1]?.trim();
  return detail ? shortenActivityMessage(detail, 72) : null;
}

function ActivityLoadingState() {
  return (
    <div className="space-y-3" aria-label="Loading recent activity">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-start gap-3 py-3">
          <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-56 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityRow({ log }: { log: OrgSyncLog }) {
  const status = getActivityStatus(log);
  const badgeStatus = getBadgeStatus(log, status);

  const createdAt = log.createdAt ? new Date(log.createdAt) : null;
  const hasValidDate = createdAt && !Number.isNaN(createdAt.getTime());

  const projectName = log.metadata?.projectName;
  const jobName = log.metadata?.jobName;
  const contextName = projectName ?? jobName ?? 'Organization activity';
  const triggerLabel = getTriggerLabel(log.metadata?.triggeredBy);

  const sourceObject = log.metadata?.sourceObject;
  const destObject = log.metadata?.destObject;

  const fullMessage = log.message?.trim();
  const usefulDetail = getUsefulActivityDetail(fullMessage, status);

  const recordsFailed = log.metadata?.recordsFailed;
  const recordsProcessed = log.recordsProcessed;
  const duration = formatDuration(log.durationMs);

  const runHref =
    log.projectId && log.jobId
      ? `/projects/${log.projectId}/jobs/${log.jobId}?tab=run-history`
      : undefined;

  const content = (
    <div
      className={cn(
        'grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2',
        'xl:grid-cols-[110px_minmax(220px,1.45fr)_minmax(190px,1.1fr)_130px_110px_24px] xl:gap-x-5',
      )}
    >
      <div className="flex items-center self-start xl:self-center">
        <StatusBadge status={badgeStatus} size="sm" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold" title={contextName}>
          {contextName}
        </p>
        <div className="text-muted-foreground mt-1 flex min-w-0 items-center gap-1.5 text-xs">
          {projectName && jobName && projectName !== jobName && (
            <span className="truncate">{jobName}</span>
          )}
          {projectName &&
            jobName &&
            projectName !== jobName &&
            triggerLabel && <span aria-hidden="true">·</span>}
          {triggerLabel && <span className="shrink-0">{triggerLabel}</span>}
        </div>
        {usefulDetail && (
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-destructive mt-1 line-clamp-1 max-w-full text-xs">
                {usefulDetail}
              </p>
            </TooltipTrigger>

            <TooltipContent className="max-w-sm">{fullMessage}</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="col-start-2 min-w-0 space-y-1.5 xl:col-auto">
        {log.metadata?.sourcePlatformId && log.metadata?.destPlatformId && (
          <PlatformPair
            sourcePlatformId={log.metadata.sourcePlatformId}
            destPlatformId={log.metadata.destPlatformId}
            variant="icon-text"
            size="sm"
          />
        )}

        {sourceObject && destObject && (
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span className="truncate">{titleCase(sourceObject)}</span>
            <ArrowRight className="size-4 shrink-0" />
            <span className="truncate">{titleCase(destObject)}</span>
          </div>
        )}
      </div>

      <div className="col-start-2 flex flex-wrap items-center gap-2 xl:col-auto xl:block">
        {typeof recordsProcessed === 'number' && (
          <p className="text-sm font-semibold">
            {recordsProcessed.toLocaleString()}
            <span className="text-muted-foreground ml-1 font-normal">
              synced
            </span>
          </p>
        )}

        {typeof recordsFailed === 'number' && recordsFailed > 0 && (
          <Badge
            variant="secondary"
            className="text-destructive mt-1 h-5 px-1.5 text-[11px]"
          >
            {recordsFailed.toLocaleString()} failed
          </Badge>
        )}
      </div>

      <div className="col-start-2 flex items-center gap-3 xl:col-auto xl:block xl:text-right">
        {hasValidDate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <time
                className="text-muted-foreground text-xs whitespace-nowrap"
                dateTime={createdAt.toISOString()}
              >
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </time>
            </TooltipTrigger>

            <TooltipContent>{createdAt.toLocaleString()}</TooltipContent>
          </Tooltip>
        )}
        {duration && (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs whitespace-nowrap xl:mt-1">
            <Clock className="size-3" /> {duration}
          </span>
        )}
      </div>

      <div className="col-start-3 row-start-1 flex justify-end xl:col-auto xl:row-auto">
        {runHref && (
          <ArrowRight className="text-muted-foreground group-hover:text-foreground size-5 transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
    </div>
  );

  if (runHref) {
    return (
      <ListRow
        asChild
        className={cn(
          'group items-center px-4 py-3 sm:px-5',
          'hover:bg-muted/40 transition-colors',
        )}
      >
        <Link
          to={runHref}
          state={{
            jobBackTo: '/dashboard',
            jobBackLabel: 'Back to Dashboard',
          }}
          aria-label={`${getActivityTitle(status)} for ${contextName}. View run history.`}
        >
          {content}
        </Link>
      </ListRow>
    );
  }

  return (
    <ListRow className="items-center px-4 py-3 sm:px-5">{content}</ListRow>
  );
}

export default function RecentActivityCard({
  logs,
  filter,
  onFilterChange,
  isLoading = false,
}: RecentActivityCardProps) {
  const recentLogs = logs.slice(0, 7);
  const groupedLogs = ACTIVITY_GROUPS.map((group) => ({
    group,
    logs: recentLogs.filter((log) => getActivityGroup(log.createdAt) === group),
  })).filter(({ logs: groupedActivity }) => groupedActivity.length > 0);
  const orderedLogs = groupedLogs.flatMap(
    ({ logs: groupedActivity }) => groupedActivity,
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="text-xl font-semibold">
            Recent Activity
          </CardTitle>
          <CardDescription>Latest sync runs and system events</CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filter}
            onValueChange={(value) => onFilterChange(value as ActivityFilter)}
          >
            <SelectTrigger
              size="sm"
              aria-label="Filter recent activity"
              className="bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {ACTIVITY_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button asChild variant="secondary" size="sm">
            <Link to="/logs">
              View all <ArrowRight />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <ActivityLoadingState />
        ) : groupedLogs.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Activity />
              </EmptyMedia>
              <EmptyTitle>No activity found</EmptyTitle>
              <EmptyDescription>
                No recent events match this filter.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-4xl border">
            <div className="bg-muted text-muted-foreground hidden grid-cols-[110px_minmax(220px,1.45fr)_minmax(190px,1.1fr)_130px_110px_24px] items-center gap-x-5 px-5 py-2 text-xs font-medium xl:grid">
              <span>Status</span>
              <span>Project and run</span>
              <span>Data flow</span>
              <span>Result</span>
              <span className="text-right">Time</span>
              <span className="sr-only">Open</span>
            </div>
            {orderedLogs.map((log, index) => (
              <ActivityRow key={log.id ?? `activity-${index}`} log={log} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
