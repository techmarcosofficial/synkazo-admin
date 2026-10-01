import {
  Building2,
  Layers3,
  Rocket,
  Sprout,
  UsersRound,
  Zap,
} from 'lucide-react';

import { cn } from '@/lib/utils';

export const PLAN_ICON_FEATURE_KEY = 'plan_icon';

export const PLAN_ICON_OPTIONS = [
  { key: 'starter', label: 'Starter', icon: Sprout },
  { key: 'pro', label: 'Pro', icon: Zap },
  { key: 'enterprise', label: 'Enterprise', icon: Building2 },
  { key: 'growth', label: 'Growth', icon: Rocket },
  { key: 'team', label: 'Team', icon: UsersRound },
  { key: 'general', label: 'General', icon: Layers3 },
] as const;

export type PlanIconKey = (typeof PLAN_ICON_OPTIONS)[number]['key'];

/** Existing named plans get a sensible icon until an admin saves an explicit choice. */
export function resolvePlanIconKey(
  storedKey: string | undefined,
  planName: string,
): PlanIconKey {
  const configured = PLAN_ICON_OPTIONS.find(
    (option) => option.key === storedKey,
  );
  if (configured) return configured.key;
  if (storedKey) return 'general';

  const name = planName.trim().toLowerCase();
  if (/^starter\b/.test(name)) return 'starter';
  if (/^pro\b/.test(name)) return 'pro';
  if (/^enterprise\b/.test(name)) return 'enterprise';
  return 'general';
}

export function PlanIcon({
  iconKey,
  planName = '',
  className,
}: {
  iconKey?: string;
  planName?: string;
  className?: string;
}) {
  const key = resolvePlanIconKey(iconKey, planName);
  const Icon = PLAN_ICON_OPTIONS.find((option) => option.key === key)!.icon;
  return <Icon aria-hidden="true" className={cn('size-5', className)} />;
}
