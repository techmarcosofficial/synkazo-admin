import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CreditCard,
  FileText,
  Gauge,
  Loader2,
  Plus,
  Sparkles,
  Star,
} from 'lucide-react';
import React, { useState } from 'react';

import { CardPicker } from './CardPicker';
import TenantBillingHistorySection from './TenantBillingHistorySection';
import TenantPlanSlider from './TenantPlanSlider';
import {
  daysLeft,
  featureList,
  FeatureRow,
  formatDate,
  usageTone,
} from '../lib/billingDisplay';

import CardBrandLogo from '@/components/billing/CardBrandLogo';
import SubscriptionPlanCard from '@/components/billing/SubscriptionPlanCard';
import ErrorState from '@/components/shared/ErrorState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { isStripeConfigured } from '@/lib/stripe';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { ChangePlanUpgradeForm } from '@/pages/checkout/ChangePlanUpgradeForm';
import {
  useCancelScheduledChangeMutation,
  useCancelSubscriptionMutation,
  usePaymentMethodsQuery,
  usePlanQuery,
  usePlansQuery,
  useReactivateMutation,
  useSubscriptionQuery,
  useUsageQuery,
} from '@/queries/useBilling';
import type { ApiPlan, ApiPrice } from '@/types/billing';

function billingIntervalLabel(interval?: string | null) {
  if (interval === 'year') return 'Yearly';
  if (interval === 'day') return 'Daily';
  return 'Monthly';
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
}

function ThinMeter({
  value,
  indicatorClassName,
}: {
  value: number;
  indicatorClassName?: string;
}) {
  return (
    <div className="bg-muted h-1.5 overflow-hidden rounded-full">
      <div
        className={cn(
          'bg-primary h-full rounded-full transition-[width]',
          indicatorClassName,
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function CompactLimitRow({
  label,
  count,
  limit,
}: {
  label: string;
  count: number;
  limit: number | null;
}) {
  const rawPct = limit ? (count / limit) * 100 : 100;
  const over = limit != null && count >= limit;

  return (
    <div className="bg-muted/45 space-y-2 rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-xs">{label}</span>
        <span className="text-muted-foreground text-xs">
          <strong className="text-foreground font-semibold">
            {count.toLocaleString()}
          </strong>{' '}
          of {limit == null ? 'unlimited' : limit.toLocaleString()}
        </span>
      </div>
      <ThinMeter
        value={rawPct}
        indicatorClassName={
          over
            ? 'bg-destructive'
            : limit == null
              ? 'bg-muted-foreground/25'
              : undefined
        }
      />
    </div>
  );
}

export default function BillingOverviewTab() {
  const planQuery = usePlanQuery();
  const usageQuery = useUsageQuery();
  const plansQuery = usePlansQuery();
  const subscriptionQuery = useSubscriptionQuery();
  const paymentMethodsQuery = usePaymentMethodsQuery();

  const cancelScheduledChange = useCancelScheduledChangeMutation();
  const cancelSubscription = useCancelSubscriptionMutation();
  const reactivateSubscription = useReactivateMutation();
  const { confirm } = useConfirmDialog();

  const [planSliderOpen, setPlanSliderOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<{
    plan: ApiPlan;
    price: ApiPrice;
  } | null>(null);

  const [manageCardsOpen, setManageCardsOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);

  if (planQuery.isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
        <div className="space-y-6 lg:col-span-5 xl:col-span-4">
          <Skeleton className="h-60 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (planQuery.isError || !planQuery.data) {
    return (
      <ErrorState
        description="We couldn't load your billing details."
        onRetry={() => void planQuery.refetch()}
      />
    );
  }

  const plan = planQuery.data;
  const usage = usageQuery.data;
  const sub = subscriptionQuery.data;
  const paymentMethods = paymentMethodsQuery.data ?? [];
  const defaultCard = paymentMethods.find((c) => c.isDefault) ?? paymentMethods[0];

  const features = featureList(plan.limits);
  const includedFeatures = features.filter((feature) => feature.enabled);
  const excludedFeatures = features.filter((feature) => !feature.enabled);
  const hasSubscription = plan.subscriptionStatus !== 'none';
  const trialDays =
    plan.subscriptionStatus === 'trialing' ? daysLeft(plan.trialEndsAt) : null;
  const usageRawPct =
    usage && usage.maxRecordsPerMonth
      ? (usage.recordsSynced / usage.maxRecordsPerMonth) * 100
      : 0;
  const usageOver =
    !!usage &&
    usage.maxRecordsPerMonth != null &&
    usage.recordsSynced >= usage.maxRecordsPerMonth;
  const usageToneInfo = usageTone(usageRawPct, usageOver);

  const cataloguePlan = plansQuery.data?.find(
    (candidate) => candidate.id === plan.planId,
  );
  const currentPrice = cataloguePlan?.prices.find(
    (price) => price.billingInterval === plan.billingInterval,
  );
  const renewalLabel = plan.cancelAtPeriodEnd
    ? 'Subscription ends'
    : plan.subscriptionStatus === 'trialing'
      ? 'Trial ends'
      : 'Renews on';
  const renewalDate =
    plan.subscriptionStatus === 'trialing'
      ? plan.trialEndsAt
      : plan.currentPeriodEnd;

  const pendingPlanName = plansQuery.data?.find(
    (p) => p.id === sub?.pendingPlanId,
  )?.name;

  const pendingCancel =
    sub?.cancelAtPeriodEnd || sub?.status === 'pending_cancel' || plan.cancelAtPeriodEnd;

  const doCancelScheduledChange = async () => {
    try {
      await cancelScheduledChange.mutateAsync();
      showToast.success('Scheduled plan change cancelled.');
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    }
  };

  const doCancel = async () => {
    try {
      await cancelSubscription.mutateAsync(undefined);
      showToast.success('Your subscription will end at the period end.');
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    }
  };

  const doReactivate = async () => {
    try {
      await reactivateSubscription.mutateAsync();
      showToast.success('Subscription reactivated.');
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    }
  };

  return (
    <div className="space-y-6">
      {/* 2-Column Responsive Layout Matching Super Admin Style */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* ── LEFT COLUMN: USAGE & BILLING HISTORY (~65-70%) ─────────────────── */}
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          {/* Plan Limits, Resource Quotas & Entitlements */}
          <Card className="rounded-xl overflow-hidden gap-0">
            <CardHeader visualLevel="section" className="p-4 sm:p-5 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="text-muted-foreground size-4" />
                Plan limits &amp; features
              </CardTitle>
              <CardDescription className="text-xs">
                Included in your {plan.planName} plan and current monthly consumption.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-6">
              {/* Monthly records synced meter */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Gauge className="size-3.5 text-muted-foreground" />
                      Usage this month
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Current billing period
                      {usage ? ` · since ${formatDate(usage.periodStart)}` : ''}
                    </p>
                  </div>
                  {usage && (
                    <div className="text-right">
                      <p className="text-xs font-semibold">
                        {usage.recordsSynced.toLocaleString()}
                        {usage.maxRecordsPerMonth != null
                          ? ` of ${usage.maxRecordsPerMonth.toLocaleString()} records used`
                          : ' records used'}
                      </p>
                      <p className={cn('text-xs font-semibold', usageToneInfo.text)}>
                        {usage.maxRecordsPerMonth == null
                          ? 'Unlimited'
                          : `${Math.round(usageRawPct)}%`}
                      </p>
                    </div>
                  )}
                </div>

                {usageQuery.isLoading || !usage ? (
                  <Skeleton className="h-1.5 w-full rounded-full" />
                ) : (
                  <ThinMeter
                    value={usage.maxRecordsPerMonth == null ? 0 : usageRawPct}
                    indicatorClassName={usageToneInfo.bar}
                  />
                )}

                {usageOver && (
                  <Alert
                    variant="destructive"
                    className="border-destructive/20 bg-destructive/5 rounded-xl"
                  >
                    <AlertCircle />
                    <AlertTitle>Monthly record limit reached</AlertTitle>
                    <AlertDescription className="text-xs">
                      New syncs are blocked until the next billing cycle or until
                      your plan is upgraded.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Quotas & Features Grid */}
              <div className="grid gap-6 lg:grid-cols-2 pt-2 border-t">
                {/* Resource Quotas */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    Resource quotas
                  </p>
                  {plan.overLimit ? (
                    <div className="space-y-2.5">
                      <CompactLimitRow
                        label="Projects"
                        count={plan.overLimit.projects.count}
                        limit={plan.overLimit.projects.limit}
                      />
                      <CompactLimitRow
                        label="Sync jobs"
                        count={plan.overLimit.jobs.count}
                        limit={plan.overLimit.jobs.limit}
                      />
                      <CompactLimitRow
                        label="Team members"
                        count={plan.overLimit.teamMembers.count}
                        limit={plan.overLimit.teamMembers.limit}
                      />
                    </div>
                  ) : (
                    <Skeleton className="h-36 w-full rounded-xl" />
                  )}
                </div>

                {/* Features Included & Excluded */}
                <div className="space-y-4 lg:border-l lg:pl-6">
                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                      Included in {plan.planName}
                    </p>
                    <ul className="space-y-2 text-xs">
                      {includedFeatures.map((feature) => (
                        <FeatureRow
                          key={feature.label}
                          enabled
                          label={feature.label}
                        />
                      ))}
                    </ul>
                  </div>
                  {excludedFeatures.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="mb-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                        Not included
                      </p>
                      <ul className="space-y-2 text-xs">
                        {excludedFeatures.map((feature) => (
                          <FeatureRow
                            key={feature.label}
                            enabled={false}
                            label={feature.label}
                          />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unified Billing & Payment History (Timeline + Invoices with Date Filter) */}
          <TenantBillingHistorySection />
        </div>

        {/* ── RIGHT COLUMN: SUBSCRIPTION & PAYMENT (~30-35%) ─────────────────── */}
        <div className="space-y-5 lg:col-span-5 xl:col-span-4">
          {/* Subscription Plan "ATM" Card (Well-proportioned dimensions) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Subscription Plan
              </h3>
            </div>

            <SubscriptionPlanCard
              planName={plan.planName}
              status={plan.subscriptionStatus}
              billingInterval={plan.billingInterval}
              currentPeriodEnd={renewalDate}
              planAccessSource={hasSubscription ? 'stripe_subscription' : 'free'}
              onChangePlan={() => setPlanSliderOpen((prev) => !prev)}
              changePlanLabel={hasSubscription ? 'Change Plan' : 'Choose Plan'}
              className="w-full"
            />
          </div>

          {/* In-App Plan Upgrade / Change Slider */}
          <TenantPlanSlider
            plans={plansQuery.data ?? []}
            currentPlanId={plan.planId}
            currentPlanName={plan.planName}
            currentBillingInterval={plan.billingInterval}
            isOpen={planSliderOpen}
            onClose={() => setPlanSliderOpen(false)}
            onSelectPlan={(targetPlan, targetPrice) => {
              setUpgradeTarget({ plan: targetPlan, price: targetPrice });
            }}
          />

          {/* Contextual Lifecycle Banners */}
          {pendingCancel && (
            <div className="border-warning/30 bg-warning/10 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-warning size-4 shrink-0" />
                <p className="text-warning text-xs font-medium">
                  Scheduled to cancel on {formatDate(renewalDate)}.
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-lg h-7 text-xs"
                onClick={doReactivate}
                disabled={reactivateSubscription.isPending}
              >
                {reactivateSubscription.isPending && (
                  <Loader2 className="mr-1.5 size-3 animate-spin" />
                )}
                Reactivate
              </Button>
            </div>
          )}

          {sub?.pendingPriceId && (
            <div className="border-info/30 bg-info/10 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="text-info size-4 shrink-0" />
                <p className="text-info text-xs font-medium">
                  Switching to {pendingPlanName ?? 'new plan'} on {formatDate(sub.pendingPlanChangeAt)}.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg h-7 text-xs"
                onClick={doCancelScheduledChange}
                disabled={cancelScheduledChange.isPending}
              >
                {cancelScheduledChange.isPending && (
                  <Loader2 className="mr-1.5 size-3 animate-spin" />
                )}
                Cancel change
              </Button>
            </div>
          )}

          {sub?.creditBalance != null && sub.creditBalance > 0 && (
            <div className="border-success/30 bg-success/10 flex items-center justify-between rounded-xl border p-3 text-xs">
              <span className="text-success font-medium">
                Credit balance: {formatPrice(sub.creditBalance, 'USD')} available.
              </span>
            </div>
          )}

          {plan.subscriptionStatus === 'past_due' && (
            <div className="border-destructive/30 bg-destructive/10 flex items-center justify-between rounded-xl border p-3.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-destructive size-4" />
                <p className="text-destructive text-xs font-medium">
                  Payment failed. Update payment method.
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="rounded-lg h-7 text-xs"
                onClick={() => setManageCardsOpen(true)}
              >
                Update card
              </Button>
            </div>
          )}

          {/* Payment Method on File Card */}
          <Card className="gap-0 py-0 p-3 sm:px-3.5 sm:py-2.5 rounded-xl border bg-card space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="size-3.5 text-muted-foreground" aria-hidden="true" />
                Payment Method on File
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] px-2 text-primary hover:text-primary"
                onClick={() => setManageCardsOpen(true)}
              >
                {paymentMethods.length > 0 ? 'Manage cards' : '+ Add card'}
              </Button>
            </div>

            {defaultCard ? (
              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-2">
                  <CardBrandLogo brand={defaultCard.cardBrand} className="h-5 w-8 shrink-0" />
                  <span className="font-semibold text-xs tracking-wider uppercase text-foreground">
                    {defaultCard.cardBrand?.toUpperCase() ?? 'CARD'}
                  </span>
                  <span className="font-mono text-sm tracking-widest text-muted-foreground">
                    &bull;&bull;&bull;&bull; {defaultCard.cardLast4}
                  </span>
                  {defaultCard.isDefault && (
                    <span className="rounded-full bg-secondary text-secondary-foreground text-[10px] px-1.5 py-0.5 font-medium ml-1">
                      Default
                    </span>
                  )}
                </div>

                {defaultCard.cardExpMonth && defaultCard.cardExpYear && (
                  <span className="text-xs text-muted-foreground font-mono">
                    Expires {defaultCard.cardExpMonth.toString().padStart(2, '0')}/
                    {defaultCard.cardExpYear}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between py-1 text-xs text-muted-foreground">
                <span>No card saved on file.</span>
                {isStripeConfigured && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs rounded-lg"
                    onClick={() => setAddCardOpen(true)}
                  >
                    <Plus className="size-3 mr-1" /> Add card
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Upcoming Billing Card */}
          <Card className="gap-0 py-0 p-3 sm:px-3.5 sm:py-3 rounded-xl border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden="true" />
                Upcoming billing
              </h4>
              <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0 border-0">
                {billingIntervalLabel(plan.billingInterval)}
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-0.5">
              <div>
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

              {hasSubscription && !pendingCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] text-muted-foreground hover:text-destructive px-1.5"
                  onClick={() =>
                    confirm({
                      variant: 'danger',
                      title: 'Cancel subscription?',
                      description:
                        'You’ll keep full access until the end of your current billing period, then your account moves to the free tier. You can reactivate any time before then.',
                      confirmLabel: 'Cancel subscription',
                      cancelLabel: 'Keep subscription',
                      onConfirm: doCancel,
                    })
                  }
                >
                  Cancel subscription
                </Button>
              )}
            </div>

            <p className="text-muted-foreground text-[10px] leading-relaxed pt-1 border-t border-border/50">
              {pendingCancel
                ? 'Cancellation is scheduled for the end of this billing period.'
                : plan.subscriptionStatus === 'trialing'
                  ? `Billing begins automatically after the trial on ${formatDate(plan.trialEndsAt)}.`
                  : 'Your subscription renews automatically on the date shown above.'}
            </p>
          </Card>
        </div>
      </div>

      {/* In-App Plan Change Confirmation / Upgrade Dialog */}
      <Dialog
        open={!!upgradeTarget}
        onOpenChange={(open) => !open && setUpgradeTarget(null)}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="capitalize">
              Confirm Plan Change to {upgradeTarget?.plan.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review your prorated balance and confirm your plan change.
            </DialogDescription>
          </DialogHeader>

          {upgradeTarget && (
            <div className="pt-1">
              <ChangePlanUpgradeForm
                plan={upgradeTarget.plan}
                price={upgradeTarget.price}
                onSuccess={async () => {
                  setUpgradeTarget(null);
                  setPlanSliderOpen(false);
                  await planQuery.refetch();
                  await subscriptionQuery.refetch();
                  showToast.success('Plan changed successfully!');
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Payment Methods Modal Dialog */}
      <Dialog open={manageCardsOpen} onOpenChange={setManageCardsOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Manage Payment Methods</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <CardPicker
              mode="manage"
              addDialogOpen={addCardOpen}
              onAddDialogOpenChange={setAddCardOpen}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
