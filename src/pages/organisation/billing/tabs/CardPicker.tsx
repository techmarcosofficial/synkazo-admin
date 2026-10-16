import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { CreditCard, Loader2, Plus, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import CardBrandLogo from '@/components/billing/CardBrandLogo';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { stripePromise, isStripeConfigured } from '@/lib/stripe';
import { showToast } from '@/lib/toast';
import {
  usePaymentMethodsQuery,
  useAddPaymentMethodMutation,
  useSetDefaultPaymentMethodMutation,
  useRemovePaymentMethodMutation,
} from '@/queries/useBilling';
import type { PaymentMethodView } from '@/types';

/** Sentinel `selectedId` value meaning "the user is entering a brand new card, not yet saved." A
 *  parent form must treat this as NOT ready to submit — wait for `onNewCardAdded`/`onSelect` to
 *  fire with the real id once the card actually attaches. */
export const NEW_CARD_ID = '__new__';

const formatExpiry = (
  month: number | null,
  year: number | null,
): string | null =>
  month && year ? `${String(month).padStart(2, '0')} / ${year}` : null;

function AddCardForm({
  onDone,
  onCancel,
}: {
  onDone: (card: PaymentMethodView) => void;
  onCancel?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const addPaymentMethod = useAddPaymentMethodMutation();

  const submit = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        showToast.error(
          submitError.message ?? 'Please check your card details.',
        );
        return;
      }
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        elements,
      });
      if (error || !paymentMethod) {
        showToast.error(error?.message ?? 'Could not add card.');
        return;
      }
      // mutateAsync (not the raw API call) so the payment methods list refetches and the new
      // card appears immediately instead of only after a page reload.
      const card = await addPaymentMethod.mutateAsync(paymentMethod.id);
      showToast.success('Card added successfully.');
      onDone(card);
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <PaymentElement options={{ layout: 'tabs' }} />
      </Card>
      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl h-8 px-3 text-xs"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          className="rounded-xl h-8 px-4 text-xs font-medium"
          onClick={submit}
          disabled={!stripe || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Adding card…
            </>
          ) : (
            'Save card'
          )}
        </Button>
      </div>
    </div>
  );
}

interface CardPickerProps {
  /** 'manage' shows Set default/Remove controls + an inline "Add card" flow.
   *  'picker' shows a selectable radio list — including "Add a new card" as one of
   *  the radio options — for the upgrade/downgrade/checkout confirm screens. */
  mode: 'manage' | 'picker';
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Fired once a new card finishes attaching, so the checkout flow can select it immediately. */
  onNewCardAdded?: (card: PaymentMethodView) => void;
  /** 'manage' mode only: whether to open directly into the "Add card" view. */
  addDialogOpen?: boolean;
  onAddDialogOpenChange?: (open: boolean) => void;
}

export function CardPicker({
  mode,
  selectedId,
  onSelect,
  onNewCardAdded,
  addDialogOpen,
  onAddDialogOpenChange,
}: CardPickerProps) {
  const { data: cards, isLoading, isError, refetch } = usePaymentMethodsQuery();
  const setDefault = useSetDefaultPaymentMethodMutation();
  const remove = useRemovePaymentMethodMutation();
  const { confirm } = useConfirmDialog();

  const [isAddingCard, setIsAddingCard] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  useEffect(() => {
    if (addDialogOpen) {
      setIsAddingCard(true);
    }
  }, [addDialogOpen]);

  const onRemove = (card: PaymentMethodView) => {
    confirm({
      variant: 'danger',
      title: 'Remove this card?',
      description: `${card.cardBrand ?? 'Card'} •••• ${card.cardLast4 ?? '····'} will be removed from your account and can no longer be used for billing.`,
      confirmLabel: 'Remove',
      onConfirm: () =>
        remove.mutate(card.id, {
          onSuccess: () => {
            showToast.success('Card removed.');
            refetch();
          },
          onError: (err) => showToast.error(getUserFriendlyError(err as never)),
        }),
    });
  };

  const handleMakeDefault = (cardId: string) => {
    setSettingDefaultId(cardId);
    setDefault.mutate(cardId, {
      onSuccess: () => {
        showToast.success('Default payment method updated.');
        refetch();
      },
      onError: (err) => {
        showToast.error(getUserFriendlyError(err as never));
      },
      onSettled: () => {
        setSettingDefaultId(null);
      },
    });
  };

  const handleNewCardAdded = (card: PaymentMethodView) => {
    onNewCardAdded?.(card);
    onSelect?.(card.id);
  };

  const handleInlineCardAdded = (card: PaymentMethodView) => {
    setIsAddingCard(false);
    onAddDialogOpenChange?.(false);
    onNewCardAdded?.(card);
    onSelect?.(card.id);
    refetch();
  };

  if (isLoading) {
    return <Skeleton className="h-16 w-full rounded-2xl" />;
  }

  const isPicker = mode === 'picker';
  const hasCards = !!cards && cards.length > 0;

  // Only the "manage" mode surfaces a fetch error — in "picker" mode (checkout),
  // falling through to the "no cards" add-a-card form on error is preferable.
  if (!isPicker && isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  // A brand-new user with no saved cards in picker mode:
  if (isPicker && !hasCards) {
    if (!isStripeConfigured) return null;
    return (
      <Elements
        stripe={stripePromise}
        options={{
          mode: 'setup',
          currency: 'usd',
          paymentMethodCreation: 'manual',
        }}
      >
        <AddCardForm onDone={handleNewCardAdded} />
      </Elements>
    );
  }

  // ── MANAGE MODE ────────────────────────────────────────────────────────────
  if (!isPicker) {
    if (isAddingCard) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b">
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg">
                <CreditCard className="size-3.5" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold">Add a new payment card</span>
            </div>
            {hasCards && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setIsAddingCard(false);
                  onAddDialogOpenChange?.(false);
                }}
              >
                &larr; Back to saved cards
              </Button>
            )}
          </div>

          {isStripeConfigured ? (
            <Elements
              stripe={stripePromise}
              options={{
                mode: 'setup',
                currency: 'usd',
                paymentMethodCreation: 'manual',
              }}
            >
              <AddCardForm
                onDone={handleInlineCardAdded}
                onCancel={
                  hasCards
                    ? () => {
                        setIsAddingCard(false);
                        onAddDialogOpenChange?.(false);
                      }
                    : undefined
                }
              />
            </Elements>
          ) : (
            <p className="text-xs text-muted-foreground">Stripe is not configured.</p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {!hasCards ? (
          <div className="space-y-3">
            <EmptyState icon={CreditCard} title="No saved cards yet" />
            {isStripeConfigured && (
              <Button
                size="sm"
                className="w-full h-9 rounded-xl text-xs font-medium"
                onClick={() => setIsAddingCard(true)}
              >
                <Plus className="size-3.5 mr-1.5" />
                Add a card
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              {cards.map((c) => {
                const expiry = formatExpiry(c.cardExpMonth, c.cardExpYear);
                const isSettingThis =
                  setDefault.isPending && settingDefaultId === c.id;

                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 p-3 sm:px-3.5 rounded-2xl border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <CardBrandLogo
                        brand={c.cardBrand}
                        className="h-6 w-9 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold capitalize flex items-center gap-2">
                          <span>
                            {c.cardBrand ?? 'Card'} •••• {c.cardLast4 ?? '····'}
                          </span>
                          {c.isDefault && (
                            <Badge
                              variant="secondary"
                              className="gap-1 text-primary text-[10px] font-semibold py-0.5 px-2 rounded-full border-0 bg-primary/10"
                            >
                              <Star className="size-3 fill-current" /> Default
                            </Badge>
                          )}
                        </div>
                        {expiry && (
                          <div className="text-muted-foreground text-xs mt-0.5 font-mono">
                            Expires {expiry}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {!c.isDefault && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs rounded-xl"
                          onClick={() => handleMakeDefault(c.id)}
                          disabled={setDefault.isPending}
                        >
                          {isSettingThis ? (
                            <Loader2 className="size-3 animate-spin mr-1" />
                          ) : null}
                          Make default
                        </Button>
                      )}
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="size-7 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onRemove(c)}
                        disabled={remove.isPending}
                        title="Remove card"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {isStripeConfigured && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 rounded-xl text-xs font-medium border-dashed hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5 mt-2"
                onClick={() => setIsAddingCard(true)}
              >
                <Plus className="size-3.5" />
                Add another card
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  // ── PICKER MODE ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {cards?.map((c) => {
        const isSelected = selectedId === c.id;
        const expiry = formatExpiry(c.cardExpMonth, c.cardExpYear);
        return (
          <Card
            key={c.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.(c.id)}
            className={`bg-secondary flex-row items-center justify-between gap-3 cursor-pointer ${
              isSelected ? 'border-primary ring-primary border ring-1' : ''
            }`}
          >
            <CardContent className="w-full">
              <div className="flex w-full items-center justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <input
                    type="radio"
                    readOnly
                    checked={isSelected}
                    className="accent-primary h-4 w-4 shrink-0"
                  />
                  <CardBrandLogo brand={c.cardBrand} />
                  <div className="min-w-0">
                    <div className="text-base font-medium capitalize">
                      {c.cardBrand ?? 'Card'} •••• {c.cardLast4 ?? '····'}
                    </div>
                    {(c.isDefault || expiry) && (
                      <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                        {c.isDefault && (
                          <span className="text-primary flex items-center gap-1 font-medium">
                            <Star className="h-3 w-3 fill-current" /> Default
                          </span>
                        )}
                        {c.isDefault && expiry && <span>·</span>}
                        {expiry && <span>Expires {expiry}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {isStripeConfigured && (
        <div className="space-y-3">
          <Card
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.(NEW_CARD_ID)}
            className={`cursor-pointer flex-row items-center gap-3 p-3 ${
              selectedId === NEW_CARD_ID
                ? 'border-primary ring-primary border ring-1'
                : ''
            }`}
          >
            <input
              type="radio"
              readOnly
              checked={selectedId === NEW_CARD_ID}
              className="accent-primary h-4 w-4"
            />
            <Plus className="text-muted-foreground h-4 w-4" />
            <span className="text-sm">Add a new card</span>
          </Card>
          {selectedId === NEW_CARD_ID && (
            <Elements
              stripe={stripePromise}
              options={{
                mode: 'setup',
                currency: 'usd',
                paymentMethodCreation: 'manual',
              }}
            >
              <AddCardForm onDone={handleNewCardAdded} />
            </Elements>
          )}
        </div>
      )}
    </div>
  );
}
