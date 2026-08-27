import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TourStep = {
  id: string;
  title: string;
  description: string;
  selector: string | null;
  tab: string | null;
  position: 'top' | 'bottom' | 'center';
};

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to your billing dashboard',
    description:
      "Here's a quick look at where to manage your subscription, usage, and payments.",
    selector: '[data-tour="billing-header"]',
    tab: 'overview',
    position: 'bottom',
  },
  {
    id: 'current-plan',
    title: 'Your current plan',
    description: 'Your active plan, status, and renewal date live here.',
    selector: '[data-tour="current-plan"]',
    tab: 'overview',
    position: 'bottom',
  },
  {
    id: 'usage',
    title: 'Track your usage',
    description:
      "See how many records you've synced this billing period, and how close you are to your plan's limit.",
    selector: '[data-tour="usage-section"]',
    tab: 'overview',
    position: 'top',
  },
  {
    id: 'manage-subscription',
    title: 'Manage your subscription',
    description: 'Change plans, switch billing interval, or cancel from here.',
    selector: '[data-tour="manage-subscription"]',
    tab: 'overview',
    position: 'top',
  },
  {
    id: 'subscription-tab',
    title: 'Subscription details',
    description:
      'Full subscription controls, including cancellation and reactivation, live in this tab.',
    selector: '[data-tour="subscription-tab"]',
    tab: 'subscription',
    position: 'bottom',
  },
  {
    id: 'invoices-tab',
    title: 'Invoices',
    description: 'Every past payment and receipt is available here.',
    selector: '[data-tour="invoices-tab"]',
    tab: 'invoices',
    position: 'bottom',
  },
  {
    id: 'payment-tab',
    title: 'Payment methods',
    description: 'Update the card on file or add a new payment method anytime.',
    selector: '[data-tour="payment-tab"]',
    tab: 'payment',
    position: 'bottom',
  },
  {
    id: 'complete',
    title: "You're all set!",
    description:
      "That's everything. You can revisit any of this anytime from the Billing page.",
    selector: null,
    tab: 'overview',
    position: 'center',
  },
];

const TOOLTIP_WIDTH = 340;
const TOOLTIP_HEIGHT_ESTIMATE = 160;
const GAP = 16;
const VIEWPORT_PADDING = 16;
const HIGHLIGHT_PADDING = 6;

type Rect = { top: number; left: number; width: number; height: number };

function measure(selector: string | null): Rect | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function BillingGuidedTour({
  active,
  tab,
  onNavigateTab,
  onDone,
}: {
  active: boolean;
  tab: string;
  onNavigateTab: (tab: string) => void;
  onDone: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = STEPS[stepIndex];

  // Reset to the first step whenever the tour (re)activates.
  useEffect(() => {
    if (active) setStepIndex(0);
  }, [active]);

  // Drive the real page's tab state so the tour highlights what the user actually sees.
  useEffect(() => {
    if (!active || !step.tab || step.tab === tab) return;
    onNavigateTab(step.tab);
  }, [active, step.tab, tab, onNavigateTab]);

  // Measure the target element once the right tab (and its content) is mounted, and keep the
  // highlight glued to it across layout shifts — the tour can sit on a step for a while.
  useLayoutEffect(() => {
    if (!active || step.tab !== tab) {
      setRect(null);
      return;
    }

    let cancelled = false;
    const recalc = () => {
      if (cancelled) return;
      setRect(measure(step.selector));
    };

    const raf = requestAnimationFrame(() => {
      const el = step.selector ? document.querySelector(step.selector) : null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      recalc();
    });

    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, true);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
    };
  }, [active, step.selector, step.tab, tab]);

  const closedRef = useRef(onDone);
  closedRef.current = onDone;

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closedRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);

  if (!active) return null;

  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;

  const handleNext = () => {
    if (isLast) {
      onDone();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const handlePrev = () => {
    if (!isFirst) setStepIndex((i) => i - 1);
  };

  let tooltipStyle: React.CSSProperties = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  };

  if (rect && step.position !== 'center') {
    let top =
      step.position === 'bottom'
        ? rect.top + rect.height + GAP
        : rect.top - GAP;
    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;

    if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;
    if (left + TOOLTIP_WIDTH > window.innerWidth - VIEWPORT_PADDING) {
      left = window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING;
    }
    if (step.position === 'top') top -= TOOLTIP_HEIGHT_ESTIMATE;
    if (top < VIEWPORT_PADDING) top = rect.top + rect.height + GAP;
    top = Math.min(top, window.innerHeight - VIEWPORT_PADDING);

    tooltipStyle = { top, left, transform: 'none' };
  }

  // Portalled to <body> — BillingPage's outer container has `animate-fade-in-up`, whose
  // keyframes leave a non-none `transform` on it (translateY(0) at rest), which makes it a
  // containing block for `position: fixed` descendants. Without the portal, every fixed-position
  // element here would be positioned relative to that div instead of the real viewport.
  // Dim+blur the whole viewport except a cutout around the highlighted element, so the
  // element itself stays sharp instead of being blurred behind a full-screen overlay. Four
  // strips (top/bottom/left/right) around the hole, rather than a single overlay + border,
  // since a plain border draws on top of a blurred element without un-blurring it.
  const overlayClass = 'bg-background/60 fixed z-[9998] backdrop-blur-[2px]';
  const hole = rect
    ? {
        top: rect.top - HIGHLIGHT_PADDING,
        left: rect.left - HIGHLIGHT_PADDING,
        width: rect.width + HIGHLIGHT_PADDING * 2,
        height: rect.height + HIGHLIGHT_PADDING * 2,
      }
    : null;

  return createPortal(
    <>
      {hole ? (
        <>
          <div
            className={overlayClass}
            style={{ top: 0, left: 0, right: 0, height: Math.max(hole.top, 0) }}
          />
          <div
            className={overlayClass}
            style={{
              top: hole.top + hole.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <div
            className={overlayClass}
            style={{
              top: hole.top,
              left: 0,
              width: Math.max(hole.left, 0),
              height: hole.height,
            }}
          />
          <div
            className={overlayClass}
            style={{
              top: hole.top,
              left: hole.left + hole.width,
              right: 0,
              height: hole.height,
            }}
          />
        </>
      ) : (
        <div className={overlayClass} style={{ inset: 0 }} />
      )}

      {rect && (
        <div
          className="border-ring pointer-events-none fixed z-[9999] rounded-lg border-2 transition-all duration-200"
          style={{
            top: rect.top - HIGHLIGHT_PADDING,
            left: rect.left - HIGHLIGHT_PADDING,
            width: rect.width + HIGHLIGHT_PADDING * 2,
            height: rect.height + HIGHLIGHT_PADDING * 2,
          }}
        />
      )}

      <div
        className="bg-popover text-popover-foreground border-border fixed z-[10000] w-[340px] rounded-xl border p-5 shadow-lg"
        style={tooltipStyle}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium">{step.title}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground -mt-1 -mr-1 size-6 shrink-0"
            onClick={onDone}
            aria-label="Close tour"
          >
            <X className="size-4" />
          </Button>
        </div>

        <p className="text-muted-foreground mb-5 text-sm leading-relaxed">
          {step.description}
        </p>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs">
            Step {stepIndex + 1} of {STEPS.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={isFirst}
              className={cn(isFirst && 'opacity-50')}
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
            <Button size="sm" onClick={handleNext}>
              {isLast ? 'Done' : 'Next'}
              {!isLast && <ArrowRight className="size-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
