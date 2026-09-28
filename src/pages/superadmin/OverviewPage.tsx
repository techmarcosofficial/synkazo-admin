import {
  AlertTriangle,
  Building2,
  Clock,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useSuperAdminPlatformOverviewQuery } from '@/queries/useSuperAdmin';
import type { PlatformOverviewResponse } from '@/types';

// Phase 3 platform overview. Every card links to the destination screen
// that filters or drills into the same underlying record set — nothing
// here is a dead summary (SA-301). The whole page renders off one
// aggregate call so we never fan out per-organisation (SA-303).

function useRelative(iso: string | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function MetricCard({
  label,
  value,
  to,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  to: string;
  icon: React.ElementType;
  tone?: 'default' | 'warning' | 'danger';
}) {
  const toneClasses =
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-900 hover:border-red-300'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300'
        : 'bg-card hover:border-primary';

  return (
    <Link
      to={to}
      className={`rounded-lg border p-4 transition-colors ${toneClasses}`}
    >
      <div className="flex items-center gap-3">
        <Icon className="size-5 shrink-0" aria-hidden />
        <div className="flex-1">
          <div className="text-2xl font-semibold">{value}</div>
          <div className="text-xs">{label}</div>
        </div>
        <ExternalLink className="size-3.5 opacity-50" aria-hidden />
      </div>
    </Link>
  );
}

function BreakdownList({
  title,
  rows,
  linkFor,
}: {
  title: string;
  rows: Array<{ label: string; value: number; key: string }>;
  linkFor: (key: string) => string;
}) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="mb-3 text-sm font-medium">{title}</div>
      <ul className="divide-y">
        {rows.map((row) => (
          <li key={row.key}>
            <Link
              to={linkFor(row.key)}
              className="hover:bg-accent flex items-center justify-between py-2 text-sm"
            >
              <span className="capitalize">
                {row.label.replace(/_/g, ' ')}
              </span>
              <span className="font-mono">{row.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecentAlerts({
  alerts,
}: {
  alerts: PlatformOverviewResponse['recentAlerts'];
}) {
  if (alerts.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-4">
        <div className="mb-2 text-sm font-medium">Recent alerts</div>
        <p className="text-muted-foreground text-sm">
          No warning or critical events in the last window. All quiet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border">
      <div className="border-b px-4 py-3 text-sm font-medium">
        Recent alerts
      </div>
      <ul className="divide-y">
        {alerts.map((alert) => {
          const to = alert.organisationId
            ? `/super-admin/organisations/${alert.organisationId}/activity`
            : '/super-admin/audit-log';
          const isCritical = alert.severity === 'critical';
          return (
            <li key={alert.id}>
              <Link
                to={to}
                className="hover:bg-accent flex items-start gap-3 px-4 py-3 text-sm"
              >
                <ShieldAlert
                  className={`mt-0.5 size-4 shrink-0 ${
                    isCritical ? 'text-red-600' : 'text-amber-600'
                  }`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    <span className="font-medium">{alert.summary}</span>
                    {alert.userEmail ? (
                      <span className="text-muted-foreground">
                        {' '}
                        · by {alert.userEmail}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-muted-foreground truncate text-xs">
                    {alert.action}
                    {' · '}
                    {new Date(alert.createdAt).toLocaleString()}
                  </div>
                </div>
                <ExternalLink className="mt-0.5 size-3.5 shrink-0 opacity-50" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// GAP-043 / SA-302 — compact inline banner for a section-level error.
// The whole overview still renders even if one aggregate query fails on
// the API side; this banner appears just above the widget whose section
// returned an error so an operator can see the failure without missing
// the working data.
function SectionErrorBanner({ label, error }: { label: string; error: string }) {
  return (
    <div className="border-amber-300 bg-amber-50 text-amber-900 flex items-start gap-2 rounded-md border px-3 py-2 text-xs">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{label}</div>
        <div className="truncate">{error}</div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const query = useSuperAdminPlatformOverviewQuery();

  if (query.isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Could not load the platform overview</AlertTitle>
        <AlertDescription className="mt-2 flex items-center gap-2">
          <span>
            {(query.error as Error)?.message ??
              'The aggregate endpoint returned an error.'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const data = query.data!;
  // GAP-043 — per-widget errors surfaced by the API's Promise.allSettled
  // path. Absent when every section loaded cleanly.
  const errors = data.errors;
  const relative = useRelative(data.generatedAt);
  const subscriptionRows = Object.entries(data.organisations.bySubscriptionStatus)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({ key, label: key, value }));
  const queueRows = [
    { key: 'waiting', label: 'Waiting', value: data.jobs.queue.waiting },
    { key: 'active', label: 'Active', value: data.jobs.queue.active },
    { key: 'failed', label: 'Failed', value: data.jobs.queue.failed },
    { key: 'delayed', label: 'Delayed', value: data.jobs.queue.delayed },
    { key: 'completed', label: 'Completed', value: data.jobs.queue.completed },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Platform overview</h1>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Clock className="size-3.5" aria-hidden />
            <span>Updated {relative}</span>
            {query.isFetching ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : null}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw className="size-4" aria-hidden />
          Refresh
        </Button>
      </div>

      {errors?.organisations ? (
        <SectionErrorBanner
          label="Organisation counts unavailable"
          error={errors.organisations}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Organisations"
          value={data.organisations.total}
          to="/super-admin/organisations"
          icon={Building2}
        />
        <MetricCard
          label="Suspended"
          value={data.organisations.suspendedCount}
          to="/super-admin/organisations?status=suspended"
          icon={ShieldAlert}
          tone={data.organisations.suspendedCount > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          label="Past-due billing"
          value={data.organisations.pastDueCount}
          to="/super-admin/organisations?subscriptionStatus=past_due"
          icon={CreditCard}
          tone={data.organisations.pastDueCount > 0 ? 'danger' : 'default'}
        />
        <MetricCard
          label={
            data.jobs.queue.workerOnline
              ? 'Worker online'
              : 'Worker OFFLINE'
          }
          value={data.jobs.queue.active + data.jobs.queue.waiting}
          to="/admin/queues"
          icon={Loader2}
          tone={data.jobs.queue.workerOnline ? 'default' : 'danger'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          {errors?.subscriptions ? (
            <SectionErrorBanner
              label="Subscriptions counts unavailable"
              error={errors.subscriptions}
            />
          ) : null}
          <BreakdownList
            title="Subscriptions by status"
            rows={subscriptionRows}
            linkFor={(key) =>
              `/super-admin/organisations?subscriptionStatus=${encodeURIComponent(
                key,
              )}`
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          {errors?.queue ? (
            <SectionErrorBanner
              label="Queue snapshot unavailable"
              error={errors.queue}
            />
          ) : null}
          <BreakdownList
            title="Queue by state"
            rows={queueRows}
            linkFor={() => '/admin/queues'}
          />
        </div>
      </div>

      {errors?.recentAlerts ? (
        <SectionErrorBanner
          label="Recent alerts unavailable"
          error={errors.recentAlerts}
        />
      ) : null}
      <RecentAlerts alerts={data.recentAlerts} />
    </div>
  );
}
