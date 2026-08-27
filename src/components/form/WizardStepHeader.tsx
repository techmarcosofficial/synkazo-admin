import { CheckIcon, XIcon } from 'lucide-react';
import { Fragment } from 'react';

import { Button } from '@/components/ui/button';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface WizardStepHeaderProps {
  title: string;
  description?: string;
  /** 1-indexed current step. */
  currentStep: number;
  totalSteps: number;
  /** Short label per step, length === totalSteps. */
  steps: string[];
  /** Renders the dialog's close (X) button grouped with the step row. */
  onClose?: () => void;
  /** When provided, step circles/labels become clickable and jump directly to that step. */
  onStepClick?: (step: number) => void;
  className?: string;
}

// Canonical wizard header for multi-step dialogs — title/description on the
// left, and the step progress (circles + connectors + labels) grouped with
// the close button on the right, so the whole header reads as one cohesive
// unit instead of the close button floating off on its own.
export default function WizardStepHeader({
  title,
  description,
  currentStep,
  totalSteps,
  steps,
  onClose,
  onStepClick,
  className,
}: WizardStepHeaderProps) {
  // Fixed connector width instead of a flex-1 stretch — otherwise a small
  // step count (e.g. 2) stretches the dashed line across the whole header.
  // Scales down as steps are added, clamped to a tight 56-96px range.
  const connectorWidth = Math.min(96, Math.max(56, 480 / totalSteps));

  return (
    <div
      className={cn(
        'flex w-full items-center justify-between gap-4',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        <p className="text-muted-foreground text-xs">
          Step {currentStep} of {totalSteps}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <div className="flex items-start">
          {steps.map((label, i) => {
            const stepNum = i + 1;
            const isComplete = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            const Component = onStepClick ? 'button' : 'div';
            return (
              <Fragment key={label}>
                {i > 0 && (
                  <div
                    style={{ width: connectorWidth }}
                    className={cn(
                      'mt-3.5 h-0.5 shrink-0',
                      stepNum <= currentStep
                        ? 'bg-primary'
                        : 'border-muted-foreground/30 border-t-2 border-dashed',
                    )}
                  />
                )}
                <Component
                  type={onStepClick ? 'button' : undefined}
                  onClick={onStepClick ? () => onStepClick(stepNum) : undefined}
                  className={cn(
                    'flex shrink-0 flex-col items-center gap-1.5',
                    onStepClick && 'cursor-pointer hover:opacity-80',
                  )}
                >
                  <div
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      isComplete && 'bg-primary text-primary-foreground',
                      isCurrent &&
                        'bg-primary text-primary-foreground ring-primary/25 ring-2',
                      !isComplete &&
                        !isCurrent &&
                        'border-muted-foreground/40 text-muted-foreground border-2 border-dashed',
                    )}
                  >
                    {isComplete ? <CheckIcon className="size-3.5" /> : stepNum}
                  </div>
                  <span
                    className={cn(
                      'max-w-20 text-center text-[11px] leading-tight text-balance',
                      isCurrent
                        ? 'text-foreground font-semibold'
                        : 'text-muted-foreground',
                    )}
                  >
                    {label}
                  </span>
                </Component>
              </Fragment>
            );
          })}
        </div>

        {onClose && (
          <>
            <div className="bg-border h-8 w-px shrink-0" />
            <Button
              variant="ghost"
              size="icon-sm"
              className="bg-secondary shrink-0"
              onClick={onClose}
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
