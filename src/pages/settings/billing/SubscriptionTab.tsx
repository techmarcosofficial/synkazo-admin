import { Loader2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { showToast } from '@/lib/toast';
import {
  useSubscriptionQuery,
  usePlansQuery,
  useCancelScheduledChangeMutation,
  useCancelSubscriptionMutation,
  useReactivateMutation,
} from '@/queries/useBilling';

function formatDate(iso: string | null): string {
  if (!iso) return 'your next billing date';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function SubscriptionTab() {
  const { data: sub, isLoading } = useSubscriptionQuery();
  const { data: plans } = usePlansQuery();
  const cancelScheduledChange = useCancelScheduledChangeMutation();
  const cancel = useCancelSubscriptionMutation();
  const reactivate = useReactivateMutation();

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!sub) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active subscription</CardTitle>
          <CardDescription>Choose a plan to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href={`${import.meta.env.VITE_MARKETING_URL}/pricing`}>
              View plans
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const pendingPlanName = plans?.find((p) => p.id === sub.pendingPlanId)?.name;

  const pendingCancel =
    sub.cancelAtPeriodEnd || sub.status === 'pending_cancel';

  const doCancelScheduledChange = async () => {
    try {
      await cancelScheduledChange.mutateAsync();
      showToast.success('Scheduled plan change cancelled.');
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    }
  };

  const doCancel = async () => {
    try {
      await cancel.mutateAsync(undefined);
      showToast.success('Your subscription will end at the period end.');
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    }
  };

  const doReactivate = async () => {
    try {
      await reactivate.mutateAsync();
      showToast.success('Subscription reactivated.');
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage subscription</CardTitle>
          <CardDescription>
            Change your plan, cancel, or reactivate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingCancel ? (
            <div className="border-warning/30 bg-warning/10 flex items-center justify-between rounded-lg border p-4">
              <p className="text-warning text-sm">
                Your subscription is scheduled to cancel at the period end.
              </p>
              <Button onClick={doReactivate} disabled={reactivate.isPending}>
                {reactivate.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Reactivate
              </Button>
            </div>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Cancel subscription</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You’ll keep full access until the end of your current
                    billing period, then your account moves to the free tier.
                    You can reactivate any time before then.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                  <AlertDialogAction onClick={doCancel}>
                    Cancel subscription
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

      {/* Unspent credit, e.g. from switching annual → monthly mid-term. Read live from Stripe,
          and drawn down automatically by future invoices. */}
      {sub.creditBalance > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Account credit</CardTitle>
            <CardDescription>
              You have{' '}
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(sub.creditBalance / 100)}{' '}
              of unused credit. It’s applied automatically to your next invoices
              before your card is charged.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {sub.pendingPriceId ? (
        <Card>
          <CardHeader>
            <CardTitle>Scheduled plan change</CardTitle>
            <CardDescription>
              Switching to {pendingPlanName ?? 'your new plan'} on{' '}
              {formatDate(sub.pendingPlanChangeAt)}. Your card on file will be
              used — no charge is due today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={doCancelScheduledChange}
              disabled={cancelScheduledChange.isPending}
            >
              {cancelScheduledChange.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Cancel scheduled change
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Change plan</CardTitle>
            <CardDescription>
              Upgrades charge the prorated difference immediately; downgrades
              take effect at your next billing date. Every change goes through
              checkout confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href={`${import.meta.env.VITE_MARKETING_URL}/pricing`}>
                Upgrade plan
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
