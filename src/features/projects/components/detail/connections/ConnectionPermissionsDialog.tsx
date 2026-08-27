import { Check, RefreshCw, ShieldCheck, X } from 'lucide-react';
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
import { useSBAuth } from '@/lib/syncbridgeAuth';
import { showToast } from '@/lib/toast';
import type { ConnectionPermissions } from '@/types';

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
  const { currentUser } = useSBAuth();
  const canManageWebhooks =
    currentUser?.role === 'org_admin' || currentUser?.role === 'super_admin';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ConnectionPermissions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState(false);

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
