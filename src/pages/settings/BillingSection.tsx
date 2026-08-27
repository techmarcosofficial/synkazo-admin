import { Check, CreditCard, FileText, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import HistoryTab from './billing/HistoryTab';
import InvoicesTab from './billing/InvoicesTab';
import PaymentHistoryTab from './billing/PaymentHistoryTab';
import PaymentMethodsTab from './billing/PaymentMethodsTab';
import SubscriptionTab from './billing/SubscriptionTab';

import BillingGuidedTour from '@/components/billing/BillingGuidedTour';
import ErrorState from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  usePlanQuery,
  useRefreshPlanMutation,
  useUsageQuery,
} from '@/queries/useBilling';
import type { PlanLimits } from '@/types';

const TOUR_DONE_KEY = 'sb_billing_tour_done';

const STATUS_LABEL: Record<string, string> = {
  none: 'No subscription',
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
  incomplete: 'Incomplete',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0;
}

/** Green under 70% used, yellow 70–89%, red 90%+ or over the limit. */
function usageTone(
  pct: number,
  over = false,
): { bar: string; text: string; label: string } {
  if (over || pct >= 90)
    return {
      bar: 'bg-destructive',
      text: 'text-destructive',
      label: 'Critical',
    };
  if (pct >= 70)
    return {
      bar: 'bg-warning',
      text: 'text-warning',
      label: 'Approaching limit',
    };
  return { bar: 'bg-success', text: 'text-success', label: 'Healthy' };
}

/**
 * Labeled meter: "Label" / "X out of Y" header row, then a thick rounded bar with the
 * percentage written in white inside the colored fill (green/yellow/red by usage).
 */
function UsageMeter({
  label,
  count,
  limit,
}: {
  label: string;
  count: number;
  limit: number | null;
}) {
  const rawPct = limit ? (count / limit) * 100 : 0;
  const pct = limit == null ? 0 : Math.min(100, Math.round(rawPct));
  const over = limit != null && count >= limit;
  const tone = usageTone(rawPct, over);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">
          {count.toLocaleString()}
          {limit != null ? ` out of ${limit.toLocaleString()}` : ''}
        </span>
      </div>
      {limit == null ? (
        <div className="bg-primary/15 flex h-6 w-full items-center rounded-full">
          <span className="text-primary pl-3 text-xs font-semibold">
            Unlimited
          </span>
        </div>
      ) : pct === 0 ? (
        // Nothing used yet — a plain empty track, no colored fill or "0%" pill.
        <div className="bg-muted h-6 w-full rounded-full" />
      ) : (
        <div className="bg-muted h-6 w-full overflow-hidden rounded-full">
          <div
            className={cn(
              'flex h-full items-center rounded-full transition-all duration-500',
              tone.bar,
            )}
            style={{ width: `${Math.max(pct, 10)}%` }}
          >
            <span className="pl-3 text-xs font-semibold text-white">
              {pct}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureRow({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {enabled ? (
        <Check className="text-success size-4 shrink-0" />
      ) : (
        <X className="text-muted-foreground size-4 shrink-0" />
      )}
      <span className={enabled ? '' : 'text-muted-foreground'}>{label}</span>
    </li>
  );
}

function featureList(limits: PlanLimits) {
  const allTransforms = limits.allowedTransformTypes.length > 1;
  return [
    {
      enabled: true,
      label: `${limits.schedulingModes.length > 2 ? 'All scheduling modes' : limits.schedulingModes.includes('interval') ? 'Daily + interval scheduling' : 'Daily scheduling'}${limits.minIntervalMinutes ? ` (min ${limits.minIntervalMinutes} min interval)` : ''}`,
    },
    {
      enabled: allTransforms,
      label: allTransforms
        ? 'All field mapping transforms'
        : 'Direct field mapping only',
    },
    { enabled: limits.associationRules, label: 'Association rules' },
    { enabled: limits.customObjects, label: 'Custom object support (HubSpot)' },
    { enabled: limits.customFields, label: 'Custom field creation' },
    { enabled: limits.jobDependencyChains, label: 'Job dependency chains' },
    { enabled: limits.envMigration, label: 'Sandbox → production migration' },
    { enabled: true, label: `${limits.logRetentionDays}-day log retention` },
  ];
}

export default function BillingSection() {
  const planQuery = usePlanQuery();
  const usageQuery = useUsageQuery();
  const refreshPlan = useRefreshPlanMutation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const handledCheckoutReturn = useRef(false);
  const [tab, setTab] = useState<string>(searchParams.get('tab') ?? 'overview');
  const [showTour, setShowTour] = useState(false);

  const handleTabChange = (value: string) => {
    setTab(value);
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  // Returning from Stripe Checkout: pull fresh state straight from Stripe (don't
  // depend on the webhook having landed), then greet the user.
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (!checkout || handledCheckoutReturn.current) return;
    handledCheckoutReturn.current = true;

    if (checkout === 'success') {
      // The checkout page already showed "Subscription purchased successfully" before
      // redirecting here — just silently sync the fresh plan state, no second toast.
      refreshPlan
        .mutateAsync()
        .catch(() =>
          showToast.error(
            "We couldn't confirm your subscription yet. Refresh in a moment.",
          ),
        );

      // Same-origin guard, mirroring CheckoutPage's — this value round-trips through a URL
      // the user could otherwise edit.
      const redirectParam = searchParams.get('redirect');
      const safeRedirect =
        redirectParam &&
        redirectParam.startsWith('/') &&
        !redirectParam.startsWith('//')
          ? redirectParam
          : null;

      // CheckoutPage only adds this for a brand-new signup, never a plan change, so it's a
      // reliable "first time" signal — but still gate on localStorage in case the user
      // bookmarks/revisits this URL.
      if (
        searchParams.get('first_checkout') === 'true' &&
        !localStorage.getItem(TOUR_DONE_KEY)
      ) {
        setShowTour(true);
      } else if (safeRedirect) {
        // No tour to run — send the user straight to the route the paywall originally blocked.
        navigate(safeRedirect, { replace: true });
      }
    } else if (checkout === 'cancelled') {
      showToast.info('Checkout cancelled — your plan is unchanged.');
    }
    searchParams.delete('checkout');
    searchParams.delete('first_checkout');
    searchParams.delete('redirect');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams]);

  if (planQuery.isLoading || refreshPlan.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-52 w-full" />
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
  const over = plan.overLimit;
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

  return (
    <div className="flex flex-col gap-6">
      <div data-tour="billing-header" className="flex items-center">
        <p className="text-muted-foreground text-sm">
          Manage your subscription and monitor usage.
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscription" data-tour="subscription-tab">
            Subscription
          </TabsTrigger>
          <TabsTrigger value="payment" data-tour="payment-tab">
            Payment Methods
          </TabsTrigger>
          <TabsTrigger value="invoices" data-tour="invoices-tab">
            Invoices
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="payment-history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-6">
          {/* Current plan */}
          <Card data-tour="current-plan">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="text-muted-foreground size-4" /> Current
                plan
              </CardTitle>
              <CardDescription>
                Your active subscription and renewal details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Plan</dt>
                  <dd className="font-medium">{plan.planName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium">
                    {STATUS_LABEL[plan.subscriptionStatus] ??
                      plan.subscriptionStatus}
                  </dd>
                </div>
                {plan.billingInterval && (
                  <div>
                    <dt className="text-muted-foreground">Billing</dt>
                    <dd className="font-medium capitalize">
                      {plan.billingInterval === 'year'
                        ? 'Yearly'
                        : plan.billingInterval === 'day'
                          ? 'Daily'
                          : 'Monthly'}
                    </dd>
                  </div>
                )}
                {trialDays != null ? (
                  <div>
                    <dt className="text-muted-foreground">Trial ends</dt>
                    <dd className="font-medium">
                      {formatDate(plan.trialEndsAt)}{' '}
                      <span className="text-muted-foreground">
                        ({trialDays} day{trialDays === 1 ? '' : 's'} left)
                      </span>
                    </dd>
                  </div>
                ) : null}
                {plan.currentPeriodEnd && (
                  <div>
                    <dt className="text-muted-foreground">
                      {plan.cancelAtPeriodEnd ? 'Ends on' : 'Renews on'}
                    </dt>
                    <dd className="font-medium">
                      {formatDate(plan.currentPeriodEnd)}
                    </dd>
                  </div>
                )}
              </dl>

              {plan.subscriptionStatus === 'trialing' &&
                !plan.cancelAtPeriodEnd && (
                  <p className="text-muted-foreground text-sm">
                    After your trial ends, your card is charged automatically
                    and the subscription continues. Cancel before{' '}
                    {formatDate(plan.trialEndsAt)} to avoid charges.
                  </p>
                )}
              {plan.cancelAtPeriodEnd && (
                <p className="text-warning text-sm">
                  Your subscription is set to cancel at the end of the current
                  period — you'll lose access to your paid features when it
                  ends.
                </p>
              )}
              {plan.subscriptionStatus === 'past_due' && (
                <p className="text-destructive text-sm">
                  Your last payment failed. Update your payment method to keep
                  your plan active.
                </p>
              )}

              {hasSubscription && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    data-tour="manage-subscription"
                    onClick={() => setTab('subscription')}
                  >
                    Manage subscription
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage this month — sync limit progress bar, recolors green/yellow/red by usage */}
          <Card data-tour="usage-section">
            <CardHeader>
              <CardTitle>Usage this month</CardTitle>
              <CardDescription>
                Records synced in the current billing period
                {usage ? ` (since ${formatDate(usage.periodStart)})` : ''}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {usageQuery.isLoading || !usage ? (
                <Skeleton className="h-6 w-full" />
              ) : (
                <>
                  <UsageMeter
                    label="Sync records"
                    count={usage.recordsSynced}
                    limit={usage.maxRecordsPerMonth}
                  />
                  <div className="flex items-center justify-between">
                    {usage.remaining != null ? (
                      <p className="text-muted-foreground text-xs">
                        {usage.remaining.toLocaleString()} records remaining
                        this month
                      </p>
                    ) : (
                      <span />
                    )}
                    {usage.maxRecordsPerMonth != null && (
                      <span
                        className={cn(
                          'text-xs font-medium',
                          usageToneInfo.text,
                        )}
                      >
                        {usageToneInfo.label}
                      </span>
                    )}
                  </div>
                  {usageOver && (
                    <p className="text-destructive text-sm">
                      You've reached your monthly record limit — new syncs will
                      be blocked until next month or until you upgrade.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Plan limits & features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="text-muted-foreground size-4" /> Plan
                limits &amp; features
              </CardTitle>
              <CardDescription>
                What's included in the {plan.planName} plan and how much you've
                used.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {over && (
                <div className="space-y-5">
                  <UsageMeter
                    label="Projects"
                    count={over.projects.count}
                    limit={over.projects.limit}
                  />
                  <UsageMeter
                    label="Sync jobs"
                    count={over.jobs.count}
                    limit={over.jobs.limit}
                  />
                  <UsageMeter
                    label="Team members"
                    count={over.teamMembers.count}
                    limit={over.teamMembers.limit}
                  />
                </div>
              )}
              <ul className="grid gap-2 border-t pt-4 sm:grid-cols-2">
                {featureList(plan.limits).map((f) => (
                  <FeatureRow
                    key={f.label}
                    enabled={f.enabled}
                    label={f.label}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionTab />
        </TabsContent>
        <TabsContent value="payment">
          <PaymentMethodsTab />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesTab />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
        <TabsContent value="payment-history">
          <PaymentHistoryTab />
        </TabsContent>
      </Tabs>

      <BillingGuidedTour
        active={showTour}
        tab={tab}
        onNavigateTab={handleTabChange}
        onDone={() => {
          setShowTour(false);
          localStorage.setItem(TOUR_DONE_KEY, 'true');
        }}
      />
    </div>
  );
}
