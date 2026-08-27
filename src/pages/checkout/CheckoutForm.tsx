import {
  AddressElement,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import type { StripeAddressElementChangeEvent } from '@stripe/stripe-js';
import { CreditCard, Loader2, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

import { billingApi } from '@/api/billing';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { showToast } from '@/lib/toast';
import { usePaymentMethodsQuery } from '@/queries/useBilling';
import type { ApiPrice, EmbeddedCheckoutRequest } from '@/types';

const NEW_CARD = '__new__';

interface CheckoutFormProps {
  price: ApiPrice;
  onSuccess: () => void | Promise<void>;
  /** Applied promo code (owned by CheckoutPage) — the server re-validates it before charging. */
  couponCode?: string;
  /** Cleared when the server rejects the code at charge time, so the shown total stays honest. */
  onCouponRejected?: () => void;
}

/**
 * Address + card live in ONE Elements group (mode: 'subscription' from the parent), same as
 * before — splitting them into separate Elements instances breaks Stripe's own autofill/
 * suggestion coordination between the two. Billing name/address is always required (Stripe
 * declines a card whose country differs from our Indian merchant account as an "export"
 * transaction unless the Customer carries a name + address — https://stripe.com/docs/india-exports).
 * If the org already has saved cards, pick one and go straight to Subscribe — no separate
 * "add card" step. Entering new card details tokenizes + attaches it in the SAME submit as
 * creating the subscription, exactly like the original flow.
 */
export function CheckoutForm({
  price,
  onSuccess,
  couponCode,
  onCouponRejected,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { data: cards, isLoading: cardsLoading } = usePaymentMethodsQuery();
  const [billingDetails, setBillingDetails] =
    useState<EmbeddedCheckoutRequest['billingDetails']>();
  // Tracked separately from billingDetails (which is only set once the WHOLE address is
  // complete) so the submit error can say specifically what's missing — the AddressElement's
  // `complete` flag covers the name field too, so an empty name alone was being reported as
  // "billing address is missing" (item 22b).
  const [addressName, setAddressName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  // Pre-select the default saved card once the list loads; a brand-new org with no cards yet
  // goes straight to the new-card form.
  useEffect(() => {
    if (selectedId || !cards) return;
    if (cards.length === 0) {
      setSelectedId(NEW_CARD);
      return;
    }
    setSelectedId(cards.find((c) => c.isDefault)?.id ?? cards[0].id);
  }, [cards]);

  const handleAddressChange = (event: StripeAddressElementChangeEvent) => {
    setAddressName(event.value.name ?? '');
    if (!event.complete) {
      setBillingDetails(undefined);
      return;
    }
    const { name, address } = event.value;
    setBillingDetails({
      name,
      line1: address.line1,
      line2: address.line2 || undefined,
      city: address.city,
      state: address.state,
      postalCode: address.postal_code,
      country: address.country,
    });
  };

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    if (!billingDetails) {
      showToast.error(
        addressName.trim()
          ? 'Please complete your billing address.'
          : 'Please enter the cardholder name.',
      );
      return;
    }
    if (!selectedId) {
      showToast.error('Please select or add a card.');
      return;
    }
    setSubmitting(true);
    try {
      let paymentMethodId: string | undefined;
      let savedPaymentMethodId: string | undefined;

      if (selectedId === NEW_CARD) {
        // Validate + collect the Elements (card + billing address), then tokenize into a
        // PaymentMethod. Passing `elements` merges the AddressElement's data into billing_details
        // automatically, so the PaymentMethod carries a complete address from creation.
        const { error: submitError } = await elements.submit();
        if (submitError) {
          showToast.error(
            submitError.message ??
              'Please check your card and billing details.',
          );
          return;
        }
        const { error: pmError, paymentMethod } =
          await stripe.createPaymentMethod({ elements });
        if (pmError || !paymentMethod) {
          showToast.error(pmError?.message ?? 'Could not process your card.');
          return;
        }
        paymentMethodId = paymentMethod.id;
      } else {
        savedPaymentMethodId = selectedId;
      }

      const result = await billingApi.checkoutEmbedded({
        priceId: price.id,
        paymentMethodId,
        savedPaymentMethodId,
        couponCode,
        billingDetails,
      });

      // The server already confirmed the card. A clientSecret comes back only when the bank
      // requires 3-D Secure — complete it here, then verify the intent actually succeeded.
      if (result.clientSecret) {
        const {
          error: actionError,
          setupIntent,
          paymentIntent,
        } = await stripe.handleNextAction({
          clientSecret: result.clientSecret,
        });
        if (actionError) {
          showToast.error(actionError.message ?? 'Card authentication failed.');
          return;
        }
        const status = setupIntent?.status ?? paymentIntent?.status;
        if (status && status !== 'succeeded' && status !== 'processing') {
          showToast.error(
            'Card authentication was not completed. Please try again or use another card.',
          );
          return;
        }
      }

      // Show the success message on-screen (not a toast) and hold briefly before handing off,
      // so the user actually reads it before the route changes.
      setSucceeded(true);
      setTimeout(() => {
        void onSuccess();
      }, 1400);
    } catch (err) {
      // A 401 here means the session token expired between loading the page and
      // submitting. The apiClient interceptor already redirects to /login on a
      // failed refresh; show a session-specific message rather than the generic
      // "reconnect your account" 401 copy.
      const response = (
        err as {
          response?: {
            status?: number;
            data?: { message?: string; code?: string };
          };
        }
      )?.response;
      if (response?.status === 401) {
        showToast.error(
          'Your session expired. Please sign in again to complete checkout.',
        );
      } else if (response?.data?.code === 'COUPON_INVALID') {
        // The code lapsed between Apply and Subscribe. Drop it so the summary re-shows the
        // undiscounted total and the user re-confirms — never charge a total they didn't see.
        onCouponRejected?.();
        showToast.error(
          response.data.message ??
            'That promo code is no longer valid. Please review your total.',
        );
      } else if (response?.status === 400 && response.data?.message) {
        // Card declines / confirmation failures come back as a 400 carrying Stripe's own
        // reason ("Your card was declined.", "insufficient funds", …) — show it verbatim.
        showToast.error(response.data.message);
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
      <div className="space-y-2">
        <Label required>Billing name &amp; address</Label>
        <div className="border-border bg-muted/40 rounded-lg border p-3">
          <AddressElement
            options={{ mode: 'billing', autocomplete: { mode: 'automatic' } }}
            onChange={handleAddressChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label required>Pay with</Label>
        {cardsLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="space-y-3">
            {cards?.map((c) => {
              const isSelected = selectedId === c.id;
              return (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(c.id)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                    isSelected
                      ? 'border-primary ring-primary ring-1'
                      : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    readOnly
                    checked={isSelected}
                    className="accent-primary h-4 w-4"
                  />
                  <CreditCard className="text-muted-foreground h-5 w-5" />
                  <div>
                    <div className="font-medium capitalize">
                      {c.cardBrand ?? 'Card'} •••• {c.cardLast4 ?? '····'}
                    </div>
                    {c.isDefault && (
                      <div className="text-primary flex items-center gap-1 text-xs">
                        <Star className="h-3 w-3 fill-current" /> Default
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {cards && cards.length > 0 && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(NEW_CARD)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                  selectedId === NEW_CARD
                    ? 'border-primary ring-primary ring-1'
                    : 'border-border'
                }`}
              >
                <input
                  type="radio"
                  readOnly
                  checked={selectedId === NEW_CARD}
                  className="accent-primary h-4 w-4"
                />
                <span className="text-sm">
                  Pay with another credit/debit card
                </span>
              </div>
            )}

            {selectedId === NEW_CARD && (
              <div className="border-border bg-muted/40 rounded-lg border p-3">
                <PaymentElement options={{ layout: 'tabs' }} />
              </div>
            )}
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!stripe || submitting || !selectedId}
        className="w-full"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
          </>
        ) : (
          'Subscribe'
        )}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        Payments are processed securely by Stripe. Your card details never touch
        our servers.
      </p>
    </div>
  );
}
