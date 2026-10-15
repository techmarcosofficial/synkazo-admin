import { format, formatDistanceToNow } from 'date-fns';
import { ArrowRightLeft, CreditCard, Sparkles } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PlanCardVariant =
  | 'free'
  | 'starter'
  | 'pro'
  | 'enterprise'
  | 'unlimited'
  | 'custom';

export function getPlanVariant(planName?: string | null): PlanCardVariant {
  if (!planName) return 'free';
  const norm = planName.toLowerCase().trim();
  if (norm.includes('unlimited')) return 'unlimited';
  if (norm.includes('enterprise')) return 'enterprise';
  if (norm.includes('pro')) return 'pro';
  if (norm.includes('starter') || norm.includes('basic')) return 'starter';
  if (norm.includes('free')) return 'free';
  return 'custom';
}

interface VariantStyleConfig {
  cardBg: string;
  glowBg: string;
  accentText: string;
  layersFill1: string;
  layersFill2: string;
  layersFill3: string;
  layersStroke: string;
  defaultDescription: string;
}

const VARIANT_CONFIGS: Record<PlanCardVariant, VariantStyleConfig> = {
  unlimited: {
    cardBg: 'bg-gradient-to-br from-[#1c1b3d] via-[#282159] to-[#17162e]',
    glowBg: 'bg-indigo-500/20',
    accentText: 'text-indigo-200',
    layersFill1: '#4338ca',
    layersFill2: '#6366f1',
    layersFill3: '#818cf8',
    layersStroke: '#a5b4fc',
    defaultDescription: 'Full access to all platform features',
  },
  enterprise: {
    cardBg: 'bg-gradient-to-br from-[#1e1b18] via-[#2e2319] to-[#141210]',
    glowBg: 'bg-amber-500/15',
    accentText: 'text-amber-200',
    layersFill1: '#78350f',
    layersFill2: '#b45309',
    layersFill3: '#d97706',
    layersStroke: '#fcd34d',
    defaultDescription: 'Dedicated SLA, custom mapping & unlimited scale',
  },
  pro: {
    cardBg: 'bg-gradient-to-br from-[#1e1834] via-[#2a1d4c] to-[#141026]',
    glowBg: 'bg-violet-500/20',
    accentText: 'text-violet-200',
    layersFill1: '#4c1d95',
    layersFill2: '#6d28d9',
    layersFill3: '#8b5cf6',
    layersStroke: '#c4b5fd',
    defaultDescription: 'Advanced sync flows, priority queues & scheduling',
  },
  starter: {
    cardBg: 'bg-gradient-to-br from-[#0f2324] via-[#133436] to-[#0a1b1c]',
    glowBg: 'bg-teal-500/20',
    accentText: 'text-teal-200',
    layersFill1: '#115e59',
    layersFill2: '#0f766e',
    layersFill3: '#14b8a6',
    layersStroke: '#5eead4',
    defaultDescription: 'Essential synchronization capabilities',
  },
  free: {
    cardBg: 'bg-gradient-to-br from-[#1e232a] via-[#262c35] to-[#161a20]',
    glowBg: 'bg-slate-500/20',
    accentText: 'text-slate-300',
    layersFill1: '#334155',
    layersFill2: '#475569',
    layersFill3: '#64748b',
    layersStroke: '#94a3b8',
    defaultDescription: 'Basic sync quotas for testing and evaluation',
  },
  custom: {
    cardBg: 'bg-gradient-to-br from-[#1a2130] via-[#20293d] to-[#141a27]',
    glowBg: 'bg-blue-500/20',
    accentText: 'text-blue-200',
    layersFill1: '#1e3a8a',
    layersFill2: '#2563eb',
    layersFill3: '#3b82f6',
    layersStroke: '#93c5fd',
    defaultDescription: 'Custom tailored organisation plan',
  },
};

/** 3D isometric stacked planes illustration matching reference screenshot */
function IsometricLayersIllustration({
  fill1,
  fill2,
  fill3,
  stroke,
}: {
  fill1: string;
  fill2: string;
  fill3: string;
  stroke: string;
}) {
  return (
    <svg
      className="h-28 w-28 opacity-90 drop-shadow-2xl select-none"
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <filter id="layer-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.4" />
        </filter>
        <linearGradient id="plane-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={fill3} stopOpacity="0.85" />
          <stop offset="100%" stopColor={fill1} stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id="plane-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={fill2} stopOpacity="0.75" />
          <stop offset="100%" stopColor={fill1} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="plane-grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={fill1} stopOpacity="0.65" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Bottom Layer */}
      <g filter="url(#layer-shadow)">
        <polygon
          points="80,82 140,105 80,128 20,105"
          fill="url(#plane-grad-3)"
          stroke={stroke}
          strokeWidth="1"
          strokeOpacity="0.3"
        />
      </g>

      {/* Middle Layer */}
      <g filter="url(#layer-shadow)">
        <polygon
          points="80,57 140,80 80,103 20,80"
          fill="url(#plane-grad-2)"
          stroke={stroke}
          strokeWidth="1.2"
          strokeOpacity="0.5"
        />
      </g>

      {/* Top Layer */}
      <g filter="url(#layer-shadow)">
        <polygon
          points="80,32 140,55 80,78 20,55"
          fill="url(#plane-grad-1)"
          stroke={stroke}
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />
      </g>
    </svg>
  );
}

function StripeSLogo() {
  return (
    <span
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm bg-[#635BFF] text-white font-bold text-[11px] shadow-sm"
      aria-label="Stripe"
    >
      S
    </span>
  );
}

export interface SubscriptionPlanCardProps {
  planName: string;
  status: string;
  billingInterval?: string | null;
  currentPeriodEnd?: string | null;
  planAccessSource?: 'free' | 'stripe_subscription' | 'manual_override' | string | null;
  description?: string | null;
  onChangePlan?: () => void;
  className?: string;
}

export default function SubscriptionPlanCard({
  planName,
  status,
  billingInterval,
  currentPeriodEnd,
  planAccessSource,
  description,
  onChangePlan,
  className,
}: SubscriptionPlanCardProps) {
  const variantKey = getPlanVariant(planName);
  const config = VARIANT_CONFIGS[variantKey];

  const periodEndDate = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const isPeriodEndValid =
    periodEndDate && !isNaN(periodEndDate.getTime());

  const periodEndFormatted = isPeriodEndValid
    ? format(periodEndDate, 'MMM d, yyyy')
    : null;

  const distanceFormatted = isPeriodEndValid
    ? formatDistanceToNow(periodEndDate, { addSuffix: false })
    : null;

  const intervalLabel =
    billingInterval && billingInterval.toLowerCase() === 'year'
      ? 'Yearly'
      : billingInterval && billingInterval.toLowerCase() === 'month'
        ? 'Monthly'
        : billingInterval
          ? billingInterval
          : planAccessSource === 'stripe_subscription'
            ? 'Monthly'
            : 'None';

  const providerLabel =
    planAccessSource === 'stripe_subscription'
      ? 'Stripe'
      : planAccessSource === 'manual_override'
        ? 'Internal Override'
        : 'Free Tier';

  const isStripe = planAccessSource === 'stripe_subscription';

  const hasPlan = Boolean(
    planName &&
      planName.toLowerCase() !== 'none' &&
      planName.trim() !== '',
  );

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-4xl border border-white/10 p-5 text-white shadow-xl transition-all',
        config.cardBg,
        className,
      )}
    >
      {/* Subtle ambient lighting */}
      <div
        className={cn(
          'pointer-events-none absolute -top-12 -right-12 size-48 rounded-full blur-3xl',
          config.glowBg,
        )}
      />

      {/* Top row: Current Plan label + Status Badge + Change Plan button */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide uppercase text-white/60">
          Current Plan
          <span className="sr-only">Live Subscription</span>
        </span>
        <div className="flex items-center gap-2">
          {onChangePlan && (
            <button
              type="button"
              onClick={onChangePlan}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white text-[11px] font-semibold px-2.5 py-0.5 backdrop-blur-md transition-all border border-white/20 cursor-pointer"
            >
              <ArrowRightLeft className="size-2.5" aria-hidden="true" />
              {hasPlan ? 'Change Plan' : 'Assign Plan'}
            </button>
          )}
          <Badge
            variant="secondary"
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize backdrop-blur-md border-0',
              status === 'active' && 'bg-success/25 text-success',
              status === 'past_due' && 'bg-amber-500/25 text-amber-300',
              status !== 'active' &&
                status !== 'past_due' &&
                'bg-white/10 text-white/80',
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                status === 'active'
                  ? 'bg-success'
                  : status === 'past_due'
                    ? 'bg-amber-400'
                    : 'bg-white/60',
              )}
            />
            {status}
          </Badge>
        </div>
      </div>

      {/* Middle row: Large Plan Name + Description + 3D Illustration */}
      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-white capitalize">
            {planName}
          </h2>
          <p className="text-xs text-white/70 max-w-[240px] leading-relaxed">
            {description ?? config.defaultDescription}
          </p>
        </div>

        <div className="shrink-0 pr-1">
          <IsometricLayersIllustration
            fill1={config.layersFill1}
            fill2={config.layersFill2}
            fill3={config.layersFill3}
            stroke={config.layersStroke}
          />
        </div>
      </div>

      {/* Bottom row: Interval, Period End, Provider */}
      <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/5 py-2.5 px-1 backdrop-blur-sm">
        {/* Interval */}
        <div className="px-3 text-center sm:text-left">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-white/50">
            Billing interval
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-white">
            {intervalLabel}
          </span>
        </div>

        {/* Current period ends */}
        <div className="px-3 text-center sm:text-left">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-white/50">
            Current period ends
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-white">
            {periodEndFormatted ?? 'Ongoing'}
          </span>
          {distanceFormatted && (
            <span className="block text-[10px] text-white/50">
              in {distanceFormatted}
            </span>
          )}
        </div>

        {/* Provider */}
        <div className="px-3 text-center sm:text-left">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-white/50">
            Provider
          </span>
          <div className="mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
            {isStripe ? (
              <>
                <StripeSLogo />
                <span className="text-xs font-semibold text-white">Stripe</span>
              </>
            ) : (
              <span className="text-xs font-semibold text-white">
                {providerLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
