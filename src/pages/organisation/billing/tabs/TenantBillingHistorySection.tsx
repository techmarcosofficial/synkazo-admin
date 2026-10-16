import { format } from 'date-fns';
import { CreditCard, ExternalLink, Receipt, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

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
  useInvoicesQuery,
  usePaymentHistoryQuery,
} from '@/queries/useBilling';

const EVENT_LABEL: Record<string, string> = {
  payment_succeeded: 'Payment succeeded',
  payment_failed: 'Payment failed',
  payment_pending: 'Payment pending',
  'subscription.created': 'Subscription created',
  'subscription.updated': 'Subscription updated',
  'subscription.canceled': 'Subscription cancelled',
  'subscription.reactivated': 'Subscription reactivated',
  trial_started: 'Trial started',
  trial_ending: 'Trial ending soon',
  plan_changed: 'Plan changed',
  'invoice.paid': 'Invoice paid',
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

function formatDateSafe(
  iso: string | null | undefined,
  formatStr = 'MMM d, yyyy',
): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return format(d, formatStr);
  } catch {
    return '—';
  }
}

export type HistorySubTab = 'payments' | 'invoices';

export default function TenantBillingHistorySection({
  className,
}: {
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState<HistorySubTab>('payments');
  const [dateRange, setDateRange] = useState<DateRangeValue>({});

  const [paymentPage, setPaymentPage] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);
  const pageSize = 20;

  const paymentHistoryQuery = usePaymentHistoryQuery(paymentPage, pageSize);
  const invoicesQuery = useInvoicesQuery(invoicePage, pageSize);

  const rawPayments = paymentHistoryQuery.data?.items ?? [];
  const totalPayments = paymentHistoryQuery.data?.total ?? 0;

  const rawInvoices = invoicesQuery.data?.items ?? [];
  const totalInvoices = invoicesQuery.data?.total ?? 0;

  // Filter payments by selected date range
  const filteredPayments = useMemo(() => {
    if (!dateRange.from && !dateRange.to) {
      return rawPayments;
    }
    return rawPayments.filter((item) => {
      if (!item.createdAt) return false;
      const d = item.createdAt.slice(0, 10);
      if (dateRange.from && d < dateRange.from) return false;
      if (dateRange.to && d > dateRange.to) return false;
      return true;
    });
  }, [rawPayments, dateRange]);

  // Filter invoices by selected date range
  const filteredInvoices = useMemo(() => {
    if (!dateRange.from && !dateRange.to) {
      return rawInvoices;
    }
    return rawInvoices.filter((inv) => {
      const invDateStr = inv.paidAt || inv.periodStart;
      if (!invDateStr) return false;
      const d = invDateStr.slice(0, 10);
      if (dateRange.from && d < dateRange.from) return false;
      if (dateRange.to && d > dateRange.to) return false;
      return true;
    });
  }, [rawInvoices, dateRange]);

  return (
    <Card className={cn('gap-0 py-0', className)}>
      <CardHeader className="px-4 py-3 sm:px-5 sm:py-3.5 border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="text-muted-foreground size-4" />
              Billing &amp; Payment History
            </CardTitle>
            <CardDescription className="text-xs">
              History of payments, lifecycle events, and Stripe invoices.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Header Tabs: Payment History & Invoices */}
            <div className="bg-muted inline-flex rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={cn(
                  'px-3 py-1 font-medium rounded-lg transition-all cursor-pointer',
                  activeTab === 'payments'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Payment History ({totalPayments})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className={cn(
                  'px-3 py-1 font-medium rounded-lg transition-all cursor-pointer',
                  activeTab === 'invoices'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Invoices ({totalInvoices})
              </button>
            </div>

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

      <CardContent className="p-4 sm:p-5 pt-3.5">
        {activeTab === 'payments' ? (
          paymentHistoryQuery.isLoading ? (
            <SkeletonTable rows={4} columns={4} />
          ) : paymentHistoryQuery.isError ? (
            <ErrorState
              title="Could not load payment history"
              onRetry={() => paymentHistoryQuery.refetch()}
            />
          ) : filteredPayments.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {dateRange.from || dateRange.to ? (
                <div className="space-y-2">
                  <p>No payment events found for the selected date range.</p>
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
                  title="No payment events yet"
                  viewMode="table"
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[160px] text-xs font-semibold">Date</TableHead>
                      <TableHead className="text-xs font-semibold">Event / Description</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((item, idx) => {
                      const statusKey = item.orderStatus ?? (item.eventType.includes('fail') ? 'failed' : 'paid');
                      const dotClass = STATUS_DOT[statusKey as keyof typeof STATUS_DOT] ?? 'bg-muted-foreground';
                      const label = item.description || EVENT_LABEL[item.eventType] || item.eventType;

                      return (
                        <TableRow key={item.id ?? idx} className="hover:bg-muted/40">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3">
                            {formatDateSafe(item.createdAt)}
                          </TableCell>
                          <TableCell className="text-xs font-medium py-3">
                            <span className="text-foreground">{label}</span>
                            {item.paymentId && (
                              <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">
                                {item.paymentId}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge
                              variant="secondary"
                              className="gap-1.5 text-[11px] font-medium capitalize py-0.5 px-2 rounded-full border-0"
                            >
                              <span className={cn('size-1.5 rounded-full', dotClass)} />
                              {item.orderStatus ?? 'succeeded'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold py-3">
                            {money(item.amount, item.currency)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPayments > pageSize && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-7 text-xs"
                    disabled={paymentPage === 1 || paymentHistoryQuery.isLoading}
                    onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-muted-foreground text-xs">
                    Page {paymentPage} of {Math.max(1, Math.ceil(totalPayments / pageSize))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-7 text-xs"
                    disabled={paymentPage * pageSize >= totalPayments || paymentHistoryQuery.isLoading}
                    onClick={() => setPaymentPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )
        ) : (
          invoicesQuery.isLoading ? (
            <SkeletonTable rows={4} columns={5} />
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
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[160px] text-xs font-semibold">Date</TableHead>
                      <TableHead className="text-xs font-semibold">Invoice #</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Amount</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv) => {
                      const dotClass = STATUS_DOT[inv.status as keyof typeof STATUS_DOT] ?? 'bg-muted-foreground';
                      const num = inv.id.slice(0, 8);

                      return (
                        <TableRow key={inv.id} className="hover:bg-muted/40">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3">
                            {formatDateSafe(inv.paidAt || inv.periodStart)}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-medium py-3">
                            {num}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge
                              variant="secondary"
                              className="gap-1.5 text-[11px] font-medium capitalize py-0.5 px-2 rounded-full border-0"
                            >
                              <span className={cn('size-1.5 rounded-full', dotClass)} />
                              {inv.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold py-3">
                            {money(inv.totalAmount, inv.currency)}
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <div className="flex items-center justify-end gap-2.5">
                              {inv.receiptUrl ? (
                                <a
                                  href={inv.receiptUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary inline-flex items-center gap-1 hover:underline text-xs font-medium"
                                >
                                  Receipt <ExternalLink className="size-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalInvoices > pageSize && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-7 text-xs"
                    disabled={invoicePage === 1 || invoicesQuery.isLoading}
                    onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-muted-foreground text-xs">
                    Page {invoicePage} of {Math.max(1, Math.ceil(totalInvoices / pageSize))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-7 text-xs"
                    disabled={invoicePage * pageSize >= totalInvoices || invoicesQuery.isLoading}
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
