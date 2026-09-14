import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PlanLimits } from '@/types';

export const STATUS_LABEL: Record<string, string> = {
  none: 'No subscription',
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
  incomplete: 'Incomplete',
};

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0;
}

/** Green under 70% used, yellow 70–89%, red 90%+ or over the limit. */
export function usageTone(
  pct: number,
  over = false,
): { bar: string; text: string; label: string } {
  if (over || pct >= 90)
    return {
      bar: 'bg-destructive',
      text: 'text-destructive',
      label: 'Critical',
    };
  if (pct >= 70)
    return {
      bar: 'bg-warning',
      text: 'text-warning',
      label: 'Approaching limit',
    };
  return { bar: 'bg-success', text: 'text-success', label: 'Healthy' };
}

/**
 * Labeled meter: "Label" / "X out of Y" header row, then a thick rounded bar with
 * the percentage written in white inside the colored fill.
 */
export function UsageMeter({
  label,
  count,
  limit,
}: {
  label: string;
  count: number;
  limit: number | null;
}) {
  const rawPct = limit ? (count / limit) * 100 : 0;
  const pct = limit == null ? 0 : Math.min(100, Math.round(rawPct));
  const over = limit != null && count >= limit;
  const tone = usageTone(rawPct, over);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">
          {count.toLocaleString()}
          {limit != null ? ` out of ${limit.toLocaleString()}` : ''}
        </span>
      </div>
      {limit == null ? (
        <div className="bg-primary/15 flex h-6 w-full items-center rounded-full">
          <span className="text-primary pl-3 text-xs font-semibold">
            Unlimited
          </span>
        </div>
      ) : pct === 0 ? (
        // Nothing used yet — a plain empty track, no colored fill or "0%" pill.
        <div className="bg-muted h-6 w-full rounded-full" />
      ) : (
        <div className="bg-muted h-6 w-full overflow-hidden rounded-full">
          <div
            className={cn(
              'flex h-full items-center rounded-full transition-all duration-500',
              tone.bar,
            )}
            style={{ width: `${Math.max(pct, 10)}%` }}
          >
            <span className="pl-3 text-xs font-semibold text-white">
              {pct}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function FeatureRow({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {enabled ? (
        <Check className="text-success size-4 shrink-0" />
      ) : (
        <X className="text-muted-foreground size-4 shrink-0" />
      )}
      <span className={enabled ? '' : 'text-muted-foreground'}>{label}</span>
    </li>
  );
}

export function featureList(limits: PlanLimits) {
  const allTransforms = limits.allowedTransformTypes.length > 1;
  return [
    {
      enabled: true,
      label: `${limits.schedulingModes.length > 2 ? 'All scheduling modes' : limits.schedulingModes.includes('interval') ? 'Daily + interval scheduling' : 'Daily scheduling'}${limits.minIntervalMinutes ? ` (min ${limits.minIntervalMinutes} min interval)` : ''}`,
    },
    {
      enabled: allTransforms,
      label: allTransforms
        ? 'All field mapping transforms'
        : 'Direct field mapping only',
    },
    { enabled: limits.associationRules, label: 'Association rules' },
    { enabled: limits.customObjects, label: 'Custom object support (HubSpot)' },
    { enabled: limits.customFields, label: 'Custom field creation' },
    { enabled: limits.jobDependencyChains, label: 'Job dependency chains' },
    { enabled: limits.envMigration, label: 'Sandbox → production migration' },
    { enabled: true, label: `${limits.logRetentionDays}-day log retention` },
  ];
}
