import { usePlanQuery } from './useBilling';

import { useSBAuth } from '@/lib/syncbridgeAuth';
import type {
  FieldMappingLevel,
  ObjectScope,
  ObjectTier,
  PlanLimits,
  SyncDirectionLimit,
  SyncFrequency,
} from '@/types';

/** Least → most capable. A plan satisfies a requirement at or below its own level. */
const FIELD_MAPPING_RANK: Record<FieldMappingLevel, number> = {
  standard: 0,
  custom: 1,
  advanced: 2,
};

export function objectScopeAllows(
  scope: ObjectScope,
  tier: ObjectTier,
): boolean {
  switch (scope) {
    case 'core':
      return tier === 'core';
    case 'core_extended':
      return tier !== 'custom';
    case 'core_custom':
      return tier !== 'extended';
    case 'all_custom':
      return true;
    default:
      return false;
  }
}

export interface Entitlements {
  /**
   * Raw limits for callers that need a value rather than a yes/no — null until the plan
   * resolves, and for super_admins (who aren't plan-scoped and bypass every gate).
   */
  limits: PlanLimits | null;
  syncDirection: (direction: SyncDirectionLimit) => boolean;
  frequency: (frequency: SyncFrequency) => boolean;
  schedulingMode: (mode: string) => boolean;
  objectTier: (tier: ObjectTier) => boolean;
  fieldMappingAtLeast: (level: FieldMappingLevel) => boolean;
  /** `direct` alone means the plan has no field transform rules at all. */
  transformRules: boolean;
  associationRules: boolean;
  customObjects: boolean;
  customFields: boolean;
  envMigration: boolean;
  priorityScheduling: boolean;
  minIntervalMinutes: number;
  logRetentionDays: number | null;
  /** False once the org sits at its project/job allowance — the same threshold the API blocks on. */
  canAddProject: boolean;
  canAddJob: boolean;
}

/**
 * Single source of truth for "is this allowed on the org's plan?" on the frontend. Wraps the
 * existing `usePlanQuery` rather than adding a second fetch — the plan is already loaded by
 * AppLayout's paywall check, so this reads from the same cache entry.
 *
 * Gates resolve permissive while the plan is still loading and for super_admins. Loading is
 * deliberately not fail-closed: AppLayout blocks the whole app behind a spinner until the plan
 * resolves, so a gated control never renders against unresolved limits, and treating "unknown"
 * as "denied" would only produce a flash of locked UI. The API enforces every one of these
 * gates independently — the UI is affordance, not security.
 */
export function useEntitlements(): Entitlements {
  const { currentUser, hasRole } = useSBAuth();
  const isExempt = hasRole('super_admin');
  const planQuery = usePlanQuery({ enabled: !!currentUser && !isExempt });

  const limits = isExempt ? null : (planQuery.data?.limits ?? null);
  const open = isExempt || limits === null;
  // `over` is computed server-side as `count >= max`, matching EntitlementService's block
  // threshold — so it already means "the next create would be rejected".
  const overLimit = isExempt ? undefined : planQuery.data?.overLimit;

  return {
    limits,
    syncDirection: (direction) =>
      open || limits!.syncDirections.includes(direction),
    frequency: (frequency) =>
      open || limits!.syncFrequencies.includes(frequency),
    schedulingMode: (mode) => open || limits!.schedulingModes.includes(mode),
    objectTier: (tier) => open || objectScopeAllows(limits!.objectScope, tier),
    fieldMappingAtLeast: (level) =>
      open ||
      FIELD_MAPPING_RANK[limits!.fieldMappingLevel] >=
        FIELD_MAPPING_RANK[level],
    transformRules:
      open || limits!.allowedTransformTypes.some((t) => t !== 'direct'),
    associationRules: open || limits!.associationRules,
    customObjects: open || limits!.customObjects,
    customFields: open || limits!.customFields,
    envMigration: open || limits!.envMigration,
    priorityScheduling: open || limits!.priorityScheduling,
    minIntervalMinutes: limits?.minIntervalMinutes ?? 1,
    logRetentionDays: open ? null : limits!.logRetentionDays,
    canAddProject: !overLimit?.projects.over,
    canAddJob: !overLimit?.jobs.over,
  };
}
