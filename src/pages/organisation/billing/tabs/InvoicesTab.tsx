import { ExternalLink, Receipt } from 'lucide-react';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import { Badge } from '@/components/ui/badge';
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
import { useInvoicesQuery } from '@/queries/useBilling';
import type { OrderStatus } from '@/types';

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);

export const STATUS_DOT: Partial<Record<OrderStatus, string>> = {
  paid: 'bg-success',
  refunded: 'bg-warning',
  partially_refunded: 'bg-warning',
  failed: 'bg-destructive',
  open: 'bg-info',
  pending: 'bg-info',
};

export default function InvoicesTab() {
  const { data, isLoading, isError, refetch } = useInvoicesQuery(1, 50);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>Your past payments and receipts.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonTable rows={4} columns={4} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices yet" viewMode="table" />
        ) : (
          <div className="overflow-hidden rounded-4xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      {inv.paidAt ? new Date(inv.paidAt).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell>
                      {money(inv.totalAmount, inv.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-muted text-muted-foreground gap-1.5">
                        <span
                          className={`size-1.5 rounded-full ${STATUS_DOT[inv.status] ?? 'bg-muted-foreground'}`}
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
                          className="text-primary inline-flex items-center gap-1 hover:underline"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        '—'
                      )}
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
