import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { billingApi, billingAdminApi } from '@/api/billing';
import type {
  BillingInterval,
  EmbeddedCheckoutRequest,
  CreatePlanRequest,
  UpdatePlanRequest,
  CreatePriceRequest,
  UpdatePriceRequest,
  CreateCouponRequest,
  UpdateCouponRequest,
  DiscountSettings,
  CreateDiscountRuleRequest,
  UpdateDiscountRuleRequest,
  RedemptionContext,
} from '@/types';

export function usePlanQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.billing.plan,
    queryFn: billingApi.getPlan,
    enabled: options?.enabled ?? true,
  });
}

// Public plan catalogue for the pricing + checkout pages.
export function usePlansQuery(interval?: BillingInterval) {
  return useQuery({
    queryKey: queryKeys.billing.plans(interval),
    queryFn: () => billingApi.getPlans(interval),
  });
}

// How many plan cards the pricing page should render (admin-configurable, public read).
export function usePricingSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.billing.pricingSettings,
    queryFn: billingApi.getPricingSettings,
  });
}

// Embedded Elements checkout — returns the created subscription + any 3DS client secret.
export function useEmbeddedCheckoutMutation() {
  return useMutation({
    mutationFn: (req: EmbeddedCheckoutRequest) =>
      billingApi.checkoutEmbedded(req),
  });
}

export function useSubscriptionQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.billing.subscription,
    queryFn: billingApi.getSubscription,
    enabled: options?.enabled ?? true,
  });
}

// Invalidate the plan/subscription/usage views after any billing mutation.
function useBillingInvalidator() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.billing.plan });
    qc.invalidateQueries({ queryKey: queryKeys.billing.subscription });
    qc.invalidateQueries({ queryKey: queryKeys.billing.usage });
  };
}

export function useUpgradeMutation() {
  const invalidate = useBillingInvalidator();
  return useMutation({
    mutationFn: (args: {
      priceId: string;
      paymentMethodId?: string;
      expectedTotal?: number;
    }) => billingApi.upgrade(args),
    onSuccess: invalidate,
  });
}

export function useCancelScheduledChangeMutation() {
  const invalidate = useBillingInvalidator();
  return useMutation({
    mutationFn: () => billingApi.cancelScheduledChange(),
    onSuccess: invalidate,
  });
}

export function useCancelSubscriptionMutation() {
  const invalidate = useBillingInvalidator();
  return useMutation({
    mutationFn: (reason?: string) => billingApi.cancel(reason),
    onSuccess: invalidate,
  });
}

export function useReactivateMutation() {
  const invalidate = useBillingInvalidator();
  return useMutation({
    mutationFn: () => billingApi.reactivate(),
    onSuccess: invalidate,
  });
}

export function usePaymentMethodsQuery() {
  return useQuery({
    queryKey: queryKeys.billing.paymentMethods,
    queryFn: billingApi.getPaymentMethods,
  });
}

export function useAddPaymentMethodMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentMethodId: string) =>
      billingApi.addPaymentMethod(paymentMethodId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.billing.paymentMethods }),
  });
}

export function useSetDefaultPaymentMethodMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => billingApi.setDefaultPaymentMethod(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.billing.paymentMethods }),
  });
}

export function useRemovePaymentMethodMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => billingApi.removePaymentMethod(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.billing.paymentMethods }),
  });
}

export function useInvoicesQuery(page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.billing.invoices(page, limit),
    queryFn: () => billingApi.getInvoices(page, limit),
  });
}

export function useHistoryQuery(page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.billing.history(page, limit),
    queryFn: () => billingApi.getHistory(page, limit),
  });
}

export function usePaymentHistoryQuery(page = 1, limit = 50) {
  return useQuery({
    queryKey: queryKeys.billing.paymentHistory(page, limit),
    queryFn: () => billingApi.getHistory(page, limit, 'payment'),
  });
}

export function useUsageQuery() {
  return useQuery({
    queryKey: queryKeys.billing.usage,
    queryFn: billingApi.getUsage,
  });
}

// ── Admin plan catalogue (super_admin) ────────────────────────────────────────

export function useAdminPlansQuery() {
  return useQuery({
    queryKey: queryKeys.billing.adminPlans,
    queryFn: billingAdminApi.listPlans,
  });
}

// After any catalogue edit, refresh the admin list AND the public plans (pricing page).
function useAdminPlansInvalidator() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.billing.adminPlans });
    qc.invalidateQueries({ queryKey: ['billing', 'plans'] });
  };
}

export function useCreatePlanMutation() {
  const invalidate = useAdminPlansInvalidator();
  return useMutation({
    mutationFn: (body: CreatePlanRequest) => billingAdminApi.createPlan(body),
    onSuccess: invalidate,
  });
}

export function useUpdatePlanMutation() {
  const invalidate = useAdminPlansInvalidator();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePlanRequest }) =>
      billingAdminApi.updatePlan(id, body),
    onSuccess: invalidate,
  });
}

export function useDeactivatePlanMutation() {
  const invalidate = useAdminPlansInvalidator();
  return useMutation({
    mutationFn: (id: string) => billingAdminApi.deactivatePlan(id),
    onSuccess: invalidate,
  });
}

export function useAddPriceMutation() {
  const invalidate = useAdminPlansInvalidator();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CreatePriceRequest }) =>
      billingAdminApi.addPrice(id, body),
    onSuccess: invalidate,
  });
}

export function useUpdatePriceMutation() {
  const invalidate = useAdminPlansInvalidator();
  return useMutation({
    mutationFn: ({
      id,
      priceId,
      body,
    }: {
      id: string;
      priceId: string;
      body: UpdatePriceRequest;
    }) => billingAdminApi.updatePrice(id, priceId, body),
    onSuccess: invalidate,
  });
}

export function useUpdateFeaturesMutation() {
  const invalidate = useAdminPlansInvalidator();
  return useMutation({
    mutationFn: ({
      id,
      features,
    }: {
      id: string;
      features: Record<string, string>;
    }) => billingAdminApi.updateFeatures(id, features),
    onSuccess: invalidate,
  });
}

export function useResyncPlanMutation() {
  const invalidate = useAdminPlansInvalidator();
  return useMutation({
    mutationFn: (id: string) => billingAdminApi.resyncPlan(id),
    onSuccess: invalidate,
  });
}

// Manually assign an existing plan to an org (super_admin, bypasses Stripe). Invalidates the
// organisations list (shown on the super-admin Organisations page) rather than the admin plan
// catalogue, since this mutates an org, not a plan.
export function useAssignPlanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organisationId,
      planId,
    }: {
      organisationId: string;
      planId: string;
    }) => billingAdminApi.assignPlanToOrganisation(organisationId, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organisations.all });
    },
  });
}

export function useOpenPortalMutation() {
  return useMutation({
    mutationFn: () => billingApi.openPortal(),
  });
}

/**
 * Pulls subscription state straight from Stripe and refreshes the cached plan/usage.
 * Used when returning from checkout so the new plan shows immediately even if the
 * webhook hasn't landed yet.
 */
export function useRefreshPlanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => billingApi.refresh(),
    onSuccess: (fresh) => {
      queryClient.setQueryData(queryKeys.billing.plan, fresh);
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.usage });
      // Refresh also backfills any invoices missed by webhooks — invalidate every
      // paginated invoices query so the tab reflects the backfill without a manual refetch.
      queryClient.invalidateQueries({ queryKey: ['billing', 'invoices'] });
    },
  });
}

// ── Discounts: coupons + settings (super admin) ────────────────────────────────

export function useAdminCouponsQuery() {
  return useQuery({
    queryKey: queryKeys.billing.adminCoupons,
    queryFn: billingAdminApi.listCoupons,
  });
}

function useCouponInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.billing.adminCoupons });
  };
}

export function useCreateCouponMutation() {
  const invalidate = useCouponInvalidate();
  return useMutation({
    mutationFn: (body: CreateCouponRequest) =>
      billingAdminApi.createCoupon(body),
    onSuccess: invalidate,
  });
}

export function useUpdateCouponMutation() {
  const invalidate = useCouponInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCouponRequest }) =>
      billingAdminApi.updateCoupon(id, body),
    onSuccess: invalidate,
  });
}

export function useDeactivateCouponMutation() {
  const invalidate = useCouponInvalidate();
  return useMutation({
    mutationFn: (id: string) => billingAdminApi.deactivateCoupon(id),
    onSuccess: invalidate,
  });
}

export function useResyncCouponMutation() {
  const invalidate = useCouponInvalidate();
  return useMutation({
    mutationFn: (id: string) => billingAdminApi.resyncCoupon(id),
    onSuccess: invalidate,
  });
}

export function useAdminDiscountSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.billing.adminDiscountSettings,
    queryFn: billingAdminApi.getDiscountSettings,
  });
}

export function useUpdateDiscountSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<DiscountSettings>) =>
      billingAdminApi.updateDiscountSettings(body),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.billing.adminDiscountSettings,
      });
      // `discountsEnabled` also rides the public pricing-settings response, which gates the
      // coupon input at checkout.
      qc.invalidateQueries({ queryKey: queryKeys.billing.pricingSettings });
    },
  });
}

/** One-shot promo-code check behind the checkout "Apply" button. */
export function useValidateCouponMutation() {
  return useMutation({
    mutationFn: (req: {
      code: string;
      priceId: string;
      context?: RedemptionContext;
    }) => billingApi.validateCoupon(req),
  });
}

/** Discounted total for a new purchase. Only enabled once a code has actually been applied. */
export function useCheckoutPreviewQuery(
  priceId: string,
  couponCode?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.billing.checkoutPreview(priceId, couponCode),
    queryFn: () => billingApi.previewCheckout({ priceId, couponCode }),
    enabled: (options?.enabled ?? true) && !!priceId,
  });
}

// ── Automatic discount rules (super admin) ─────────────────────────────────────

export function useAdminDiscountRulesQuery() {
  return useQuery({
    queryKey: queryKeys.billing.adminDiscountRules,
    queryFn: billingAdminApi.listDiscountRules,
  });
}

function useDiscountRulesInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.billing.adminDiscountRules });
  };
}

export function useCreateDiscountRuleMutation() {
  const invalidate = useDiscountRulesInvalidate();
  return useMutation({
    mutationFn: (body: CreateDiscountRuleRequest) =>
      billingAdminApi.createDiscountRule(body),
    onSuccess: invalidate,
  });
}

export function useUpdateDiscountRuleMutation() {
  const invalidate = useDiscountRulesInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateDiscountRuleRequest;
    }) => billingAdminApi.updateDiscountRule(id, body),
    onSuccess: invalidate,
  });
}

export function useDeactivateDiscountRuleMutation() {
  const invalidate = useDiscountRulesInvalidate();
  return useMutation({
    mutationFn: (id: string) => billingAdminApi.deactivateDiscountRule(id),
    onSuccess: invalidate,
  });
}

/**
 * Live day-based proration breakdown for a pending plan change. Not cached beyond the moment
 * it's shown — the Transfer Fee % or a price could change between renders, and a stale figure
 * would just be rejected on confirm anyway.
 */
export function useUpgradePreviewQuery(
  priceId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.billing.upgradePreview(priceId),
    queryFn: () => billingApi.previewUpgrade({ priceId }),
    enabled: (options?.enabled ?? true) && !!priceId,
    staleTime: 0,
    gcTime: 0,
  });
}
