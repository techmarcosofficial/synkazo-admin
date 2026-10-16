import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  Receipt,
  ShieldAlert,
} from 'lucide-react';
import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlanSlider from '@/components/billing/PlanSlider';
import AssignPlanDialog from '@/pages/superadmin/billing/AssignPlanDialog';
import BillingActions from '@/pages/superadmin/billing/BillingActions';
import BillingActivityTable from '@/pages/superadmin/billing/BillingActivityTable';
import BillingHistorySection from '@/pages/superadmin/billing/BillingHistorySection';
import BillingInvoicesTable from '@/pages/superadmin/billing/BillingInvoicesTable';
import BillingNotesCard from '@/pages/superadmin/billing/BillingNotesCard';
import BillingOverviewHeader from '@/pages/superadmin/billing/BillingOverviewHeader';
import EntitlementsUsage from '@/pages/superadmin/billing/EntitlementsUsage';
import InvoiceDetailDrawer from '@/pages/superadmin/billing/InvoiceDetailDrawer';
import SubscriptionPlanCard from '@/pages/superadmin/billing/SubscriptionPlanCard';
import LifecycleConfirmDialog from '@/pages/superadmin/lifecycle/LifecycleConfirmDialog';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useAdminPlansQuery } from '@/queries/useBilling';
import {
  useAssignPlanMutation,
  useCancelSubscriptionAtPeriodEndMutation,
  useCancelSubscriptionImmediateMutation,
  useClearPaymentHoldMutation,
  useImposePaymentHoldMutation,
  useResumeSubscriptionMutation,
  useSuperAdminBillingHistoryQuery,
  useSuperAdminBillingOverviewQuery,
  useSuperAdminInvoicesQuery,
  useSuperAdminOrganisationQuery,
  useSuperAdminSubscriptionQuery,
} from '@/queries/useSuperAdmin';
import type { SuperAdminInvoiceListItem } from '@/types';

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

export type MainBillingTab = 'overview' | 'history';

export default function OrganisationBillingPage() {
  const { organisationId } = useParams<{ organisationId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state: default is 'overview', supported tabs: 'overview', 'history'
  const activeTabParam = searchParams.get('tab');
  const activeTab: MainBillingTab =
    activeTabParam === 'history' || activeTabParam === 'invoices'
      ? 'history'
      : 'overview';

  const setActiveTab = (tab: MainBillingTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  // State for Invoice Details Drawer
  const [selectedInvoice, setSelectedInvoice] =
    useState<SuperAdminInvoiceListItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // State for Assign Plan Dialog & Inline Plan Slider
  const [assignPlanOpen, setAssignPlanOpen] = useState(false);
  const [planSliderOpen, setPlanSliderOpen] = useState(false);
  const [assignPlanError, setAssignPlanError] = useState<string | null>(null);

  // State for Lifecycle & Hold Actions
  const [holdAction, setHoldAction] = useState<'impose' | 'clear' | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);

  type SubscriptionActionKey =
    | 'cancel-scheduled'
    | 'resume'
    | 'cancel-immediate';
  const [subAction, setSubAction] = useState<SubscriptionActionKey | null>(null);

  // Queries
  const orgQuery = useSuperAdminOrganisationQuery(organisationId);
  const overviewQuery = useSuperAdminBillingOverviewQuery(
    organisationId ?? '',
  );
  const subscriptionQuery = useSuperAdminSubscriptionQuery(
    organisationId ?? '',
  );
  const invoicesQuery = useSuperAdminInvoicesQuery(
    organisationId ?? '',
    1,
    5,
  );
  const historyQuery = useSuperAdminBillingHistoryQuery(
    organisationId ?? '',
    1,
    5,
    false,
  );
  const plansQuery = useAdminPlansQuery();

  // Mutations
  const assignPlanMutation = useAssignPlanMutation(organisationId ?? '');
  const imposeHoldMutation = useImposePaymentHoldMutation(
    organisationId ?? '',
  );
  const clearHoldMutation = useClearPaymentHoldMutation(
    organisationId ?? '',
  );
  const cancelScheduledMutation =
    useCancelSubscriptionAtPeriodEndMutation(organisationId ?? '');
  const resumeMutation = useResumeSubscriptionMutation(organisationId ?? '');
  const cancelImmediateMutation =
    useCancelSubscriptionImmediateMutation(organisationId ?? '');

  const openInvoiceDetail = (invoice: SuperAdminInvoiceListItem) => {
    setSelectedInvoice(invoice);
    setDrawerOpen(true);
  };

  if (!organisationId) {
    return (
      <EmptyState
        icon={Receipt}
        title="Missing organisation id"
        description="This route requires an organisation identifier in the URL."
      />
    );
  }

  const organisation = orgQuery.data;
  const overview = overviewQuery.data;
  const subscription = subscriptionQuery.data;
  const invoices = invoicesQuery.data?.data ?? [];
  const historyItems = historyQuery.data?.data ?? [];

  const paymentHoldActive = organisation?.paymentHoldActive ?? false;
  const isPastDue = overview?.plan.subscriptionStatus === 'past_due';

  return (
    <div className="flex flex-col gap-6">
      {/* Drawer: Detailed Invoice Breakdown & Provider Retry */}
      <InvoiceDetailDrawer
        organisationId={organisationId}
        invoice={selectedInvoice}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      {/* Assign Plan Dialog */}
      {overview ? (
        <AssignPlanDialog
          open={assignPlanOpen}
          onOpenChange={setAssignPlanOpen}
          plans={plansQuery.data ?? []}
          currentPlanId={overview.plan.planId}
          currentPlanName={overview.plan.planName}
          isSubmitting={assignPlanMutation.isPending}
          errorMessage={assignPlanError}
          onSubmit={async (planId, reason) => {
            setAssignPlanError(null);
            try {
              await assignPlanMutation.mutateAsync({ planId, reason });
              showToast.success('Plan assigned.');
              setAssignPlanOpen(false);
            } catch (err) {
              setAssignPlanError(extractErrorMessage(err));
            }
          }}
        />
      ) : null}

      {/* Manual Hold Confirmation Dialogs (CAP-027) */}
      {organisation && (
        <>
          <LifecycleConfirmDialog
            open={holdAction === 'impose'}
            onOpenChange={(o) => {
              if (!o) setHoldAction(null);
            }}
            title="Impose payment hold"
            description="Stop the sync scheduler and pause queued jobs for this organisation independent of billing state. Tenant reads remain available."
            bodyWarning="Use for compliance / support holds only. Scheduled runs are held until explicitly lifted."
            actionLabel="Impose hold"
            tone="danger"
            organisationName={organisation.name}
            requiresNameConfirm
            minReasonLength={10}
            reasonPlaceholder="Why is this organisation being manually held?"
            isSubmitting={imposeHoldMutation.isPending}
            errorMessage={holdError}
            onSubmit={async ({ reason }) => {
              setHoldError(null);
              try {
                await imposeHoldMutation.mutateAsync({
                  reason,
                  confirmName: organisation.name,
                });
                showToast.success('Payment hold imposed.');
                setHoldAction(null);
              } catch (err) {
                setHoldError(extractErrorMessage(err));
              }
            }}
          />

          <LifecycleConfirmDialog
            open={holdAction === 'clear'}
            onOpenChange={(o) => {
              if (!o) setHoldAction(null);
            }}
            title="Clear payment hold"
            description="Lift the manual payment hold. The scheduler resumes for this organisation on the next tick."
            actionLabel="Clear hold"
            tone="warning"
            organisationName={organisation.name}
            requiresNameConfirm={false}
            minReasonLength={10}
            reasonPlaceholder="Why is this hold being cleared?"
            isSubmitting={clearHoldMutation.isPending}
            errorMessage={holdError}
            onSubmit={async ({ reason }) => {
              setHoldError(null);
              try {
                await clearHoldMutation.mutateAsync({ reason });
                showToast.success('Payment hold cleared.');
                setHoldAction(null);
              } catch (err) {
                setHoldError(extractErrorMessage(err));
              }
            }}
          />
        </>
      )}

      {/* Subscription Lifecycle Dialogs (CAP-031) */}
      {organisation && overview && (
        <>
          <LifecycleConfirmDialog
            open={subAction === 'cancel-scheduled'}
            onOpenChange={(o) => {
              if (!o) setSubAction(null);
            }}
            title="Cancel subscription at period end"
            description="The customer retains access until the end of the current billing period, then automatically drops to Free."
            actionLabel="Schedule cancellation"
            tone="warning"
            organisationName={organisation.name}
            requiresNameConfirm={false}
            minReasonLength={10}
            reasonPlaceholder="Why is this cancellation being scheduled?"
            isSubmitting={cancelScheduledMutation.isPending}
            errorMessage={
              cancelScheduledMutation.isError
                ? extractErrorMessage(cancelScheduledMutation.error)
                : null
            }
            onSubmit={({ reason }) => {
              cancelScheduledMutation.mutate(
                { reason },
                {
                  onSuccess: () => {
                    showToast.success(
                      'Subscription cancellation scheduled for period end.',
                    );
                    setSubAction(null);
                  },
                },
              );
            }}
          />

          <LifecycleConfirmDialog
            open={subAction === 'resume'}
            onOpenChange={(o) => {
              if (!o) setSubAction(null);
            }}
            title="Resume subscription"
            description="Clear the scheduled cancellation. The subscription continues on its regular renewal schedule."
            actionLabel="Resume subscription"
            tone="warning"
            organisationName={organisation.name}
            requiresNameConfirm={false}
            minReasonLength={0}
            reasonPlaceholder="Optional context for the audit trail"
            isSubmitting={resumeMutation.isPending}
            errorMessage={
              resumeMutation.isError
                ? extractErrorMessage(resumeMutation.error)
                : null
            }
            onSubmit={({ reason }) => {
              resumeMutation.mutate(
                { reason: reason.trim() || 'Resumed by Super Admin' },
                {
                  onSuccess: () => {
                    showToast.success('Subscription resumed.');
                    setSubAction(null);
                  },
                },
              );
            }}
          />

          <LifecycleConfirmDialog
            open={subAction === 'cancel-immediate'}
            onOpenChange={(o) => {
              if (!o) setSubAction(null);
            }}
            title="Cancel subscription immediately"
            description="Immediately drop the organisation to Free, bypass the period-end wait, and pause over-limit jobs."
            bodyWarning="High-impact action. The customer loses paid plan access immediately."
            actionLabel="Cancel immediately"
            tone="danger"
            organisationName={organisation.name}
            requiresNameConfirm
            minReasonLength={10}
            reasonPlaceholder="Why is this subscription being cancelled immediately?"
            isSubmitting={cancelImmediateMutation.isPending}
            errorMessage={
              cancelImmediateMutation.isError
                ? extractErrorMessage(cancelImmediateMutation.error)
                : null
            }
            onSubmit={({ reason }) => {
              cancelImmediateMutation.mutate(
                { reason },
                {
                  onSuccess: () => {
                    showToast.success('Subscription cancelled immediately.');
                    setSubAction(null);
                  },
                },
              );
            }}
          />
        </>
      )}

      {/* Top Banner: Manual Payment Hold Active (CAP-027) */}
      {paymentHoldActive && (
        <Alert
          variant="destructive"
          className="border-amber-300 bg-amber-50 text-amber-900"
        >
          <AlertTriangle className="size-4 text-amber-700" />
          <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
            <div>
              <AlertTitle className="font-semibold text-amber-900">
                Manual Billing Hold Active
              </AlertTitle>
              <AlertDescription className="text-xs text-amber-800">
                This organisation is currently placed on a manual service
                hold. Scheduled sync execution and queued runs are paused until
                lifted.
              </AlertDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-400 bg-white text-xs font-medium text-amber-900 hover:bg-amber-100"
              onClick={() => {
                setHoldError(null);
                setHoldAction('clear');
              }}
            >
              Clear payment hold
            </Button>
          </div>
        </Alert>
      )}

      {/* Top Banner: Recurring-Payment Failure Grace Period (CAP-032) */}
      {isPastDue && (
        <Alert
          variant="destructive"
          className="border-red-300 bg-red-50 text-red-900"
        >
          <ShieldAlert className="size-4 text-red-700" />
          <div>
            <AlertTitle className="font-semibold text-red-900">
              Subscription Past Due (Grace Period Active)
            </AlertTitle>
            <AlertDescription className="text-xs text-red-800">
              Payment retries failed. The organisation is currently in the
              grace period. If payment is not settled before the grace period
              expires, the system will downgrade the organisation to the Free
              tier and halt paid-only sync schedules.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Over-Plan Alert Banner */}
      {overview?.plan.overLimit.isOverLimit && (
        <Alert variant="destructive">
          <AlertTitle>Over-plan resources</AlertTitle>
          <AlertDescription>
            One or more resource counts exceed this plan&rsquo;s limits.
            Scheduled runs may fail until the plan is upgraded or the count
            reduces.
          </AlertDescription>
        </Alert>
      )}

      {/* Top Organisation Billing Actions Bar (matching reference header) */}
      {organisation && overview ? (
        <BillingActions
          organisation={organisation}
          planName={overview.plan.planName}
          subscriptionStatus={overview.plan.subscriptionStatus}
          cancelAtPeriodEnd={overview.plan.cancelAtPeriodEnd}
          planAccessSource={overview.plan.planAccessSource}
          onToggleHold={() => {
            setHoldError(null);
            setHoldAction(paymentHoldActive ? 'clear' : 'impose');
          }}
          onCancelAtPeriodEnd={() => setSubAction('cancel-scheduled')}
          onResumeSubscription={() => setSubAction('resume')}
          onCancelImmediate={() => setSubAction('cancel-immediate')}
        />
      ) : null}

      {/* Responsive Two-Column Layout */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* ── LEFT COLUMN: BILLING MANAGEMENT (~65%) ───────────────────── */}
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          {/* Compact Billing Overview Header & 6 Mini Stat Cards */}
          {overviewQuery.isLoading ? (
            <SkeletonList count={2} />
          ) : overviewQuery.isError ? (
            <ErrorState
              title="Could not load billing overview"
              description={extractErrorMessage(overviewQuery.error)}
              onRetry={() => overviewQuery.refetch()}
            />
          ) : overview ? (
            <BillingOverviewHeader
              overview={overview}
              subscriptionId={subscription?.id ?? null}
            />
          ) : null}

          {/* Child Tabs: Overview | History & Invoices */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as MainBillingTab)}
            className="space-y-4"
          >
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="history">History &amp; Invoices</TabsTrigger>
            </TabsList>

            {/* Sub-Tab 1: Overview (Recent billing activity + Latest invoice) */}
            <TabsContent value="overview" className="space-y-6">
              {/* Section 1: Recent billing activity */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">
                      Recent billing activity
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Latest invoices and payment events for this organisation.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setActiveTab('history')}
                  >
                    View all activity &rarr;
                  </Button>
                </div>

                <BillingActivityTable
                  items={historyItems}
                  maxRows={4}
                  onViewAll={() => setActiveTab('history')}
                />
              </div>

              {/* Section 2: Latest invoice */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">
                      Latest invoice
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Most recent invoice for this organisation.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setActiveTab('history')}
                  >
                    View all invoices &rarr;
                  </Button>
                </div>

                {invoicesQuery.isLoading ? (
                  <SkeletonList count={1} />
                ) : invoices.length === 0 ? (
                  <Card className="p-6 text-center text-xs text-muted-foreground">
                    No invoices yet
                  </Card>
                ) : (
                  <BillingInvoicesTable
                    invoices={invoices}
                    onOpenDetail={openInvoiceDetail}
                    maxRows={1}
                  />
                )}
              </div>
            </TabsContent>

            {/* Sub-Tab 2: History & Invoices (Combined full workspace) */}
            <TabsContent value="history" className="space-y-6">
              <BillingHistorySection
                organisationId={organisationId}
                onOpenDetail={openInvoiceDetail}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* ── RIGHT COLUMN: SUBSCRIPTION & ENTITLEMENTS (~35%) ─────────── */}
        <div className="space-y-4 lg:col-span-5 xl:col-span-4">
          <span className="sr-only">Subscription</span>

          {/* Subscription Plan Card */}
          {overview ? (
            <SubscriptionPlanCard
              planName={overview.plan.planName}
              status={overview.plan.subscriptionStatus}
              billingInterval={overview.plan.billingInterval}
              currentPeriodEnd={overview.plan.currentPeriodEnd}
              planAccessSource={overview.plan.planAccessSource}
              onChangePlan={() => {
                setAssignPlanError(null);
                setPlanSliderOpen((prev) => !prev);
              }}
              changePlanLabel={overview ? 'Change Plan' : 'Choose Plan'}
              className="w-full"
            />
          ) : (
            <Card className="h-44 animate-pulse" />
          )}

          {/* Inline Plan Change Slider (Shared Component with inline audit reason) */}
          <PlanSlider
            plans={plansQuery.data ?? []}
            currentPlanId={overview?.plan?.planId ?? null}
            currentPlanName={overview?.plan?.planName ?? null}
            currentBillingInterval={overview?.plan?.billingInterval}
            isOpen={planSliderOpen}
            onClose={() => {
              setPlanSliderOpen(false);
              setAssignPlanError(null);
            }}
            onSavePlanChange={async (planId, reason) => {
              try {
                setAssignPlanError(null);
                await assignPlanMutation.mutateAsync({ planId, reason });
                showToast.success('Plan changed successfully.');
                setPlanSliderOpen(false);
                await overviewQuery.refetch();
              } catch (err) {
                const msg = extractErrorMessage(err);
                setAssignPlanError(msg);
                showToast.error(msg);
                throw err;
              }
            }}
            isSubmitting={assignPlanMutation.isPending}
            errorMessage={assignPlanError}
          />

          {/* Payment Method on File (CAP-021: Non-sensitive card details) */}
          {subscription?.paymentMethod && (
            <Card size="sm" className="gap-0 py-0 p-3 sm:px-3.5 sm:py-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    Payment Method on File
                  </h4>
                  {subscription.paymentMethod.isDefault && (
                    <span className="rounded-full bg-secondary text-secondary-foreground text-[10px] px-2 py-0.5 font-medium">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs tracking-wider uppercase text-foreground">
                      {subscription.paymentMethod.cardBrand?.toUpperCase() ?? 'CARD'}
                    </span>
                    <span className="font-mono text-sm tracking-widest text-muted-foreground">
                      &bull;&bull;&bull;&bull; {subscription.paymentMethod.cardLast4}
                    </span>
                  </div>
                  {subscription.paymentMethod.cardExpMonth && (
                    <span className="text-xs text-muted-foreground font-mono">
                      Expires {subscription.paymentMethod.cardExpMonth.toString().padStart(2, '0')}/
                      {subscription.paymentMethod.cardExpYear}
                    </span>
                  )}
                </div>
              </Card>
            )}

            {/* Entitlements & Usage */}
          {overview && (
            <EntitlementsUsage
              organisationId={organisationId}
              planName={overview.plan.planName}
              overLimit={overview.plan.overLimit}
              usage={overview.usage}
            />
          )}

          {/* Enhanced Billing Notes Card */}
          <BillingNotesCard organisationId={organisationId} />
        </div>
      </div>
    </div>
  );
}
