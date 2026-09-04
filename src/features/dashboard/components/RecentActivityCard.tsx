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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const STATUS_CONFIG: Record<
  ActivityStatus,
  {
    label: string;
    icon: typeof CircleCheck;
    badgeVariant: 'outline' | 'destructive';
    className?: string;
  }
> = {
  success: {
    label: 'Success',
    icon: CircleCheck,
    badgeVariant: 'outline',
    className: 'text-success',
  },
  warning: {
    label: 'Warning',
    icon: TriangleAlert,
    badgeVariant: 'outline',
    className: 'text-warning',
  },
  failed: {
    label: 'Failed',
    icon: CircleX,
    badgeVariant: 'destructive',
  },
  running: {
    label: 'Running',
    icon: LoaderCircle,
    badgeVariant: 'outline',
    className: 'text-info',
  },
  stopped: {
    label: 'Stopped',
    icon: PauseCircle,
    badgeVariant: 'outline',
    className: 'text-muted-foreground',
  },
  info: {
    label: 'Activity',
    icon: Info,
    badgeVariant: 'outline',
    className: 'text-info',
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
  const runHref =
    log.projectId && log.jobId
      ? `/projects/${log.projectId}/jobs/${log.jobId}?tab=run-history`
      : undefined;

  const rowContent = (
    <>
      <Badge
        variant={statusConfig.badgeVariant}
        className={statusConfig.className}
      >
        <StatusIcon />
        {statusConfig.label}
      </Badge>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium">{getActivityTitle(status)}</p>
          {hasValidDate && (
            <time
              className="text-muted-foreground shrink-0 text-xs"
              dateTime={createdAt.toISOString()}
            >
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </time>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-muted-foreground text-sm">
            <span className="text-foreground">{contextName}</span>
            {projectName && jobName && projectName !== jobName
              ? ` · ${jobName}`
              : ''}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {log.metadata?.sourcePlatformId && log.metadata?.destPlatformId && (
              <PlatformPair
                sourcePlatformId={log.metadata.sourcePlatformId}
                destPlatformId={log.metadata.destPlatformId}
                variant="badge"
                size="sm"
              />
            )}
            {sourceObject && destObject && (
              <Badge variant="outline">
                {titleCase(sourceObject)} → {titleCase(destObject)}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {typeof log.recordsProcessed === 'number' && (
            <Badge variant="secondary">
              {log.recordsProcessed.toLocaleString()} synced
            </Badge>
          )}
          {typeof log.metadata?.recordsFailed === 'number' &&
            log.metadata.recordsFailed > 0 && (
              <Badge variant="destructive">
                {log.metadata.recordsFailed.toLocaleString()} failed
              </Badge>
            )}
        </div>

        {showMessage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-muted-foreground w-fit max-w-full text-sm">
                {shortMessage}
              </p>
            </TooltipTrigger>
            <TooltipContent>{fullMessage}</TooltipContent>
          </Tooltip>
        )}

        {runHref && (
          <span className="text-primary inline-flex items-center gap-1 text-xs font-medium">
            View run <ArrowRight className="size-3" />
          </span>
        )}
      </div>
    </>
  );

  if (runHref) {
    return (
      <ListRow asChild className="items-start">
        <Link
          to={runHref}
          aria-label={`${getActivityTitle(status)} for ${contextName}. View run history.`}
        >
          {rowContent}
        </Link>
      </ListRow>
    );
  }

  return <ListRow className="items-start">{rowContent}</ListRow>;
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
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(value) => {
              if (value) onFilterChange(value as ActivityFilter);
            }}
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Filter recent activity"
          >
            {ACTIVITY_FILTERS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                aria-label={`Show ${option.label.toLowerCase()} activity`}
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Button asChild variant="ghost" size="sm">
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
          <div className="border rounded-4xl overflow-hidden">
            {groupedLogs.map(({ group, logs: groupedActivity }, groupIndex) => (
              <div key={group} className="space-y-2">
                {groupIndex > 0 && <Separator />}
                <p className="text-muted-foreground text-xs font-medium">
                  {group}
                </p>
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
