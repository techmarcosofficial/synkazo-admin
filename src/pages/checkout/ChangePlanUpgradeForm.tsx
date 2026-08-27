import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { CreditCard, Loader2, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

import { billingApi } from '@/api/billing';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { stripePromise, isStripeConfigured } from '@/lib/stripe';
import { showToast } from '@/lib/toast';
import {
  useUpgradeMutation,
  usePaymentMethodsQuery,
  useUpgradePreviewQuery,
} from '@/queries/useBilling';
import type { ApiPlan, ApiPrice } from '@/types';

const NEW_CARD = '__new__';

interface ChangePlanFormProps {
  plan: ApiPlan;
  price: ApiPrice;
  onSuccess: () => void | Promise<void>;
}

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);

const BILLING_INTERVAL_LABEL: Record<string, string> = {
  month: 'Monthly',
  year: 'Yearly',
  day: 'Daily',
};

/**
 * Owns its own Elements group (mode: 'setup') so a new card can be entered inline — same single
 * "Confirm plan change" click tokenizes + attaches the card (if one was entered) and charges the
 * day-based prorated amount, no separate "Add card" step. Confirms any required 3-D Secure, then
 * retries the same endpoint with the same resolved card so the server-side confirmation completes.
 *
 * Covers BOTH upgrades and downgrades — every plan change is now immediate, computed by the same
 * Transfer Fee formula, and resets the billing cycle. There is no more separate scheduled-downgrade
 * flow.
 */
export function ChangePlanUpgradeForm({
  plan,
  price,
  onSuccess,
}: ChangePlanFormProps) {
  if (!isStripeConfigured) return null;
  return (
    <Elements
      stripe={stripePromise}
      options={{
        mode: 'setup',
        currency: price.currency.toLowerCase(),
        paymentMethodCreation: 'manual',
      }}
    >
      <ChangePlanForm plan={plan} price={price} onSuccess={onSuccess} />
    </Elements>
  );
}

function ChangePlanForm({ plan, price, onSuccess }: ChangePlanFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const changePlan = useUpgradeMutation();
  // Every figure is server-computed from the day-based formula — never re-derived locally, so the
  // displayed total and the actual charge can't drift.
  const {
    data: preview,
    isLoading: previewLoading,
    isError: previewError,
    refetch: refetchPreview,
  } = useUpgradePreviewQuery(price.id);
  const { data: cards, isLoading: cardsLoading } = usePaymentMethodsQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  // Pre-select the default saved card; an org with no cards yet goes straight to the new-card form.
  useEffect(() => {
    if (selectedId || !cards) return;
    if (cards.length === 0) {
      setSelectedId(NEW_CARD);
      return;
    }
    setSelectedId(cards.find((c) => c.isDefault)?.id ?? cards[0].id);
  }, [cards]);

  const handleConfirm = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      let paymentMethodId = selectedId;

      if (selectedId === NEW_CARD) {
        if (!stripe || !elements) return;
        const { error: submitError } = await elements.submit();
        if (submitError) {
          showToast.error(
            submitError.message ?? 'Please check your card details.',
          );
          return;
        }
        const { error: pmError, paymentMethod } =
          await stripe.createPaymentMethod({ elements });
        if (pmError || !paymentMethod) {
          showToast.error(pmError?.message ?? 'Could not process your card.');
          return;
        }
        const saved = await billingApi.addPaymentMethod(paymentMethod.id);
        paymentMethodId = saved.id;
      }

      const changeArgs = {
        priceId: price.id,
        paymentMethodId,
        // Echo back the total the user actually saw; the server 409s if it no longer matches.
        expectedTotal: preview?.amountDueToday,
      };
      let result = await changePlan.mutateAsync(changeArgs);
      if (result.clientSecret) {
        if (!stripe) throw new Error('Stripe failed to load.');
        const { error, paymentIntent } = await stripe.handleNextAction({
          clientSecret: result.clientSecret,
        });
        if (error) {
          showToast.error(error.message ?? 'Card authentication failed.');
          return;
        }
        if (
          paymentIntent &&
          paymentIntent.status !== 'succeeded' &&
          paymentIntent.status !== 'processing'
        ) {
          showToast.error(
            'Card authentication was not completed. Please try again.',
          );
          return;
        }
        // Re-confirm now the intent is settled, with the SAME resolved card, so the server
        // actually applies the plan change.
        result = await changePlan.mutateAsync(changeArgs);
      }
      setSucceeded(true);
      setTimeout(() => {
        void onSuccess();
      }, 1400);
    } catch (err) {
      const response = (
        err as {
          response?: {
            status?: number;
            data?: { message?: string; code?: string };
          };
        }
      )?.response;
      if (response?.status === 409) {
        // The Transfer Fee % or a price changed between preview and confirm. Re-preview and make
        // the user confirm the new figure.
        void refetchPreview();
        showToast.error(
          response.data?.message ??
            'The amount due has changed. Please review the new total and confirm again.',
        );
      } else if (response?.status === 400 && response.data?.message) {
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
        <p className="text-lg font-semibold">Plan changed successfully.</p>
        <p className="text-muted-foreground text-sm">
          Redirecting to dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {previewLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : previewError || !preview ? (
        <Card className="gap-2 p-4">
          <p className="text-destructive">
            We couldn’t calculate your new total. Please retry before
            confirming.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void refetchPreview()}
          >
            Retry
          </Button>
        </Card>
      ) : (
        <Card className="gap-2 p-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current plan</span>
            <span>{preview.currentPlanName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current plan price</span>
            <span>{money(preview.oldPlanPrice, preview.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Billing cycle</span>
            <span>
              {BILLING_INTERVAL_LABEL[preview.billingInterval] ??
                preview.billingInterval}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total billing days</span>
            <span>{preview.totalBillingDays}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Days used</span>
            <span>{preview.daysUsed}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Days remaining</span>
            <span>{preview.daysRemaining}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Daily cost</span>
            <span>{money(preview.dailyCost, preview.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Used amount</span>
            <span>{money(preview.usedAmount, preview.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Remaining credit</span>
            <span>{money(preview.remainingCredit, preview.currency)}</span>
          </div>
          {preview.transferFeePercent > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transfer fee</span>
                <span>{preview.transferFeePercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Transfer fee amount
                </span>
                <span className="text-primary">
                  −{money(preview.transferFeeAmount, preview.currency)}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between font-medium">
            <span className="text-muted-foreground">Final credit applied</span>
            <span className="text-primary">
              −{money(preview.finalCredit, preview.currency)}
            </span>
          </div>
          <div className="border-border flex justify-between border-t pt-2">
            <span className="text-muted-foreground">New plan</span>
            <span>{preview.newPlanName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">New plan price</span>
            <span>{money(preview.newPlanPrice, preview.currency)}</span>
          </div>
          <div className="border-border flex justify-between border-t pt-2 font-semibold">
            <span>Due today</span>
            <span>{money(preview.amountDueToday, preview.currency)}</span>
          </div>
          {preview.overflowAmount > 0 && (
            <p className="text-muted-foreground text-xs">
              {preview.refundPolicy === 'refund'
                ? `${money(preview.overflowAmount, preview.currency)} will be refunded to your card.`
                : preview.refundPolicy === 'none'
                  ? `Your remaining ${money(preview.overflowAmount, preview.currency)} of unused credit will not be carried over.`
                  : `${money(preview.overflowAmount, preview.currency)} will be added to your account balance and used for future invoices.`}
            </p>
          )}
        </Card>
      )}

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
        onClick={handleConfirm}
        disabled={submitting || !selectedId || previewLoading || !preview}
        className="w-full"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
          </>
        ) : (
          'Confirm plan change'
        )}
      </Button>
    </div>
  );
}
