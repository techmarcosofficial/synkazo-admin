import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import {
  CARD_MARGIN,
  CARD_WIDTH,
  placeCard,
  type Box,
  type GuidePlacement,
} from './guideDom';

import { cn } from '@/lib/utils';

/**
 * The hint card used by the setup guide and the billing tour: title, one
 * short paragraph, a footer, and an arrow pointing at the anchor. Without an
 * anchor it sits centred, or along the bottom edge when `fallback="bottom"`.
 * Render it inside a portal to <body>.
 */
export default function GuideCard({
  anchor,
  avoid,
  placement = 'bottom',
  fallback = 'center',
  title,
  body,
  icon,
  footer,
  className,
}: {
  anchor: Box | null;
  /** Keep clear of this box (an open dialog) when there's room beside it. */
  avoid?: Box | null;
  placement?: GuidePlacement;
  fallback?: 'center' | 'bottom';
  title: ReactNode;
  body: ReactNode;
  icon?: ReactNode;
  footer: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(140);

  useLayoutEffect(() => {
    if (ref.current) setHeight(ref.current.offsetHeight);
  });

  let style: React.CSSProperties;
  let side: GuidePlacement | null = null;
  let arrow = 0;
  if (anchor) {
    const placed = placeCard(anchor, height, placement, avoid);
    style = { top: placed.top, left: placed.left };
    side = placed.side;
    arrow = placed.arrow;
  } else if (fallback === 'bottom') {
    style = { left: '50%', bottom: 16, transform: 'translateX(-50%)' };
  } else {
    style = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  }

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      // A Radix dialog would treat a click here as a click outside it.
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        'guide-card bg-popover text-popover-foreground border-border pointer-events-auto fixed rounded-2xl border p-4 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.22),0_2px_6px_rgb(0_0_0/0.06)]',
        className,
      )}
      style={{
        ...style,
        width: `min(${CARD_WIDTH}px, calc(100vw - ${CARD_MARGIN * 2}px))`,
      }}
    >
      {side && (
        <span
          aria-hidden="true"
          className="bg-popover border-border absolute size-3 rotate-45"
          style={
            side === 'bottom'
              ? { top: -6.5, left: arrow - 6, borderLeftWidth: 1, borderTopWidth: 1 }
              : side === 'top'
                ? { bottom: -6.5, left: arrow - 6, borderRightWidth: 1, borderBottomWidth: 1 }
                : side === 'right'
                  ? { left: -6.5, top: arrow - 6, borderLeftWidth: 1, borderBottomWidth: 1 }
                  : { right: -6.5, top: arrow - 6, borderRightWidth: 1, borderTopWidth: 1 }
          }
        />
      )}
      {icon}
      <p className="text-sm leading-snug font-semibold text-balance">{title}</p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed text-pretty">
        {body}
      </p>
      <div className="mt-3.5 flex items-center justify-between gap-2">
        {footer}
      </div>
    </div>
  );
}
