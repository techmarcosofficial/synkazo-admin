import {
  ArrowUpRight,
  Bell,
  Building2,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  Clock3,
  History,
  Info,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Link } from 'react-router-dom';
import HeadingPair from '@/components/shared/HeadingPair';
import { headingTitleStyles } from '@/components/shared/headingStyles';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlatformOverviewResponse } from '@/types/superAdmin';

type Alert = PlatformOverviewResponse['recentAlerts'][number];
// Successful administrative changes are activity even if the audit producer
// recorded a warning. Destructive and unrecognised warnings remain reviewable.
export function requiresAttention(alert: Alert) {
  if (alert.severity === 'critical') return true;
  if (alert.severity === 'info') return false;
  return !/(?:plan_assigned|plan\.assigned|metadata_updated_by_super_admin|note_created|created_by_super_admin|updated_by_super_admin|job_added|job_cross_object_property_created)$/.test(
    alert.action,
  );
}

function EventRow({ event }: { event: Alert }) {
  const actionable = requiresAttention(event);
  const Icon = actionable
    ? event.severity === 'critical'
      ? ShieldAlert
      : TriangleAlert
    : Info;
  const createdAt = new Date(event.createdAt);
  const validDate = Number.isFinite(createdAt.getTime());
  const organisation =
    event.organisationName ??
    (event.organisationId ? 'Organisation unavailable' : 'Platform');
  return (
    <li>
      <Link
        className="group/event hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-3 rounded-2xl px-1 py-2.5 outline-none focus-visible:ring-2"
        to={
          event.organisationId && event.organisationName
            ? `/super-admin/organisations/${event.organisationId}/activity`
            : '/super-admin/audit-log'
        }
      >
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-2xl ${event.severity === 'critical' ? 'bg-destructive/10 text-destructive' : actionable ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`line-clamp-2 min-w-0 capitalize ${headingTitleStyles.item}`}
            >
              {event.summary.replace(/_/g, ' ')}
            </span>
            <StatusBadge status={event.severity} label={event.severity} size="xs" className="capitalize" />
          </div>
          <div className="text-muted-foreground mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span
              className="inline-flex max-w-full min-w-0 items-center gap-1"
              title={organisation}
            >
              <Building2 className="size-3 shrink-0" />
              <span className="truncate">{organisation}</span>
            </span>
            {validDate && (
              <time
                className="shrink-0"
                dateTime={event.createdAt}
                title={createdAt.toLocaleString()}
              >
                · {formatDistanceToNowStrict(createdAt, { addSuffix: true })}
              </time>
            )}
          </div>
        </div>
        <span className="text-muted-foreground group-hover/event:text-foreground inline-flex shrink-0 items-center gap-1 text-xs font-medium">
          <span className="hidden sm:inline">
            {actionable ? 'Review' : 'View'}
          </span>
          <ArrowUpRight className="size-3.5" />
        </span>
      </Link>
    </li>
  );
}

export default function OverviewAttention({
  data,
  loading,
  error,
}: {
  data?: PlatformOverviewResponse;
  loading: boolean;
  error?: string;
}) {
  const events = data?.recentAlerts ?? [];
  const attention = events.filter(requiresAttention);
  const activity = events.filter((event) => !requiresAttention(event));
  const updatedAt = data ? new Date(data.generatedAt) : null;
  return (
    <Card
      surface="outer"
      size="sm"
      className="h-full min-w-0"
      role="region"
      aria-labelledby="overview-attention-title"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-2xl">
              <Bell className="size-4" />
            </span>
            <HeadingPair
              title="Needs attention"
              titleId="overview-attention-title"
              visualLevel="card"
              subtitle="Latest platform events for review."
              trailing={
                !loading && !error && data && attention.length > 0 ? (
                  <Badge
                    size="xs"
                    variant="secondary"
                    className="hidden sm:inline-flex"
                  >
                    {attention.length} recent
                  </Badge>
                ) : undefined
              }
            />
          </div>
          <Button asChild size="sm" variant="ghost" className="shrink-0">
            <Link to="/super-admin/audit-log">
              Audit log
              <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 flex-1">
        {loading ? (
          <div
            role="status"
            aria-label="Loading Needs attention"
            className="space-y-4 py-2"
          >
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="flex min-h-28 items-center gap-3 py-3">
            <CircleAlert className="text-destructive size-5 shrink-0" />
            <div className="min-w-0">
              <p className={headingTitleStyles.item}>
                Alerts could not be loaded
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-4">
                {error}
              </p>
            </div>
          </div>
        ) : !data ? (
          <div className="text-muted-foreground flex min-h-28 items-center justify-center gap-2 text-sm">
            <Info className="size-4" />
            Recent events unavailable.
          </div>
        ) : (
          <>
            {attention.length ? (
              <ul
                className="divide-border/60 divide-y"
                aria-label="Recent alerts"
              >
                {attention.slice(0, 4).map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </ul>
            ) : (
              <div className="flex min-h-32 flex-col items-center justify-center gap-2 py-4 text-center">
                <span className="bg-success/10 text-success flex size-10 items-center justify-center rounded-full">
                  <CheckCheck className="size-5" />
                </span>
                <p className={headingTitleStyles.item}>
                  No recent alerts to review
                </p>
                <p className="text-muted-foreground max-w-xs text-xs leading-4">
                  {activity.length
                    ? 'Administrative changes are listed separately below.'
                    : 'Warning and critical events will appear here.'}
                </p>
              </div>
            )}
            {activity.length > 0 && (
              <details className="group/activity border-border/70 mt-2 border-t">
                <summary className="hover:text-foreground text-muted-foreground focus-visible:ring-ring flex cursor-pointer list-none items-center gap-2 rounded-2xl py-3 text-xs outline-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
                  <History className="size-3.5 shrink-0" />
                  <span className="text-foreground font-medium">
                    Administrative activity
                  </span>
                  <Badge size="xs" variant="secondary">
                    {activity.length}
                  </Badge>
                  <ChevronDown className="ml-auto size-3.5 transition-transform group-open/activity:rotate-180" />
                </summary>
                <ul
                  className="divide-border/60 max-h-64 divide-y overflow-y-auto"
                  aria-label="Administrative activity events"
                >
                  {activity.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </CardContent>
      {!loading && !error && data && (
        <CardFooter className="text-muted-foreground justify-between gap-2 border-t text-xs">
          <span>
            {attention.length > 4
              ? `Showing 4 of ${attention.length} recent alerts`
              : 'Latest recorded events'}
          </span>
          {updatedAt && Number.isFinite(updatedAt.getTime()) && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <Clock3 className="size-3" />
              <time
                dateTime={data.generatedAt}
                title={updatedAt.toLocaleString()}
              >
                Updated{' '}
                {updatedAt.toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </time>
            </span>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
