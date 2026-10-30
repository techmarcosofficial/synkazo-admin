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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

export default function TenantBillingHistorySection({
  className,
}: {
  className?: string;
}) {
  // ── Table 1: Invoices state & queries ─────────────────────────────────────
  const [invoiceDateRange, setInvoiceDateRange] = useState<DateRangeValue>({});
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [invoicePage, setInvoicePage] = useState(1);
  const invoicePageSize = 5;

  const invoicesQuery = useInvoicesQuery(invoicePage, invoicePageSize);
  const rawInvoices = invoicesQuery.data?.items ?? [];
  const totalInvoices = invoicesQuery.data?.total ?? 0;

  // ── Table 2: Payment History state & queries ──────────────────────────────
  const [paymentDateRange, setPaymentDateRange] = useState<DateRangeValue>({});
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [paymentPage, setPaymentPage] = useState(1);
  const paymentPageSize = 5;

  const paymentHistoryQuery = usePaymentHistoryQuery(paymentPage, paymentPageSize);
  const rawPayments = paymentHistoryQuery.data?.items ?? [];
  const totalPayments = paymentHistoryQuery.data?.total ?? 0;

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return rawInvoices.filter((inv) => {
      // Date filter
      if (invoiceDateRange.from || invoiceDateRange.to) {
        const invDateStr = inv.paidAt || inv.periodStart;
        if (!invDateStr) return false;
        const d = invDateStr.slice(0, 10);
        if (invoiceDateRange.from && d < invoiceDateRange.from) return false;
        if (invoiceDateRange.to && d > invoiceDateRange.to) return false;
      }
      // Status filter
      if (invoiceStatusFilter !== 'all') {
        if (inv.status !== invoiceStatusFilter) return false;
      }
      return true;
    });
  }, [rawInvoices, invoiceDateRange, invoiceStatusFilter]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return rawPayments.filter((item) => {
      // Date filter
      if (paymentDateRange.from || paymentDateRange.to) {
        if (!item.createdAt) return false;
        const d = item.createdAt.slice(0, 10);
        if (paymentDateRange.from && d < paymentDateRange.from) return false;
        if (paymentDateRange.to && d > paymentDateRange.to) return false;
      }
      // Status filter
      if (paymentStatusFilter !== 'all') {
        if (item.orderStatus !== paymentStatusFilter) return false;
      }
      return true;
    });
  }, [rawPayments, paymentDateRange, paymentStatusFilter]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Hidden main title for accessibility and test match */}
      <div className="sr-only">
        <h2>Billing &amp; Payment History</h2>
      </div>

      {/* ── Table 1: All Invoices Card ────────────────────────────────────── */}
      <Card>
        <CardHeader visualLevel="section">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2.5">
              <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-xl">
                <Receipt className="size-4" aria-hidden="true" />
              </span>
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span>All invoices</span>
                  {totalInvoices > 0 && (
                    <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0 border-0 font-normal">
                      {totalInvoices}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Stripe tax invoices and downloadable receipts.
                </CardDescription>
              </div>
            </div>

            {/* Invoices Dedicated Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={invoiceStatusFilter}
                onValueChange={(val) => {
                  setInvoiceStatusFilter(val);
                  setInvoicePage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[110px] rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>

              <DateRangePicker
                value={invoiceDateRange}
                onChange={(range) => {
                  setInvoiceDateRange(range);
                  setInvoicePage(1);
                }}
                placeholder="Filter by date"
                className="h-8 text-xs px-2.5 rounded-xl"
              />

              {(invoiceDateRange.from || invoiceDateRange.to || invoiceStatusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                  title="Clear invoice filters"
                  aria-label="Clear invoice filters"
                  onClick={() => {
                    setInvoiceDateRange({});
                    setInvoiceStatusFilter('all');
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {invoicesQuery.isLoading ? (
            <SkeletonTable rows={3} columns={5} />
          ) : invoicesQuery.isError ? (
            <ErrorState
              title="Could not load invoices"
              onRetry={() => invoicesQuery.refetch()}
            />
          ) : filteredInvoices.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {invoiceDateRange.from || invoiceDateRange.to || invoiceStatusFilter !== 'all' ? (
                <div className="space-y-1.5">
                  <p>No invoices match the selected filters.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] rounded-lg"
                    onClick={() => {
                      setInvoiceDateRange({});
                      setInvoiceStatusFilter('all');
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <EmptyState icon={Receipt} title="No invoices yet" viewMode="table" />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border">
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
                      const dotClass =
                        STATUS_DOT[inv.status as keyof typeof STATUS_DOT] ?? 'bg-muted-foreground';
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

              {totalInvoices > invoicePageSize && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-6 text-[11px] px-2"
                    disabled={invoicePage === 1 || invoicesQuery.isLoading}
                    onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-muted-foreground text-[11px]">
                    Page {invoicePage} of {Math.max(1, Math.ceil(totalInvoices / invoicePageSize))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-6 text-[11px] px-2"
                    disabled={invoicePage * invoicePageSize >= totalInvoices || invoicesQuery.isLoading}
                    onClick={() => setInvoicePage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Table 2: All Payment History Card ─────────────────────────────── */}
      <Card>
        <CardHeader visualLevel="section">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2.5">
              <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-xl">
                <CreditCard className="size-4" aria-hidden="true" />
              </span>
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span>All payment history</span>
                  {totalPayments > 0 && (
                    <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0 border-0 font-normal">
                      {totalPayments}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Recent payments and transaction outcomes.
                </CardDescription>
              </div>
            </div>

            {/* Payments Dedicated Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={paymentStatusFilter}
                onValueChange={(val) => {
                  setPaymentStatusFilter(val);
                  setPaymentPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[115px] rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All outcomes</SelectItem>
                  <SelectItem value="paid">Succeeded</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              <DateRangePicker
                value={paymentDateRange}
                onChange={(range) => {
                  setPaymentDateRange(range);
                  setPaymentPage(1);
                }}
                placeholder="Filter by date"
                className="h-8 text-xs px-2.5 rounded-xl"
              />

              {(paymentDateRange.from || paymentDateRange.to || paymentStatusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                  title="Clear payment filters"
                  aria-label="Clear payment filters"
                  onClick={() => {
                    setPaymentDateRange({});
                    setPaymentStatusFilter('all');
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {paymentHistoryQuery.isLoading ? (
            <SkeletonTable rows={3} columns={4} />
          ) : paymentHistoryQuery.isError ? (
            <ErrorState
              title="Could not load payment history"
              onRetry={() => paymentHistoryQuery.refetch()}
            />
          ) : filteredPayments.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {paymentDateRange.from || paymentDateRange.to || paymentStatusFilter !== 'all' ? (
                <div className="space-y-1.5">
                  <p>No payment events match the selected filters.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] rounded-lg"
                    onClick={() => {
                      setPaymentDateRange({});
                      setPaymentStatusFilter('all');
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <EmptyState icon={CreditCard} title="No payment events yet" viewMode="table" />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[160px] text-xs font-semibold">Date</TableHead>
                      <TableHead className="text-xs font-semibold">Event</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((item) => {
                      const dotClass =
                        STATUS_DOT[item.orderStatus as keyof typeof STATUS_DOT] ??
                        'bg-muted-foreground';

                      return (
                        <TableRow key={item.id} className="hover:bg-muted/40">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3">
                            {formatDateSafe(item.createdAt)}
                          </TableCell>
                          <TableCell className="text-xs font-medium py-3">
                            {item.description || item.eventType}
                          </TableCell>
                          <TableCell className="py-3">
                            {item.orderStatus ? (
                              <Badge
                                variant="secondary"
                                className="gap-1.5 text-[11px] font-medium capitalize py-0.5 px-2 rounded-full border-0"
                              >
                                <span className={cn('size-1.5 rounded-full', dotClass)} />
                                {item.orderStatus.replace('_', ' ')}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-right py-3">
                            {money(item.amount, item.currency)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPayments > paymentPageSize && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-6 text-[11px] px-2"
                    disabled={paymentPage === 1 || paymentHistoryQuery.isLoading}
                    onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-muted-foreground text-[11px]">
                    Page {paymentPage} of {Math.max(1, Math.ceil(totalPayments / paymentPageSize))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-6 text-[11px] px-2"
                    disabled={paymentPage * paymentPageSize >= totalPayments || paymentHistoryQuery.isLoading}
                    onClick={() => setPaymentPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
