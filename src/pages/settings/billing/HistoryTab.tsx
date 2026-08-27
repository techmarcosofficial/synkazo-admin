import { History } from 'lucide-react';
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

export default function HistoryTab() {
  const { data, isLoading, isError, refetch } = useHistoryQuery(1, 50);
  const [view, setView] = useState<BillingHistoryViewMode>('table');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing history</CardTitle>
        <CardDescription>
          A full audit trail of subscription and payment events.
        </CardDescription>
        {data && data.items.length > 0 && (
          <CardAction>
            <BillingHistoryViewToggle value={view} onChange={setView} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonTable rows={4} columns={4} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={History} title="No events yet" viewMode="table" />
        ) : view === 'timeline' ? (
          <BillingTimeline
            items={data.items.map((ev, i) => ({
              key: i,
              date: ev.createdAt,
              title: LABEL[ev.eventType] ?? ev.eventType,
              description: ev.description,
              // Pure subscription-lifecycle events (trial started, plan changed, ...) carry no
              // payment outcome — a neutral dot, not a false "success"/"failure" read.
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
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((ev, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(ev.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {LABEL[ev.eventType] ?? ev.eventType}
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
