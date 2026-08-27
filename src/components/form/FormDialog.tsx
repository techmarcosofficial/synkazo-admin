import { XIcon } from 'lucide-react';

import WizardStepHeader from './WizardStepHeader';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useDialogCloseGuard } from '@/hooks/useDialogCloseGuard';

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  children: React.ReactNode;
  // Function form receives requestClose, the same close handler used by the
  // header X button — wire footer Cancel buttons to it (instead of an onClose
  // prop) so Cancel closes consistently with the rest of the dialog.
  footer?: React.ReactNode | ((requestClose: () => void) => React.ReactNode);
  // Wizard mode: pass the current step (1-indexed) and total step count to render
  // a progress indicator in the header instead of a plain description.
  currentStep?: number;
  totalSteps?: number;
  // Short label per step (length === totalSteps). When passed alongside
  // currentStep/totalSteps, renders the full WizardStepHeader (step badge +
  // "Step X of Y" + step row) instead of the plain progress bar.
  stepLabels?: string[];
  // When provided (wizard mode only), step circles/labels become clickable and jump
  // directly to that step instead of being purely decorative.
  onStepClick?: (step: number) => void;
  // Blocks closing via outside-click/Esc — only X/Cancel can close. Defaults
  // to true since FormDialog is used for forms; pass false for non-form
  // content (e.g. an informational multi-step tour).
  preventOutsideClose?: boolean;
  // When true, closing via X/Cancel shows a "Discard changes?" confirmation
  // instead of closing immediately. Reserved for multi-step wizards / large
  // forms — omit for simple forms.
  isDirty?: boolean;
}

export default function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
  footer,
  currentStep,
  totalSteps,
  stepLabels,
  onStepClick,
  preventOutsideClose = true,
  isDirty = false,
}: FormDialogProps) {
  const { requestClose } = useDialogCloseGuard({
    isDirty,
    onClose: () => onOpenChange(false),
  });

  const isWizard =
    typeof currentStep === 'number' && typeof totalSteps === 'number';
  const hasFullStepper = isWizard && !!stepLabels;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size={size}
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0"
        onEscapeKeyDown={(e) => {
          if (preventOutsideClose) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (preventOutsideClose) e.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0 flex-row items-center justify-between gap-4 border-b px-6 py-4">
          {hasFullStepper ? (
            <WizardStepHeader
              title={title}
              description={description}
              currentStep={currentStep!}
              totalSteps={totalSteps!}
              steps={stepLabels!}
              onClose={requestClose}
              onStepClick={onStepClick}
              className="w-full"
            />
          ) : (
            <>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <DialogTitle>{title}</DialogTitle>
                {description && (
                  <DialogDescription>{description}</DialogDescription>
                )}
                {isWizard && (
                  <Progress
                    value={(currentStep! / totalSteps!) * 100}
                    className="mt-2 h-1"
                  />
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="bg-secondary shrink-0"
                onClick={requestClose}
              >
                <XIcon />
                <span className="sr-only">Close</span>
              </Button>
            </>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>

        {footer && (
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            {typeof footer === 'function' ? footer(requestClose) : footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
