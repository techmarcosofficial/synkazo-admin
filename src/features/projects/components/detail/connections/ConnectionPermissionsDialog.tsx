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
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function ConnectionPermissionsDialog({
  conn,
  open,
  onOpenChange,
}: ConnectionPermissionsDialogProps) {
  const meta = PLATFORM_META[conn.platformId] ?? { label: conn.platformId };
  const { currentUser } = useSynkazoAuth();
  const canManageWebhooks =
    currentUser?.role === 'org_admin' || currentUser?.role === 'super_admin';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ConnectionPermissions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState(false);
  const [rescoping, setRescoping] = useState(false);
  const isHubSpotOAuth = conn.platformId === 'hubspot' && data?.kind === 'hubspot_oauth';

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
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            {meta.label} Permissions
          </DialogTitle>
          <DialogDescription>
            {conn.environment === 'sandbox' ? 'Sandbox' : 'Production'}{' '}
            connection
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {!loading && error && (
          <p className="text-destructive text-sm">{error}</p>
        )}

        {!loading && !error && data && (
          <div className="space-y-4">
            {(data.plan || data.planError) && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium">
                    Account Type
                  </span>
                  {data.plan ? (
                    <Badge variant="secondary" className="text-xs capitalize">
                      {data.plan.toLowerCase()}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      {data.planError}
                    </span>
                  )}
                </div>
                {data.plan && (
                  <p className="text-muted-foreground text-xs">
                    Account type only — HubSpot doesn't expose your subscription
                    tier via API.
                  </p>
                )}
              </div>
            )}

            {data.scopes && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium">
                    Granted scopes
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    Live from HubSpot
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.scopes.map((scope) => (
                    <Badge
                      key={scope}
                      variant="secondary"
                      className="font-mono text-xs"
                    >
                      {scope}
                    </Badge>
                  ))}
                </div>
                {data.hubDomain && (
                  <p className="text-muted-foreground text-xs">
                    Portal: <span className="font-mono">{data.hubDomain}</span>
                  </p>
                )}
              </div>
            )}

            {data.verifiedAccess && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium">
                    Verified access
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Tested just now
                  </Badge>
                </div>
                <div className="space-y-1">
                  {data.verifiedAccess.map((entry) => (
                    <div
                      key={entry.object}
                      className="flex items-center justify-between text-xs"
                    >
                      <span>{entry.label}</span>
                      {entry.read ? (
                        <span className="text-success flex items-center gap-1">
                          <Check className="size-3" /> Read access
                        </span>
                      ) : (
                        <span className="text-destructive flex items-center gap-1">
                          <X className="size-3" /> No access
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.webhookHealth && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium">
                    Webhook subscriptions
                  </span>
                  {canManageWebhooks && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 gap-1.5 px-2 text-xs"
                      disabled={resyncing}
                      onClick={handleResync}
                    >
                      <RefreshCw
                        className={resyncing ? 'size-3 animate-spin' : 'size-3'}
                      />
                      Force re-sync
                    </Button>
                  )}
                </div>
                {data.webhookHealth.subscriptions.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No custom-object subscriptions needed yet — registered
                    automatically once a two-way job targets a HubSpot custom
                    object.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.webhookHealth.subscriptions.map((sub) => (
                      <div
                        key={sub.id}
                        className="space-y-1 rounded-lg border px-2.5 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-mono text-xs">
                            {sub.objectType} · {sub.subscriptionType}
                            {sub.propertyName ? ` (${sub.propertyName})` : ''}
                          </span>
                          <StatusBadge status={sub.status} size="xs" />
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {sub.registeredAt
                            ? `Registered ${new Date(sub.registeredAt).toLocaleString()}`
                            : 'Not yet registered'}
                          {sub.lastVerifiedAt &&
                            ` · Verified ${new Date(sub.lastVerifiedAt).toLocaleString()}`}
                        </div>
                        {sub.lastError && (
                          <PageContextAlert
                            variant="error"
                            title={sub.lastError}
                            className="px-2 py-1.5 **:data-[slot=alert-title]:text-xs"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {data.note && (
              <p className="text-muted-foreground text-xs">{data.note}</p>
            )}

            {!data.scopes && !data.verifiedAccess && (
              <p className="text-muted-foreground text-xs">
                {meta.label} doesn't expose per-connection permissions via API —
                showing connection health instead.
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
              <div className="border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  disabled={rescoping}
                  onClick={handleReconnect}
                >
                  <KeyRound
                    className={rescoping ? 'size-3.5 animate-pulse' : 'size-3.5'}
                  />
                  {rescoping
                    ? 'Redirecting to HubSpot…'
                    : 'Manage HubSpot access'}
                </Button>
                <p className="text-muted-foreground mt-2 text-xs">
                  Opens HubSpot's consent screen so you can add or remove
                  optional permissions. Your existing connection stays in place.
                </p>
              </div>
            )}

            <div className="space-y-1.5 border-t pt-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="capitalize">{data.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Account</span>
                <span className="font-mono">{data.accountName ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Connected</span>
                <span>
                  {data.connectedAt
                    ? new Date(data.connectedAt).toLocaleString()
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last checked</span>
                <span>
                  {data.lastCheckedAt
                    ? new Date(data.lastCheckedAt).toLocaleString()
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        )}
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
    <div className="rounded-lg border border-dashed px-3 py-2.5">
      <div className="text-muted-foreground mb-1 text-xs font-medium">
        Not granted at consent
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ungranted.map((label) => (
          <Badge
            key={label}
            variant="outline"
            className="text-muted-foreground text-xs"
          >
            {label}
          </Badge>
        ))}
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        Use "Manage HubSpot access" below to grant these on your next
        reconnect. Custom-object features require HubSpot Enterprise.
      </p>
    </div>
  );
}
