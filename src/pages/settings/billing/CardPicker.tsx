import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { CreditCard, Loader2, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';

import CardBrandLogo from '@/components/billing/CardBrandLogo';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
}: {
  onDone: (card: PaymentMethodView) => void;
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
      showToast.success('Card added.');
      onDone(card);
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    } finally {
      setSubmitting(false);
    }
  };

  // Not a <form> — this can be mounted inside a parent <form> (the main checkout screen), and
  // nested <form> elements are invalid HTML that browsers handle inconsistently (which broke
  // submission entirely). A plain button + onClick avoids that.
  return (
    <div className="space-y-4">
      <Card className="p-3">
        <PaymentElement options={{ layout: 'tabs' }} />
      </Card>
      <Button
        type="button"
        onClick={submit}
        disabled={!stripe || submitting}
        className="w-full"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding…
          </>
        ) : (
          'Add card'
        )}
      </Button>
    </div>
  );
}

interface CardPickerProps {
  /** 'manage' shows Set default/Remove controls + a dialog-based "Add card" flow (Payment
   *  Methods tab). 'picker' shows a selectable radio list — including "Add a new card" as one of
   *  the radio options — for the upgrade/downgrade/checkout confirm screens. */
  mode: 'manage' | 'picker';
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Fired once a new card finishes attaching, so the checkout flow can select it immediately. */
  onNewCardAdded?: (card: PaymentMethodView) => void;
  /** 'manage' mode only: the "Add a card" dialog's open state, controlled by the parent so its
   *  trigger button can live in the parent's own CardHeader instead of down here in the list. */
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

  const onRemove = (card: PaymentMethodView) => {
    confirm({
      variant: 'danger',
      title: 'Remove this card?',
      description: `${card.cardBrand ?? 'Card'} •••• ${card.cardLast4 ?? '····'} will be removed from your account and can no longer be used for billing.`,
      confirmLabel: 'Remove',
      onConfirm: () =>
        remove.mutate(card.id, {
          onSuccess: () => showToast.success('Card removed.'),
          onError: (err) => showToast.error(getUserFriendlyError(err as never)),
        }),
    });
  };

  const handleNewCardAdded = (card: PaymentMethodView) => {
    onNewCardAdded?.(card);
    onSelect?.(card.id);
  };

  const handleDialogCardAdded = () => {
    onAddDialogOpenChange?.(false);
  };

  if (isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  const isPicker = mode === 'picker';
  const hasCards = !!cards && cards.length > 0;

  // Only the "manage" mode (Payment Methods settings tab) surfaces a fetch error — in "picker"
  // mode (checkout), falling through to the "no cards" add-a-card form on error is preferable to
  // blocking the user from completing checkout.
  if (!isPicker && isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  // A brand-new user with no saved cards yet: skip the picker/radio UI entirely and show the
  // card form directly, same as the plain always-blank checkout form used to.
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

  return (
    <div className="space-y-3">
      {!hasCards && !isPicker && (
        <EmptyState icon={CreditCard} title="No saved cards yet" />
      )}

      {cards?.map((c) => {
        const isSelected = isPicker && selectedId === c.id;
        const expiry = formatExpiry(c.cardExpMonth, c.cardExpYear);
        return (
          <Card
            key={c.id}
            role={isPicker ? 'button' : undefined}
            tabIndex={isPicker ? 0 : undefined}
            onClick={isPicker ? () => onSelect?.(c.id) : undefined}
            className={`bg-secondary flex-row items-center justify-between gap-3 ${
              isPicker
                ? `cursor-pointer ${isSelected ? 'border-primary ring-primary border ring-1' : ''}`
                : ''
            }`}
          >
            <CardContent className="w-full">
              <div className="flex w-full items-center justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  {isPicker && (
                    <input
                      type="radio"
                      readOnly
                      checked={isSelected}
                      className="accent-primary h-4 w-4 shrink-0"
                    />
                  )}
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
                {!isPicker && (
                  <div className="flex shrink-0 items-center gap-1">
                    {!c.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground text-xs"
                        onClick={() => setDefault.mutate(c.id)}
                        disabled={setDefault.isPending}
                      >
                        Set default
                      </Button>
                    )}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => onRemove(c)}
                      disabled={remove.isPending}
                      title="Remove card"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {isPicker && isStripeConfigured && (
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

      {!isPicker && isStripeConfigured && (
        <Dialog open={!!addDialogOpen} onOpenChange={onAddDialogOpenChange}>
          <DialogContent
            onEscapeKeyDown={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Add a card</DialogTitle>
            </DialogHeader>
            <Elements
              stripe={stripePromise}
              options={{
                mode: 'setup',
                currency: 'usd',
                paymentMethodCreation: 'manual',
                appearance: {
                  theme: 'night',
                  variables: { colorPrimary: '#7e6df2' },
                },
              }}
            >
              <AddCardForm onDone={handleDialogCardAdded} />
            </Elements>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
