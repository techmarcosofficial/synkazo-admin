import { CreditCard, Plus, X } from 'lucide-react';
import { useState } from 'react';

import { CardPicker } from './CardPicker';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useStripeClient } from '@/lib/stripe';
import { useSubscriptionQuery } from '@/queries/useBilling';

export default function PaymentMethodsTab({
  defaultAddingCard = false,
}: {
  defaultAddingCard?: boolean;
} = {}) {
  const { isStripeConfigured } = useStripeClient();
  const { data: sub } = useSubscriptionQuery();
  const [isAdding, setIsAdding] = useState(defaultAddingCard);
  // Razorpay keeps the card on its own recurring mandate; there are no saved Stripe cards.
  const razorpay = sub?.gateway === 'razorpay';

  return (
    <Card>
      <CardHeader visualLevel="section">
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="size-4 text-primary" aria-hidden="true" />
              <span>Payment methods</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Manage the cards used for your subscription and recurring invoices.
            </CardDescription>
          </div>

          {isStripeConfigured && !razorpay && (
            <CardAction className="m-0">
              {isAdding ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs rounded-xl"
                  onClick={() => setIsAdding(false)}
                >
                  <X className="size-3.5 mr-1" />
                  Cancel
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-8 text-xs rounded-xl"
                  onClick={() => setIsAdding(true)}
                >
                  <Plus className="size-3.5 mr-1" />
                  Add card
                </Button>
              )}
            </CardAction>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {razorpay ? (
          <p className="text-muted-foreground text-sm">
            Your card is held securely by Razorpay for this subscription. To pay
            with a different card, cancel and subscribe again with the new card
            once the current period ends, or contact support if a payment is
            failing.
          </p>
        ) : (
          <CardPicker
            mode="manage"
            addDialogOpen={isAdding}
            onAddDialogOpenChange={setIsAdding}
          />
        )}
      </CardContent>
    </Card>
  );
}
