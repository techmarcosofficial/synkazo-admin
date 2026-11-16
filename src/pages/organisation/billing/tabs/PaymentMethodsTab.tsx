import { useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, Plus, RefreshCw, Star, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { CardPicker } from './CardPicker';

import { billingApi } from '@/api/billing';
import CardBrandLogo from '@/components/billing/CardBrandLogo';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { openRazorpayCheckout } from '@/lib/razorpay';
import { useStripeClient } from '@/lib/stripe';
import { showToast } from '@/lib/toast';
import { queryKeys } from '@/queries/queryKeys';
import {
  usePaymentMethodsQuery,
  useSubscriptionQuery,
} from '@/queries/useBilling';

/** Razorpay links exactly one card to the subscription; changing it replaces that card. */
function useRazorpayCardChange() {
  const qc = useQueryClient();
  const [changing, setChanging] = useState(false);

  const change = async () => {
    setChanging(true);
    try {
      const session = await billingApi.razorpayCardChange();
      const response = await openRazorpayCheckout(
        {
          key: session.keyId,
          subscription_id: session.subscriptionId,
          subscription_card_change: true,
          name: 'Synkazo',
          description: 'Update the card for your subscription',
          prefill: { name: session.name, email: session.email },
        },
        (message) => showToast.error(message),
      );
      if (!response) return; // Window closed — the current card stays in place.
      await billingApi.razorpayCardChangeVerify(response);
      await qc.invalidateQueries({ queryKey: queryKeys.billing.all });
      showToast.success('Card updated. Future payments use the new card.');
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    } finally {
      setChanging(false);
    }
  };

  return { change, changing };
}

function RazorpayCard({
  onChange,
  changing,
}: {
  onChange: () => void;
  changing: boolean;
}) {
  const { data: cards, isLoading, isError, refetch } = usePaymentMethodsQuery();

  if (isLoading) return <Skeleton className="h-16 w-full rounded-2xl" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const card = cards?.[0];
  if (!card)
    return (
      <div className="space-y-3">
        <EmptyState icon={CreditCard} title="No card linked yet" />
        <Button
          size="sm"
          className="h-9 w-full rounded-xl text-xs font-medium"
          onClick={onChange}
          disabled={changing}
        >
          <Plus className="mr-1.5 size-3.5" />
          Add a card
        </Button>
      </div>
    );

  const expiry =
    card.cardExpMonth && card.cardExpYear
      ? `${String(card.cardExpMonth).padStart(2, '0')} / ${card.cardExpYear}`
      : null;

  return (
    <div className="space-y-3">
      <div className="bg-muted/20 flex items-center justify-between gap-3 rounded-2xl border p-3 sm:px-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <CardBrandLogo brand={card.cardBrand} className="h-6 w-9 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold capitalize">
              <span>
                {card.cardBrand ?? 'Card'} •••• {card.cardLast4 ?? '····'}
              </span>
              <Badge
                variant="secondary"
                className="text-primary bg-primary/10 gap-1 rounded-full border-0 px-2 py-0.5 text-[10px] font-semibold"
              >
                <Star className="size-3 fill-current" /> Default
              </Badge>
            </div>
            {expiry && (
              <div className="text-muted-foreground mt-0.5 font-mono text-xs">
                Expires {expiry}
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        Razorpay charges this card for your subscription. Changing it replaces
        this card for all future payments.
      </p>
    </div>
  );
}

function PaymentMethodsCard({
  action,
  children,
}: {
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader visualLevel="section">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <CreditCard className="text-primary size-4" aria-hidden="true" />
              <span>Payment methods</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Manage the cards used for your subscription and recurring
              invoices.
            </CardDescription>
          </div>
          {action && <CardAction className="m-0">{action}</CardAction>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function RazorpayPaymentMethods() {
  const { change, changing } = useRazorpayCardChange();
  return (
    <PaymentMethodsCard
      action={
        <Button
          size="sm"
          className="h-8 rounded-xl text-xs"
          onClick={() => void change()}
          disabled={changing}
        >
          {changing ? (
            <Loader2 className="mr-1 size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 size-3.5" />
          )}
          Change card
        </Button>
      }
    >
      <RazorpayCard onChange={() => void change()} changing={changing} />
    </PaymentMethodsCard>
  );
}

export default function PaymentMethodsTab({
  defaultAddingCard = false,
}: {
  defaultAddingCard?: boolean;
} = {}) {
  const { isStripeConfigured } = useStripeClient();
  const { data: sub } = useSubscriptionQuery();
  const [isAdding, setIsAdding] = useState(defaultAddingCard);

  if (sub?.gateway === 'razorpay') return <RazorpayPaymentMethods />;

  return (
    <PaymentMethodsCard
      action={
        isStripeConfigured &&
        (isAdding ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-xl text-xs"
            onClick={() => setIsAdding(false)}
          >
            <X className="mr-1 size-3.5" />
            Cancel
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-8 rounded-xl text-xs"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="mr-1 size-3.5" />
            Add card
          </Button>
        ))
      }
    >
      <CardPicker
        mode="manage"
        addDialogOpen={isAdding}
        onAddDialogOpenChange={setIsAdding}
      />
    </PaymentMethodsCard>
  );
}
