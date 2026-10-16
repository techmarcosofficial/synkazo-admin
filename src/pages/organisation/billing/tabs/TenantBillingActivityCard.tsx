import { Clock, Milestone } from 'lucide-react';
import React, { useState } from 'react';

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
import { cn } from '@/lib/utils';
import { useHistoryQuery } from '@/queries/useBilling';

const EVENT_LABEL: Record<string, string> = {
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
  payment_pending: 'Payment pending',
  'refund.updated': 'Refund processed',
};

const money = (cents: number | null | undefined, currency?: string | null) => {
  if (cents == null) return '—';
  const c = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: c,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${c}`;
  }
};

export default function TenantBillingActivityCard({
  className,
}: {
  className?: string;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const historyQuery = useHistoryQuery(page, pageSize);

  const items = historyQuery.data?.items ?? [];
  const total = historyQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card size="sm" className={cn('gap-0 py-0', className)}>
      <CardHeader className="px-4 py-3 sm:px-4.5 sm:py-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Clock className="text-muted-foreground size-4" />
              Billing Activity
            </CardTitle>
            <CardDescription className="text-xs">
              Chronological log of payments and lifecycle events.
            </CardDescription>
          </div>
          {total > 0 && (
            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {total} {total === 1 ? 'event' : 'events'}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-4">
        {historyQuery.isLoading ? (
          <SkeletonTable rows={4} columns={2} />
        ) : historyQuery.isError ? (
          <ErrorState
            title="Could not load billing activity"
            onRetry={() => historyQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            <EmptyState
              icon={Milestone}
              title="No billing activity recorded yet"
              viewMode="table"
            />
          </div>
        ) : (
          <div className="space-y-3.5">
            <BillingTimeline
              items={items.map((ev, i) => ({
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
                oldStatus: ev.oldStatus ?? undefined,
                newStatus: ev.newStatus ?? undefined,
              }))}
            />

            {total > pageSize && (
              <div className="pt-2 border-t flex items-center justify-between text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px] px-2 rounded-lg"
                  disabled={page === 1 || historyQuery.isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground text-[11px]">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px] px-2 rounded-lg"
                  disabled={page >= totalPages || historyQuery.isLoading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
