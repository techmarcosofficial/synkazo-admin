import {
  AlertTriangle,
  CreditCard,
  Gauge,
  History,
  Receipt,
  ShieldAlert,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import BillingSubNavigation, { type BillingNavItem } from '@/components/billing/BillingSubNavigation';
import PlanSlider from '@/components/billing/PlanSlider';
import UpcomingBillingAndPaymentCard from '@/components/billing/UpcomingBillingAndPaymentCard';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { STATUS_DOT } from '@/pages/organisation/billing/tabs/InvoicesTab';
import AssignPlanDialog from '@/pages/superadmin/billing/AssignPlanDialog';
import BillingActions from '@/pages/superadmin/billing/BillingActions';
import BillingHistorySection from '@/pages/superadmin/billing/BillingHistorySection';
import BillingInvoicesTable from '@/pages/superadmin/billing/BillingInvoicesTable';
import BillingNotesCard from '@/pages/superadmin/billing/BillingNotesCard';
import BillingOverviewHeader from '@/pages/superadmin/billing/BillingOverviewHeader';
import EntitlementsUsage from '@/pages/superadmin/billing/EntitlementsUsage';
import InvoiceDetailDrawer from '@/pages/superadmin/billing/InvoiceDetailDrawer';
import SubscriptionPlanCard from '@/pages/superadmin/billing/SubscriptionPlanCard';
import LifecycleConfirmDialog from '@/pages/superadmin/lifecycle/LifecycleConfirmDialog';
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

function formatCurrency(
  amount: number | null | undefined,
  currency?: string | null,
): string {
  if (amount == null) return '—';
  const c = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: c,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${c}`;
  }
}

export type SuperAdminBillingSection =
  | 'overview'
  | 'cards'
  | 'invoices'
  | 'activity';

export default function OrganisationBillingPage() {
  const { organisationId } = useParams<{ organisationId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Query Params: supports section=overview|cards|invoices|activity with backwards-compatible tab=
  const activeSectionParam = searchParams.get('section') || searchParams.get('tab');
  const activeSection: SuperAdminBillingSection =
    activeSectionParam === 'cards' || activeSectionParam === 'subscription'
      ? 'cards'
      : activeSectionParam === 'activity' || activeSectionParam === 'history'
        ? 'activity'
        : activeSectionParam === 'invoices'
          ? 'invoices'
          : 'overview';

  const setActiveSection = (section: SuperAdminBillingSection) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('section', section);
      next.delete('tab');
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

  // Invoices Section filter state
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [paymentPage, setPaymentPage] = useState(1);
  const paymentPageSize = 10;

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
    50,
  );
  const historyQuery = useSuperAdminBillingHistoryQuery(
    organisationId ?? '',
    paymentPage,
    paymentPageSize,
    true, // payments only for the flat payments table
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
  const rawInvoices = invoicesQuery.data?.data ?? [];
  const paymentItems = historyQuery.data?.data ?? [];
  const totalPayments = historyQuery.data?.total ?? 0;

  const paymentHoldActive = organisation?.paymentHoldActive ?? false;
  const isPastDue = overview?.plan.subscriptionStatus === 'past_due';

  const highlightParam = searchParams.get('highlight');
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  useEffect(() => {
    if (!overview || !highlightParam) return;
    setActiveHighlight(highlightParam);
    const target =
      document.getElementById('entitlement-resource-' + highlightParam) ||
      document.getElementById('entitlements-usage');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const timer = setTimeout(() => {
      setActiveHighlight(null);
    }, 2800);
    return () => clearTimeout(timer);
  }, [overview, highlightParam]);

  // Invoices filtered by status
  const filteredInvoices = useMemo(() => {
    if (invoiceStatusFilter === 'all') return rawInvoices;
    return rawInvoices.filter((inv) => inv.status === invoiceStatusFilter);
  }, [rawInvoices, invoiceStatusFilter]);

  // Top Tabs Navigation Items (matching Super Admin Dashboard style)
  const navItems: BillingNavItem[] = [
    { id: 'overview', label: 'Overview', icon: Gauge },
    {
      id: 'cards',
      label: 'Payment methods',
      icon: CreditCard,
      badge: subscription?.paymentMethod ? 1 : undefined,
    },
    {
      id: 'invoices',
      label: 'Invoices & Payments',
      icon: Receipt,
      badge: rawInvoices.length > 0 ? rawInvoices.length : undefined,
    },
    { id: 'activity', label: 'Billing Activity', icon: History },
  ];

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
            description="Stop sync scheduling and hold queued jobs for this organisation."
            bodyWarning="Scheduled runs will be held until explicitly lifted."
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
            description="Lift the manual payment hold on this organisation."
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
            description="The subscription will cancel at the end of the current billing period."
            actionLabel="Schedule cancellation"
            tone="warning"
            organisationName={organisation.name}
            requiresNameConfirm={false}
            minReasonLength={10}
            reasonPlaceholder="Why is this subscription scheduled to cancel?"
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
                    showToast.success('Cancellation scheduled.');
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
            description="Clear the scheduled cancellation. The subscription will renew normally."
            actionLabel="Resume subscription"
            tone="warning"
            organisationName={organisation.name}
            requiresNameConfirm={false}
            minReasonLength={0}
            reasonPlaceholder="Optional reason for audit log"
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
            description="Cancel subscription immediately and switch organisation to Free."
            bodyWarning="The organisation loses paid plan access immediately."
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

      {/* Top Organisation Billing Actions Bar (pinned on top) */}
      {organisation && overview ? (
        <BillingActions
          organisation={organisation}
          planName={overview.plan.planName}
          subscriptionStatus={overview.plan.subscriptionStatus}
          cancelAtPeriodEnd={overview.plan.cancelAtPeriodEnd}
          planAccessSource={overview.plan.planAccessSource}
          onAssignPlan={() => setAssignPlanOpen(true)}
          onToggleHold={() => {
            setHoldError(null);
            setHoldAction(paymentHoldActive ? 'clear' : 'impose');
          }}
          onCancelAtPeriodEnd={() => setSubAction('cancel-scheduled')}
          onResumeSubscription={() => setSubAction('resume')}
          onCancelImmediate={() => setSubAction('cancel-immediate')}
        />
      ) : null}

      {/* ── TOP HORIZONTAL TABS (MATCHING SUPER ADMIN DASHBOARD STYLE) ──── */}
      <BillingSubNavigation
        activeId={activeSection}
        items={navItems}
        onSelect={(id) => setActiveSection(id as SuperAdminBillingSection)}
        title="Organisation Billing"
        selectId="superadmin-billing-section-select"
      />

      {/* ── SECTION CONTENT AREA ────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* ── SECTION 1: OVERVIEW ───────────────────────────────────────── */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
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

            {/* Two-Column Grid:
                Left = Upcoming billing & Payment Method (moved here!)
                Right = Subscription Card + PlanSlider + Entitlements & Usage (moved here!)
            */}
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              {/* Left: Upcoming Billing & Payment Method (~60-65%) */}
              <div className="space-y-6 lg:col-span-7 xl:col-span-8">
                {overview && (
                  <UpcomingBillingAndPaymentCard
                    plan={{
                      planName: overview.plan.planName,
                      billingInterval: overview.plan.billingInterval,
                      subscriptionStatus: overview.plan.subscriptionStatus,
                      trialEndsAt: overview.plan.trialEndsAt,
                    }}
                    renewalDate={overview.plan.currentPeriodEnd}
                    renewalLabel={
                      overview.plan.cancelAtPeriodEnd
                        ? 'Subscription ends'
                        : overview.plan.subscriptionStatus === 'trialing'
                          ? 'Trial ends'
                          : 'Renews on'
                    }
                    hasSubscription={overview.plan.subscriptionStatus !== 'none'}
                    pendingCancel={overview.plan.cancelAtPeriodEnd}
                    defaultCard={subscription?.paymentMethod ?? null}
                    onManageCards={() => setActiveSection('cards')}
                    canManageCards={true}
                  />
                )}
              </div>

              {/* Right: Subscription Card + Inline PlanSlider + Entitlements & Usage (~35-40%) */}
              <div className="space-y-4 lg:col-span-5 xl:col-span-4">
                <span className="sr-only">Subscription</span>

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

                {/* Inline Plan Change Slider rendered right beneath SubscriptionPlanCard */}
                <PlanSlider
                  title="Change Plan"
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

                {/* Entitlements & Usage moved here to the right column! */}
                {overview && (
                  <EntitlementsUsage
                    organisationId={organisationId}
                    planName={overview.plan.planName}
                    overLimit={overview.plan.overLimit}
                    usage={overview.usage}
                    highlightedKey={activeHighlight}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 2: PAYMENT METHODS (STRICTLY READ-ONLY) ───────────── */}
        {activeSection === 'cards' && (
          <div className="space-y-6">
            {overview && (
              <div className="max-w-md">
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
                  changePlanLabel="Change Plan"
                  className="w-full"
                />

                <div className="pt-2">
                  <PlanSlider
                    title="Change Plan"
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
                </div>
              </div>
            )}

            <Card className="gap-0 py-0">
              <CardHeader visualLevel="section" className="px-4 py-3 sm:px-5 sm:py-3.5 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <CreditCard className="size-4 text-primary" aria-hidden="true" />
                      <span>Payment methods on file</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Active payment methods registered for this organisation.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Read-only
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Informative notice for compliance and auditing */}
                <Alert className="border-info/20 bg-info/5 rounded-xl py-2 px-3">
                  <AlertTitle className="text-xs font-semibold text-info">
                    Managed by Tenant
                  </AlertTitle>
                  <AlertDescription className="text-xs text-muted-foreground">
                    Payment methods are managed directly by tenant administrators. Details are presented read-only for support and compliance auditing.
                  </AlertDescription>
                </Alert>

                {/* Payment Method on File Display */}
                {subscription?.paymentMethod ? (
                  <div className="rounded-2xl border p-4 sm:p-5 bg-muted/20 space-y-3 max-w-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Receipt className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        Payment Method on File
                      </span>
                      {subscription.paymentMethod.isDefault && (
                        <Badge variant="secondary" size="xs">Default</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs tracking-wider uppercase text-foreground">
                          {subscription.paymentMethod.cardBrand?.toUpperCase() ?? 'CARD'}
                        </span>
                        <span className="font-mono text-sm tracking-widest text-muted-foreground">
                          •••• {subscription.paymentMethod.cardLast4}
                        </span>
                      </div>

                      {subscription.paymentMethod.cardExpMonth && (
                        <span className="text-xs text-muted-foreground font-mono">
                          Expires {subscription.paymentMethod.cardExpMonth.toString().padStart(2, '0')}/
                          {subscription.paymentMethod.cardExpYear}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={CreditCard}
                    title="No payment method on file"
                    description="This organisation has no active credit card saved in Stripe."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── SECTION 3: INVOICES & PAYMENT HISTORY (DUAL TABLES, NO TIMELINE) ─ */}
        {activeSection === 'invoices' && (
          <div className="space-y-6">
            {/* Table 1: Invoices Table Card with dedicated filters and drawer */}
            <Card className="gap-0 py-0">
              <CardHeader visualLevel="section" className="px-4 py-3 sm:px-5 sm:py-3.5 border-b">
                <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-xl">
                      <Receipt className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <span>All invoices</span>
                        {rawInvoices.length > 0 && (
                          <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0 border-0 font-normal">
                            {rawInvoices.length}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Stripe invoices generated for this organisation.
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={invoiceStatusFilter}
                      onValueChange={setInvoiceStatusFilter}
                    >
                      <SelectTrigger className="h-8 text-xs w-[120px] rounded-xl">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="void">Void</SelectItem>
                        <SelectItem value="uncollectible">Uncollectible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5">
                {invoicesQuery.isLoading ? (
                  <SkeletonList count={2} />
                ) : filteredInvoices.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No invoices yet
                  </div>
                ) : (
                  <BillingInvoicesTable
                    invoices={filteredInvoices}
                    onOpenDetail={openInvoiceDetail}
                  />
                )}
              </CardContent>
            </Card>

            {/* Table 2: All Payment History Table (Flat table, NOT timeline tree) */}
            <Card className="gap-0 py-0">
              <CardHeader visualLevel="section" className="px-4 py-3 sm:px-5 sm:py-3.5 border-b">
                <div className="flex items-center gap-2.5">
                  <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-xl">
                    <CreditCard className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <span>All payment history</span>
                      {totalPayments > 0 && (
                        <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0 border-0 font-normal">
                          {totalPayments}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Recent payments and transaction outcomes for this organisation.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5">
                {historyQuery.isLoading ? (
                  <SkeletonTable rows={4} columns={4} />
                ) : paymentItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No payment history recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-xl border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[170px] text-xs font-semibold">Date</TableHead>
                            <TableHead className="text-xs font-semibold">Event</TableHead>
                            <TableHead className="text-xs font-semibold">Status</TableHead>
                            <TableHead className="text-right text-xs font-semibold">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paymentItems.map((item, idx) => {
                            const dotClass =
                              item.orderStatus && STATUS_DOT[item.orderStatus as keyof typeof STATUS_DOT]
                                ? STATUS_DOT[item.orderStatus as keyof typeof STATUS_DOT]
                                : 'bg-muted-foreground';
                            return (
                              <TableRow key={item.id ?? `${item.paymentId}-${idx}`} className="hover:bg-muted/40">
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3">
                                  {item.createdAt
                                    ? new Date(item.createdAt).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : '—'}
                                </TableCell>
                                <TableCell className="text-xs font-medium py-3">
                                  {item.description || item.eventType}
                                </TableCell>
                                <TableCell className="py-3">
                                  {item.orderStatus ? (
                                    <Badge
                                      variant="secondary"
                                      className="gap-1.5 text-[11px] font-medium capitalize py-0.5 px-2 rounded-full border-0"
                                    >
                                      <span className={cn('size-1.5 rounded-full', dotClass)} />
                                      {item.orderStatus.replace('_', ' ')}
                                    </Badge>
                                  ) : (
                                    <StatusBadge status="completed" label="Succeeded" />
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-xs font-semibold text-right py-3">
                                  {formatCurrency(item.amount, item.currency)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {totalPayments > paymentPageSize && (
                      <PaginationBar
                        page={paymentPage}
                        totalPages={Math.max(1, Math.ceil(totalPayments / paymentPageSize))}
                        total={totalPayments}
                        pageSize={paymentPageSize}
                        onPageChange={setPaymentPage}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── SECTION 4: BILLING ACTIVITY & NOTES (DEDICATED ACTIVITY TIMELINE) ─ */}
        {activeSection === 'activity' && (
          <div className="space-y-6">
            {/* The Dedicated Billing Activity Timeline Tree */}
            <BillingHistorySection
              organisationId={organisationId}
              onOpenDetail={openInvoiceDetail}
            />

            {/* Enhanced Billing Notes Card for internal staff notes */}
            <BillingNotesCard organisationId={organisationId} />
          </div>
        )}
      </div>
    </div>
  );
}
