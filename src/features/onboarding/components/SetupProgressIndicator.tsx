import { ArrowRight, CircleCheck, CircleDot, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { SetupProgressRing } from './SetupJourneyCard';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import {
  setupGuideProgress,
  type SetupGuide,
} from '@/features/onboarding/setupGuide';
import { cn } from '@/lib/utils';

const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 120;

/**
 * "Action needed →" plus a progress ring, shown on the right of a detail
 * page's tab row on every tab. Hovering (or focusing) opens a panel with the
 * next step, its instructions and every step's status; clicking goes
 * straight to the next step.
 */
export default function SetupProgressIndicator({
  guide,
  className,
}: {
  guide: SetupGuide | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!guide) return null;

  const { label, steps, next, secondaryAction } = guide;
  const { done, total } = setupGuideProgress(steps);
  const requiredDone = done === total;
  const statusText = requiredDone ? 'Next step' : 'Action needed';

  const scheduleOpen = (value: boolean) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => setOpen(value),
      value ? OPEN_DELAY_MS : CLOSE_DELAY_MS,
    );
  };
  const hoverProps = {
    onPointerEnter: (event: React.PointerEvent) => {
      if (event.pointerType === 'mouse') scheduleOpen(true);
    },
    onPointerLeave: (event: React.PointerEvent) => {
      if (event.pointerType === 'mouse') scheduleOpen(false);
    },
  };

  const go = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
    next.onGo();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn('flex shrink-0 items-center', className)}
          {...hoverProps}
        >
          <button
            type="button"
            onClick={go}
            onFocus={(event) => {
              // Keyboard focus opens the panel; a mouse click just navigates.
              if (event.target.matches(':focus-visible')) scheduleOpen(true);
            }}
            onBlur={() => scheduleOpen(false)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setOpen(false);
            }}
            aria-label={`${label}: ${done} of ${total} complete. ${statusText}: ${next.title}`}
            aria-describedby={open ? 'setup-progress-panel' : undefined}
            data-step-guides-action={next.guidesFlowAction ? 'true' : undefined}
            data-project-configure-step={
              next.guidesFlowAction ? 'true' : undefined
            }
            className="group hover:bg-muted/60 focus-visible:ring-ring/50 inline-flex cursor-pointer items-center gap-2 rounded-full py-0.5 pr-0.5 pl-3 transition-colors outline-none focus-visible:ring-2"
          >
            <span className="inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-(--brand-orange)">
              {statusText}
              <ArrowRight
                aria-hidden="true"
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
              />
            </span>
            <SetupProgressRing
              decorative
              done={done}
              total={total}
              className="size-9"
              labelClassName="text-[10px]"
            />
          </button>
        </div>
      </PopoverAnchor>

      <PopoverContent
        id="setup-progress-panel"
        role="dialog"
        aria-label={`${label} next step`}
        align="end"
        sideOffset={6}
        className="w-80 gap-3 p-4"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        {...hoverProps}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
            {label}
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {done} of {total} done
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold">{next.title}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {next.instruction}
          </p>
        </div>

        <ol aria-label={`${label} steps`} className="space-y-1.5 border-t pt-3">
          {steps.map((step) => {
            const isComplete = step.status === 'complete';
            const isCurrent = step.status === 'current';
            const Icon = isComplete
              ? CircleCheck
              : isCurrent
                ? CircleDot
                : Lock;
            return (
              <li
                key={step.title}
                aria-current={isCurrent ? 'step' : undefined}
                className="flex items-center gap-2 text-xs"
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    'size-3.5 shrink-0',
                    isComplete && 'text-success',
                    isCurrent && 'text-(--brand-orange)',
                    !isComplete && !isCurrent && 'text-muted-foreground/60',
                  )}
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate',
                    isComplete && 'text-muted-foreground',
                    isCurrent && 'text-foreground font-semibold',
                    !isComplete && !isCurrent && 'text-muted-foreground/70',
                  )}
                >
                  {step.title}
                </span>
                <span className="sr-only">
                  {isComplete ? 'Done' : isCurrent ? 'Current step' : 'Pending'}
                </span>
                {step.optional && (
                  <span className="text-muted-foreground text-[10px]">
                    Optional
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="flex items-center justify-between gap-2 pt-1">
          {secondaryAction ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                secondaryAction.onClick();
              }}
              className="text-muted-foreground hover:text-foreground cursor-pointer text-xs underline-offset-2 hover:underline"
            >
              {secondaryAction.label}
            </button>
          ) : (
            <span />
          )}
          <Button
            size="sm"
            onClick={go}
            className="h-8 gap-1.5 border-transparent bg-(--brand-orange) px-3.5 text-xs font-medium text-white hover:bg-(--brand-orange)/90"
          >
            {next.actionLabel}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
