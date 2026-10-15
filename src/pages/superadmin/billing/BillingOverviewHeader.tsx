import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  Check,
  Copy,
  CreditCard,
  FileText,
  Layers,
  Sparkles,
} from 'lucide-react';
import React, { useState } from 'react';

import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { SuperAdminBillingOverview } from '@/types';

interface BillingOverviewHeaderProps {
  overview: SuperAdminBillingOverview;
  subscriptionId?: string | null;
  className?: string;
}

export default function BillingOverviewHeader({
  overview,
  subscriptionId,
  className,
}: BillingOverviewHeaderProps) {
  const [copied, setCopied] = useState(false);
  const { plan } = overview;

  const periodEndDate = plan.currentPeriodEnd
    ? new Date(plan.currentPeriodEnd)
    : null;
  const isPeriodEndValid =
    periodEndDate && !isNaN(periodEndDate.getTime());

  const periodEndText = isPeriodEndValid
    ? `${format(periodEndDate, 'MMM d, yyyy')} (in ${formatDistanceToNow(periodEndDate)})`
    : 'Ongoing';

  const providerSource =
    plan.planAccessSource === 'manual_override'
      ? 'Super Admin assignment'
      : plan.planAccessSource === 'stripe_subscription'
        ? 'Stripe subscription'
        : 'Free plan';

  const intervalLabel =
    plan.billingInterval && plan.billingInterval.toLowerCase() === 'year'
      ? 'Yearly'
      : plan.billingInterval && plan.billingInterval.toLowerCase() === 'month'
        ? 'Monthly'
        : plan.billingInterval
          ? plan.billingInterval
          : plan.planAccessSource === 'stripe_subscription'
            ? 'Monthly'
            : 'None';

  const subIdDisplay = subscriptionId
    ? subscriptionId.length > 22
      ? `${subscriptionId.slice(0, 18)}...`
      : subscriptionId
    : 'None';

  const handleCopySubscriptionId = () => {
    if (!subscriptionId) return;
    navigator.clipboard.writeText(subscriptionId);
    setCopied(true);
    showToast.success('Subscription ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor =
    plan.subscriptionStatus === 'active'
      ? 'bg-success'
      : plan.subscriptionStatus === 'past_due'
        ? 'bg-amber-500'
        : 'bg-slate-400';

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Billing Overview
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage this organisation&rsquo;s subscription, view invoices and payment
          history, and add internal notes.
        </p>
      </div>

      {/* 6 mini stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Current plan */}
        <div className="rounded-2xl border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Layers className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span>Current plan</span>
          </div>
          <div className="mt-1.5 font-semibold text-sm capitalize truncate">
            {plan.planName}
          </div>
        </div>

        {/* Card 2: Status */}
        <div className="rounded-2xl border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn('size-2 rounded-full inline-block', statusColor)}
              aria-hidden="true"
            />
            <span>Status</span>
          </div>
          <div className="mt-1.5 font-semibold text-sm capitalize truncate">
            {plan.subscriptionStatus}
          </div>
        </div>

        {/* Card 3: Billing interval */}
        <div className="rounded-2xl border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span>Billing interval</span>
          </div>
          <div className="mt-1.5 font-semibold text-sm truncate">
            {intervalLabel}
          </div>
        </div>

        {/* Card 4: Provider / source */}
        <div className="rounded-2xl border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CreditCard className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span>Provider / source</span>
          </div>
          <div className="mt-1.5 font-semibold text-sm truncate">
            {providerSource}
          </div>
        </div>

        {/* Card 5: Current period ends */}
        <div className="rounded-2xl border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span>Current period ends</span>
          </div>
          <div className="mt-1.5 font-semibold text-xs sm:text-sm truncate" title={periodEndText}>
            {periodEndText}
          </div>
        </div>

        {/* Card 6: Subscription ID */}
        <div className="rounded-2xl border bg-card p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span>Subscription ID</span>
            </div>
            {subscriptionId && (
              <button
                type="button"
                onClick={handleCopySubscriptionId}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                title="Copy full subscription ID"
              >
                {copied ? (
                  <Check className="size-3 text-success" />
                ) : (
                  <Copy className="size-3" />
                )}
              </button>
            )}
          </div>
          <div
            className="mt-1.5 font-mono text-xs truncate text-muted-foreground"
            title={subscriptionId ?? 'None'}
          >
            {subIdDisplay}
          </div>
        </div>
      </div>
    </div>
  );
}
