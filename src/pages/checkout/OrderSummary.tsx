import { Check, Loader2, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCheckoutPreviewQuery,
  usePricingSettingsQuery,
  useValidateCouponMutation,
} from '@/queries/useBilling';
import type {
  ApiPlan,
  ApiPrice,
  CouponInvalidReason,
  RedemptionContext,
} from '@/types';

interface OrderSummaryProps {
  plan: ApiPlan;
  price: ApiPrice;
  // Set when switching an existing subscription's plan (not a brand-new signup) — suppresses the
  // "free trial" framing (an existing subscriber isn't starting a fresh trial) and lets the
  // caller override "Due today" (e.g. $0 for a downgrade, which isn't charged until next cycle).
  suppressTrialCopy?: boolean;
  dueTodayOverride?: number; // minor units; replaces the computed "Due today" amount when set
  /** Applied promo code, owned by CheckoutPage so the submit button can send it too. */
  couponCode?: string;
  onCouponChange?: (code: string | undefined) => void;
  /** False for downgrades — nothing is charged today, so there's nothing to discount. */
  allowCoupon?: boolean;
  /**
   * True on plan changes: the upgrade form shows Stripe's own prorated breakdown (including the
   * discount), so the summary must not subtract it a second time.
   */
  suppressDiscountLine?: boolean;
}

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);

/** Server-side rejection reasons rendered as something a customer can act on. */
const COUPON_ERROR_COPY: Record<CouponInvalidReason, string> = {
  discounts_disabled: 'Promo codes aren’t available right now.',
  not_found: 'That code doesn’t exist.',
  inactive: 'That code is no longer active.',
  expired: 'That code has expired.',
  max_redemptions_reached: 'That code has reached its usage limit.',
  org_limit_reached: 'Your organisation has already used that code.',
  not_applicable_to_context: 'That code can’t be used on this purchase.',
  not_applicable_to_plan: 'That code doesn’t apply to this plan.',
  not_synced: 'That code isn’t available yet. Please contact support.',
};

const SUPPORT_LEVEL_LABELS: Record<string, string> = {
  email: 'Email',
  priority: 'Priority',
  dedicated: 'Dedicated',
  dedicated_sla: 'Dedicated + SLA',
};

/** A few headline features to reassure the buyer at checkout. */
const HIGHLIGHT_KEYS: { key: string; label: (v: string) => string }[] = [
  {
    key: 'max_jobs',
    label: (v) => (v === '-1' ? 'Unlimited sync jobs' : `${v} sync jobs`),
  },
  {
    key: 'max_records_monthly',
    label: (v) =>
      v === '-1'
        ? 'Unlimited records / month'
        : `${Number(v).toLocaleString()} records / month`,
  },
  { key: 'sync_frequency', label: (v) => `Sync as often as ${v}` },
  {
    key: 'support_level',
    label: (v) => `${SUPPORT_LEVEL_LABELS[v] ?? v} support`,
  },
];

/**
 * Promo-code field. Validation here is only for immediate feedback — the server re-validates the
 * code when the charge is actually made, so a code that lapses between Apply and Subscribe is
 * caught there rather than quietly charging a different total.
 */
function CouponInput({
  priceId,
  appliedCode,
  onChange,
  context,
}: {
  priceId: string;
  appliedCode?: string;
  onChange: (code: string | undefined) => void;
  context: RedemptionContext;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const validate = useValidateCouponMutation();

  const apply = async () => {
    const code = draft.trim().toUpperCase();
    if (!code) return;
    setError(null);
    try {
      const result = await validate.mutateAsync({ code, priceId, context });
      if (result.valid) {
        onChange(result.code);
        setDraft('');
      } else {
        setError(COUPON_ERROR_COPY[result.reason]);
      }
    } catch {
      setError('Could not check that code. Please try again.');
    }
  };

  if (appliedCode) {
    return (
      <div className="border-border mt-6 border-t pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
            {appliedCode}
            <button
              type="button"
              aria-label={`Remove promo code ${appliedCode}`}
              onClick={() => {
                onChange(undefined);
                setError(null);
              }}
              className="hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
          <span className="text-muted-foreground text-xs">
            Promo code applied
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border mt-6 border-t pt-4">
      <Label htmlFor="coupon-code" className="text-xs">
        Promo code
      </Label>
      <div className="mt-2 flex gap-2">
        <Input
          id="coupon-code"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void apply();
            }
          }}
          placeholder="SAVE10"
          className="h-9 uppercase"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0"
          disabled={!draft.trim() || validate.isPending}
          onClick={() => void apply()}
        >
          {validate.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            'Apply'
          )}
        </Button>
      </div>
      {error && <p className="text-destructive mt-2 text-xs">{error}</p>}
    </div>
  );
}

export function OrderSummary({
  plan,
  price,
  suppressTrialCopy = false,
  dueTodayOverride,
  couponCode,
  onCouponChange,
  allowCoupon = false,
  suppressDiscountLine = false,
}: OrderSummaryProps) {
  const { data: pricingSettings } = usePricingSettingsQuery();
  const couponsAvailable =
    allowCoupon &&
    !!onCouponChange &&
    pricingSettings?.discountsEnabled !== false;
  // Only queried once a code is actually applied — with no code the total is just the price.
  const { data: preview } = useCheckoutPreviewQuery(price.id, couponCode, {
    enabled: couponsAvailable && !!couponCode && !suppressDiscountLine,
  });
  const discountAmount =
    couponCode && !suppressDiscountLine ? (preview?.discountAmount ?? 0) : 0;
  const showsTrial =
    plan.features['trial_enabled'] === 'true' && !suppressTrialCopy;
  const perLabel =
    price.billingInterval === 'year'
      ? '/year'
      : price.billingInterval === 'day'
        ? '/day'
        : '/month';
  return (
    <Card>
      <CardContent>
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Order summary
        </h2>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <div className="text-card-foreground text-lg font-semibold">
              {plan.name}
            </div>
            {plan.description && (
              <div className="text-muted-foreground text-sm">
                {plan.description}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-card-foreground text-2xl font-bold">
              {money(price.amount, price.currency)}
            </div>
            <div className="text-muted-foreground text-xs">{perLabel}</div>
          </div>
        </div>

        {price.discountPercent != null && price.billingInterval === 'year' && (
          <div className="text-primary mt-2 text-xs font-medium">
            Save {price.discountPercent}% with annual billing
          </div>
        )}

        <ul className="border-border mt-6 space-y-2 border-t pt-4">
          {HIGHLIGHT_KEYS.filter((h) => plan.features[h.key] != null).map(
            (h) => (
              <li
                key={h.key}
                className="text-muted-foreground flex items-start gap-2 text-sm"
              >
                <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <span>{h.label(plan.features[h.key])}</span>
              </li>
            ),
          )}
        </ul>

        {couponsAvailable && (
          <CouponInput
            priceId={price.id}
            appliedCode={couponCode}
            onChange={onCouponChange!}
            context={suppressDiscountLine ? 'upgrade' : 'new_purchase'}
          />
        )}

        {discountAmount > 0 && (
          <div className="border-border mt-4 flex items-center justify-between border-t pt-4 text-sm">
            <span className="text-muted-foreground">
              Discount{couponCode ? ` (${couponCode})` : ''}
            </span>
            <span className="text-primary font-medium">
              −{money(discountAmount, price.currency)}
            </span>
          </div>
        )}

        <div className="border-border mt-6 flex items-center justify-between border-t pt-4">
          <span className="text-foreground text-sm font-medium">Due today</span>
          <span className="text-card-foreground text-lg font-semibold">
            {dueTodayOverride != null
              ? money(dueTodayOverride, price.currency)
              : showsTrial
                ? money(0, price.currency)
                : money(
                    Math.max(0, price.amount - discountAmount),
                    price.currency,
                  )}
          </span>
        </div>
        {showsTrial && (
          <p className="text-muted-foreground mt-2 text-xs">
            Your {plan.features['trial_days'] ?? 14}-day free trial starts
            today. You won’t be charged until it ends.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
