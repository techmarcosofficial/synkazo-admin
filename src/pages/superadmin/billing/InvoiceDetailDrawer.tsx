import { useState } from 'react';
import { format } from 'date-fns';
import {
  ExternalLink,
  RefreshCw,
  FileText,
  Calendar,
  CreditCard,
  DollarSign,
  Info,
} from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/lib/toast';
import {
  useSuperAdminInvoiceDetailQuery,
  useRetryInvoiceMutation,
} from '@/queries/useSuperAdmin';
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

function formatDateSafe(
  iso: string | null | undefined,
  formatStr = 'PPp',
): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return format(d, formatStr);
}

function InvoiceStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} label={status} className="capitalize" />;
}

interface InvoiceDetailDrawerProps {
  organisationId: string;
  invoice: SuperAdminInvoiceListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InvoiceDetailDrawer({
  organisationId,
  invoice,
  open,
  onOpenChange,
}: InvoiceDetailDrawerProps) {
  const [retryNote, setRetryNote] = useState('');
  const [showRetryConfirm, setShowRetryConfirm] = useState(false);

  const detailQuery = useSuperAdminInvoiceDetailQuery(
    organisationId,
    invoice?.id ?? null,
    open && !!invoice?.id,
  );

  const retryMutation = useRetryInvoiceMutation(organisationId);

  if (!invoice) return null;

  const detail = detailQuery.data;
  const currency = detail?.currency ?? invoice.currency;
  const status = detail?.status ?? invoice.status;
  const invoiceNumber = invoice.invoiceNumber ?? invoice.id.slice(0, 8);
  const hostedUrl = invoice.hostedInvoiceUrl || invoice.receiptUrl;

  const totalAmount =
    detail?.totalAmount ??
    invoice.totalAmount ??
    detail?.amount ??
    invoice.amount ??
    0;
  const subtotal = detail?.subtotal ?? totalAmount;
  const discountAmount = detail?.discountAmount ?? 0;
  const taxAmount = detail?.taxAmount ?? 0;
  const amountPaid =
    invoice.amountPaid ?? (status === 'paid' ? totalAmount : 0);
  const amountDue = invoice.amountDue ?? (status === 'paid' ? 0 : totalAmount);

  const canRetry =
    status === 'failed' || status === 'open' || status === 'uncollectible';

  const handleRetryPayment = async () => {
    try {
      await retryMutation.mutateAsync({
        invoiceId: invoice.id,
        dto: { note: retryNote.trim() || undefined },
      });
      showToast.success('Payment retry triggered successfully.');
      setShowRetryConfirm(false);
      setRetryNote('');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast.error(e?.response?.data?.message ?? 'Failed to retry payment.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b pb-4 pr-12 space-y-1.5">
          <SheetTitle className="flex items-center gap-2 font-mono text-lg truncate">
            <FileText className="size-5 text-muted-foreground shrink-0" />
            <span>Invoice {invoiceNumber}</span>
          </SheetTitle>
          <div className="pt-0.5">
            <InvoiceStatusBadge status={status} />
          </div>
          <SheetDescription className="text-xs">
            Internal ID: <code className="font-mono text-xs">{invoice.id}</code>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6 px-4">
          {/* Amount Breakdown Card */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="size-3.5" />
              Amount breakdown
            </h3>
            {detailQuery.isLoading ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">
                    {formatCurrency(subtotal, currency)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount</span>
                    <span className="font-mono">
                      -{formatCurrency(discountAmount, currency)}
                    </span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span className="font-mono">
                      +{formatCurrency(taxAmount, currency)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total Amount</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(totalAmount, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  <span>Amount Paid</span>
                  <span className="font-mono">
                    {formatCurrency(amountPaid, currency)}
                  </span>
                </div>
                {amountDue > 0 && (
                  <div className="flex justify-between text-xs font-medium text-amber-700">
                    <span>Amount Due</span>
                    <span className="font-mono">
                      {formatCurrency(amountDue, currency)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timeline & Dates */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              Dates & Period
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block">Created / Issued</span>
                <span className="font-medium">
                  {formatDateSafe(invoice.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Paid At</span>
                <span className="font-medium">
                  {formatDateSafe(invoice.paidAt)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Period Start</span>
                <span className="font-medium">
                  {formatDateSafe(invoice.periodStart, 'PP')}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Period End</span>
                <span className="font-medium">
                  {formatDateSafe(invoice.periodEnd, 'PP')}
                </span>
              </div>
            </div>
          </div>

          {/* Actions & Links */}
          <div className="space-y-4">
            {hostedUrl && (
              <Button
                variant="outline"
                className="w-full justify-between rounded-xl"
                asChild
              >
                <a
                  href={hostedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="size-4" />
                    Open Stripe hosted invoice / receipt
                  </span>
                  <span className="text-xs text-muted-foreground">PDF / Web</span>
                </a>
              </Button>
            )}

            {/* Provider Retry action (CAP-028) */}
            {canRetry && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="size-4 text-amber-700 mt-0.5" />
                  <div className="text-xs text-amber-800">
                    <p className="font-medium">Retry Invoice Payment</p>
                    <p className="mt-0.5">
                      Trigger an audited Stripe payment attempt using the customer&rsquo;s default payment method.
                    </p>
                  </div>
                </div>

                {showRetryConfirm ? (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <Label htmlFor="retry-note" className="text-xs">
                        Audit note (optional)
                      </Label>
                      <Input
                        id="retry-note"
                        placeholder="e.g. Customer confirmed new card on file"
                        value={retryNote}
                        onChange={(e) => setRetryNote(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleRetryPayment}
                        disabled={retryMutation.isPending}
                      >
                        {retryMutation.isPending ? (
                          <RefreshCw className="mr-1.5 size-3.5 animate-spin" />
                        ) : null}
                        Confirm Retry
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowRetryConfirm(false)}
                        disabled={retryMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-900 hover:bg-amber-100"
                    onClick={() => setShowRetryConfirm(true)}
                  >
                    <RefreshCw className="mr-1.5 size-3.5" />
                    Retry Payment with Stripe
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
