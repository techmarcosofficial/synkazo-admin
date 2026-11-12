import { ArrowLeft, ArrowRight, CircleCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import GuideCard from '@/features/guide/GuideCard';
import {
  findVisible,
  highlightMode,
  mark,
  sameBoxes,
  scrimClipPath,
  toBox,
  type Box,
  type GuidePlacement,
} from '@/features/guide/guideDom';

export type BillingTourSection = 'overview' | 'cards' | 'invoices' | 'activity';

type TourStep = {
  id: string;
  title: string;
  description: string;
  /** The billing section this step shows; the tour switches to it. */
  section: BillingTourSection;
  /** Everything that stays sharp and lit. Empty for a centred step. */
  targets: string[];
  /** Index into `targets` the hint card points at. */
  anchor?: number;
  placement?: GuidePlacement;
};

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to your billing dashboard',
    description:
      'A quick look at where you manage your plan, usage, cards and invoices. Takes under a minute.',
    section: 'overview',
    targets: [],
  },
  {
    id: 'current-plan',
    title: 'Your active plan',
    description:
      'Your plan, its status, billing interval and renewal countdown live here.',
    section: 'overview',
    targets: ['[data-tour="current-plan"]'],
    placement: 'bottom',
  },
  {
    id: 'usage',
    title: 'Limits and usage',
    description:
      'Synced records, projects, jobs and the features your plan includes, for this billing cycle.',
    section: 'overview',
    targets: ['[data-tour="usage-section"]'],
    placement: 'right',
  },
  {
    id: 'manage-subscription',
    title: 'Upcoming payment',
    description:
      'Your next payment, the card it will be charged to, and where to change plans.',
    section: 'overview',
    targets: ['[data-tour="manage-subscription"]'],
    placement: 'top',
  },
  {
    id: 'cards',
    title: 'Manage cards',
    description:
      'Add a card, choose the default one for payments, or remove cards you no longer use.',
    section: 'cards',
    targets: ['[data-tour="cards-nav"]', '[data-tour="billing-section"]'],
    anchor: 0,
    placement: 'bottom',
  },
  {
    id: 'invoices',
    title: 'Invoices and payments',
    description:
      'Every invoice and payment, with PDFs to download for your records.',
    section: 'invoices',
    targets: ['[data-tour="invoices-nav"]', '[data-tour="billing-section"]'],
    anchor: 0,
    placement: 'bottom',
  },
  {
    id: 'activity',
    title: 'Billing activity',
    description:
      'A timeline of plan changes, renewals and payment events, so nothing on your bill is a surprise.',
    section: 'activity',
    targets: ['[data-tour="activity-nav"]', '[data-tour="billing-section"]'],
    anchor: 0,
    placement: 'bottom',
  },
  {
    id: 'complete',
    title: 'Billing is ready',
    description:
      "Next up: your first sync. We'll highlight each step as you go, starting with Projects.",
    section: 'overview',
    targets: [],
  },
];

/**
 * First-checkout tour of the billing workspace. Each step opens its section
 * (switching tabs for Cards, Invoices and Activity), lights up the tab and
 * its content in the theme's primary colour, and blurs everything else.
 */
export default function BillingGuidedTour({
  active,
  onDone,
  onSection,
}: {
  active: boolean;
  onDone: () => void;
  onSection: (section: BillingTourSection) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [boxes, setBoxes] = useState<Array<Box | null>>([]);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [waitedOut, setWaitedOut] = useState(false);
  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const onSectionRef = useRef(onSection);
  onSectionRef.current = onSection;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (active) setStepIndex(0);
  }, [active]);

  useEffect(() => {
    setConfirmSkip(false);
    setWaitedOut(false);
    if (!active) return;
    onSectionRef.current(step.section);
    // If a target never renders (e.g. data failed to load), don't strand the
    // user behind the blur: show the card centred after a moment.
    const id = window.setTimeout(() => setWaitedOut(true), 1500);
    return () => window.clearTimeout(id);
  }, [active, step.section, stepIndex]);

  // Follow the targets every frame: the section swaps content, data loads in,
  // the page scrolls. Each target is marked so it glows.
  useEffect(() => {
    if (!active) return;
    const marks = step.targets.map(() => ({ current: null as Element | null }));
    let scrolled = false;
    let raf = 0;
    const tick = () => {
      const els = step.targets.map((sel) => findVisible(sel));
      els.forEach((el, i) => mark(marks[i], el, el ? highlightMode(el) : null));
      const next = els.map((el) => (el ? toBox(el) : null));
      setBoxes((prev) => (sameBoxes(prev, next) ? prev : next));

      const anchorEl = els[step.anchor ?? 0];
      if (!scrolled && anchorEl) {
        scrolled = true;
        const r = anchorEl.getBoundingClientRect();
        if (r.top < 72 || r.bottom > window.innerHeight - 24) {
          anchorEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      marks.forEach((m) => mark(m, null, null));
      setBoxes([]);
    };
  }, [active, step]);

  const next = () => (isLast ? onDoneRef.current() : setStepIndex((i) => i + 1));
  const back = () => !isFirst && setStepIndex((i) => i - 1);
  const nextRef = useRef(next);
  nextRef.current = next;
  const backRef = useRef(back);
  backRef.current = back;

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDoneRef.current();
      else if (e.key === 'ArrowRight') nextRef.current();
      else if (e.key === 'ArrowLeft') backRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);

  if (!active) return null;

  const visible = boxes.filter((b): b is Box => Boolean(b));
  const anchor = step.targets.length ? (boxes[step.anchor ?? 0] ?? visible[0] ?? null) : null;
  // A targeted step whose element hasn't rendered yet waits rather than
  // flashing a centred card.
  const waiting =
    step.targets.length > 0 && visible.length === 0 && !waitedOut;

  // Portalled to <body>: BillingPage animates in with a transform, which would
  // otherwise become the containing block for these fixed elements.
  return createPortal(
    <>
      <div
        aria-hidden="true"
        className="bg-background/55 fixed inset-0 z-[9998] backdrop-blur-[3px] transition-[clip-path] duration-200"
        style={visible.length ? { clipPath: scrimClipPath(visible) } : undefined}
      />

      {!waiting && (
        <GuideCard
          key={step.id}
          anchor={anchor}
          placement={step.placement}
          className="z-[10000]"
          icon={
            isLast && (
              <CircleCheck className="text-primary mb-2 size-7" aria-hidden="true" />
            )
          }
          title={step.title}
          body={step.description}
          footer={
            <>
              {confirmSkip ? (
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">Skip the tour?</span>
                  <button
                    type="button"
                    onClick={onDone}
                    className="text-foreground cursor-pointer font-semibold underline-offset-2 hover:underline"
                  >
                    Yes, skip
                  </button>
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span className="tabular-nums">
                    Step {stepIndex + 1} of {STEPS.length}
                  </span>
                  {!isLast && (
                    <>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => setConfirmSkip(true)}
                        className="hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
                      >
                        Skip tour
                      </button>
                    </>
                  )}
                </span>
              )}
              <span className="flex shrink-0 items-center gap-1.5">
                {!isFirst && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={back}
                  >
                    <ArrowLeft className="size-3.5" aria-hidden="true" />
                    Back
                  </Button>
                )}
                <Button size="sm" className="h-7 px-3 text-xs" onClick={next}>
                  {isLast ? 'Done' : 'Next'}
                  {!isLast && <ArrowRight className="size-3.5" aria-hidden="true" />}
                </Button>
              </span>
            </>
          }
        />
      )}
    </>,
    document.body,
  );
}
