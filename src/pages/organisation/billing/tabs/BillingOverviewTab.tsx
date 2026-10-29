import {
  CreditCard,
  Database,
  FileText,
  FolderOpen,
  Gauge,
  History,
  Package,
  Receipt,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import TenantBillingActivityCard from './TenantBillingActivityCard';
import TenantBillingHistorySection from './TenantBillingHistorySection';
import TenantPlanSlider from './TenantPlanSlider';
import PaymentMethodsTab from './PaymentMethodsTab';
import {
  daysLeft,
  featureList,
  formatDate,
} from '../lib/billingDisplay';

import BillingSubNavigation, { type BillingNavItem } from '@/components/billing/BillingSubNavigation';
import SubscriptionPlanCard from '@/components/billing/SubscriptionPlanCard';
import UpcomingBillingAndPaymentCard from '@/components/billing/UpcomingBillingAndPaymentCard';
import ErrorState from '@/components/shared/ErrorState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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

export type TenantBillingSection = 'overview' | 'cards' | 'invoices' | 'activity';

export default function BillingOverviewTab() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL query section param
  const sectionParam = searchParams.get('section') || searchParams.get('tab');
  const activeSection: TenantBillingSection =
    sectionParam === 'cards' || sectionParam === 'payment-methods'
      ? 'cards'
      : sectionParam === 'invoices'
        ? 'invoices'
        : sectionParam === 'activity' || sectionParam === 'history'
          ? 'activity'
          : 'overview';

  const setActiveSection = (section: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('section', section);
      next.delete('tab');
      return next;
    });
  };

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

  if (planQuery.isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
        <div className="space-y-6 lg:col-span-5 xl:col-span-4">
          <Skeleton className="h-60 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
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
    (usage.remaining === 0 || usage.recordsSynced >= usage.maxRecordsPerMonth);

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

  // Top Tabs Navigation Items (matching Super Admin Dashboard style)
  const navItems: BillingNavItem[] = [
    { id: 'overview', label: 'Overview', icon: Gauge },
    {
      id: 'cards',
      label: 'Manage cards',
      icon: CreditCard,
      badge: paymentMethods.length > 0 ? paymentMethods.length : undefined,
    },
    { id: 'invoices', label: 'Invoices & Payments', icon: Receipt },
    { id: 'activity', label: 'Billing Activity', icon: History },
  ];

  return (
    <div className="space-y-5">
      {/* Top Menu / Tabs Navigation (matching Super Admin Dashboard style) */}
      <BillingSubNavigation
        activeId={activeSection}
        items={navItems}
        onSelect={setActiveSection}
        title="Billing"
        selectId="tenant-billing-section-select"
      />

      {/* ── SECTION CONTENT AREA ────────────────────────────────────────── */}
      {/* ── SECTION 1: OVERVIEW ───────────────────────────────────────── */}
      {activeSection === 'overview' && (
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-12">
          {/* Left Column: Plan Limits & Features (~60-65%) */}
          <div className="space-y-4 sm:space-y-5 lg:col-span-7 xl:col-span-8">
            {/* Plan Limits, Resource Quotas & Entitlements Card */}
            <Card className="gap-0 py-0">
              <CardHeader visualLevel="section" className="px-4 py-3 sm:px-5 sm:py-3.5 border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="text-muted-foreground size-4" />
                  Plan limits &amp; features
                </CardTitle>
                <CardDescription className="text-xs">
                  Included in your {plan.planName} plan and current monthly consumption.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Resource Usage & Quotas */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Resource Usage &amp; Quotas
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      Billing cycle: <strong className="text-foreground font-medium">{formatDate(usage?.periodStart ?? null)}</strong> – <strong className="text-foreground font-medium">{formatDate(renewalDate)}</strong>
                    </span>
                  </div>

                  {usageOver && (
                    <Alert
                      variant="destructive"
                      className="border-destructive/20 bg-destructive/5 rounded-xl py-2 px-3 mb-1.5"
                    >
                      <AlertTitle className="text-xs font-semibold">Monthly record limit reached</AlertTitle>
                      <AlertDescription className="text-xs">
                        Production and Sandbox share this monthly limit. New syncs are blocked until the next UTC month or until your plan is upgraded.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {/* Records synced */}
                    <div className="space-y-1 rounded-xl bg-muted/20 p-2.5 border border-border/40">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Database className="size-3.5 text-amber-500" aria-hidden="true" />
                          <span>Records synced</span>
                        </div>
                        <span
                          className={cn(
                            'font-mono text-xs',
                            usageOver
                              ? 'font-semibold text-destructive'
                              : usage?.maxRecordsPerMonth == null
                                ? 'text-muted-foreground'
                                : 'font-medium text-foreground',
                          )}
                        >
                          {usage
                            ? `${usage.recordsSynced.toLocaleString()} of ${usage.maxRecordsPerMonth != null ? usage.maxRecordsPerMonth.toLocaleString() : 'unlimited'} records used`
                            : '0 records used'}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        One shared monthly limit for Production and Sandbox.
                        {(usage?.recordsReserved ?? 0) > 0 &&
                          ` ${usage!.recordsReserved!.toLocaleString()} records are reserved by active syncs.`}
                      </p>
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500 bg-gradient-to-r',
                            usageOver
                              ? 'from-red-500 to-rose-600'
                              : 'from-amber-500 to-orange-500',
                          )}
                          style={{
                            width: `${usage?.maxRecordsPerMonth == null ? (usage?.recordsSynced ? 25 : 0) : Math.min(100, Math.max(3, Math.round(usageRawPct)))}%`,
                          }}
                          aria-label={`Records used: ${Math.round(usageRawPct)}%`}
                        />
                      </div>
                    </div>

                    {/* Projects */}
                    <div className="space-y-1 rounded-xl bg-muted/20 p-2.5 border border-border/40">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-medium">
                          <FolderOpen className="size-3.5 text-blue-500" aria-hidden="true" />
                          <span>Projects</span>
                        </div>
                        <span className="font-mono text-xs font-medium text-foreground">
                          {plan.overLimit?.projects.limit != null
                            ? `${plan.overLimit.projects.count.toLocaleString()} / ${plan.overLimit.projects.limit.toLocaleString()}`
                            : `${plan.overLimit?.projects.count ?? 0} / Unlimited`}
                        </span>
                      </div>
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-indigo-500"
                          style={{
                            width: `${
                              plan.overLimit?.projects.limit
                                ? Math.min(100, Math.max(3, Math.round((plan.overLimit.projects.count / plan.overLimit.projects.limit) * 100)))
                                : plan.overLimit?.projects.count ? 25 : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Sync Jobs */}
                    <div className="space-y-1 rounded-xl bg-muted/20 p-2.5 border border-border/40">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Package className="size-3.5 text-purple-500" aria-hidden="true" />
                          <span>Sync jobs</span>
                        </div>
                        <span className="font-mono text-xs font-medium text-foreground">
                          {plan.overLimit?.jobs.limit != null
                            ? `${plan.overLimit.jobs.count.toLocaleString()} / ${plan.overLimit.jobs.limit.toLocaleString()}`
                            : `${plan.overLimit?.jobs.count ?? 0} / Unlimited`}
                        </span>
                      </div>
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-purple-500 to-violet-500"
                          style={{
                            width: `${
                              plan.overLimit?.jobs.limit
                                ? Math.min(100, Math.max(3, Math.round((plan.overLimit.jobs.count / plan.overLimit.jobs.limit) * 100)))
                                : plan.overLimit?.jobs.count ? 25 : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Team Members */}
                    <div className="space-y-1 rounded-xl bg-muted/20 p-2.5 border border-border/40">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Users className="size-3.5 text-emerald-500" aria-hidden="true" />
                          <span>Team members</span>
                        </div>
                        <span className="font-mono text-xs font-medium text-foreground">
                          {plan.overLimit?.teamMembers.limit != null
                            ? `${plan.overLimit.teamMembers.count.toLocaleString()} / ${plan.overLimit.teamMembers.limit.toLocaleString()}`
                            : `${plan.overLimit?.teamMembers.count ?? 0} / Unlimited`}
                        </span>
                      </div>
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-teal-600"
                          style={{
                            width: `${
                              plan.overLimit?.teamMembers.limit
                                ? Math.min(100, Math.max(3, Math.round((plan.overLimit.teamMembers.count / plan.overLimit.teamMembers.limit) * 100)))
                                : plan.overLimit?.teamMembers.count ? 25 : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plan Features & Inclusions */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Plan Capabilities &amp; Inclusions
                    </h4>
                    <Badge variant="secondary" className="text-[10px] rounded-full px-2 py-0 border-0 font-medium">
                      {plan.planName} tier
                    </Badge>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {features.map((feature) => (
                      <div
                        key={feature.label}
                        className="flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-1.5 text-xs border border-transparent hover:border-border/50 transition-colors"
                      >
                        <span
                          className={cn(
                            'size-3.5 rounded-full inline-flex items-center justify-center shrink-0',
                            feature.enabled
                              ? 'bg-success/20 text-success'
                              : 'bg-muted text-muted-foreground/60',
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                        </span>
                        <span
                          className={cn(
                            'font-medium truncate',
                            feature.enabled ? 'text-foreground' : 'text-muted-foreground/70',
                          )}
                        >
                          {feature.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Subscription ATM Card & Upcoming Billing + Card (~35-40%) */}
          <div className="space-y-3.5 lg:col-span-5 xl:col-span-4">
            {/* Subscription Plan "ATM" Card */}
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

            {/* Consolidated Upcoming Billing & Payment Mode Card */}
            <UpcomingBillingAndPaymentCard
              plan={plan}
              renewalDate={renewalDate}
              renewalLabel={renewalLabel}
              trialDays={trialDays}
              currentPrice={currentPrice}
              hasSubscription={hasSubscription}
              pendingCancel={pendingCancel}
              pendingPlanName={pendingPlanName}
              pendingPlanChangeAt={sub?.pendingPlanChangeAt}
              creditBalance={sub?.creditBalance}
              defaultCard={defaultCard}
              onManageCards={() => setActiveSection('cards')}
              onCancelSubscription={() =>
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
              onReactivateSubscription={doReactivate}
              isReactivating={reactivateSubscription.isPending}
              onCancelScheduledChange={doCancelScheduledChange}
              isCancellingScheduledChange={cancelScheduledChange.isPending}
            />
          </div>
        </div>
      )}

      {/* ── SECTION 2: MANAGE CARDS ───────────────────────────────────── */}
      {activeSection === 'cards' && (
        <PaymentMethodsTab />
      )}

      {/* ── SECTION 3: INVOICES & PAYMENT HISTORY ─────────────────────── */}
      {activeSection === 'invoices' && (
        <TenantBillingHistorySection />
      )}

      {/* ── SECTION 4: BILLING ACTIVITY ───────────────────────────────── */}
      {activeSection === 'activity' && (
        <TenantBillingActivityCard />
      )}

      {/* In-App Plan Upgrade / Change Slider */}
      <TenantPlanSlider
        title="Upgrade Plan"
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
    </div>
  );
}
