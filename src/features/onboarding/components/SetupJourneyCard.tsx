import { ArrowRight } from 'lucide-react';

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
      <CardContent className="px-4 py-4 sm:px-5">
        <div className="grid items-center gap-4 lg:grid-cols-[minmax(12rem,0.85fr)_minmax(0,1.65fr)_auto] lg:gap-5">
          <div className="min-w-0">
            <div className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              {eyebrow}
            </div>
            <h2 className="mt-1 text-base font-semibold tracking-tight">
              {title}
            </h2>
            <p className="text-muted-foreground mt-1 text-xs leading-4.5">
              {description}
            </p>
          </div>

          <ol
            aria-label={`${eyebrow} progress`}
            className={cn(
              'grid gap-3 sm:grid-cols-2 sm:gap-0',
              steps.length > 2 && 'lg:grid-cols-4',
            )}
          >
            {steps.map((step, index) => {
              const isComplete = step.status === 'complete';
              const isCurrent = step.status === 'current';
              const canSelect = Boolean(step.onSelect && isComplete);

              return (
                <li
                  key={step.title}
                  aria-current={isCurrent ? 'step' : undefined}
                  className="relative min-w-0"
                >
                  {index < steps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute top-4 left-8 hidden h-px w-[calc(100%-2rem)]',
                        steps.length > 2 ? 'lg:block' : 'sm:block',
                        isComplete
                          ? 'bg-primary'
                          : 'border-muted-foreground/35 border-t border-dashed',
                      )}
                    />
                  )}

                  <button
                    type="button"
                    disabled={!canSelect}
                    onClick={step.onSelect}
                    className={cn(
                      'relative z-10 flex w-full flex-col items-start gap-1.5 pr-3 text-left transition-opacity',
                      step.status === 'upcoming' && 'text-muted-foreground',
                      canSelect && 'cursor-pointer hover:opacity-80',
                    )}
                  >
                    <span
                      className={cn(
                        'bg-card flex size-8 shrink-0 items-center justify-center rounded-full border p-0.5',
                        isComplete && 'border-primary text-primary-foreground',
                        isCurrent && 'border-primary text-primary-foreground',
                        step.status === 'upcoming' &&
                          'border-border text-muted-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-6 items-center justify-center rounded-full text-[11px] font-semibold',
                          isComplete && 'bg-primary',
                          isCurrent && 'bg-primary/10 text-primary',
                          step.status === 'upcoming' && 'bg-muted',
                        )}
                      >
                        {index + 1}
                      </span>
                    </span>
                    <span className="min-w-0">
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
                      <span className="text-muted-foreground mt-0.5 block text-[11px] leading-4">
                        {step.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="flex shrink-0 flex-col items-start justify-between gap-4 self-stretch lg:min-w-32 lg:items-end">
            <span className="text-muted-foreground text-[11px] font-medium whitespace-nowrap">
              {completedCount} of {requiredSteps.length} complete
            </span>
            {onContinue && (
              <Button size="sm" onClick={onContinue}>
                {actionLabel}
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
