import {
  Ban,
  Building2,
  CircleStop,
  Clock,
  CreditCard,
  PlayCircle,
  XCircle,
} from 'lucide-react';
import React, { useState } from 'react';

import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  SubscriptionStatus,
  SuperAdminOrganisationDetail,
} from '@/types';

interface BillingActionsProps {
  organisation: SuperAdminOrganisationDetail;
  planName: string;
  subscriptionStatus: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  planAccessSource?: string | null;
  onAssignPlan?: () => void;
  onToggleHold: () => void;
  onCancelAtPeriodEnd: () => void;
  onResumeSubscription: () => void;
  onCancelImmediate: () => void;
  className?: string;
}

export default function BillingActions({
  organisation,
  planName,
  subscriptionStatus,
  cancelAtPeriodEnd,
  planAccessSource,
  onAssignPlan,
  onToggleHold,
  onCancelAtPeriodEnd,
  onResumeSubscription,
  onCancelImmediate,
  className,
}: BillingActionsProps) {
  const hasSubscription = subscriptionStatus !== 'none';
  const canScheduleCancel =
    hasSubscription &&
    !cancelAtPeriodEnd &&
    subscriptionStatus !== 'pending_cancel' &&
    subscriptionStatus !== 'canceled';
  const canResume =
    cancelAtPeriodEnd || subscriptionStatus === 'pending_cancel';
  const canCancelImmediate =
    hasSubscription && subscriptionStatus !== 'canceled';

  const paymentHoldActive = organisation.paymentHoldActive ?? false;

  const providerLabel =
    planAccessSource === 'stripe_subscription'
      ? 'Stripe subscription'
      : planAccessSource === 'manual_override'
        ? 'Super Admin assignment'
        : 'Free plan';

  return (
    <Card
      className={cn(
        'flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {/* Left: Organisation Identity & Metadata */}
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-muted/40 text-foreground">
          <Building2 className="size-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {organisation.name}
            </h1>
            <StatusBadge status={organisation.status} label={organisation.status} tone={organisation.status === 'pending' ? 'info' : undefined} className="capitalize" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {organisation.slug} &middot; {providerLabel} &middot;{' '}
            <span className="capitalize">{planName} plan</span>
          </p>
        </div>
      </div>

      {/* Right: Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Impose / Clear payment hold */}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 text-xs font-medium',
            paymentHoldActive && 'border-warning/50 bg-warning/10 text-warning hover:bg-warning/20',
          )}
          onClick={onToggleHold}
        >
          <CreditCard className="size-3.5" aria-hidden="true" />
          {paymentHoldActive ? 'Clear payment hold' : 'Impose payment hold'}
        </Button>

        {/* Cancel at period end */}
        {canScheduleCancel && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium"
            onClick={onCancelAtPeriodEnd}
          >
            <Clock className="size-3.5" aria-hidden="true" />
            Cancel at period end
          </Button>
        )}

        {/* Resume subscription */}
        {canResume && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium text-success hover:bg-success/10"
            onClick={onResumeSubscription}
          >
            <PlayCircle className="size-3.5" aria-hidden="true" />
            Resume subscription
          </Button>
        )}

        {/* Cancel immediately */}
        {canCancelImmediate && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
            onClick={onCancelImmediate}
          >
            <Ban className="size-3.5 text-destructive" aria-hidden="true" />
            Cancel immediately
          </Button>
        )}
      </div>
    </Card>
  );
}
