import { ArrowRight, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type SetupJourneyStepStatus = 'complete' | 'current' | 'upcoming';

export interface SetupJourneyStep {
  title: string;
  description: string;
  status: SetupJourneyStepStatus;
  optional?: boolean;
  onSelect?: () => void;
  guidesFlowAction?: boolean;
}

interface SetupJourneyCardProps {
  eyebrow: string;
  title: string;
  description: string;
  steps: SetupJourneyStep[];
  compact?: boolean;
  actionLabel?: string;
  onContinue?: () => void;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export default function SetupJourneyCard({
  eyebrow,
  title,
  description,
  steps,
  compact = false,
  actionLabel = 'Continue setup',
  onContinue,
  secondaryAction,
}: SetupJourneyCardProps) {
  const requiredSteps = steps.filter((step) => !step.optional);
  const completedCount = requiredSteps.filter(
    (step) => step.status === 'complete',
  ).length;

  // Project setup opts into this layout for three steps; Job Setup keeps its grid.
  const isCompact = compact || steps.length <= 2;
  const isThreeStepCompact = compact && steps.length === 3;

  return (
    <Card className="gap-0 overflow-hidden rounded-3xl py-0 shadow-xs">
      <CardContent
        className={cn('px-3 py-3 sm:px-4', !isCompact && 'space-y-3')}
      >
        {isCompact ? (
          /* ── Compact 3-zone layout (Project Setup) ───────── */
          <div
            className={cn(
              'flex flex-col gap-2',
              isThreeStepCompact
                ? 'xl:flex-row xl:items-center xl:gap-3'
                : 'sm:flex-row sm:items-center sm:gap-3',
            )}
          >
            {/* Zone 1 — Intro */}
            <div
              className={cn(
                'min-w-0',
                isThreeStepCompact
                  ? 'xl:w-[22%] xl:shrink-0'
                  : 'sm:w-[26%] sm:shrink-0',
              )}
            >
              <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                {eyebrow}
              </div>
              <h2 className="text-foreground text-sm font-semibold tracking-tight">
                {title}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs leading-normal font-normal">
                {description}
              </p>
            </div>

            {/* Zone 2 — Step pills, single horizontal row each */}
            <ol
              aria-label={`${eyebrow} progress`}
              className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row"
            >
              {steps.map((step, index) => {
                const isComplete = step.status === 'complete';
                const isCurrent = step.status === 'current';
                const isUpcoming = step.status === 'upcoming';
                const canSelect = Boolean(
                  step.onSelect && (isComplete || isCurrent || step.optional),
                );
                const statusLabel = isComplete
                  ? 'Complete'
                  : isCurrent
                    ? 'Action needed'
                    : step.optional
                      ? 'Optional'
                      : 'Upcoming';

                return (
                  <li
                    key={step.title}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={cn(
                      'relative min-w-0 h-auto flex-1',
                      isThreeStepCompact && 'flex flex-col',
                    )}
                  >
                    <button
                      type="button"
                      disabled={!canSelect}
                      onClick={step.onSelect}
                      data-project-configure-step={
                        step.guidesFlowAction ? 'true' : undefined
                      }
                      className={cn(
                        'flex w-full flex-col rounded-2xl border px-3 py-2 text-left transition-colors',
                        isThreeStepCompact && 'flex-1',
                        isComplete &&
                          'border-success/30 bg-success/5 hover:bg-success/10',
                        isCurrent &&
                          'border-primary/40 bg-primary/5 ring-primary/10 hover:bg-primary/10 ring-1',
                        isUpcoming &&
                          'border-border/70 bg-muted/25 text-muted-foreground',
                        canSelect && 'cursor-pointer',
                      )}
                    >
                      {/* Header row: circle · title · status badge */}
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            'flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
                            isComplete &&
                              'border-success bg-success text-white',
                            isCurrent &&
                              'border-primary bg-primary text-primary-foreground',
                            isUpcoming &&
                              'border-border bg-background text-muted-foreground',
                          )}
                        >
                          {isComplete ? (
                            <Check className="size-3" aria-hidden="true" />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate text-xs font-semibold',
                            isComplete || isCurrent
                              ? 'text-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          {step.title}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 text-xs font-medium whitespace-nowrap',
                            isThreeStepCompact && 'xl:sr-only 2xl:not-sr-only',
                            isComplete && 'text-success',
                            isCurrent && 'text-primary',
                            isUpcoming && 'text-muted-foreground',
                          )}
                        >
                          {statusLabel}
                        </span>
                      </span>

                      {/* Description — indented to align with title */}
                      <span className="text-muted-foreground pl-7 text-xs leading-normal">
                        {step.description}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* Zone 3 — Progress counter + action, inline */}
            <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
              <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                {completedCount}/{requiredSteps.length} complete
              </span>
              {onContinue && actionLabel && (
                <div className="flex items-center gap-1.5">
                  {secondaryAction && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground h-7 text-xs"
                      onClick={secondaryAction.onClick}
                    >
                      {secondaryAction.label}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={onContinue}
                  >
                    {actionLabel}
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Full-width layout (> 2 steps — Job Setup, unchanged) ───── */
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    {eyebrow}
                  </div>
                  <h2 className="text-foreground text-sm font-semibold tracking-tight">
                    {title}
                  </h2>
                </div>
                <p className="text-muted-foreground mt-0.5 max-w-3xl text-xs leading-normal font-normal">
                  {description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                  {completedCount}/{requiredSteps.length} complete
                </span>
                <div className="flex items-center gap-2">
                  {secondaryAction && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground h-8 text-xs"
                      onClick={secondaryAction.onClick}
                    >
                      {secondaryAction.label}
                    </Button>
                  )}
                  {onContinue && actionLabel && (
                    <Button size="sm" className="h-8" onClick={onContinue}>
                      {actionLabel}
                      <ArrowRight data-icon="inline-end" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <ol
                aria-label={`${eyebrow} progress`}
                className={cn(
                  'grid gap-2 sm:grid-cols-2',
                  steps.length === 3 && 'lg:grid-cols-3',
                  steps.length >= 4 && 'lg:grid-cols-4',
                )}
              >
                {steps.map((step, index) => {
                  const isComplete = step.status === 'complete';
                  const isCurrent = step.status === 'current';
                  const isUpcoming = step.status === 'upcoming';
                  const canSelect = Boolean(
                    step.onSelect && (isComplete || isCurrent || step.optional),
                  );
                  const statusLabel = isComplete
                    ? 'Complete'
                    : isCurrent
                      ? 'Action needed'
                      : step.optional
                        ? 'Optional'
                        : 'Upcoming';

                  return (
                    <li
                      key={step.title}
                      aria-current={isCurrent ? 'step' : undefined}
                      className="relative min-w-0"
                    >
                      <button
                        type="button"
                        disabled={!canSelect}
                        onClick={step.onSelect}
                        className={cn(
                          'relative flex h-full min-h-14 w-full items-center gap-2.5 rounded-3xl border px-3.5 py-2.5 text-left transition-colors',
                          isComplete &&
                            'border-success/30 bg-success/5 hover:bg-success/10',
                          isCurrent &&
                            'border-primary/40 bg-primary/5 ring-primary/10 hover:bg-primary/10 ring-1',
                          isUpcoming &&
                            'border-border/70 bg-muted/25 text-muted-foreground',
                          canSelect && 'cursor-pointer',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                            isComplete &&
                              'border-success bg-success text-white',
                            isCurrent &&
                              'border-primary bg-primary text-primary-foreground',
                            isUpcoming &&
                              'border-border bg-background text-muted-foreground',
                          )}
                        >
                          {isComplete ? (
                            <Check className="size-3.5" aria-hidden="true" />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span className="min-w-0 flex-1 text-xs leading-normal">
                          <span
                            className={cn(
                              'text-xs',
                              isComplete || isCurrent
                                ? 'text-foreground font-semibold'
                                : 'text-muted-foreground font-medium',
                            )}
                          >
                            {step.title}
                          </span>
                          <span className="text-muted-foreground ml-1.5">
                            · {step.description}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'shrink-0 text-xs font-medium whitespace-nowrap',
                            isComplete && 'text-success',
                            isCurrent && 'text-primary',
                            isUpcoming && 'text-muted-foreground',
                          )}
                        >
                          {statusLabel}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
