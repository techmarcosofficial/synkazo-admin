import type { PlanId } from '@/types';

const KEY = 'sb_pending_plan';

export type PendingPlanInterval = 'month' | 'year';

export interface PendingPlan {
  plan: PlanId;
  interval: PendingPlanInterval;
}

/**
 * Remembers a plan a logged-out visitor picked on /pricing so checkout can resume
 * automatically after they register/log in.
 */
export function savePendingPlan(p: PendingPlan): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — resume just won't happen */
  }
}

/**
 * Returns whatever was stored, unvalidated — plan ids are real DB ids now, not a fixed set this
 * module can know in advance. The caller (PricingSection) already has the live plan list in
 * scope and checks the id is still a real, sellable plan before resuming checkout with it.
 */
export function readPendingPlan(): PendingPlan | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingPlan;
    if (!p.plan || typeof p.plan !== 'string') return null;
    return { plan: p.plan, interval: p.interval === 'year' ? 'year' : 'month' };
  } catch {
    return null;
  }
}

export function clearPendingPlan(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Reads and immediately clears the pending plan — a login/register resume-into-checkout is a
 * one-shot intent, not a standing preference. Without consuming it here, a visitor who picks a
 * plan but never finishes checkout (or already has an active plan from elsewhere) gets bounced
 * into checkout on every future login forever, since nothing else was ever going to clear it.
 */
export function consumePendingPlan(): PendingPlan | null {
  const p = readPendingPlan();
  if (p) clearPendingPlan();
  return p;
}
