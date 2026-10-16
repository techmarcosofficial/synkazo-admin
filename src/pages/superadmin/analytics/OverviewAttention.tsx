import {
  ArrowRight,
  Bell,
  ChevronRight,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PlatformOverviewResponse } from '@/types/superAdmin';
import { AnalyticsSection } from './AnalyticsSection';

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
  const Icon = actionable ? ShieldAlert : Info;
  return (
    <li className="border-border/70 border-t first:border-t-0">
      <Link
        className="hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-2.5 rounded-2xl py-2.5 outline-none focus-visible:ring-2"
        to={
          event.organisationId && event.organisationName
            ? `/super-admin/organisations/${event.organisationId}/activity`
            : '/super-admin/audit-log'
        }
      >
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-2xl ${event.severity === 'critical' ? 'bg-destructive/10 text-destructive' : actionable ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-medium capitalize">
            {event.summary}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            <span>
              {event.organisationName ??
                (event.organisationId
                  ? 'Organisation unavailable'
                  : 'Platform')}
            </span>
            {' · '}
            <time dateTime={event.createdAt}>
              {new Date(event.createdAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </time>
          </p>
        </div>
        <Badge
          size="xs"
          variant={event.severity === 'critical' ? 'destructive' : 'secondary'}
          className={
            event.severity === 'warning' ? 'bg-warning/10 text-warning' : ''
          }
        >
          {event.severity}
        </Badge>
        <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
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
  const attention = events.filter(requiresAttention),
    activity = events.filter((event) => !requiresAttention(event));
  return (
    <AnalyticsSection
      title="Needs attention"
      icon={Bell}
      description="Recent events that may need review or action."
      loading={loading}
      error={error}
      action={
        <Button asChild size="sm" variant="outline">
          <Link to="/super-admin/audit-log">
            View audit log
            <ArrowRight />
          </Link>
        </Button>
      }
    >
      {data ? (
        attention.length ? (
          <ul>
            {attention.slice(0, 4).map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground flex min-h-24 items-center text-sm">
            No warning or critical issues in recent events.
          </p>
        )
      ) : (
        <p className="text-muted-foreground py-6 text-sm">
          Recent events unavailable.
        </p>
      )}
      {activity.length > 0 && (
        <details className="border-border/70 mt-2 border-t pt-2 text-xs">
          <summary className="text-muted-foreground cursor-pointer">
            Administrative activity · {activity.length}
          </summary>
          <ul className="mt-1">
            {activity.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        </details>
      )}
      <p className="text-muted-foreground mt-2 text-xs">
        Latest recorded events; this is not an unresolved issue count.
      </p>
    </AnalyticsSection>
  );
}
