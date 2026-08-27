import { CreditCard } from 'lucide-react';
import { useState } from 'react';

import {
  BillingHistoryViewToggle,
  BillingTimeline,
  type BillingHistoryViewMode,
} from './BillingTimeline';
import { STATUS_DOT } from './InvoicesTab';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePaymentHistoryQuery } from '@/queries/useBilling';

const EVENT_LABEL: Record<string, string> = {
  payment_succeeded: 'Payment succeeded',
  payment_failed: 'Payment failed',
  'invoice.paid': 'Invoice paid',
  'invoice.payment_failed': 'Payment failed',
};

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);

export default function PaymentHistoryTab() {
  const { data, isLoading, isError, refetch } = usePaymentHistoryQuery(1, 50);
  const [view, setView] = useState<BillingHistoryViewMode>('table');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment history</CardTitle>
        <CardDescription>
          Every payment attempt — succeeded or failed — with its ID and reason.
        </CardDescription>
        {data && data.items.length > 0 && (
          <CardAction>
            <BillingHistoryViewToggle value={view} onChange={setView} />
          </CardAction>
        )}
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
        ) : view === 'timeline' ? (
          <BillingTimeline
            items={data.items.map((ev, i) => ({
              key: i,
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
            }))}
          />
        ) : (
          <div className="overflow-hidden rounded-4xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((ev, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      {new Date(ev.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {EVENT_LABEL[ev.eventType] ?? ev.eventType}
                    </TableCell>
                    <TableCell>
                      {ev.amount != null && ev.currency
                        ? money(ev.amount, ev.currency)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {ev.orderStatus ? (
                        <Badge className="bg-muted text-muted-foreground gap-1.5">
                          <span
                            className={`size-1.5 rounded-full ${STATUS_DOT[ev.orderStatus] ?? 'bg-muted-foreground'}`}
                          />
                          {ev.orderStatus.replace('_', ' ')}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {ev.paymentId ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {ev.description ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
