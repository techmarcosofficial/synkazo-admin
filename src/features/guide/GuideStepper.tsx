import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

import {
  GUIDE_STEPS,
  GUIDE_STEP_COUNT,
  type GuideProgress,
  type GuideStepId,
} from './guideSteps';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Steps that have a place to go. "Create project" is done by the time a stepper exists. */
const NAVIGABLE: ReadonlySet<GuideStepId> = new Set([
  'connect',
  'job',
  'map',
  'test',
  'schedule',
]);

/**
 * Step-form header for first-run setup: numbered steps with checkmarks, a
 * "n of 6 done" count, and Prev / Next. Next unlocks once the step you're on
 * is finished, and never skips past the first unfinished step.
 */
export default function GuideStepper({
  progress,
  viewStep,
  onGo,
  className,
}: {
  progress: GuideProgress;
  /** The step this tab belongs to, or null on tabs outside the setup path. */
  viewStep: GuideStepId | null;
  onGo: (step: GuideStepId) => void;
  className?: string;
}) {
  const { done, current, doneCount } = progress;
  const ids = GUIDE_STEPS.map((s) => s.id);
  const currentIdx = current ? ids.indexOf(current) : ids.length - 1;
  const viewIdx = viewStep ? ids.indexOf(viewStep) : -1;

  const prevStep =
    viewIdx > 0 && NAVIGABLE.has(ids[viewIdx - 1]) ? ids[viewIdx - 1] : null;

  let nextStep: GuideStepId | null = null;
  let nextLabel = 'Next';
  if (!viewStep) {
    nextStep = current;
    nextLabel = 'Continue setup';
  } else if (done[viewStep] && viewIdx + 1 <= currentIdx) {
    nextStep = ids[viewIdx + 1] ?? null;
  }
  const nextTitle = nextStep
    ? GUIDE_STEPS.find((s) => s.id === nextStep)?.short
    : null;
  const blockedTitle = viewStep
    ? GUIDE_STEPS.find((s) => s.id === viewStep)?.title
    : null;

  return (
    <nav
      aria-label="Setup steps"
      className={cn(
        'border-border/70 flex flex-wrap items-center gap-x-4 gap-y-2 border-t py-2.5',
        className,
      )}
    >
      <p className="flex shrink-0 items-baseline gap-2">
        <span className="text-sm font-semibold">Getting started</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {doneCount} of {GUIDE_STEP_COUNT} done
        </span>
      </p>

      <ol className="flex min-w-0 flex-1 items-center overflow-x-auto">
        {GUIDE_STEPS.map((step, i) => {
          const isDone = done[step.id];
          const isCurrent = step.id === current;
          const isViewing = step.id === viewStep;
          const reachable =
            NAVIGABLE.has(step.id) && (isDone || isCurrent) && !isViewing;
          return (
            <li key={step.id} className="flex shrink-0 items-center">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'mx-1 h-px w-3 lg:w-5',
                    done[GUIDE_STEPS[i - 1].id] ? 'bg-primary/50' : 'bg-border',
                  )}
                />
              )}
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onGo(step.id)}
                aria-current={isViewing ? 'step' : undefined}
                className={cn(
                  'group flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-xs transition-colors outline-none',
                  'focus-visible:ring-ring/50 focus-visible:ring-2',
                  reachable && 'hover:bg-muted cursor-pointer',
                  isViewing && 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums',
                    isDone && 'bg-primary/15 text-primary',
                    isCurrent &&
                      'bg-primary text-primary-foreground shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_20%,transparent)]',
                    !isDone &&
                      !isCurrent &&
                      'border-border text-muted-foreground border',
                  )}
                >
                  {isDone ? (
                    <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap',
                    // Narrow screens keep only the active label.
                    !isCurrent && !isViewing && 'hidden lg:inline',
                    isCurrent || isViewing
                      ? 'text-foreground font-semibold'
                      : isDone
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground/80',
                  )}
                >
                  <span className="xl:hidden">{step.short}</span>
                  <span className="hidden xl:inline">{step.title}</span>
                </span>
                <span className="sr-only">
                  {isDone ? ', done' : isCurrent ? ', to do now' : ', upcoming'}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-xs"
          disabled={!prevStep}
          onClick={() => prevStep && onGo(prevStep)}
        >
          <ChevronLeft aria-hidden="true" />
          Prev
        </Button>
        <Button
          size="sm"
          data-guide="guide-next"
          className="h-8 px-3 text-xs"
          disabled={!nextStep}
          title={
            !nextStep && blockedTitle
              ? `Finish “${blockedTitle}” to continue`
              : undefined
          }
          onClick={() => nextStep && onGo(nextStep)}
        >
          {nextStep && viewStep ? `Next: ${nextTitle}` : nextLabel}
          <ChevronRight data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
