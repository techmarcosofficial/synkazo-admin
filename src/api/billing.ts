import apiClient from './apiClient';

import type {
  PlanStatus,
  UsageSummary,
  BillingInterval,
  ApiPlan,
  EmbeddedCheckoutRequest,
  EmbeddedCheckoutResult,
  SubscriptionDetail,
  UpgradeResult,
  PaymentMethodView,
  InvoiceListItem,
  Paginated,
  HistoryItem,
  AdminApiPlan,
  CreatePlanRequest,
  UpdatePlanRequest,
  CreatePriceRequest,
  UpdatePriceRequest,
  Coupon,
  CreateCouponRequest,
  UpdateCouponRequest,
  ValidateCouponResult,
  CheckoutPreview,
  DiscountSettings,
  RedemptionContext,
  DiscountRule,
  CreateDiscountRuleRequest,
  UpdateDiscountRuleRequest,
  UpgradePreview,
  Organisation,
} from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

export const billingApi = {
  getPlan: (): Promise<PlanStatus> => apiClient.get('/billing/plan').then(d),
  getUsage: (): Promise<UsageSummary> =>
    apiClient.get('/billing/usage').then(d),

  // Public plan catalogue for the pricing + checkout pages.
  getPlans: (interval?: BillingInterval): Promise<ApiPlan[]> =>
    apiClient
      .get('/billing/plans', {
        params: interval ? { billing_interval: interval } : undefined,
      })
      .then(d),
  // Whether the coupon input should be offered at all on checkout.
  getPricingSettings: (): Promise<{
    discountsEnabled: boolean;
  }> => apiClient.get('/billing/pricing-settings').then(d),

  // Promo codes. `validateCoupon` is the "Apply" check; the server re-validates at charge time,
  // so a stale result here can never cause a wrong charge.
  validateCoupon: (req: {
    code: string;
    priceId: string;
    context?: RedemptionContext;
  }): Promise<ValidateCouponResult> =>
    apiClient.post('/billing/coupons/validate', req).then(d),

  previewCheckout: (req: {
    priceId: string;
    couponCode?: string;
  }): Promise<CheckoutPreview> =>
    apiClient.post('/billing/checkout/preview', req).then(d),

  // The day-based proration breakdown for a plan change, before committing.
  previewUpgrade: (req: { priceId: string }): Promise<UpgradePreview> =>
    apiClient.post('/billing/subscription/upgrade/preview', req).then(d),

  // Embedded Stripe Elements checkout — the payment method is tokenized client-side,
  // so only its id (never raw card data) reaches the server.
  checkoutEmbedded: (
    req: EmbeddedCheckoutRequest,
  ): Promise<EmbeddedCheckoutResult> =>
    apiClient.post('/billing/checkout/embedded', req).then(d),

  openPortal: (): Promise<{ url: string }> =>
    apiClient.post('/billing/portal').then(d),
  // Re-syncs subscription state straight from Stripe (recovers missed webhooks);
  // returns the fresh PlanStatus. Called when returning from checkout.
  refresh: (): Promise<PlanStatus> =>
    apiClient.post('/billing/refresh').then(d),

  // ── Subscription lifecycle ──────────────────────────────────────────────────
  getSubscription: (): Promise<SubscriptionDetail | null> =>
    apiClient.get('/billing/subscription').then(d),
  // Every plan change (upgrade or downgrade) takes effect immediately — charges the day-based
  // prorated difference now and resets the billing cycle. Never a one-click switch — only
  // reachable through the checkout confirmation flow.
  upgrade: (args: {
    priceId: string;
    paymentMethodId?: string;
    /** Previewed amount due; the server 409s if re-resolving yields a different total. */
    expectedTotal?: number;
  }): Promise<UpgradeResult> =>
    apiClient.patch('/billing/subscription/upgrade', args).then(d),
  // Only relevant for a legacy (pre-migration) scheduled downgrade — new plan changes never
  // create one.
  cancelScheduledChange: () =>
    apiClient.post('/billing/subscription/cancel-scheduled-change').then(d),
  cancel: (reason?: string) =>
    apiClient.post('/billing/subscription/cancel', { reason }).then(d),
  reactivate: () => apiClient.post('/billing/subscription/reactivate').then(d),

  // ── Payment methods ─────────────────────────────────────────────────────────
  getPaymentMethods: (): Promise<PaymentMethodView[]> =>
    apiClient.get('/billing/payment-methods').then(d),
  addPaymentMethod: (paymentMethodId: string): Promise<PaymentMethodView> =>
    apiClient.post('/billing/payment-methods', { paymentMethodId }).then(d),
  setDefaultPaymentMethod: (id: string): Promise<PaymentMethodView> =>
    apiClient.patch(`/billing/payment-methods/${id}/default`).then(d),
  removePaymentMethod: (id: string): Promise<{ deleted: true }> =>
    apiClient.delete(`/billing/payment-methods/${id}`).then(d),

  // ── Invoices + history ────────────────────────────────────────────────────────
  getInvoices: (page = 1, limit = 20): Promise<Paginated<InvoiceListItem>> =>
    apiClient.get('/billing/invoices', { params: { page, limit } }).then(d),
  getHistory: (
    page = 1,
    limit = 20,
    type?: 'payment',
  ): Promise<Paginated<HistoryItem>> =>
    apiClient
      .get('/billing/history', { params: { page, limit, type } })
      .then(d),
};

// Super-admin plan-catalogue management (guarded server-side to super_admin).
export const billingAdminApi = {
  listPlans: (): Promise<AdminApiPlan[]> =>
    apiClient.get('/billing/admin/plans').then(d),
  createPlan: (body: CreatePlanRequest): Promise<AdminApiPlan> =>
    apiClient.post('/billing/admin/plans', body).then(d),
  updatePlan: (id: string, body: UpdatePlanRequest): Promise<AdminApiPlan> =>
    apiClient.patch(`/billing/admin/plans/${id}`, body).then(d),
  deactivatePlan: (id: string): Promise<AdminApiPlan> =>
    apiClient.delete(`/billing/admin/plans/${id}`).then(d),
  addPrice: (id: string, body: CreatePriceRequest): Promise<AdminApiPlan> =>
    apiClient.post(`/billing/admin/plans/${id}/prices`, body).then(d),
  updatePrice: (
    id: string,
    priceId: string,
    body: UpdatePriceRequest,
  ): Promise<AdminApiPlan> =>
    apiClient
      .patch(`/billing/admin/plans/${id}/prices/${priceId}`, body)
      .then(d),
  updateFeatures: (
    id: string,
    features: Record<string, string>,
  ): Promise<Record<string, string>> =>
    apiClient
      .patch(`/billing/admin/plans/${id}/features`, { features })
      .then(d),
  resyncPlan: (
    id: string,
  ): Promise<{ plan: AdminApiPlan; relinked: string[] }> =>
    apiClient.post(`/billing/admin/plans/${id}/resync`).then(d),

  // Manually assign an existing plan to an org, bypassing Stripe — the org then functions
  // exactly per that plan's limits/features without being billed for it.
  assignPlanToOrganisation: (
    organisationId: string,
    planId: string,
  ): Promise<Organisation> =>
    apiClient
      .patch(`/billing/admin/organisations/${organisationId}/plan`, { planId })
      .then(d),

  // ── Coupons + discount settings ─────────────────────────────────────────────
  listCoupons: (): Promise<Coupon[]> =>
    apiClient.get('/billing/admin/coupons').then(d),
  createCoupon: (body: CreateCouponRequest): Promise<Coupon> =>
    apiClient.post('/billing/admin/coupons', body).then(d),
  updateCoupon: (id: string, body: UpdateCouponRequest): Promise<Coupon> =>
    apiClient.patch(`/billing/admin/coupons/${id}`, body).then(d),
  deactivateCoupon: (id: string): Promise<Coupon> =>
    apiClient.delete(`/billing/admin/coupons/${id}`).then(d),
  resyncCoupon: (id: string): Promise<Coupon> =>
    apiClient.post(`/billing/admin/coupons/${id}/resync`).then(d),

  listDiscountRules: (): Promise<DiscountRule[]> =>
    apiClient.get('/billing/admin/discount-rules').then(d),
  createDiscountRule: (
    body: CreateDiscountRuleRequest,
  ): Promise<DiscountRule> =>
    apiClient.post('/billing/admin/discount-rules', body).then(d),
  updateDiscountRule: (
    id: string,
    body: UpdateDiscountRuleRequest,
  ): Promise<DiscountRule> =>
    apiClient.patch(`/billing/admin/discount-rules/${id}`, body).then(d),
  deactivateDiscountRule: (id: string): Promise<DiscountRule> =>
    apiClient.delete(`/billing/admin/discount-rules/${id}`).then(d),

  getDiscountSettings: (): Promise<DiscountSettings> =>
    apiClient.get('/billing/admin/settings/discounts').then(d),
  updateDiscountSettings: (
    body: Partial<DiscountSettings>,
  ): Promise<DiscountSettings> =>
    apiClient.patch('/billing/admin/settings/discounts', body).then(d),
};
