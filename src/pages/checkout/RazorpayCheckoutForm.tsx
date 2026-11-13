import { Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { billingApi } from '@/api/billing';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { openRazorpayCheckout } from '@/lib/razorpay';
import { showToast } from '@/lib/toast';
import {
  useRefreshPlanMutation,
  useUpgradeMutation,
} from '@/queries/useBilling';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/queries/queryKeys';
import type { ApiPlan, ApiPrice } from '@/types';

type ErrorResponse = {
  response?: { status?: number; data?: { message?: string; code?: string } };
};

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);

/**
 * New subscription via Razorpay Checkout. The card is entered in Razorpay's own modal (it never
 * touches our servers); the server creates the subscription first and verifies the signed result.
 */
export function RazorpayCheckoutForm({
  plan,
  price,
  onSuccess,
  couponCode,
  onCouponRejected,
}: {
  plan: ApiPlan;
  price: ApiPrice;
  onSuccess: () => void | Promise<void>;
  couponCode?: string;
  onCouponRejected?: () => void;
}) {
  const refreshPlan = useRefreshPlanMutation();
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const pay = async () => {
    setSubmitting(true);
    try {
      const session = await billingApi.razorpayCheckout({
        priceId: price.id,
        couponCode,
      });
      const response = await openRazorpayCheckout(
        {
          key: session.keyId,
          subscription_id: session.subscriptionId,
          name: 'Synkazo',
          description: session.description,
          prefill: { name: session.name, email: session.email },
        },
        (message) => showToast.error(message),
      );
      if (!response) return; // Modal closed — nothing charged; the button stays usable.
      await billingApi.razorpayVerify(response);
      const confirmed = await refreshPlan.mutateAsync();
      if (
        confirmed.paymentHoldActive ||
        confirmed.planId !== plan.id ||
        !['active', 'trialing'].includes(confirmed.subscriptionStatus)
      ) {
        showToast.error(
          'Payment confirmation is still pending. Paid access will become available after your payment is confirmed.',
        );
        return;
      }
      setSucceeded(true);
      setTimeout(() => void onSuccess(), 1400);
    } catch (err) {
      const response = (err as ErrorResponse).response;
      if (response?.status === 401) {
        showToast.error(
          'Your session expired. Please sign in again to complete checkout.',
        );
      } else if (response?.data?.code === 'COUPON_INVALID') {
        onCouponRejected?.();
        showToast.error(
          response.data.message ??
            'That promo code is no longer valid. Please review your total.',
        );
      } else if (response?.data?.message) {
        showToast.error(response.data.message);
      } else if (err instanceof Error && !response) {
        showToast.error(err.message);
      } else {
        showToast.error(getUserFriendlyError(err as never));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (succeeded) {
    return (
      <div className="space-y-2 py-12 text-center">
        <p className="text-lg font-semibold">
          Subscription purchased successfully.
        </p>
        <p className="text-muted-foreground text-sm">
          Redirecting to dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="border-border bg-muted/40 flex items-start gap-3 rounded-2xl border p-4">
        <ShieldCheck className="text-primary mt-0.5 size-5 shrink-0" />
        <div className="space-y-1 text-sm">
          <p className="font-medium">Pay securely with your card</p>
          <p className="text-muted-foreground">
            A secure Razorpay window opens to collect your card and set up the
            recurring payment for {plan.name}. Your card details never touch our
            servers.
          </p>
        </div>
      </div>
      <Button
        type="button"
        className="w-full"
        size="lg"
        disabled={submitting}
        onClick={pay}
      >
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Subscribe to {plan.name}
      </Button>
      <p className="text-muted-foreground text-center text-xs">
        Payments are processed by Razorpay. You can cancel any time from
        Billing.
      </p>
    </div>
  );
}

/**
 * Plan change for a Razorpay subscription: scheduled for the end of the current cycle, nothing
 * charged now (Razorpay has no equivalent of our immediate prorated switch).
 */
export function RazorpayChangePlanForm({
  price,
  onSuccess,
}: {
  price: ApiPrice;
  onSuccess: () => void | Promise<void>;
}) {
  const upgrade = useUpgradeMutation();
  const preview = useQuery({
    queryKey: [...queryKeys.billing.upgradePreview(price.id), 'razorpay'],
    queryFn: () => billingApi.previewRazorpayPlanChange({ priceId: price.id }),
    staleTime: 0,
  });
  const [done, setDone] = useState(false);

  if (preview.isLoading) return <Skeleton className="h-40" />;
  if (preview.isError || !preview.data)
    return (
      <p className="text-destructive text-sm">
        We couldn’t load this plan change. Refresh the page and try again.
      </p>
    );
  const p = preview.data;
  const date = p.effectiveAt
    ? new Date(p.effectiveAt).toLocaleDateString(undefined, {
        dateStyle: 'long',
      })
    : 'the end of your current billing period';

  if (done)
    return (
      <div className="space-y-2 py-12 text-center">
        <p className="text-lg font-semibold">Plan change scheduled.</p>
        <p className="text-muted-foreground text-sm">
          You’ll move to {p.newPlanName} on {date}.
        </p>
      </div>
    );

  return (
    <div className="space-y-5">
      <dl className="border-border divide-border divide-y rounded-2xl border text-sm">
        {(
          [
            ['Current plan', p.currentPlanName],
            ['New plan', p.newPlanName],
            ['Takes effect', date],
            [
              'New price',
              `${money(p.newAmount, p.currency)} / ${p.billingInterval}`,
            ],
            ['Due today', money(0, p.currency)],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 p-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground text-sm">
        You keep your current plan until {date}. From then on, your card is
        charged the new price each billing period.
      </p>
      <Button
        type="button"
        className="w-full"
        size="lg"
        disabled={upgrade.isPending}
        onClick={() =>
          upgrade.mutate(
            { priceId: price.id },
            {
              onSuccess: () => {
                setDone(true);
                setTimeout(() => void onSuccess(), 1400);
              },
              onError: (err) =>
                showToast.error(
                  (err as ErrorResponse).response?.data?.message ??
                    getUserFriendlyError(err as never),
                ),
            },
          )
        }
      >
        {upgrade.isPending && <Loader2 className="size-4 animate-spin" />}
        Schedule plan change
      </Button>
    </div>
  );
}
