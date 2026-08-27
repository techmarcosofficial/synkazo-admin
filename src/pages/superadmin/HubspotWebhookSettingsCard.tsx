import { AlertTriangle, CheckCircle2, Save, Webhook } from 'lucide-react';
import { useEffect, useState } from 'react';

import ErrorState from '@/components/shared/ErrorState';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { showToast } from '@/lib/toast';
import {
  useHubspotWebhookSettingsQuery,
  useUpdateHubspotWebhookSettingsMutation,
} from '@/queries/useHubspotWebhookSettings';

// Super-admin "HubSpot Webhook Target" — HubSpot's webhooks-v3 API has no
// per-portal target URL, so this single value is shared by every portal the
// app is installed in. When it drifts from this deployment's own webhook
// receiver URL, HubSpot's events go nowhere this environment can see, and
// nothing else in the product surfaces that failure.
export default function HubspotWebhookSettingsCard() {
  const query = useHubspotWebhookSettingsQuery();
  const updateMutation = useUpdateHubspotWebhookSettingsMutation();

  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (query.data) setDraft(query.data.targetUrl ?? query.data.expectedUrl);
  }, [query.data]);

  const save = async (targetUrl: string) => {
    try {
      await updateMutation.mutateAsync(targetUrl);
      showToast.success('Webhook target URL registered with HubSpot.');
    } catch {
      showToast.error(
        'Failed to update the webhook target URL. Please try again.',
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold">
          <Webhook className="size-4" />
          HubSpot Webhook Target
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Where HubSpot delivers webhook events for this app — app-wide, shared
          by every portal with it installed. If it doesn't match this
          deployment's own URL, HubSpot's events never reach it.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? (
          <SkeletonList count={2} />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : (
          query.data && (
            <div className="space-y-4">
              <div className="bg-card space-y-3 rounded-4xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground text-sm">
                    Currently registered with HubSpot
                  </span>
                  {query.data.matches ? (
                    <Badge className="bg-success/10 text-success gap-1.5">
                      <CheckCircle2 className="size-3" />
                      Matches this deployment
                    </Badge>
                  ) : (
                    <Badge className="bg-warning/10 text-warning gap-1.5">
                      <AlertTriangle className="size-3" />
                      Mismatch
                    </Badge>
                  )}
                </div>
                <p className="font-mono text-sm break-all">
                  {query.data.targetUrl ?? '— not registered —'}
                </p>
                <div className="border-border/60 space-y-1 border-t pt-3">
                  <span className="text-muted-foreground text-sm">
                    Expected for this deployment
                  </span>
                  <p className="text-muted-foreground font-mono text-sm break-all">
                    {query.data.expectedUrl}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="font-mono"
                  placeholder="https://api.example.com/api/webhooks/hubspot"
                  aria-label="HubSpot webhook target URL"
                />
                <Button
                  onClick={() => save(draft)}
                  disabled={
                    updateMutation.isPending ||
                    !draft ||
                    draft === query.data.targetUrl
                  }
                >
                  {updateMutation.isPending ? <Spinner /> : <Save />}
                  Save
                </Button>
              </div>
              {!query.data.matches && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => save(query.data!.expectedUrl)}
                  disabled={updateMutation.isPending}
                >
                  Use expected URL
                </Button>
              )}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
