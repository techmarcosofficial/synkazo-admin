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
}

interface SetupJourneyCardProps {
  eyebrow: string;
  title: string;
  description: string;
  steps: SetupJourneyStep[];
  actionLabel?: string;
  onContinue?: () => void;
}

export default function SetupJourneyCard({
  eyebrow,
  title,
  description,
  steps,
  actionLabel = 'Continue setup',
  onContinue,
}: SetupJourneyCardProps) {
  const requiredSteps = steps.filter((step) => !step.optional);
  const completedCount = requiredSteps.filter(
    (step) => step.status === 'complete',
  ).length;

  return (
    <Card className="gap-0 overflow-hidden rounded-3xl py-0 shadow-xs">
      <CardContent className="space-y-3 px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <div className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                {eyebrow}
              </div>
              <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
            </div>
            <p className="text-muted-foreground mt-0.5 max-w-3xl text-[11px] leading-4">
              {description}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="text-muted-foreground text-[10px] font-medium whitespace-nowrap">
              {completedCount}/{requiredSteps.length} complete
            </span>
            {onContinue && actionLabel && (
              <Button size="sm" className="h-8" onClick={onContinue}>
                {actionLabel}
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        <div>
          <ol
            aria-label={`${eyebrow} progress`}
            className={cn(
              'grid gap-2 sm:grid-cols-2',
              steps.length > 2 && 'lg:grid-cols-4',
            )}
          >
            {steps.map((step, index) => {
              const isComplete = step.status === 'complete';
              const isCurrent = step.status === 'current';
              const isUpcoming = step.status === 'upcoming';
              const canSelect = Boolean(
                step.onSelect && (isComplete || isCurrent),
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
                      'relative flex h-full min-h-14 w-full items-center gap-2.5 rounded-3xl border px-3 py-2.5 text-left transition-colors',
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
                        'flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
                        isComplete && 'border-success bg-success text-white',
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
                    <span className="min-w-0 flex-1 text-[11px] leading-4">
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
                        'shrink-0 text-[9px] leading-3 font-semibold whitespace-nowrap',
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
      </CardContent>
    </Card>
  );
}
