import type { PlanId } from '@/types';

// The public pricing page's toggle stays Monthly/Annual only (day-interval plans are
// admin/direct-checkout only), so the pricing card types are intentionally narrower than the
// full billing `BillingInterval` union. Mirrors the marketing app's identical type.
export type PublicBillingInterval = 'month' | 'year';

export interface PricingPlan {
  id: PlanId;
  name: string;
  tagline: string;
  price: Record<PublicBillingInterval, string>;
  period: Record<PublicBillingInterval, string>;
  subNote?: Partial<Record<PublicBillingInterval, string>>;
  features: string[];
  /** Short list rendered on the landing-page preview cards. */
  previewFeatures: string[];
  highlighted: boolean;
  /**
   * Admin-configurable purchase-button label (from the plan's `cta_label` feature). When
   * unset, the pricing page falls back to its computed label ("Subscribe").
   */
  ctaLabel?: string;
  /**
   * Admin-set `sellable` feature flag. False (the default when unset) means the plan has no
   * confirmed self-serve checkout wiring, so its card renders a "Contact us" CTA instead of a
   * buy button — see `usePricingPlans`.
   */
  sellable: boolean;
  /**
   * The plan's raw `membership_features` key/value map, exactly as stored.
   */
  rawFeatures: Record<string, string>;
}
