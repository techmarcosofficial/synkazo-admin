import type { AlertVariant } from '@/components/shared/PageContextAlert';

const RANK: Record<AlertVariant, number> = {
  error: 3,
  warning: 2,
  info: 1,
  success: 0,
};

export interface AlertCandidate {
  variant: AlertVariant;
}

/** Reduces a page's candidate alerts to the single highest-severity one to show. */
export function pickHighestPriority<T extends AlertCandidate>(
  candidates: T[],
): T | undefined {
  return candidates.reduce<T | undefined>(
    (winner, c) =>
      !winner || RANK[c.variant] > RANK[winner.variant] ? c : winner,
    undefined,
  );
}
