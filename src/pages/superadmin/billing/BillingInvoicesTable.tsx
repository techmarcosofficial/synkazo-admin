import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Eye, RefreshCw } from 'lucide-react';
import React from 'react';

import EmptyState from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { STATUS_DOT } from '@/pages/organisation/billing/tabs/InvoicesTab';
import type { SuperAdminInvoiceListItem } from '@/types';

function formatCurrency(
  amount: number | null | undefined,
  currency?: string | null,
): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const c = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: c,
    }).format(num / 100);
  } catch {
    return `${(num / 100).toFixed(2)} ${c}`;
  }
}

interface BillingInvoicesTableProps {
  invoices: SuperAdminInvoiceListItem[];
  onOpenDetail: (invoice: SuperAdminInvoiceListItem) => void;
  maxRows?: number;
  className?: string;
}

export default function BillingInvoicesTable({
  invoices,
  onOpenDetail,
  maxRows,
  className,
}: BillingInvoicesTableProps) {
  const displayItems = maxRows ? invoices.slice(0, maxRows) : invoices;

  if (invoices.length === 0) {
    return (
      <Card className="p-6 text-center text-xs text-muted-foreground">
        No invoices yet
      </Card>
    );
  }

  return (
    <Card size="sm" className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-semibold">Invoice number</TableHead>
            <TableHead className="text-xs font-semibold">Status</TableHead>
            <TableHead className="text-xs font-semibold">Amount due</TableHead>
            <TableHead className="text-xs font-semibold">Amount paid</TableHead>
            <TableHead className="text-xs font-semibold">Issued</TableHead>
            <TableHead className="text-xs font-semibold">Paid</TableHead>
            <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayItems.map((invoice) => {
            const num = invoice.invoiceNumber ?? invoice.id.slice(0, 8);
            const statusKey = invoice.status.toLowerCase();
            const dotClass = STATUS_DOT[statusKey as keyof typeof STATUS_DOT] ?? 'bg-muted-foreground';

            return (
              <TableRow key={invoice.id} className="hover:bg-muted/40">
                <TableCell className="font-mono text-xs font-medium py-3">
                  <button
                    type="button"
                    onClick={() => onOpenDetail(invoice)}
                    className="text-primary hover:underline font-medium text-left"
                  >
                    {num}
                  </button>
                </TableCell>
                <TableCell className="py-3">
                  <Badge
                    variant="secondary"
                    className="gap-1.5 text-[11px] font-medium capitalize py-0.5 px-2"
                  >
                    <span className={`size-1.5 rounded-full ${dotClass}`} />
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs py-3">
                  {formatCurrency(
                    invoice.amountDue ??
                      invoice.totalAmount ??
                      invoice.amount ??
                      0,
                    invoice.currency,
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs py-3">
                  {formatCurrency(
                    invoice.amountPaid ??
                      (invoice.status === 'paid'
                        ? (invoice.totalAmount ?? invoice.amount ?? 0)
                        : 0),
                    invoice.currency,
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-3">
                  {invoice.createdAt &&
                  !isNaN(new Date(invoice.createdAt).getTime())
                    ? formatDistanceToNow(new Date(invoice.createdAt), {
                        addSuffix: true,
                      })
                    : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-3">
                  {invoice.paidAt &&
                  !isNaN(new Date(invoice.paidAt).getTime())
                    ? formatDistanceToNow(new Date(invoice.paidAt), {
                        addSuffix: true,
                      })
                    : '—'}
                </TableCell>
                <TableCell className="text-right py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onOpenDetail(invoice)}
                    >
                      <Eye className="mr-1 size-3.5" />
                      View details
                    </Button>
                    {invoice.hostedInvoiceUrl || invoice.receiptUrl ? (
                      <a
                        href={(invoice.hostedInvoiceUrl || invoice.receiptUrl)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-1 text-xs hover:underline font-medium ml-1"
                      >
                        Open <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
