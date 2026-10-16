import { CreditCard, ExternalLink, Receipt, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { BillingTimeline } from './BillingTimeline';
import { STATUS_DOT } from './InvoicesTab';

import DateRangePicker, { type DateRangeValue } from '@/components/shared/DateRangePicker';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
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
import { cn } from '@/lib/utils';
import {
  useHistoryQuery,
  useInvoicesQuery,
  usePaymentHistoryQuery,
} from '@/queries/useBilling';

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

export default function TenantBillingHistorySection({
  className,
}: {
  className?: string;
}) {
  const [subSection, setSubSection] = useState<'activity' | 'invoices'>('activity');
  const [paymentsOnly, setPaymentsOnly] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeValue>({});

  const [historyPage, setHistoryPage] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);

  // When paymentsOnly is active, use the filtered payment history query; otherwise use the full history query
  const allHistoryQuery = useHistoryQuery(historyPage, 50);
  const paymentHistoryQuery = usePaymentHistoryQuery(historyPage, 50);
  const activeHistoryQuery = paymentsOnly ? paymentHistoryQuery : allHistoryQuery;

  const invoicesQuery = useInvoicesQuery(invoicePage, 50);

  const rawHistoryItems = activeHistoryQuery.data?.items ?? [];
  const totalHistory = activeHistoryQuery.data?.total ?? 0;

  // Filter history items by selected date range for auditing
  const filteredHistoryItems = useMemo(() => {
    if (!dateRange.from && !dateRange.to) {
      return rawHistoryItems;
    }
    return rawHistoryItems.filter((ev) => {
      if (!ev.createdAt) return false;
      const evDate = ev.createdAt.slice(0, 10);
      if (dateRange.from && evDate < dateRange.from) return false;
      if (dateRange.to && evDate > dateRange.to) return false;
      return true;
    });
  }, [rawHistoryItems, dateRange]);

  const rawInvoices = invoicesQuery.data?.items ?? [];
  const totalInvoices = invoicesQuery.data?.total ?? 0;

  // Filter invoices by selected date range
  const filteredInvoices = useMemo(() => {
    if (!dateRange.from && !dateRange.to) {
      return rawInvoices;
    }
    return rawInvoices.filter((inv) => {
      const invDateStr = inv.paidAt || inv.periodStart;
      if (!invDateStr) return false;
      const invDate = invDateStr.slice(0, 10);
      if (dateRange.from && invDate < dateRange.from) return false;
      if (dateRange.to && invDate > dateRange.to) return false;
      return true;
    });
  }, [rawInvoices, dateRange]);

  return (
    <Card className={cn('gap-0', className)}>
      <CardHeader className="p-4 sm:p-5 pb-4 border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="text-muted-foreground size-4" />
              Billing &amp; Payment History
            </CardTitle>
            <CardDescription className="text-xs">
              Chronological log of payments, lifecycle events, and Stripe invoices.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sub-toggle between Activity and Invoices */}
            <div className="bg-muted inline-flex rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setSubSection('activity')}
                className={`px-3 py-1 font-medium rounded-lg transition-all ${
                  subSection === 'activity'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Activity ({totalHistory})
              </button>
              <button
                type="button"
                onClick={() => setSubSection('invoices')}
                className={`px-3 py-1 font-medium rounded-lg transition-all ${
                  subSection === 'invoices'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Invoices ({totalInvoices})
              </button>
            </div>

            {subSection === 'activity' && (
              <Button
                variant={paymentsOnly ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-2.5 text-xs rounded-xl"
                onClick={() => {
                  setPaymentsOnly(!paymentsOnly);
                  setHistoryPage(1);
                }}
              >
                Payments only
              </Button>
            )}

            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Filter by date"
              className="h-8 text-xs px-2.5 rounded-xl"
            />

            {(dateRange.from || dateRange.to) && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                title="Clear date filter"
                aria-label="Clear date filter"
                onClick={() => setDateRange({})}
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-4">
        {subSection === 'activity' ? (
          activeHistoryQuery.isLoading ? (
            <SkeletonTable rows={4} columns={4} />
          ) : activeHistoryQuery.isError ? (
            <ErrorState
              title="Could not load billing activity"
              onRetry={() => activeHistoryQuery.refetch()}
            />
          ) : filteredHistoryItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {dateRange.from || dateRange.to ? (
                <div className="space-y-2">
                  <p>No activity events found for the selected date range.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs rounded-xl"
                    onClick={() => setDateRange({})}
                  >
                    Clear date filter
                  </Button>
                </div>
              ) : (
                <EmptyState
                  icon={CreditCard}
                  title={paymentsOnly ? 'No payment events yet' : 'No activity events yet'}
                  viewMode="table"
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <BillingTimeline
                items={filteredHistoryItems.map((ev, i) => ({
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

              {totalHistory > 50 && (
                <div className="mt-4 flex items-center justify-between gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={historyPage === 1 || activeHistoryQuery.isLoading}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-muted-foreground text-xs">
                    Page {historyPage} of {Math.max(1, Math.ceil(totalHistory / 50))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={historyPage * 50 >= totalHistory || activeHistoryQuery.isLoading}
                    onClick={() => setHistoryPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )
        ) : (
          invoicesQuery.isLoading ? (
            <SkeletonTable rows={4} columns={4} />
          ) : invoicesQuery.isError ? (
            <ErrorState
              title="Could not load invoices"
              onRetry={() => invoicesQuery.refetch()}
            />
          ) : filteredInvoices.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {dateRange.from || dateRange.to ? (
                <div className="space-y-2">
                  <p>No invoices found for the selected date range.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs rounded-xl"
                    onClick={() => setDateRange({})}
                  >
                    Clear date filter
                  </Button>
                </div>
              ) : (
                <EmptyState icon={Receipt} title="No invoices yet" viewMode="table" />
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-xs">
                        {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }) : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {money(inv.totalAmount, inv.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="bg-muted text-muted-foreground gap-1.5 rounded-full border-0 font-medium text-xs capitalize"
                        >
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              STATUS_DOT[inv.status] ?? 'bg-muted-foreground',
                            )}
                          />
                          {inv.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {inv.receiptUrl ? (
                          <a
                            href={inv.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary inline-flex items-center gap-1 hover:underline text-xs font-medium"
                          >
                            Receipt <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalInvoices > 50 && (
                <div className="p-3 border-t flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={invoicePage === 1 || invoicesQuery.isLoading}
                    onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-muted-foreground text-xs">
                    Page {invoicePage} of {Math.max(1, Math.ceil(totalInvoices / 50))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={invoicePage * 50 >= totalInvoices || invoicesQuery.isLoading}
                    onClick={() => setInvoicePage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
