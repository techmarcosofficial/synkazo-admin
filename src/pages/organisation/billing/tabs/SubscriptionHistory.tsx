import { History } from 'lucide-react';

import { BillingTimeline } from './BillingTimeline';
import { STATUS_DOT } from './InvoicesTab';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useHistoryQuery } from '@/queries/useBilling';

const LABEL: Record<string, string> = {
  'subscription.created': 'Subscription created',
  'subscription.updated': 'Subscription updated',
  'subscription.canceled': 'Subscription cancelled',
  'subscription.reactivated': 'Subscription reactivated',
  trial_started: 'Trial started',
  trial_ending: 'Trial ending soon',
  plan_changed: 'Plan changed',
  'invoice.paid': 'Invoice paid',
  payment_succeeded: 'Payment succeeded',
  payment_failed: 'Payment failed',
  'refund.updated': 'Refund processed',
};

export default function SubscriptionHistory() {
  const { data, isLoading, isError, refetch } = useHistoryQuery(1, 50);

  return (
    <Card>
      <CardHeader visualLevel="section">
        <CardTitle>Billing history</CardTitle>
        <CardDescription>
          A full audit trail of subscription and payment events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonTable rows={4} columns={4} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={History} title="No events yet" viewMode="table" />
        ) : (
          <div className="space-y-4">
            <BillingTimeline
              items={data.items.map((ev, i) => ({
                key: i,
                date: ev.createdAt,
                title: LABEL[ev.eventType] ?? ev.eventType,
                description: ev.description,
                dotClassName: ev.orderStatus
                  ? (STATUS_DOT[ev.orderStatus] ?? 'bg-muted-foreground')
                  : 'bg-muted-foreground',
                status: ev.orderStatus ?? undefined,
              }))}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
