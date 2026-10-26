import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CreditCard,
  Loader2,
  Plus,
  Sparkles,
} from 'lucide-react';
import React from 'react';

import CardBrandLogo from '@/components/billing/CardBrandLogo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/pages/organisation/billing/lib/billingDisplay';
import type { PaymentMethodView } from '@/types';

function billingIntervalLabel(interval: string | null | undefined): string {
  if (!interval) return 'Monthly';
  if (interval === 'year' || interval === 'yearly') return 'Annual billing';
  return 'Monthly billing';
}

function formatPrice(cents: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(0)}`;
  }
}

export interface UpcomingBillingAndPaymentCardProps {
  plan: {
    planName: string;
    billingInterval?: string | null;
    subscriptionStatus?: string | null;
    trialEndsAt?: string | null;
  };
  renewalDate: string | null;
  renewalLabel?: string;
  trialDays?: number | null;
  currentPrice?: { amount: number; currency: string } | null;
  hasSubscription: boolean;
  pendingCancel?: boolean;
  pendingPlanName?: string | null;
  pendingPlanChangeAt?: string | null;
  creditBalance?: number | null;
  defaultCard?: PaymentMethodView | null;
  onManageCards: () => void;
  onCancelSubscription?: () => void;
  onReactivateSubscription?: () => void;
  onCancelScheduledChange?: () => void;
  isCancellingScheduledChange?: boolean;
  isReactivating?: boolean;
  canManageCards?: boolean;
  className?: string;
}

export default function UpcomingBillingAndPaymentCard({
  plan,
  renewalDate,
  renewalLabel = 'Renews on',
  trialDays,
  currentPrice,
  hasSubscription,
  pendingCancel = false,
  pendingPlanName,
  pendingPlanChangeAt,
  creditBalance,
  defaultCard,
  onManageCards,
  onCancelSubscription,
  onReactivateSubscription,
  onCancelScheduledChange,
  isCancellingScheduledChange = false,
  isReactivating = false,
  canManageCards = true,
  className,
}: UpcomingBillingAndPaymentCardProps) {
  const isPastDue = plan.subscriptionStatus === 'past_due';

  return (
    <Card size="sm" className={className}>
      <div className="p-4 sm:p-5 space-y-4">
        {/* Header with Title and "Manage cards" Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" aria-hidden="true" />
              <span>Upcoming billing &amp; Payment Method</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Scheduled renewal date and primary card on file for recurring charges.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full text-[10px] px-2.5 py-0.5 border-0">
              {billingIntervalLabel(plan.billingInterval)}
            </Badge>

            {canManageCards && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-lg px-2.5 text-primary hover:text-primary font-medium"
                onClick={onManageCards}
              >
                <CreditCard className="size-3 mr-1.5" />
                {defaultCard ? 'Manage cards' : '+ Add card'}
              </Button>
            )}
          </div>
        </div>

        {/* ── Contextual Lifecycle Alerts ─────────────────────────────────── */}
        {pendingCancel && (
          <div className="border-warning/30 bg-warning/10 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-warning size-4 shrink-0" />
              <p className="text-warning text-xs font-medium">
                Subscription scheduled to cancel on {formatDate(renewalDate)}.
              </p>
            </div>
            {onReactivateSubscription && (
              <Button
                size="sm"
                className="rounded-lg h-7 text-xs"
                onClick={onReactivateSubscription}
                disabled={isReactivating}
              >
                {isReactivating && <Loader2 className="mr-1.5 size-3 animate-spin" />}
                Reactivate
              </Button>
            )}
          </div>
        )}

        {pendingPlanName && pendingPlanChangeAt && (
          <div className="border-info/30 bg-info/10 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="text-info size-4 shrink-0" />
              <p className="text-info text-xs font-medium">
                Switching to {pendingPlanName} on {formatDate(pendingPlanChangeAt)}.
              </p>
            </div>
            {onCancelScheduledChange && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg h-7 text-xs"
                onClick={onCancelScheduledChange}
                disabled={isCancellingScheduledChange}
              >
                {isCancellingScheduledChange && (
                  <Loader2 className="mr-1.5 size-3 animate-spin" />
                )}
                Cancel change
              </Button>
            )}
          </div>
        )}

        {creditBalance != null && creditBalance > 0 && (
          <div className="border-success/30 bg-success/10 flex items-center justify-between rounded-xl border p-3 text-xs">
            <span className="text-success font-medium">
              Credit balance: {formatPrice(creditBalance, 'USD')} available toward future charges.
            </span>
          </div>
        )}

        {isPastDue && (
          <div className="border-destructive/30 bg-destructive/10 flex items-center justify-between rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-destructive size-4" />
              <p className="text-destructive text-xs font-medium">
                Payment failed. Please update your payment method.
              </p>
            </div>
            {canManageCards && (
              <Button
                size="sm"
                variant="destructive"
                className="rounded-lg h-7 text-xs"
                onClick={onManageCards}
              >
                Update card
              </Button>
            )}
          </div>
        )}

        {/* ── Two-Box Grid: Left = Upcoming billing | Right = Payment method on file ── */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {/* Box 1: Upcoming Billing */}
          <div className="flex flex-col justify-between rounded-xl border bg-muted/20 p-3.5 space-y-2">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="size-3 text-muted-foreground" aria-hidden="true" />
                  Upcoming billing
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {plan.planName} tier
                </span>
              </div>

              <div className="pt-1.5">
                <p className="text-base font-bold">
                  {currentPrice
                    ? `${formatPrice(currentPrice.amount, currentPrice.currency)}`
                    : 'Free'}
                  {currentPrice && (
                    <span className="text-muted-foreground font-normal text-xs ml-1">
                      / {plan.billingInterval ?? 'month'}
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {renewalLabel}:{' '}
                  <strong className="text-foreground font-medium">
                    {formatDate(renewalDate)}
                  </strong>
                  {trialDays != null && (
                    <span className="ml-1 text-primary">({trialDays} days left)</span>
                  )}
                </p>
              </div>
            </div>

            {hasSubscription && !pendingCancel && onCancelSubscription && (
              <div className="pt-2 border-t border-border/40 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 px-2 rounded-lg"
                  onClick={onCancelSubscription}
                >
                  Cancel subscription
                </Button>
              </div>
            )}
          </div>

          {/* Box 2: Payment Method on File */}
          <div className="flex flex-col justify-between rounded-xl border bg-muted/20 p-3.5 space-y-2">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="size-3 text-muted-foreground" aria-hidden="true" />
                  Payment Method on File
                </span>
                {defaultCard?.isDefault && (
                  <Badge variant="secondary" className="rounded-full text-[10px] px-1.5 py-0 border-0 bg-primary/10 text-primary">
                    Default
                  </Badge>
                )}
              </div>

              {defaultCard ? (
                <div className="pt-1.5">
                  <div className="flex items-center gap-2">
                    <CardBrandLogo brand={defaultCard.cardBrand} className="h-5 w-8 shrink-0" />
                    <span className="font-semibold text-xs tracking-wider uppercase text-foreground">
                      {defaultCard.cardBrand?.toUpperCase() ?? 'CARD'}
                    </span>
                    <span className="font-mono text-xs tracking-widest text-muted-foreground">
                      •••• {defaultCard.cardLast4}
                    </span>
                  </div>

                  {defaultCard.cardExpMonth && defaultCard.cardExpYear && (
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      Expires {defaultCard.cardExpMonth.toString().padStart(2, '0')}/
                      {defaultCard.cardExpYear}
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-2 text-xs text-muted-foreground flex items-center justify-between">
                  <span>No card saved on file.</span>
                  {canManageCards && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px] px-2 rounded-lg"
                      onClick={onManageCards}
                    >
                      <Plus className="size-2.5 mr-1" /> Add card
                    </Button>
                  )}
                </div>
              )}
            </div>

            {canManageCards && (
              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-[11px] text-primary"
                  onClick={onManageCards}
                >
                  {defaultCard ? 'Manage cards & view details →' : '+ Add a payment method →'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <p className="text-muted-foreground text-[10px] leading-relaxed pt-1 border-t border-border/50">
          {pendingCancel
            ? 'Cancellation is scheduled for the end of this billing period.'
            : plan.subscriptionStatus === 'trialing'
              ? `Billing begins automatically after the trial on ${formatDate(plan.trialEndsAt ?? null)}.`
              : 'Your subscription renews automatically on the date shown above.'}
        </p>
      </div>
    </Card>
  );
}
