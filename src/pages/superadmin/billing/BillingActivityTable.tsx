import { format } from 'date-fns';
import React from 'react';

import EmptyState from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
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
import type { HistoryItem } from '@/types/billing';

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

function formatDateSafe(
  iso: string | null | undefined,
  formatStr = 'MMM d, yyyy, h:mm a',
): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return format(d, formatStr);
}

export const EVENT_DISPLAY_NAMES: Record<string, string> = {
  payment_succeeded: 'Payment succeeded',
  payment_failed: 'Payment failed',
  payment_pending: 'Payment pending',
  invoice_created: 'Invoice created',
  invoice_paid: 'Invoice paid',
  subscription_created: 'Subscription created',
  subscription_updated: 'Subscription active',
  subscription_cancelled: 'Subscription cancelled',
};

interface BillingActivityTableProps {
  items: HistoryItem[];
  maxRows?: number;
  onViewAll?: () => void;
  className?: string;
}

export default function BillingActivityTable({
  items,
  maxRows = 5,
  onViewAll,
  className,
}: BillingActivityTableProps) {
  const displayItems = maxRows ? items.slice(0, maxRows) : items;

  if (items.length === 0) {
    return (
      <Card className="p-6 text-center text-xs text-muted-foreground">
        No billing activity recorded yet.
      </Card>
    );
  }

  return (
    <Card size="sm" className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[180px] text-xs font-semibold">Date</TableHead>
            <TableHead className="text-xs font-semibold">Event</TableHead>
            <TableHead className="text-xs font-semibold">Status</TableHead>
            <TableHead className="text-xs font-semibold">Amount</TableHead>
            <TableHead className="text-xs font-semibold">Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayItems.map((item, idx) => {
            const statusKey = item.orderStatus ?? (item.eventType.includes('fail') ? 'failed' : 'paid');
            const dotClass = STATUS_DOT[statusKey as keyof typeof STATUS_DOT] ?? 'bg-muted-foreground';
            const eventName = EVENT_DISPLAY_NAMES[item.eventType] ?? item.eventType;

            return (
              <TableRow key={item.id ?? idx} className="hover:bg-muted/40">
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3">
                  {formatDateSafe(item.createdAt)}
                </TableCell>
                <TableCell className="font-mono text-xs font-medium py-3">
                  {eventName}
                </TableCell>
                <TableCell className="py-3">
                  <Badge
                    variant="secondary"
                    className="gap-1.5 text-[11px] font-medium capitalize py-0.5 px-2"
                  >
                    <span className={`size-1.5 rounded-full ${dotClass}`} />
                    {item.newStatus ?? statusKey}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs font-semibold py-3">
                  {formatCurrency(item.amount, item.currency)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-sm truncate py-3" title={item.description ?? ''}>
                  {item.description ?? '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
