import { Elements } from '@stripe/react-stripe-js';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { ChangePlanUpgradeForm } from './ChangePlanUpgradeForm';
import { CheckoutForm } from './CheckoutForm';
import { OrderSummary } from './OrderSummary';

import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { clearPendingPlan, savePendingPlan } from '@/lib/pendingPlan';
import { stripePromise, isStripeConfigured } from '@/lib/stripe';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import {
  usePlansQuery,
  useRefreshPlanMutation,
  useSubscriptionQuery,
} from '@/queries/useBilling';
import type { ApiPlan, ApiPrice, BillingInterval, PlanId } from '@/types';

const ACTIVE_SUB_STATUSES = new Set(['active', 'trialing']);

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  // Applied promo code, owned here so the summary (which collects it) and the form (which
  // submits it) can never disagree about what the user is being charged. Only meaningful for a
  // brand-new purchase — plan changes are priced entirely by the Transfer Fee formula (no coupons).
  const [couponCode, setCouponCode] = useState<string | undefined>(undefined);
  // Set immediately on purchase success, before the async plan-refresh/navigate below — without
  // it, invalidating the subscription query while this page is still mounted flips
  // `isChangingPlan` (the new plan is already live) and flashes the brand-new-purchase form for a
  // moment before the navigate takes effect.
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { currentUser } = useSynkazoAuth();
  const refreshPlan = useRefreshPlanMutation();
  const subQuery = useSubscriptionQuery({ enabled: !!currentUser });
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const priceIdParam = params.get('priceId');
  const planParam = params.get('plan') as PlanId | null;
  const interval = (params.get('interval') as BillingInterval) ?? 'month';
  // Same-origin only — guards against this becoming an open redirect via a crafted URL.
  const redirectParam = params.get('redirect');
  const safeRedirect =
    redirectParam &&
    redirectParam.startsWith('/') &&
    !redirectParam.startsWith('//')
      ? redirectParam
      : null;

  // Fetch the full catalogue (not filtered to one interval) — we need it both to resolve the
  // target plan/price AND to look up the current subscription's price when detecting a
  // plan-change vs. a brand-new signup.
  const plansQuery = usePlansQuery();

  const resolved = useMemo<{ plan: ApiPlan; price: ApiPrice } | null>(() => {
    const plans = plansQuery.data;
    if (!plans) return null;
    if (priceIdParam) {
      for (const plan of plans) {
        const price = plan.prices.find((pr) => pr.id === priceIdParam);
        if (price) return { plan, price };
      }
      return null;
    }
    if (planParam) {
      const plan = plans.find((p) => p.id === planParam);
      const price =
        plan?.prices.find((pr) => pr.billingInterval === interval) ??
        plan?.prices[0];
      if (plan && price) return { plan, price };
    }
    return null;
  }, [plansQuery.data, priceIdParam, planParam, interval]);

  // Detect "changing an existing subscription's plan" vs. "brand-new signup" from the org's
  // actual current subscription — not a query flag, which the user could revisit/bookmark
  // stale. A subscriber landing back on /checkout for their own current plan/price falls back to
  // the ordinary new-subscription form (resolved.price.id === current price is excluded below).
  const currentPrice = useMemo<ApiPrice | null>(() => {
    if (!plansQuery.data || !subQuery.data?.priceId) return null;
    for (const p of plansQuery.data) {
      const price = p.prices.find((pr) => pr.id === subQuery.data!.priceId);
      if (price) return price;
    }
    return null;
  }, [plansQuery.data, subQuery.data]);

  const hasActiveSub =
    !!subQuery.data && ACTIVE_SUB_STATUSES.has(subQuery.data.status);
  // Every plan change (upgrade or downgrade) now behaves identically — immediate, day-based
  // proration via ChangePlanUpgradeForm. No more "upgrade vs scheduled downgrade" distinction.
  const isChangingPlan = !!(
    hasActiveSub &&
    resolved &&
    currentPrice &&
    subQuery.data!.priceId !== resolved.price.id
  );
  // Latch once true and never fall back. `useUpgradeMutation` invalidates the subscription query
  // the instant the change succeeds — while ChangePlanUpgradeForm is still mounted showing its own
  // "Plan changed successfully" message — which flips `isChangingPlan` to false (the new plan is
  // already live) and would otherwise flash the brand-new-purchase form for a moment before the
  // redirect below. Once this page has shown the change-plan flow, it keeps showing it.
  const showChangePlanFormRef = useRef(false);
  if (isChangingPlan) showChangePlanFormRef.current = true;
  const showChangePlanForm = showChangePlanFormRef.current;

  // Not logged in → remember the pick and send them through registration first. Day-interval
  // plans aren't part of this anonymous resume flow (super_admin-only, never reached without
  // being logged in already) — fall back to month for the type if a URL was crafted with one.
  if (!currentUser) {
    if (planParam) {
      savePendingPlan({
        plan: planParam,
        interval: interval === 'day' ? 'month' : interval,
      });
    }
    return <Navigate to="/register" replace />;
  }

  if (!isStripeConfigured) {
    return (
      <Shell>
        <p className="text-muted-foreground">
          Billing isn’t configured on this environment yet. Please contact
          support.
        </p>
      </Shell>
    );
  }

  if (isRedirecting || plansQuery.isLoading || subQuery.isLoading) {
    return (
      <Shell>
        <div className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />{' '}
          {isRedirecting ? 'Redirecting…' : 'Loading checkout…'}
        </div>
      </Shell>
    );
  }

  if (!resolved) {
    return (
      <Shell>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            We couldn’t find that plan. Please pick one again.
          </p>
          <Button
            variant="link"
            className="px-0"
            onClick={() => {
              window.location.href = `${import.meta.env.VITE_FRONTEND_URL}/pricing`;
            }}
          >
            Back to pricing
          </Button>
        </div>
      </Shell>
    );
  }

  const { plan, price } = resolved;

  const onPurchaseSuccess = async () => {
    setIsRedirecting(true);
    // The visitor now has an active plan — a pick made before they logged in must not keep
    // resuming into checkout on every future login (it never got cleared otherwise).
    clearPendingPlan();
    // Pull the fresh subscription state from Stripe into the plan cache BEFORE we land on a
    // gated route, so the subscription paywall (AppLayout) sees the new active/trialing status
    // immediately instead of a stale "none" and re-locking.
    try {
      await refreshPlan.mutateAsync();
    } catch {
      // Non-fatal — the billing page also refreshes on ?checkout=success.
    }
    // A paywall-initiated checkout (e.g. HubSpot install landing on Connections before an
    // org had a plan) carries the originally-blocked route — send them back there instead
    // of always landing on the billing page. But a brand-new signup still needs to see the
    // guided tour first, so only take this shortcut when the tour isn't going to fire.
    if (safeRedirect && hasActiveSub) {
      navigate(safeRedirect);
      return;
    }
    // Only a brand-new signup (not a plan change on an existing subscription) triggers the
    // billing page's guided tour. If a redirect was pending, carry it along so the tour can
    // send the user there once they finish it instead of dropping the deep link.
    const tourParam = hasActiveSub ? '' : '&first_checkout=true';
    const redirectParam =
      !hasActiveSub && safeRedirect
        ? `&redirect=${encodeURIComponent(safeRedirect)}`
        : '';
    navigate(
      `/settings?section=billing&checkout=success${tourParam}${redirectParam}`,
    );
  };

  return (
    <Shell>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground mb-6 -ml-2"
        onClick={() => {
          window.location.href = `${import.meta.env.VITE_FRONTEND_URL}/pricing`;
        }}
      >
        <ArrowLeft className="h-4 w-4" /> Back to plans
      </Button>
      <div
        className={`grid gap-8 ${showChangePlanForm ? 'max-w-2xl' : 'md:grid-cols-[1fr_360px]'}`}
      >
        <Card>
          <CardContent>
            <h1 className="text-card-foreground mb-6 text-2xl font-bold tracking-tight">
              {showChangePlanForm
                ? 'Confirm your plan change'
                : 'Complete your subscription'}
            </h1>
            {showChangePlanForm ? (
              <ChangePlanUpgradeForm
                plan={plan}
                price={price}
                onSuccess={onPurchaseSuccess}
              />
            ) : (
              <Elements
                stripe={stripePromise}
                options={{
                  mode: 'subscription',
                  amount: price.amount,
                  currency: price.currency,
                  paymentMethodCreation: 'manual',
                  appearance: { theme: isDark ? 'night' : 'stripe' },
                }}
              >
                <CheckoutForm
                  price={price}
                  onSuccess={onPurchaseSuccess}
                  couponCode={couponCode}
                  onCouponRejected={() => setCouponCode(undefined)}
                />
              </Elements>
            )}
          </CardContent>
        </Card>
        {/* ChangePlanUpgradeForm renders its own Transfer Fee breakdown (including the real
            "Due today") during a plan change — showing the raw new-plan price here too would be
            misleading, since it's not what's actually charged. */}
        {!showChangePlanForm && (
          <OrderSummary
            plan={plan}
            price={price}
            couponCode={couponCode}
            onCouponChange={setCouponCode}
            allowCoupon
          />
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-4xl">{children}</div>
    </div>
  );
}
