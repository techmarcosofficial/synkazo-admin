import { Check, KeyRound, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { connectionsApi } from '@/api/connections';
import { PLATFORM_META } from '@/components/connections/platformMeta';
import type { ExtConnection } from '@/components/connections/types';
import PageContextAlert from '@/components/shared/PageContextAlert';
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import type {
  ConnectionPermissions,
  HubSpotConnectionCapabilities,
} from '@/types';

interface ConnectionPermissionsDialogProps {
  conn: ExtConnection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HUBSPOT_SCOPE_LABELS: Record<string, string> = {
  oauth: 'Connect your HubSpot account',
  'crm.objects.contacts.read': 'Contacts — read',
  'crm.objects.contacts.write': 'Contacts — write',
  'crm.objects.companies.read': 'Companies — read',
  'crm.objects.companies.write': 'Companies — write',
  'crm.objects.deals.read': 'Deals — read',
  'crm.objects.deals.write': 'Deals — write',
  'crm.schemas.contacts.read': 'Contact properties',
  'crm.schemas.companies.read': 'Company properties',
  'crm.schemas.deals.read': 'Deal properties',
  'crm.schemas.custom.read': 'Custom object schemas — read',
  'crm.schemas.custom.write': 'Custom object schemas — write',
  'crm.objects.custom.read': 'Custom objects — read',
  'crm.objects.custom.write': 'Custom objects — write',
  'crm.objects.projects.read': 'HubSpot projects — read',
  'crm.objects.projects.write': 'HubSpot projects — write',
  'crm.objects.owners.read': 'Owners — read',
  'crm.objects.appointments.read': 'Appointments — read',
  'crm.objects.appointments.write': 'Appointments — write',
  'crm.schemas.appointments.read': 'Appointment properties',
  'crm.objects.invoices.read': 'Invoices — read',
  'crm.objects.invoices.write': 'Invoices — write',
  'crm.objects.line_items.read': 'Line items — read',
  'crm.objects.line_items.write': 'Line items — write',
};

export default function ConnectionPermissionsDialog({
  conn,
  open,
  onOpenChange,
}: ConnectionPermissionsDialogProps) {
  const meta = PLATFORM_META[conn.platformId] ?? { label: conn.platformId };
  const { hasRole } = useSynkazoAuth();
  // Rank-based, so a role added above org_admin is included automatically.
  const canManageWebhooks = hasRole('org_admin');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ConnectionPermissions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState(false);
  const [rescoping, setRescoping] = useState(false);
  const isHubSpotOAuth =
    conn.platformId === 'hubspot' && data?.kind === 'hubspot_oauth';

  useEffect(() => {
    if (!open || !conn.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    connectionsApi
      .getConnectionPermissions(conn.projectId, conn.id)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled)
          setError("Couldn't load permissions for this connection.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, conn.id, conn.projectId]);

  const handleResync = async () => {
    setResyncing(true);
    try {
      const subscriptions = await connectionsApi.forceResyncWebhooks(
        conn.projectId,
        conn.id,
      );
      setData((prev) =>
        prev
          ? { ...prev, webhookHealth: { scope: 'connection', subscriptions } }
          : prev,
      );
      showToast.success('Webhook subscriptions re-synced.');
    } catch {
      showToast.error(
        "Couldn't re-sync webhook subscriptions. Please try again.",
      );
    } finally {
      setResyncing(false);
    }
  };

  /**
   * Reconnect / manage HubSpot access — mints a rescope OAuth state via the
   * api and redirects the browser to HubSpot's consent screen. Post-consent,
   * HubSpot returns to the api's callback, which updates the SAME connection
   * row in place (no delete/recreate) and bounces back to the dashboard.
   * Plan §3.1 / api §2.8.
   */
  const handleReconnect = async () => {
    setRescoping(true);
    try {
      const { redirectUrl } = await connectionsApi.startHubSpotRescope(conn.id);
      // Do NOT open in a new tab — the user needs to see the consent screen
      // and return to the same tab, which our callback redirects back to.
      window.location.href = redirectUrl;
    } catch {
      showToast.error(
        "Couldn't start the reconnect flow. Please try again in a moment.",
      );
      setRescoping(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-10rem)] flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="bg-popover shrink-0 border-b px-4 py-4 pr-14 sm:px-6 sm:pr-14">
          <DialogTitle>
            <span className="flex items-center gap-2 text-lg leading-snug">
              <ShieldCheck className="size-5 shrink-0" aria-hidden="true" />
              {isHubSpotOAuth
                ? 'HubSpot permissions & rescoping'
                : `${meta.label} permissions`}
            </span>
          </DialogTitle>
          <DialogDescription>
            {conn.environment === 'sandbox' ? 'Sandbox' : 'Production'}{' '}
            connection
          </DialogDescription>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="bg-secondary absolute top-4 right-4"
                >
                  <X aria-hidden="true" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {loading && (
            <div className="space-y-3" aria-label="Loading permissions">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {!loading && error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && data && (
            <div className="space-y-6">
              {(data.plan || data.planError) && (
                <section className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-heading text-sm font-semibold">
                      Account type
                    </h3>
                    {data.plan ? (
                      <Badge variant="secondary" className="capitalize">
                        {data.plan.toLowerCase()}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {data.planError}
                      </span>
                    )}
                  </div>
                  {data.plan && (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Account type only — HubSpot doesn't expose your
                      subscription tier via API.
                    </p>
                  )}
                </section>
              )}

              {data.scopes && (
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-heading text-sm font-semibold">
                      Currently granted permissions
                    </h3>
                    {data.source === 'live' && (
                      <Badge variant="secondary">Live from HubSpot</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {data.scopes.map((scope) => (
                      <div
                        key={scope}
                        className="bg-muted/50 min-w-0 rounded-xl px-3 py-2.5"
                      >
                        <p className="text-sm leading-snug font-medium">
                          {HUBSPOT_SCOPE_LABELS[scope] ?? scope}
                        </p>
                        {HUBSPOT_SCOPE_LABELS[scope] && (
                          <p className="text-muted-foreground mt-1 font-mono text-xs leading-relaxed break-all">
                            {scope}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {data.scopes.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      No permissions were returned for this connection.
                    </p>
                  )}
                  {data.hubDomain && (
                    <p className="text-muted-foreground text-sm">
                      Portal:{' '}
                      <span className="font-mono text-xs break-all">
                        {data.hubDomain}
                      </span>
                    </p>
                  )}
                </section>
              )}

              {data.verifiedAccess && (
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-heading text-sm font-semibold">
                      Verified access
                    </h3>
                    <Badge variant="outline">Tested just now</Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {data.verifiedAccess.map((entry) => (
                      <div
                        key={entry.object}
                        className="bg-muted/50 flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm"
                      >
                        <span className="font-medium">{entry.label}</span>
                        {entry.read ? (
                          <span className="text-success flex items-center gap-1 whitespace-nowrap">
                            <Check className="size-4" aria-hidden="true" /> Read
                            access
                          </span>
                        ) : (
                          <span className="text-destructive flex items-center gap-1 whitespace-nowrap">
                            <X className="size-4" aria-hidden="true" /> No
                            access
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {data.verifiedAccess.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      No access checks were returned for this connection.
                    </p>
                  )}
                </section>
              )}

              {data.webhookHealth && (
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-heading text-sm font-semibold">
                      Webhook subscriptions
                    </h3>
                    {canManageWebhooks && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={resyncing}
                        onClick={handleResync}
                      >
                        <RefreshCw
                          className={
                            resyncing ? 'size-4 animate-spin' : 'size-4'
                          }
                          aria-hidden="true"
                        />
                        Force re-sync
                      </Button>
                    )}
                  </div>
                  {data.webhookHealth.subscriptions.length === 0 ? (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      No custom-object subscriptions needed yet — registered
                      automatically once a two-way job targets a HubSpot custom
                      object.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.webhookHealth.subscriptions.map((sub) => (
                        <div
                          key={sub.id}
                          className="bg-muted/50 min-w-0 space-y-2 rounded-xl px-3 py-2.5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <span className="min-w-0 font-mono text-xs leading-relaxed break-all">
                              {sub.objectType} · {sub.subscriptionType}
                              {sub.propertyName ? ` (${sub.propertyName})` : ''}
                            </span>
                            <StatusBadge status={sub.status} size="xs" />
                          </div>
                          <div className="text-muted-foreground text-xs leading-relaxed">
                            {sub.registeredAt
                              ? `Registered ${new Date(sub.registeredAt).toLocaleString()}`
                              : 'Not yet registered'}
                            {sub.lastVerifiedAt &&
                              ` · Verified ${new Date(sub.lastVerifiedAt).toLocaleString()}`}
                          </div>
                          {sub.lastError && (
                            <PageContextAlert
                              surface="inner"
                              variant="error"
                              title={sub.lastError}
                              className="px-2 py-1.5 **:data-[slot=alert-title]:text-xs"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {data.note && (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {data.note}
                </p>
              )}

              {!data.scopes && !data.verifiedAccess && (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {meta.label} doesn't expose per-connection permissions via API
                  — showing connection health instead.
                </p>
              )}

              {/*
              Plan §3.3 — surface features that were requested but not granted
              at consent, so the user knows why an object is greyed out in the
              field-mapper and how to unlock it. The Reconnect button below
              runs the same rescope flow to re-request them.
            */}
              {isHubSpotOAuth && data.capabilities && (
                <UngrantedFeaturesHint capabilities={data.capabilities} />
              )}

              {/*
              Plan §3.1 — reconnect / manage permissions. Only shown for
              HubSpot OAuth connections; the same flow works for adding new
              optional scopes AND for revoking ones the user granted before.
            */}
              {isHubSpotOAuth && (
                <section className="space-y-3 border-t pt-5">
                  <h3 className="font-heading text-sm font-semibold">
                    Manage permissions
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto min-h-9 w-full text-center whitespace-normal"
                    disabled={rescoping}
                    onClick={handleReconnect}
                  >
                    <KeyRound
                      className={
                        rescoping ? 'size-3.5 animate-pulse' : 'size-3.5'
                      }
                      aria-hidden="true"
                    />
                    {rescoping
                      ? 'Redirecting to HubSpot…'
                      : 'Review or Add Permissions in HubSpot'}
                  </Button>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    You’ll return to HubSpot to add or remove optional
                    permissions. Synkazo updates this existing connection. Your
                    project, jobs, mappings, and schedules are not deleted.
                  </p>
                </section>
              )}

              <section className="space-y-3 border-t pt-5">
                <h3 className="font-heading text-sm font-semibold">
                  Connection details
                </h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="mt-0.5 capitalize">{data.status}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">Account</dt>
                    <dd className="mt-0.5 font-mono text-xs leading-relaxed break-all">
                      {data.accountName ?? '—'}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">Connected</dt>
                    <dd className="mt-0.5">
                      {data.connectedAt
                        ? new Date(data.connectedAt).toLocaleString()
                        : '—'}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">Last checked</dt>
                    <dd className="mt-0.5">
                      {data.lastCheckedAt
                        ? new Date(data.lastCheckedAt).toLocaleString()
                        : '—'}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Compact summary of HubSpot optional-scope features that were requested but
 * NOT granted at the last consent — surfaced with a "Reconnect to enable"
 * hint so the user knows why a feature is unavailable and how to unlock it.
 * Plan §3.3.
 */
function UngrantedFeaturesHint({
  capabilities,
}: {
  capabilities: HubSpotConnectionCapabilities;
}) {
  const ungranted: string[] = [];
  const { objects, features } = capabilities;
  if (!objects.appointments.read) ungranted.push('Appointments');
  if (!objects.invoices.read) ungranted.push('Invoices');
  if (!objects.line_items.read) ungranted.push('Line items');
  if (!objects.projects.read) ungranted.push('Projects (HubSpot)');
  if (!objects.customObjects.read) ungranted.push('Custom objects');
  if (!features.ownerAssignment) ungranted.push('Owner assignment');

  if (ungranted.length === 0) return null;

  return (
    <section className="space-y-3 rounded-xl border border-dashed p-4">
      <h3 className="font-heading text-sm font-semibold">
        Not granted at consent
      </h3>
      <div className="flex flex-wrap gap-2">
        {ungranted.map((label) => (
          <Badge
            key={label}
            variant="outline"
            className="text-muted-foreground whitespace-normal"
          >
            {label}
          </Badge>
        ))}
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Use “Review or Add Permissions in HubSpot” below to grant these on your
        next reconnect. Custom-object features require HubSpot Enterprise.
      </p>
    </section>
  );
}
