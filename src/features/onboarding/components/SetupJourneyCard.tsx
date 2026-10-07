import { ArrowRight, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import HeadingPair from '@/components/shared/HeadingPair';
import {
  headingSubtitleStyles,
  headingTitleStyles,
} from '@/components/shared/headingStyles';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type SetupJourneyStepStatus = 'complete' | 'current' | 'upcoming';

export interface SetupJourneyStep {
  title: string;
  description: string;
  status: SetupJourneyStepStatus;
  optional?: boolean;
  onSelect?: () => void;
  guidesFlowAction?: boolean;
  hoverHint?: string;
  isCurrentTab?: boolean;
}

function StepButtonWithTooltip({
  hint,
  children,
}: {
  hint?: string;
  children: React.ReactElement;
}) {
  if (!hint) return children;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs font-normal">
          {hint}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const setupEyebrowStyles =
  'text-muted-foreground text-[10px] leading-4 font-semibold tracking-wider uppercase';

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

  // Both project setup and job setup use this unified single-line compact layout
  const isCompact = compact !== false;
  const isMultiStepCompact = isCompact && steps.length >= 3;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent
        className={cn('px-3 py-3 sm:px-4', !isCompact && 'space-y-3')}
      >
        {isCompact ? (
          /* ── Compact 3-zone layout (Project & Job Setup) ───────── */
          <div
            className={cn(
              'flex flex-col gap-2',
              isMultiStepCompact
                ? 'xl:flex-row xl:items-center xl:gap-3'
                : 'sm:flex-row sm:items-center sm:gap-3',
            )}
          >
            {/* Zone 1 — Intro */}
            <div
              className={cn(
                'min-w-0',
                steps.length >= 4
                  ? 'xl:w-[19%] 2xl:w-[17%] xl:shrink-0'
                  : steps.length === 3
                    ? 'xl:w-[22%] 2xl:w-[20%] xl:shrink-0'
                    : 'sm:w-[26%] sm:shrink-0',
              )}
            >
              <div className={setupEyebrowStyles}>{eyebrow}</div>
              <HeadingPair
                title={title}
                subtitle={description}
                visualLevel="card"
              />
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
                const isCurrentTab = Boolean(step.isCurrentTab);
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
                        'relative h-auto min-w-0 flex-1',
                        isMultiStepCompact && 'flex flex-col',
                      )}
                    >
                      <StepButtonWithTooltip hint={step.hoverHint}>
                        <button
                          type="button"
                          disabled={!canSelect}
                          onClick={step.onSelect}
                          data-step-hint={step.hoverHint}
                          data-step-current-tab={
                            isCurrentTab ? 'true' : undefined
                          }
                          data-project-configure-step={
                            step.guidesFlowAction ? 'true' : undefined
                          }
                          data-step-guides-action={
                            step.guidesFlowAction ? 'true' : undefined
                          }
                          className={cn(
                            'group flex w-full flex-col rounded-2xl border px-3 py-2 text-left transition-all',
                            isMultiStepCompact && 'flex-1 justify-center',
                            isComplete &&
                              (isCurrentTab
                                ? 'border-solid border-success/60 bg-success/10 ring-1 ring-success/30 hover:bg-success/15'
                                : 'border-solid border-success/30 bg-success/5 hover:bg-success/10'),
                            isCurrent &&
                              (isCurrentTab
                                ? 'border-solid border-primary bg-primary/10 ring-2 ring-primary/25 shadow-xs hover:border-primary hover:bg-primary/15'
                                : 'border-dashed border-primary/60 bg-primary/[0.04] ring-1 ring-primary/10 hover:border-primary hover:bg-primary/10 hover:border-solid'),
                            isUpcoming &&
                              (isCurrentTab
                                ? 'border-solid border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted/50'
                                : 'border-dashed border-border/70 bg-muted/20 text-muted-foreground hover:bg-muted/30'),
                            canSelect && 'cursor-pointer',
                          )}
                        >
                          {/* Header row: circle · title · status badge */}
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                'flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-transform group-hover:scale-105',
                                isComplete &&
                                  'border-success bg-success text-white',
                                isCurrent &&
                                  'border-primary bg-primary text-primary-foreground shadow-xs',
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
                                'min-w-0 flex-1 truncate',
                                headingTitleStyles.item,
                                isComplete || isCurrent
                                  ? 'text-foreground'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {step.title}
                            </span>
                            <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium whitespace-nowrap">
                              {isCurrentTab && (
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold border leading-none shrink-0',
                                    isCurrent
                                      ? 'border-primary/40 bg-primary/15 text-primary'
                                      : isComplete
                                        ? 'border-success/40 bg-success/15 text-success'
                                        : 'border-border/80 bg-background/80 text-muted-foreground',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'size-1.5 rounded-full',
                                      isCurrent
                                        ? 'bg-primary animate-pulse'
                                        : isComplete
                                          ? 'bg-success'
                                          : 'bg-muted-foreground',
                                    )}
                                  />
                                  Current tab
                                </span>
                              )}
                              <span
                                className={cn(
                                  isMultiStepCompact && 'xl:sr-only 2xl:not-sr-only',
                                  isComplete && 'text-success',
                                  isCurrent && 'text-primary font-semibold',
                                  isUpcoming && 'text-muted-foreground',
                                )}
                              >
                                {statusLabel}
                                {isCurrent && canSelect && !isCurrentTab && (
                                  <ArrowRight className="inline-block size-3 ml-1 transition-transform group-hover:translate-x-0.5" />
                                )}
                              </span>
                              {/* Visual indicator for active step when status label is hidden on xl */}
                              {isCurrent && canSelect && !isCurrentTab && isMultiStepCompact && (
                                <ArrowRight className="size-3 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 hidden xl:block 2xl:hidden" />
                              )}
                            </span>
                          </span>

                          {/* Description — indented to align with title */}
                          <span
                            className={cn(
                              'text-muted-foreground pl-7 line-clamp-1',
                              headingSubtitleStyles.item,
                            )}
                          >
                            {step.description}
                          </span>
                        </button>
                      </StepButtonWithTooltip>
                    </li>
                  );
              })}
            </ol>

            {/* Zone 3 — Progress counter + completion action */}
            <div className="flex shrink-0 items-center gap-2 justify-end">
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
              <span className="text-muted-foreground text-xs font-medium whitespace-nowrap rounded-full border border-border/60 bg-muted/30 px-2.5 py-1">
                {completedCount}/{requiredSteps.length} complete
              </span>
              {completedCount === requiredSteps.length && onContinue && actionLabel && (
                <Button size="sm" className="h-8 text-xs font-medium" onClick={onContinue}>
                  {actionLabel}
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* ── Full-width layout (> 2 steps — Job Setup, unchanged) ───── */
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className={setupEyebrowStyles}>{eyebrow}</div>
                <HeadingPair
                  title={title}
                  subtitle={description}
                  visualLevel="card"
                  className="max-w-3xl"
                />
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
                  {completedCount === requiredSteps.length && onContinue && actionLabel && (
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
                  const isCurrentTab = Boolean(step.isCurrentTab);
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
                      <StepButtonWithTooltip hint={step.hoverHint}>
                        <button
                          type="button"
                          disabled={!canSelect}
                          onClick={step.onSelect}
                          data-step-hint={step.hoverHint}
                          data-step-current-tab={
                            isCurrentTab ? 'true' : undefined
                          }
                          data-project-configure-step={
                            step.guidesFlowAction ? 'true' : undefined
                          }
                          data-step-guides-action={
                            step.guidesFlowAction ? 'true' : undefined
                          }
                          className={cn(
                            'relative flex h-full min-h-14 w-full items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition-colors',
                            isComplete &&
                              (isCurrentTab
                                ? 'border-solid border-success/60 bg-success/10 ring-1 ring-success/30 hover:bg-success/15'
                                : 'border-solid border-success/30 bg-success/5 hover:bg-success/10'),
                            isCurrent &&
                              (isCurrentTab
                                ? 'border-solid border-primary bg-primary/10 ring-2 ring-primary/25 shadow-xs hover:border-primary hover:bg-primary/15'
                                : 'border-dashed border-primary/60 bg-primary/[0.04] ring-1 ring-primary/10 hover:border-primary hover:bg-primary/10 hover:border-solid'),
                            isUpcoming &&
                              (isCurrentTab
                                ? 'border-solid border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted/50'
                                : 'border-dashed border-border/70 bg-muted/20 text-muted-foreground hover:bg-muted/30'),
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
                              headingTitleStyles.item,
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
                        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium whitespace-nowrap">
                          {isCurrentTab && (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold border leading-none shrink-0',
                                isCurrent
                                  ? 'border-primary/40 bg-primary/15 text-primary'
                                  : isComplete
                                    ? 'border-success/40 bg-success/15 text-success'
                                    : 'border-border/80 bg-background/80 text-muted-foreground',
                              )}
                            >
                              <span
                                className={cn(
                                  'size-1.5 rounded-full',
                                  isCurrent
                                    ? 'bg-primary animate-pulse'
                                    : isComplete
                                      ? 'bg-success'
                                      : 'bg-muted-foreground',
                                )}
                              />
                              Current tab
                            </span>
                          )}
                          <span
                            className={cn(
                              isComplete && 'text-success',
                              isCurrent && 'text-primary font-semibold',
                              isUpcoming && 'text-muted-foreground',
                            )}
                          >
                            {statusLabel}
                            {isCurrent && canSelect && !isCurrentTab && (
                              <ArrowRight className="inline-block size-3 ml-1 transition-transform group-hover:translate-x-0.5" />
                            )}
                          </span>
                        </span>
                      </button>
                    </StepButtonWithTooltip>
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
