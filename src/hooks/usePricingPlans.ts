import { useMemo } from 'react';

import { usePlansQuery } from '@/queries/useBilling';
import type { ApiPlan } from '@/types';
import type { PricingPlan } from '@/types/pricing';

// Marketing-copy feature keys an admin can set on any plan (see the admin PlanFormDialog).
// Ride the same generic features map as the enforced limits — no schema change needed.
const SELLABLE_KEY = 'sellable';
const CTA_LABEL_KEY = 'cta_label';
const TAGLINE_KEY = 'tagline';
const HIGHLIGHTED_KEY = 'highlighted';
// Whether the plan is public at all — independent of `sellable`, which only picks the CTA
// (buy button vs. "Contact us") on a card that's already showing. Fail-closed: anything other
// than the literal string 'true' (including unset) is hidden.
const SHOW_ON_PRICING_KEY = 'show_on_pricing';
const MARKETING_FEATURES_KEY = 'marketing_features';
const MARKETING_PREVIEW_FEATURES_KEY = 'marketing_preview_features';

/** Whole-dollar when the amount is even dollars, else two decimals. */
function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** "Save $X vs monthly" when a year price undercuts 12× the month price. */
function savingsNote(
  monthCents: number,
  yearCents: number,
): string | undefined {
  const saved = monthCents * 12 - yearCents;
  if (saved <= 0) return undefined;
  return `Save ${formatMoney(saved, 'usd')} vs monthly`;
}

/** "a|b|c" (stored feature value) -> ["a", "b", "c"]. */
function splitFeatureList(value: string | undefined): string[] {
  return value ? value.split('|').filter(Boolean) : [];
}

/**
 * Builds one pricing card from a live plan. Every field comes from the plan's own DB row or its
 * admin-set `membership_features` — there is no curated/static copy anywhere.
 */
function buildPlan(live: ApiPlan): PricingPlan {
  const month = live.prices.find((pr) => pr.billingInterval === 'month');
  const year = live.prices.find((pr) => pr.billingInterval === 'year');
  const f = live.features ?? {};

  const marketingFeatures = splitFeatureList(f[MARKETING_FEATURES_KEY]);
  const previewFeatures = splitFeatureList(f[MARKETING_PREVIEW_FEATURES_KEY]);

  return {
    id: live.id,
    name: live.name,
    tagline: f[TAGLINE_KEY] || live.description || '',
    features: marketingFeatures,
    previewFeatures:
      previewFeatures.length > 0
        ? previewFeatures
        : marketingFeatures.slice(0, 4),
    highlighted: f[HIGHLIGHTED_KEY] === 'true',
    // Empty string (admin cleared the field) is treated as "unset" downstream.
    ctaLabel: f[CTA_LABEL_KEY] || undefined,
    // Fail-closed default: unset → not sellable.
    sellable: f[SELLABLE_KEY] === 'true',
    rawFeatures: f,
    price: {
      month: month ? formatMoney(month.amount, month.currency) : '',
      year: year ? formatMoney(year.amount, year.currency) : '',
    },
    period: {
      month: month ? '/month' : '',
      year: year ? '/year' : '',
    },
    subNote: {
      year: month && year ? savingsNote(month.amount, year.amount) : undefined,
    },
  };
}

/**
 * Builds the paywall's plan cards straight from GET /billing/plans — every active plan in the
 * admin-managed catalogue, in `sortOrder`, filtered down to the ones an admin has explicitly
 * marked public via `show_on_pricing`. Fully data-driven: no static plan list, no curated copy.
 */
export function usePricingPlans(): {
  plans: PricingPlan[];
  isLoading: boolean;
} {
  const { data, isLoading } = usePlansQuery();

  const plans = useMemo<PricingPlan[]>(() => {
    if (!data || data.length === 0) return [];
    return data
      .map(buildPlan)
      .filter((p) => p.rawFeatures[SHOW_ON_PRICING_KEY] === 'true');
  }, [data]);

  return { plans, isLoading };
}
