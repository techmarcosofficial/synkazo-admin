import { CreditCard, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { billingApi } from '@/api/billing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  cvvValid,
  detectBrand,
  digitsOnly,
  formatCardNumber,
  formatExpiry,
  luhnValid,
  parseExpiry,
  phoneValid,
} from '@/lib/cardInput';
import { getUserFriendlyError } from '@/lib/errorMessages';
import {
  loadRazorpayCustom,
  openRazorpayCheckout,
  payWithCard,
} from '@/lib/razorpay';
import { showToast } from '@/lib/toast';
import {
  useRefreshPlanMutation,
  useUpgradeMutation,
} from '@/queries/useBilling';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/queries/queryKeys';
import type { ApiPlan, ApiPrice, RazorpayCheckoutResponse } from '@/types';

type ErrorResponse = {
  response?: { status?: number; data?: { message?: string; code?: string } };
};

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);

/** Maps an axios-ish error to the right toast / coupon reset, shared by every failure branch. */
function reportCheckoutError(
  err: unknown,
  onCouponRejected?: () => void,
): void {
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
}

/**
 * New subscription via Razorpay Custom Checkout — the card is entered inline on this page (same
 * layout as the Stripe form), then handed straight to Razorpay; it never touches our servers.
 * The subscription is created up-front (prefetched) so the Subscribe click can call Razorpay
 * synchronously, which the bank-auth popup requires. Razorpay still opens a small OTP/3-D Secure
 * window for the RBI-mandated authentication step.
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
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  // Create (or resume) the Razorpay subscription as soon as the form mounts, and again whenever
  // the applied coupon changes. The backend resumes the same unpaid subscription for an identical
  // price+coupon, so these repeated calls don't pile up subscriptions. razorpay.js is preloaded
  // alongside so the Subscribe click stays within the user gesture.
  const session = useQuery({
    queryKey: ['razorpay-session', price.id, couponCode ?? null],
    queryFn: () =>
      billingApi.razorpayCheckout({ priceId: price.id, couponCode }),
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    void loadRazorpayCustom().catch(() => {
      /* surfaced on submit if it actually fails */
    });
  }, []);

  // A coupon the server rejects at session-creation time is dropped here, exactly as the submit
  // path would, so the OrderSummary re-shows the undiscounted total.
  useEffect(() => {
    if (session.isError) reportCheckoutError(session.error, onCouponRejected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isError]);

  const brand = detectBrand(digitsOnly(cardNumber));

  const finish = async (response: RazorpayCheckoutResponse) => {
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
  };

  const validate = (): string | null => {
    if (!cardName.trim()) return 'Please enter the cardholder name.';
    const number = digitsOnly(cardNumber);
    if (!luhnValid(number)) return 'Please enter a valid card number.';
    if (!parseExpiry(expiry))
      return 'Please enter a valid expiry date (MM/YY).';
    if (!cvvValid(cvv, brand)) return 'Please enter a valid CVV.';
    if (!phoneValid(contact)) return 'Please enter a valid mobile number.';
    return null;
  };

  const pay = async () => {
    const problem = validate();
    if (problem) {
      showToast.error(problem);
      return;
    }
    if (!session.data) {
      showToast.error(
        session.isError
          ? 'We couldn’t start checkout. Refresh the page and try again.'
          : 'Preparing checkout — one moment, then try again.',
      );
      return;
    }
    const exp = parseExpiry(expiry)!;
    setSubmitting(true);
    try {
      const Razorpay = await loadRazorpayCustom();
      const response = await payWithCard(Razorpay, session.data.keyId, {
        subscriptionId: session.data.subscriptionId,
        amount: session.data.amount,
        currency: session.data.currency,
        email: session.data.email,
        contact: digitsOnly(contact),
        card: {
          name: cardName.trim(),
          number: digitsOnly(cardNumber),
          expiryMonth: exp.month,
          expiryYear: exp.year,
          cvv,
        },
      });
      await finish(response);
    } catch (err) {
      reportCheckoutError(err, onCouponRejected);
    } finally {
      setSubmitting(false);
    }
  };

  // Fallback: hand off to Razorpay's hosted modal (the original flow) if the customer prefers it,
  // or if Custom Checkout isn't available on the account. Checkout never hard-fails.
  const payViaModal = async () => {
    if (!session.data) {
      showToast.error('Preparing checkout — one moment, then try again.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await openRazorpayCheckout(
        {
          key: session.data.keyId,
          subscription_id: session.data.subscriptionId,
          name: 'Synkazo',
          description: session.data.description,
          prefill: { name: session.data.name, email: session.data.email },
        },
        (message) => showToast.error(message),
      );
      if (!response) return; // Modal closed — nothing charged.
      await finish(response);
    } catch (err) {
      reportCheckoutError(err, onCouponRejected);
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

  if (session.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label required>Billing details</Label>
        <div className="border-border bg-card text-card-foreground relative isolate space-y-3 rounded-2xl border p-4 shadow-2xs">
          <div className="space-y-1.5">
            <Label htmlFor="rzp-name" className="text-muted-foreground text-xs">
              Cardholder name
            </Label>
            <Input
              id="rzp-name"
              autoComplete="cc-name"
              placeholder="Name on card"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="rzp-email"
                className="text-muted-foreground text-xs"
              >
                Email
              </Label>
              <Input
                id="rzp-email"
                value={session.data?.email ?? ''}
                readOnly
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="rzp-contact"
                className="text-muted-foreground text-xs"
              >
                Mobile number
              </Label>
              <Input
                id="rzp-contact"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="9123456780"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label required>Card details</Label>
        <div className="border-border bg-card text-card-foreground relative isolate space-y-3 rounded-2xl border p-4 shadow-2xs">
          <div className="space-y-1.5">
            <Label
              htmlFor="rzp-number"
              className="text-muted-foreground text-xs"
            >
              Card number
            </Label>
            <div className="relative">
              <Input
                id="rzp-number"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="1234 1234 1234 1234"
                value={cardNumber}
                onChange={(e) =>
                  setCardNumber(formatCardNumber(e.target.value))
                }
                className="pr-10"
              />
              <CreditCard className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="rzp-expiry"
                className="text-muted-foreground text-xs"
              >
                Expiry (MM/YY)
              </Label>
              <Input
                id="rzp-expiry"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="rzp-cvv"
                className="text-muted-foreground text-xs"
              >
                CVV
              </Label>
              <Input
                id="rzp-cvv"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder={brand === 'amex' ? '1234' : '123'}
                maxLength={4}
                value={cvv}
                onChange={(e) => setCvv(digitsOnly(e.target.value).slice(0, 4))}
              />
            </div>
          </div>
        </div>
      </div>

      <Button
        type="button"
        onClick={pay}
        disabled={submitting || session.isLoading}
        className="w-full"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
          </>
        ) : (
          `Subscribe to ${plan.name}`
        )}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        Payments are processed securely by Razorpay. Your card details never
        touch our servers.{' '}
        <button
          type="button"
          onClick={payViaModal}
          disabled={submitting}
          className="underline underline-offset-2 disabled:opacity-50"
        >
          Pay in a Razorpay window instead
        </button>
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
