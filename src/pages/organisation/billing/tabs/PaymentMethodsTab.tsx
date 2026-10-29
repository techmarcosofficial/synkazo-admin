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
import { isStripeConfigured } from '@/lib/stripe';

export default function PaymentMethodsTab({
  defaultAddingCard = false,
}: {
  defaultAddingCard?: boolean;
} = {}) {
  const [isAdding, setIsAdding] = useState(defaultAddingCard);

  return (
    <Card className="gap-0 py-0">
      <CardHeader visualLevel="section" className="px-4 py-3 sm:px-5 sm:py-3.5 border-b">
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

          {isStripeConfigured && (
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

      <CardContent className="p-4 sm:p-5">
        <CardPicker
          mode="manage"
          addDialogOpen={isAdding}
          onAddDialogOpenChange={setIsAdding}
        />
      </CardContent>
    </Card>
  );
}
