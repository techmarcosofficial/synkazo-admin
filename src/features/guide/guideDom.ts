// DOM helpers shared by the setup guide and the billing tour: measuring
// targets, placing the hint card beside them, and marking them so the
// [data-guide-active] rules in index.css light them up.

export type GuidePlacement = 'top' | 'bottom' | 'left' | 'right';

export type Box = { top: number; left: number; width: number; height: number };

export const CARD_WIDTH = 296;
export const CARD_GAP = 14;
export const CARD_MARGIN = 12;

export function toBox(el: Element): Box | null {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function sameBox(a: Box | null, b: Box | null) {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

export function sameBoxes(a: Array<Box | null>, b: Array<Box | null>) {
  return a.length === b.length && a.every((box, i) => sameBox(box, b[i]));
}

/** First element matching `selector` that is actually on screen. */
export function findVisible(selector: string): Element | null {
  for (const el of document.querySelectorAll(selector)) {
    if (toBox(el)) return el;
  }
  return null;
}

/**
 * How a target lights up (see [data-guide-active] in index.css):
 * - text: a transparent control (tab, nav link, ghost button). The label and
 *   icon turn primary and an aura line glides beneath it.
 * - control: a filled or outlined button. Soft glow plus a gliding sheen.
 * - area: a transparent group (form field, identifier bar). Faint wash + glow.
 * - panel: a card or section with its own background. Glow only, so the
 *   card keeps its surface.
 */
export type HighlightMode = 'text' | 'control' | 'area' | 'panel';

const INTERACTIVE =
  'button, a, [role="tab"], [role="button"], input, select, textarea';

function isTransparent(color: string) {
  return (
    color === 'transparent' ||
    /,\s*0\)$/.test(color) ||
    /\/\s*0\)$/.test(color)
  );
}

export function highlightMode(el: Element): HighlightMode {
  const transparent = isTransparent(getComputedStyle(el).backgroundColor);
  if (!el.matches(INTERACTIVE)) return transparent ? 'area' : 'panel';
  return transparent ? 'text' : 'control';
}

/** Marks `el` (and un-marks whatever `ref` held before). */
export function mark(
  ref: { current: Element | null },
  el: Element | null,
  mode: HighlightMode | 'quiet' | null,
) {
  if (ref.current === el) return;
  ref.current?.removeAttribute('data-guide-active');
  ref.current = el;
  if (el && mode) el.setAttribute('data-guide-active', mode);
}

export function placeCard(
  box: Box,
  height: number,
  preferred: GuidePlacement,
  /** A surface the card must not cover (an open dialog). Tried first: beside it. */
  avoid?: Box | null,
): { top: number; left: number; side: GuidePlacement; arrow: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(CARD_WIDTH, vw - CARD_MARGIN * 2);
  const clampY = (v: number) =>
    Math.max(CARD_MARGIN, Math.min(v, vh - height - CARD_MARGIN));

  if (avoid) {
    // Sit beside the dialog, level with the target, pointing back at it.
    const centerY = box.top + box.height / 2;
    const top = clampY(centerY - height / 2);
    const arrow = Math.max(16, Math.min(centerY - top, height - 16));
    const rightX = avoid.left + avoid.width + CARD_GAP;
    if (rightX + w <= vw - CARD_MARGIN) {
      return { top, left: rightX, side: 'right', arrow };
    }
    const leftX = avoid.left - CARD_GAP - w;
    if (leftX >= CARD_MARGIN) return { top, left: leftX, side: 'left', arrow };
  }

  const fits: Record<GuidePlacement, boolean> = {
    bottom: box.top + box.height + CARD_GAP + height <= vh - CARD_MARGIN,
    top: box.top - CARD_GAP - height >= CARD_MARGIN,
    right: box.left + box.width + CARD_GAP + w <= vw - CARD_MARGIN,
    left: box.left - CARD_GAP - w >= CARD_MARGIN,
  };
  const opposite: Record<GuidePlacement, GuidePlacement> = {
    bottom: 'top',
    top: 'bottom',
    left: 'right',
    right: 'left',
  };
  const order: GuidePlacement[] = [
    preferred,
    opposite[preferred],
    'bottom',
    'top',
    'right',
    'left',
  ];
  const side = order.find((s) => fits[s]) ?? 'bottom';
  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(v, max));

  if (side === 'top' || side === 'bottom') {
    const left = clamp(
      box.left + box.width / 2 - w / 2,
      CARD_MARGIN,
      vw - w - CARD_MARGIN,
    );
    const top =
      side === 'bottom'
        ? box.top + box.height + CARD_GAP
        : box.top - CARD_GAP - height;
    const arrow = clamp(box.left + box.width / 2 - left, 18, w - 18);
    return {
      top: clamp(top, CARD_MARGIN, vh - height - CARD_MARGIN),
      left,
      side,
      arrow,
    };
  }
  const top = clamp(
    box.top + box.height / 2 - height / 2,
    CARD_MARGIN,
    vh - height - CARD_MARGIN,
  );
  const left =
    side === 'right' ? box.left + box.width + CARD_GAP : box.left - CARD_GAP - w;
  const arrow = clamp(box.top + box.height / 2 - top, 16, height - 16);
  return { top, left, side, arrow };
}

/**
 * clip-path for a full-screen scrim with rounded holes cut around `boxes`, so
 * a blurred overlay leaves several highlighted elements sharp at once.
 */
export function scrimClipPath(boxes: Box[], pad = 8, radius = 14): string {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let d = `M0 0H${vw}V${vh}H0Z`;
  for (const b of boxes) {
    const x = b.left - pad;
    const y = b.top - pad;
    const w = b.width + pad * 2;
    const h = b.height + pad * 2;
    const r = Math.min(radius, w / 2, h / 2);
    d +=
      ` M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}` +
      `V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
      `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
      `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  }
  return `path(evenodd, "${d}")`;
}
