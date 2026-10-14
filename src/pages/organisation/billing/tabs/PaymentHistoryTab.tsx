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
import { Button } from '@/components/ui/button';
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
  const [view, setView] = useState<BillingHistoryViewMode>('table');

  return (
    <Card>
      <CardHeader visualLevel="section">
        <CardTitle>Payment history</CardTitle>
        <CardDescription>
          The final result of each payment, including successful retries.
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
            }))}
          />
        ) : (
          <div className="overflow-hidden rounded-3xl border">
            <Table>
              <TableHeader>
                <TableRow>
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
                  <TableRow key={ev.id ?? `${ev.paymentId}-${i}`}>
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
