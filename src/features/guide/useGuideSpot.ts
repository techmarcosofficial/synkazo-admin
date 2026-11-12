import { useEffect, useRef } from 'react';

import { useGuideStore, type GuideSpot } from './guideStore';

let nextKey = 1;

/**
 * Points the guide at a control while this component is mounted. Pass null to
 * point nowhere. The most recently mounted spot wins, so a dialog's spot sits
 * on top of its page's spot and the page's returns when the dialog closes.
 */
export function useGuideSpot(spot: GuideSpot | null | false | undefined) {
  const keyRef = useRef(0);
  if (!keyRef.current) keyRef.current = nextKey++;

  const pushSpot = useGuideStore((s) => s.pushSpot);
  const removeSpot = useGuideStore((s) => s.removeSpot);

  // Re-register only when what the user sees changes.
  const signature = spot
    ? JSON.stringify([
        spot.id,
        spot.target,
        spot.targetMode,
        spot.extras,
        spot.title,
        spot.body,
        spot.step,
        spot.placement,
        spot.floatWhenMissing,
        spot.action?.label,
      ])
    : '';
  const latest = useRef<GuideSpot | null>(null);
  latest.current = spot || null;

  useEffect(() => {
    const key = keyRef.current;
    const current = latest.current;
    if (!current) return;
    pushSpot({
      ...current,
      key,
      // Read the latest callback at click time instead of re-registering.
      action: current.action && {
        label: current.action.label,
        onClick: () => latest.current?.action?.onClick(),
      },
    });
    return () => removeSpot(key);
  }, [signature, pushSpot, removeSpot]);
}
