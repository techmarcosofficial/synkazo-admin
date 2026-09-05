import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  ArrowRight,
  CircleCheck,
  CircleX,
  Info,
  LoaderCircle,
  PauseCircle,
  TriangleAlert,
} from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<
  ActivityStatus,
  {
    label: string;
    icon: typeof CircleCheck;
    iconClassName: string;
  }
> = {
  success: {
    label: 'Success',
    icon: CircleCheck,
    iconClassName: 'text-success',
  },
  warning: {
    label: 'Warning',
    icon: TriangleAlert,
    iconClassName: 'text-warning',
  },
  failed: {
    label: 'Failed',
    icon: CircleX,
    iconClassName: 'text-destructive',
  },
  running: {
    label: 'Running',
    icon: LoaderCircle,
    iconClassName: 'text-info',
  },
  stopped: {
    label: 'Stopped',
    icon: PauseCircle,
    iconClassName: 'text-paused',
  },
  info: {
    label: 'Activity',
    icon: Info,
    iconClassName: 'text-info',
  },
};

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
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  const createdAt = log.createdAt ? new Date(log.createdAt) : null;
  const hasValidDate = createdAt && !Number.isNaN(createdAt.getTime());

  const projectName = log.metadata?.projectName;
  const jobName = log.metadata?.jobName;
  const contextName = projectName ?? jobName ?? 'Organization activity';

  const sourceObject = log.metadata?.sourceObject;
  const destObject = log.metadata?.destObject;

  const fullMessage = log.message?.trim();
  const shortMessage = shortenActivityMessage(fullMessage);
  const showMessage = status !== 'success' && !!shortMessage;

  const recordsFailed = log.metadata?.recordsFailed;
  const recordsProcessed = log.recordsProcessed;

  const runHref =
    log.projectId && log.jobId
      ? `/projects/${log.projectId}/jobs/${log.jobId}?tab=run-history`
      : undefined;

  const content = (
    <div
      className={cn(
        'grid w-full min-w-0 items-center gap-x-5 gap-y-3',
        'md:grid-cols-[110px_minmax(220px,1.6fr)_minmax(180px,1.2fr)_140px_90px_28px]',
      )}
    >
      {/* Status */}
      <div className="flex items-center">
        <Badge variant="secondary" className="w-fit gap-1.5 whitespace-nowrap">
          <StatusIcon className={cn('size-3.5', statusConfig.iconClassName)} />
          {statusConfig.label}
        </Badge>
      </div>

      {/* Activity / Context */}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {getActivityTitle(status)}
        </p>

        {/* <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs">
          <span className="text-foreground truncate">{contextName}</span>

          {projectName && jobName && projectName !== jobName && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground truncate">{jobName}</span>
            </>
          )}
        </div> */}

        {showMessage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-muted-foreground mt-1.5 line-clamp-1 max-w-full text-xs">
                {shortMessage}
              </p>
            </TooltipTrigger>

            <TooltipContent className="max-w-sm">{fullMessage}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Integration / Mapping */}
      <div className="min-w-0 space-y-1.5">
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
            <ArrowRight className="size-3 shrink-0" />
            <span className="truncate">{titleCase(destObject)}</span>
          </div>
        )}
      </div>

      {/* Records */}
      <div className="flex flex-wrap items-center gap-1.5">
        {typeof recordsProcessed === 'number' && (
          <span className="text-xs font-medium">
            {recordsProcessed.toLocaleString()}
            <span className="text-muted-foreground ml-1 font-normal">
              synced
            </span>
          </span>
        )}

        {typeof recordsFailed === 'number' && recordsFailed > 0 && (
          <Badge variant="destructive" className="h-5 px-1.5 text-[11px]">
            {recordsFailed.toLocaleString()} failed
          </Badge>
        )}
      </div>

      {/* Time */}
      <div className="md:text-right">
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
      </div>

      {/* Action */}
      <div className="hidden justify-end md:flex">
        {runHref && (
          <ArrowRight className="text-muted-foreground group-hover:text-foreground size-4 transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
    </div>
  );

  if (runHref) {
    return (
      <ListRow
        asChild
        className={cn(
          'group items-center',
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

  return <ListRow className="items-center">{content}</ListRow>;
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
            {groupedLogs.map(({ group, logs: groupedActivity }, groupIndex) => (
              <div key={group}>
                {groupIndex > 0 && <Separator />}
                {/* <p className="text-muted-foreground text-xs font-medium">
                  {group}
                </p> */}
                <div>
                  {groupedActivity.map((log, index) => (
                    <ActivityRow
                      key={log.id ?? `${group}-${index}`}
                      log={log}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
