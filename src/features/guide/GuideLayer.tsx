import { CircleCheck, Lightbulb } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import GuideCard from './GuideCard';
import { highlightMode, mark, sameBox, toBox, type Box } from './guideDom';
import { useGuideStore, type GuideSpot } from './guideStore';
import { GUIDE_STEP_COUNT, guideStepNumber } from './guideSteps';

import { Button } from '@/components/ui/button';

const CHIP_OFFSET = 8;

// An open modal covers everything outside it; a ring there would point at a
// control the user can't reach.
const MODAL_SELECTOR = [
  '[data-slot="dialog-content"][data-state="open"]',
  '[data-slot="alert-dialog-content"][data-state="open"]',
  '[data-slot="sheet-content"][data-state="open"]',
].join(',');
// Open menus and selects float over the page; hide while one is in the way.
const POPPER_SELECTOR =
  '[data-radix-popper-content-wrapper]:has([role="listbox"],[role="menu"])';

function topModal(): Element | null {
  const all = document.querySelectorAll(MODAL_SELECTOR);
  return all.length ? all[all.length - 1] : null;
}

/** First visible match of the spot's selectors that isn't hidden behind a modal. */
function findTarget(target: GuideSpot['target']): Element | null {
  if (!target) return null;
  const modal = topModal();
  const selectors = Array.isArray(target) ? target : [target];
  for (const selector of selectors) {
    for (const el of document.querySelectorAll(selector)) {
      if (modal && !modal.contains(el)) continue;
      if (toBox(el)) return el;
    }
  }
  return null;
}

/**
 * Off screen, or covered by something else (a sticky page header) at its
 * centre: either way the user can't see it, so it needs scrolling to.
 */
function isHidden(el: Element, box: Box) {
  if (box.top < 0 || box.top + box.height > window.innerHeight) return true;
  const x = box.left + Math.min(box.width / 2, 24);
  const y = box.top + Math.min(box.height / 2, 16);
  const top = document.elementFromPoint(x, y);
  return Boolean(top && !el.contains(top) && !top.contains(el));
}

/**
 * Renders the current guide spot: the control to use next lights up in the
 * theme's primary colour, with a small hint card beside it. Nothing here blocks the page; the
 * user clicks the real control.
 */
export default function GuideLayer() {
  const status = useGuideStore((s) => s.status);
  const paused = useGuideStore((s) => s.paused);
  const spot = useGuideStore((s) => s.spots[s.spots.length - 1] ?? null);
  const collapsed = useGuideStore((s) =>
    spot ? Boolean(s.collapsed[spot.id]) : false,
  );
  const collapse = useGuideStore((s) => s.collapse);
  const finish = useGuideStore((s) => s.finish);

  const active = status === 'active' && !paused && Boolean(spot);

  const [box, setBox] = useState<Box | null>(null);
  const [avoid, setAvoid] = useState<Box | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const markedRef = useRef<Element | null>(null);
  const scrolledFor = useRef<string | null>(null);

  useEffect(() => {
    setConfirmSkip(false);
    setExpanded(false);
  }, [spot?.id]);

  // Track the target every frame: dialogs animate in, tabs swap content,
  // sticky headers scroll. A few rect reads per frame are cheap.
  useEffect(() => {
    const extrasMarked = new Map<Element, string>();
    const syncExtras = (desired: Map<Element, string>) => {
      for (const [el, mode] of extrasMarked) {
        if (desired.get(el) !== mode) {
          el.removeAttribute('data-guide-active');
          extrasMarked.delete(el);
        }
      }
      for (const [el, mode] of desired) {
        if (!extrasMarked.has(el)) {
          el.setAttribute('data-guide-active', mode);
          extrasMarked.set(el, mode);
        }
      }
    };
    const clear = () => {
      mark(markedRef, null, null);
      syncExtras(new Map());
    };
    if (!active || !spot) {
      clear();
      setBox(null);
      setAvoid(null);
      return;
    }
    let raf = 0;
    const tick = () => {
      const popper = document.querySelector(POPPER_SELECTOR);
      const modal = topModal();
      const found = findTarget(spot.target);
      const isBlocked = Boolean(popper && !(found && popper.contains(found)));
      setBlocked((prev) => (prev === isBlocked ? prev : isBlocked));

      const el = isBlocked ? null : found;
      const next = el ? toBox(el) : null;
      setBox((prev) => (sameBox(prev, next) ? prev : next));
      const modalBox = el && modal?.contains(el) ? toBox(modal) : null;
      setAvoid((prev) => (sameBox(prev, modalBox) ? prev : modalBox));

      if (el !== markedRef.current) {
        mark(markedRef, el, el ? (spot.targetMode ?? highlightMode(el)) : null);
        if (el && next && scrolledFor.current !== spot.id) {
          scrolledFor.current = spot.id;
          if (isHidden(el, next)) {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
      }

      const desired = new Map<Element, string>();
      if (!isBlocked) {
        for (const extra of spot.extras ?? []) {
          const els = extra.all
            ? [...document.querySelectorAll(extra.target)].filter(
                (x) => (!modal || modal.contains(x)) && toBox(x),
              )
            : [findTarget(extra.target)].filter((x): x is Element => !!x);
          for (const x of els) {
            if (x !== el && !desired.has(x)) {
              desired.set(x, extra.mode ?? highlightMode(x));
            }
          }
        }
      }
      syncExtras(desired);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clear();
    };
  }, [active, spot]);

  if (!active || !spot || blocked) return null;

  const hasTarget = Boolean(spot.target);
  if (hasTarget && !box && !spot.floatWhenMissing) return null;

  const showCard = !collapsed || expanded;
  const stepNo = spot.step ? guideStepNumber(spot.step) : null;

  // Portalled to <body> so no transformed ancestor becomes the containing
  // block for these fixed elements. Pointer-down stops here so a Radix
  // dialog doesn't treat a click on the hint as a click outside it.
  return createPortal(
    <>
      {box && !showCard && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setExpanded(true)}
          aria-label={`Show hint: ${spot.title}`}
          className="guide-chip bg-primary text-primary-foreground focus-visible:ring-primary/50 pointer-events-auto fixed z-[71] flex size-6 cursor-pointer items-center justify-center rounded-full shadow-md outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ top: box.top - CHIP_OFFSET - 6, left: box.left + box.width - CHIP_OFFSET }}
        >
          <Lightbulb className="size-3.5" aria-hidden="true" />
        </button>
      )}

      {showCard && (
        <GuideCard
          key={spot.id}
          anchor={box}
          avoid={avoid}
          placement={spot.placement}
          fallback={hasTarget ? 'bottom' : 'center'}
          className="z-[71]"
          icon={
            !hasTarget && (
              <CircleCheck className="text-primary mb-2 size-7" aria-hidden="true" />
            )
          }
          title={spot.title}
          body={spot.body}
          footer={
            <>
              {confirmSkip ? (
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">End the guide?</span>
                  <button
                    type="button"
                    onClick={finish}
                    className="text-foreground cursor-pointer font-semibold underline-offset-2 hover:underline"
                  >
                    Yes, end it
                  </button>
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-2 text-xs">
                  {stepNo && (
                    <span className="tabular-nums">
                      Step {stepNo} of {GUIDE_STEP_COUNT}
                    </span>
                  )}
                  {stepNo && <span aria-hidden="true">·</span>}
                  <button
                    type="button"
                    onClick={() => setConfirmSkip(true)}
                    className="hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
                  >
                    Skip guide
                  </button>
                </span>
              )}

              {spot.action ? (
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={spot.action.onClick}
                >
                  {spot.action.label}
                </Button>
              ) : (
                box && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => {
                      setExpanded(false);
                      collapse(spot.id);
                    }}
                  >
                    Got it
                  </Button>
                )
              )}
            </>
          }
        />
      )}
    </>,
    document.body,
  );
}
