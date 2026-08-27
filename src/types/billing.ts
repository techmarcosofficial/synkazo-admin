// A real `membership_plans.id` (or the seeded Free plan's id) — never a name/slug. Plans are
// fully data-driven, so this is opaque `string`; display name comes from `planName` alongside
// it wherever the id appears.
export type PlanId = string;

export type SubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'unpaid'
  | 'paused'
  | 'pending_cancel';

export type SyncDirectionLimit = 'one_way' | 'two_way';
export type SyncFrequency =
  'realtime' | '15min' | 'hourly' | 'daily' | 'custom';
export type ObjectScope =
  'core' | 'core_extended' | 'core_custom' | 'all_custom';
export type ObjectTier = 'core' | 'extended' | 'custom';
export type FieldMappingLevel = 'standard' | 'custom' | 'advanced';
export type QueuePriority = 'standard' | 'high' | 'highest';
export type SupportLevel = 'email' | 'priority' | 'dedicated' | 'dedicated_sla';

// Mirrors the backend's serializePlanLimits — a `null` numeric limit means "unlimited".
export interface PlanLimits {
  maxProjects: number | null;
  maxJobs: number | null;
  maxRecordsPerMonth: number | null;
  schedulingModes: string[];
  minIntervalMinutes: number | null;
  allowedTransformTypes: string[];
  associationRules: boolean;
  customObjects: boolean;
  customFields: boolean;
  jobDependencyChains: boolean;
  envMigration: boolean;
  priorityScheduling: boolean;
  logRetentionDays: number;
  maxTeamMembers: number | null;
  syncDirections: SyncDirectionLimit[];
  syncFrequencies: SyncFrequency[];
  objectScope: ObjectScope;
  fieldMappingLevel: FieldMappingLevel;
  queuePriority: QueuePriority;
  supportLevel: SupportLevel;
  multiLocation: boolean;
  connectorsIncluded: number | null;
}

export interface OverLimitResource {
  count: number;
  limit: number | null; // null = unlimited
  over: boolean;
}

export interface OverLimitSummary {
  projects: OverLimitResource;
  jobs: OverLimitResource;
  teamMembers: OverLimitResource;
  records: OverLimitResource;
  isOverLimit: boolean;
}

export type BillingInterval = 'month' | 'year' | 'day';

export interface PlanStatus {
  planId: PlanId;
  planName: string;
  subscriptionStatus: SubscriptionStatus;
  billingInterval?: BillingInterval | null;
  trialEndsAt: string | null;
  // Card-first model: true while the subscription is trialing but the clock hasn't started —
  // it begins when the org creates its first sync job. When true, trialEndsAt is null.
  trialPendingStart?: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: PlanLimits;
  overLimit?: OverLimitSummary;
}

export interface UsageSummary {
  recordsSynced: number;
  maxRecordsPerMonth: number | null; // null = unlimited
  periodStart: string;
  remaining: number | null; // null = unlimited
}

export interface CheckoutUrlResponse {
  url: string;
}

// ── DB-driven plan catalogue (GET /billing/plans) ──────────────────────────────

export interface ApiPrice {
  id: string;
  amount: number; // minor units (cents)
  currency: string;
  billingInterval: BillingInterval;
  discountPercent: number | null;
}

export interface ApiPlan {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  prices: ApiPrice[];
  features: Record<string, string>;
}

// ── Embedded checkout (Stripe Elements) ────────────────────────────────────────

export interface EmbeddedCheckoutRequest {
  priceId: string;
  /** Promo code — re-validated server-side before the charge. */
  couponCode?: string;
  /** A freshly tokenized, not-yet-attached Stripe PaymentMethod id (pm_...). Provide this OR
   *  `savedPaymentMethodId`, not both. */
  paymentMethodId?: string;
  /** A local payment_methods.id for a card the user already has on file. */
  savedPaymentMethodId?: string;
  billingDetails?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface EmbeddedCheckoutResult {
  subscriptionId: string;
  status: string;
  clientSecret: string | null; // present when 3-D Secure confirmation is required
}

// ── Current subscription (GET /billing/subscription) ───────────────────────────

export interface SubscriptionDetail {
  id: string;
  planName: string;
  planId: string | null;
  /** Unspent account credit in minor units (read live from Stripe). */
  creditBalance: number;
  priceId: string | null;
  status: SubscriptionStatus | string;
  trialEndAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  defaultPaymentMethod: string | null;
  // A downgrade in progress — the current plan/price stays active until pendingPlanChangeAt.
  pendingPlanId: string | null;
  pendingPriceId: string | null;
  pendingPlanChangeAt: string | null;
}

// ── Upgrade/downgrade (checkout-confirmed plan changes) ────────────────────────

export interface UpgradeResult {
  subscriptionId: string;
  status: 'active' | 'requires_action';
  clientSecret: string | null; // present when 3-D Secure confirmation is required
}

// ── Payment methods ────────────────────────────────────────────────────────────

export interface PaymentMethodView {
  id: string;
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  isDefault: boolean;
}

// ── Invoices + history ─────────────────────────────────────────────────────────

export type OrderStatus =
  | 'draft'
  | 'open'
  | 'paid'
  | 'uncollectible'
  | 'void'
  | 'pending'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface InvoiceListItem {
  id: string;
  amount: number;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  receiptUrl: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface HistoryItem {
  eventType: string;
  oldStatus: string | null;
  newStatus: string | null;
  description: string | null;
  createdAt: string;
  orderId: string | null;
  paymentId: string | null;
  amount: number | null;
  currency: string | null;
  orderStatus: OrderStatus | null;
}

// ── Admin plan catalogue (GET /billing/admin/plans, super_admin) ────────────────

export interface AdminApiPrice extends ApiPrice {
  isActive: boolean;
  stripePriceId: string;
}

export interface AdminApiPlan {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  stripeProductId: string | null;
  // Feature keys permanently locked at plan creation ("publish") — see PlanFormDialog.
  lockedFields: string[];
  prices: AdminApiPrice[];
  features: Record<string, string>;
}

export interface CreatePlanRequest {
  name: string;
  description?: string;
  sortOrder?: number;
  // Defaults to active on the backend when omitted.
  isActive?: boolean;
  // Initial feature/limit map, set atomically with the plan.
  features?: Record<string, string>;
  // Feature keys to permanently lock at creation — never editable again afterward.
  lockedFields?: string[];
}

export interface UpdatePlanRequest {
  name?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreatePriceRequest {
  amount: number; // minor units (cents)
  billingInterval: BillingInterval;
  currency?: string;
  discountPercent?: number | null;
}

export interface UpdatePriceRequest {
  isActive?: boolean;
}

// ── Discounts: coupons, automatic rules, settings ──────────────────────────────

export type CouponDuration = 'once' | 'repeating' | 'forever';
export type CouponAppliesTo = 'all' | 'new_purchase' | 'upgrade';
export type RedemptionContext = 'new_purchase' | 'upgrade';

/** Mirrors the backend's machine-readable rejection reasons (CouponInvalidReason). */
export type CouponInvalidReason =
  | 'discounts_disabled'
  | 'not_found'
  | 'inactive'
  | 'expired'
  | 'max_redemptions_reached'
  | 'org_limit_reached'
  | 'not_applicable_to_context'
  | 'not_applicable_to_plan'
  | 'not_synced';

export interface Coupon {
  id: string;
  code: string;
  name: string;
  /** decimal(5,2) — serialized as a string by the backend. Exactly one of this / amountOff. */
  percentOff: string | null;
  amountOff: number | null; // minor units (cents)
  currency: string;
  duration: CouponDuration;
  durationInMonths: number | null;
  appliesTo: CouponAppliesTo;
  applicablePlanIds: string[] | null; // null = any plan
  maxRedemptions: number | null; // null = unlimited
  timesRedeemed: number;
  maxRedemptionsPerOrg: number;
  expiresAt: string | null;
  isActive: boolean;
  stripeCouponId: string | null;
  stripePromotionCodeId: string | null;
  createdAt: string;
}

export interface CreateCouponRequest {
  code: string;
  name: string;
  percentOff?: number;
  amountOff?: number; // cents
  currency?: string;
  duration?: CouponDuration;
  durationInMonths?: number;
  appliesTo?: CouponAppliesTo;
  applicablePlanIds?: string[];
  maxRedemptions?: number;
  maxRedemptionsPerOrg?: number;
  expiresAt?: string;
}

/** `code` is immutable — changing it would orphan an already-shared code. */
export type UpdateCouponRequest = Partial<
  Omit<CreateCouponRequest, 'code' | 'currency'>
> & { isActive?: boolean };

export type ValidateCouponResult =
  | {
      valid: true;
      code: string;
      label: string;
      percentOff: number | null;
      amountOff: number | null;
    }
  | { valid: false; reason: CouponInvalidReason };

export interface AppliedDiscount {
  code: string;
  label: string;
  source: 'coupon' | 'automatic';
}

export interface CheckoutPreview {
  subtotal: number;
  discountAmount: number;
  total: number;
  currency: string;
  appliedDiscount: AppliedDiscount | null;
}

export type RefundPolicy = 'credit_balance' | 'refund' | 'none';

export interface DiscountSettings {
  discountsEnabled: boolean;
  /** % deducted from a plan change's remaining credit before it's applied to the new plan. */
  transferFeePercent: number;
  refundPolicy: RefundPolicy;
}

export type DiscountRuleScope = 'new_purchase' | 'upgrade' | 'interval_annual';

export interface DiscountRule {
  id: string;
  name: string;
  scope: DiscountRuleScope;
  planId: string | null;
  fromPlanId: string | null;
  toPlanId: string | null;
  percentOff: string | null;
  amountOff: number | null;
  currency: string;
  duration: CouponDuration;
  durationInMonths: number | null;
  priority: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  stripeCouponId: string | null;
  createdAt: string;
}

export interface CreateDiscountRuleRequest {
  name: string;
  scope: DiscountRuleScope;
  planId?: string;
  fromPlanId?: string;
  toPlanId?: string;
  percentOff?: number;
  amountOff?: number;
  duration?: CouponDuration;
  durationInMonths?: number;
  priority?: number;
  startsAt?: string;
  endsAt?: string;
}

export type UpdateDiscountRuleRequest = Partial<CreateDiscountRuleRequest> & {
  isActive?: boolean;
};

/**
 * The day-based proration breakdown for a plan change (upgrade or downgrade — both are
 * immediate). Every figure is server-computed; `amountDueToday` must be echoed back on confirm
 * (`expectedTotal`) so the charge is rejected if the Transfer Fee % or a price changed meanwhile.
 */
export interface UpgradePreview {
  currentPlanName: string;
  newPlanName: string;
  currency: string;
  billingInterval: BillingInterval;
  totalBillingDays: number;
  daysUsed: number;
  daysRemaining: number;
  oldPlanPrice: number;
  dailyCost: number;
  usedAmount: number;
  remainingCredit: number;
  transferFeePercent: number;
  transferFeeAmount: number;
  finalCredit: number;
  newPlanPrice: number;
  amountDueToday: number;
  /** Surplus credited to the account balance when the credit exceeds the new plan's price. */
  overflowAmount: number;
  refundPolicy: RefundPolicy;
}
