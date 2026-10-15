import { X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import DateRangePicker, { type DateRangeValue } from '@/components/shared/DateRangePicker';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EVENT_DISPLAY_NAMES } from '@/pages/superadmin/billing/BillingActivityTable';
import BillingInvoicesTable from '@/pages/superadmin/billing/BillingInvoicesTable';
import { BillingTimeline } from '@/pages/organisation/billing/tabs/BillingTimeline';
import { STATUS_DOT } from '@/pages/organisation/billing/tabs/InvoicesTab';
import { cn } from '@/lib/utils';
import {
  useSuperAdminBillingHistoryQuery,
  useSuperAdminInvoicesQuery,
} from '@/queries/useSuperAdmin';
import type { SuperAdminInvoiceListItem } from '@/types';

function formatCurrency(
  amount: number | null | undefined,
  currency?: string | null,
): string {
  if (amount == null) return '—';
  const c = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: c,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${c}`;
  }
}

interface BillingHistorySectionProps {
  organisationId: string;
  onOpenDetail: (invoice: SuperAdminInvoiceListItem) => void;
  className?: string;
}

export default function BillingHistorySection({
  organisationId,
  onOpenDetail,
  className,
}: BillingHistorySectionProps) {
  const [subSection, setSubSection] = useState<'activity' | 'invoices'>('activity');

  // History query state
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(20);
  const [historyOnlyPayments, setHistoryOnlyPayments] = useState(false);

  // Date range filter state (for auditing purchase events on specific days)
  const [dateRange, setDateRange] = useState<DateRangeValue>({});

  // Invoices query state
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(10);

  const historyQuery = useSuperAdminBillingHistoryQuery(
    organisationId,
    historyPage,
    historyPageSize,
    historyOnlyPayments,
  );

  const invoicesQuery = useSuperAdminInvoicesQuery(
    organisationId,
    invoicePage,
    invoicePageSize,
  );

  const rawHistoryItems = historyQuery.data?.data ?? [];
  const totalHistory = historyQuery.data?.total ?? 0;

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

  const invoices = invoicesQuery.data?.data ?? [];
  const totalInvoices = invoicesQuery.data?.total ?? 0;

  // Filter invoices if date range is active
  const filteredInvoices = useMemo(() => {
    if (!dateRange.from && !dateRange.to) {
      return invoices;
    }
    return invoices.filter((inv) => {
      const invDateStr = inv.createdAt || inv.periodStart;
      if (!invDateStr) return false;
      const invDate = invDateStr.slice(0, 10);
      if (dateRange.from && invDate < dateRange.from) return false;
      if (dateRange.to && invDate > dateRange.to) return false;
      return true;
    });
  }, [invoices, dateRange]);

  return (
    <Card className={cn('gap-0 py-0', className)}>
      <CardHeader className="p-4 sm:p-5 pb-4 border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold">
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
                variant={historyOnlyPayments ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-2.5 text-xs rounded-xl"
                onClick={() => {
                  setHistoryOnlyPayments(!historyOnlyPayments);
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
          historyQuery.isLoading ? (
            <SkeletonTable rows={5} columns={5} />
          ) : historyQuery.isError ? (
            <ErrorState
              title="Could not load payment activity"
              onRetry={() => historyQuery.refetch()}
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
                'No activity events found.'
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <BillingTimeline
                items={filteredHistoryItems.map((ev, i) => ({
                  key: ev.id ?? `${ev.paymentId}-${i}`,
                  date: ev.createdAt,
                  title: EVENT_DISPLAY_NAMES[ev.eventType] ?? ev.eventType,
                  description: ev.description,
                  amount:
                    ev.amount != null && ev.currency
                      ? formatCurrency(ev.amount, ev.currency)
                      : null,
                  dotClassName: ev.orderStatus
                    ? (STATUS_DOT[ev.orderStatus] ?? 'bg-muted-foreground')
                    : 'bg-muted-foreground',
                  status: ev.newStatus ?? ev.orderStatus ?? undefined,
                  paymentId: ev.paymentId ?? undefined,
                  oldStatus: ev.oldStatus ?? undefined,
                  newStatus: ev.newStatus ?? undefined,
                }))}
              />
              {totalHistory > historyPageSize && (
                <PaginationBar
                  page={historyPage}
                  totalPages={Math.max(1, Math.ceil(totalHistory / historyPageSize))}
                  total={totalHistory}
                  pageSize={historyPageSize}
                  onPageChange={setHistoryPage}
                  onPageSizeChange={(size) => {
                    setHistoryPageSize(size);
                    setHistoryPage(1);
                  }}
                />
              )}
            </div>
          )
        ) : invoicesQuery.isLoading ? (
          <SkeletonTable rows={4} columns={7} />
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
              'No invoices yet.'
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <BillingInvoicesTable
              invoices={filteredInvoices}
              onOpenDetail={onOpenDetail}
            />
            {totalInvoices > invoicePageSize && (
              <PaginationBar
                page={invoicePage}
                totalPages={Math.max(1, Math.ceil(totalInvoices / invoicePageSize))}
                total={totalInvoices}
                pageSize={invoicePageSize}
                onPageChange={setInvoicePage}
                onPageSizeChange={(size) => {
                  setInvoicePageSize(size);
                  setInvoicePage(1);
                }}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
