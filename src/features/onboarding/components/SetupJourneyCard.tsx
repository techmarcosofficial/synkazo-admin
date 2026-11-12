import { ArrowRight, Check, CircleCheck, Info } from 'lucide-react';

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

/** Compact setup is a flat section closed by a divider; the full layout stays a card. */
function SetupJourneyFrame({
  compact,
  children,
}: {
  compact: boolean;
  children: React.ReactNode;
}) {
  if (compact) {
    return (
      <section className="border-border/70 border-b pb-4">{children}</section>
    );
  }
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="space-y-3 px-3 py-3 sm:px-4">
        {children}
      </CardContent>
    </Card>
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
  /** Show only the first unfinished step (no step numbers); the ring still counts every step. */
  currentStepOnly?: boolean;
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
  currentStepOnly = false,
}: SetupJourneyCardProps) {
  const requiredSteps = steps.filter((step) => !step.optional);
  const completedCount = requiredSteps.filter(
    (step) => step.status === 'complete',
  ).length;

  // Both project setup and job setup use this unified single-line compact layout
  const isCompact = compact !== false;
  const visibleSteps =
    isCompact && currentStepOnly
      ? steps.filter((step) => step.status !== 'complete').slice(0, 1)
      : steps;
  const isMultiStepCompact = isCompact && visibleSteps.length >= 3;

  return (
    <SetupJourneyFrame compact={isCompact}>
      {isCompact ? (
        /* ── Compact 3-zone layout (Project & Job Setup) ───────── */
        <div
          className={cn(
            'flex flex-col gap-3',
            isMultiStepCompact
              ? 'xl:flex-row xl:items-center xl:gap-0'
              : 'sm:flex-row sm:items-center sm:gap-0',
          )}
        >
          {/* Zone 1 — Intro; the description lives in an info tooltip */}
          <div
            className={cn(
              'min-w-0',
              isMultiStepCompact ? 'xl:pr-4' : 'sm:pr-4',
              visibleSteps.length >= 4
                ? 'xl:w-[19%] xl:shrink-0 2xl:w-[17%]'
                : visibleSteps.length === 3
                  ? 'xl:w-[22%] xl:shrink-0 2xl:w-[20%]'
                  : 'sm:w-[26%] sm:shrink-0',
            )}
          >
            <div className={setupEyebrowStyles}>{eyebrow}</div>
            <div className="flex min-w-0 items-center gap-1.5">
              <h2 className={cn('truncate', headingTitleStyles.card)}>
                {title}
              </h2>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`About: ${title}`}
                      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring shrink-0 cursor-help rounded-full outline-none focus-visible:ring-2"
                    >
                      <Info className="size-3.5" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="start"
                    className="max-w-sm text-xs leading-relaxed font-normal whitespace-pre-line"
                  >
                    {description}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="sr-only">{description}</p>
          </div>

          {/* Zone 2 — Steps as one flat row, separated by dividers instead of nested cards */}
          <ol
            aria-label={`${eyebrow} progress`}
            className={cn(
              'border-border/70 flex min-w-0 flex-1 flex-col gap-1 border-t pt-3',
              isMultiStepCompact
                ? 'xl:flex-row xl:gap-0 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-2'
                : 'sm:flex-row sm:gap-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-2',
            )}
          >
            {visibleSteps.map((step, index) => {
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
                  ? 'Up next'
                  : step.optional
                    ? 'Optional'
                    : 'Upcoming';

              return (
                <li
                  key={step.title}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'relative flex min-w-0 flex-1 items-stretch',
                    index > 0 &&
                      (isMultiStepCompact
                        ? 'xl:before:bg-border/70 xl:before:my-2 xl:before:mr-2 xl:before:w-px xl:before:shrink-0 xl:before:content-[""]'
                        : 'sm:before:bg-border/70 sm:before:my-2 sm:before:mr-2 sm:before:w-px sm:before:shrink-0 sm:before:content-[""]'),
                  )}
                >
                  <StepButtonWithTooltip hint={step.hoverHint}>
                    <button
                      type="button"
                      disabled={!canSelect}
                      onClick={step.onSelect}
                      data-step-hint={step.hoverHint}
                      data-step-status={step.status}
                      data-step-current-tab={isCurrentTab ? 'true' : undefined}
                      data-project-configure-step={
                        step.guidesFlowAction ? 'true' : undefined
                      }
                      data-step-guides-action={
                        step.guidesFlowAction ? 'true' : undefined
                      }
                      className={cn(
                        'group relative flex w-full min-w-0 flex-1 flex-col justify-center rounded-xl px-3 py-2 text-left transition-colors',
                        // The step for the open tab is underlined exactly like the active tab in the tab bar.
                        isCurrentTab &&
                          'after:bg-primary after:absolute after:inset-x-3 after:bottom-0 after:h-1 after:content-[""]',
                        canSelect && 'hover:bg-muted/60',
                        canSelect && 'cursor-pointer',
                      )}
                    >
                      {/* Header row: circle · title · status */}
                      <span className="flex items-center gap-2">
                        {!currentStepOnly && (
                          <span
                            className={cn(
                              // Step numbers look the same in every state; status shows on the right.
                              'border-border text-foreground flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                            )}
                          >
                            {index + 1}
                          </span>
                        )}
                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate',
                            headingTitleStyles.item,
                            isCurrentTab
                              ? 'text-foreground font-bold'
                              : currentStepOnly
                                ? 'text-foreground font-semibold'
                                : 'text-muted-foreground font-medium',
                          )}
                        >
                          {step.title}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap">
                          {isCurrentTab && (
                            <span className="sr-only">Current tab</span>
                          )}
                          {isComplete && (
                            <CircleCheck
                              className="text-success size-4"
                              aria-hidden="true"
                            />
                          )}
                          <span
                            className={cn(
                              (isComplete ||
                                (isMultiStepCompact && !isCurrent)) &&
                                (isComplete
                                  ? 'sr-only'
                                  : 'xl:sr-only 2xl:not-sr-only'),
                              isCurrent &&
                                'text-primary font-semibold',
                              isUpcoming && 'text-muted-foreground',
                            )}
                          >
                            {statusLabel}
                            {isCurrent && canSelect && !isCurrentTab && (
                              <ArrowRight className="ml-1 inline-block size-3 transition-transform group-hover:translate-x-0.5" />
                            )}
                          </span>
                        </span>
                      </span>

                      {/* Description — indented to align with title */}
                      <span
                        className={cn(
                          'text-muted-foreground line-clamp-1',
                          !currentStepOnly && 'pl-7',
                          headingSubtitleStyles.item,
                          !isCurrent && 'opacity-80',
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
          <div
            className={cn(
              'flex shrink-0 items-center justify-end gap-2',
              isMultiStepCompact ? 'xl:pl-3' : 'sm:pl-3',
            )}
          >
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
            <span className="text-muted-foreground text-xs font-medium whitespace-nowrap tabular-nums">
              {completedCount} of {requiredSteps.length} done
            </span>
            {completedCount === requiredSteps.length &&
              onContinue &&
              actionLabel && (
                <Button
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={onContinue}
                >
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
                {completedCount === requiredSteps.length &&
                  onContinue &&
                  actionLabel && (
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
                    ? 'Up next'
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
                              ? 'border-success/60 bg-success/10 ring-success/30 hover:bg-success/15 border-solid ring-1'
                              : 'border-success/30 bg-success/5 hover:bg-success/10 border-solid'),
                          isCurrent &&
                            (isCurrentTab
                              ? 'border-primary bg-primary/10 ring-primary/25 hover:border-primary hover:bg-primary/15 border-solid shadow-xs ring-2'
                              : 'border-primary/60 bg-primary/[0.04] ring-primary/10 hover:border-primary hover:bg-primary/10 border-dashed ring-1 hover:border-solid'),
                          isUpcoming &&
                            (isCurrentTab
                              ? 'border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted/50 border-solid'
                              : 'border-border/70 bg-muted/20 text-muted-foreground hover:bg-muted/30 border-dashed'),
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
                                'inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-semibold',
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
                              <ArrowRight className="ml-1 inline-block size-3 transition-transform group-hover:translate-x-0.5" />
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
    </SetupJourneyFrame>
  );
}
