import { Plus } from 'lucide-react';
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

export default function PaymentMethodsTab() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment methods</CardTitle>
        <CardDescription>
          Manage the cards used for your subscription.
        </CardDescription>
        {isStripeConfigured && (
          <CardAction>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus /> Add card
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <CardPicker
          mode="manage"
          addDialogOpen={addDialogOpen}
          onAddDialogOpenChange={setAddDialogOpen}
        />
      </CardContent>
    </Card>
  );
}
