import { CreditCard } from 'lucide-react';
import { useState } from 'react';

import { BillingTimeline } from './BillingTimeline';
import { STATUS_DOT } from './InvoicesTab';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { usePaymentHistoryQuery } from '@/queries/useBilling';

const EVENT_LABEL: Record<string, string> = {
  payment_succeeded: 'Payment succeeded',
  payment_failed: 'Payment failed',
  payment_pending: 'Payment pending',
};

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);

export default function PaymentHistoryTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = usePaymentHistoryQuery(
    page,
    50,
  );

  return (
    <Card>
      <CardHeader visualLevel="section">
        <CardTitle>Payment history</CardTitle>
        <CardDescription>
          The final result of each payment, including successful retries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonTable rows={4} columns={6} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payment events yet"
            viewMode="table"
          />
        ) : (
          <div className="space-y-4">
            <BillingTimeline
              items={data.items.map((ev, i) => ({
                key: ev.id ?? `${ev.paymentId}-${i}`,
                date: ev.createdAt,
                title: EVENT_LABEL[ev.eventType] ?? ev.eventType,
                description: ev.description,
                amount:
                  ev.amount != null && ev.currency
                    ? money(ev.amount, ev.currency)
                    : null,
                dotClassName: ev.orderStatus
                  ? (STATUS_DOT[ev.orderStatus] ?? 'bg-muted-foreground')
                  : 'bg-muted-foreground',
                status: ev.orderStatus ?? undefined,
                paymentId: ev.paymentId ?? undefined,
              }))}
            />
          </div>
        )}
        {data && (data.total > 50 || page > 1) && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={page === 1 || isLoading}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-muted-foreground text-sm">
              Page {page} of {Math.max(1, Math.ceil(data.total / 50))}
            </span>
            <Button
              variant="outline"
              disabled={page * 50 >= data.total || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
