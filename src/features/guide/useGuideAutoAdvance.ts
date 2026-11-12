import { useEffect, useRef } from 'react';

import type { GuideStepId } from './guideSteps';

const DELAY_MS = 900;

/**
 * Moves to the next step on its own when the user finishes one of `from`
 * while looking at it, so the stepper behaves like a form that advances.
 * Never fires on page load, and holds off while a dialog is open (e.g. the
 * "connections ready" confirmation) so nothing changes under the user.
 */
export function useGuideAutoAdvance({
  enabled,
  current,
  viewStep,
  from,
  go,
  delays,
}: {
  enabled: boolean;
  current: GuideStepId | null;
  viewStep: GuideStepId | null;
  from: ReadonlyArray<GuideStepId>;
  go: (step: GuideStepId) => void;
  /** Per finished step, how long to linger first (e.g. to read a test result). */
  delays?: Partial<Record<GuideStepId, number>>;
}) {
  const prev = useRef<GuideStepId | null | undefined>(undefined);
  const goRef = useRef(go);
  goRef.current = go;

  useEffect(() => {
    const before = prev.current;
    prev.current = current;
    if (!enabled || before === undefined || before === current || !current)
      return;
    if (!before || !from.includes(before) || viewStep !== before) return;

    const id = window.setTimeout(() => {
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      goRef.current(current);
    }, delays?.[before] ?? DELAY_MS);
    return () => window.clearTimeout(id);
  }, [enabled, current, viewStep, from, delays]);
}
