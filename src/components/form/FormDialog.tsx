import type { LucideIcon } from 'lucide-react';
import { XIcon } from 'lucide-react';
import { useContext } from 'react';

import WizardStepHeader from './WizardStepHeader';

import { TenantAdminVisualContext } from '@/components/shared/TenantAdminVisualContext';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  /** Domain category badge shown above title (e.g. 'Related Objects', 'Custom Schema') */
  category?: string;
  /** Context or count badge shown next to category (string or custom ReactNode) */
  badge?: React.ReactNode;
  /** Primary icon rendered next to dialog title */
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  /** Tighter spacing without header/footer dividers for brief confirmations. */
  compact?: boolean;
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
  category,
  badge,
  icon: Icon,
  compact = false,
  children,
  footer,
  currentStep,
  totalSteps,
  stepLabels,
  onStepClick,
  preventOutsideClose = true,
  isDirty = false,
}: FormDialogProps) {
  const tenantAdminVisuals = useContext(TenantAdminVisualContext);
  const { requestClose } = useDialogCloseGuard({
    isDirty,
    onClose: () => onOpenChange(false),
  });

  const isWizard =
    typeof currentStep === 'number' && typeof totalSteps === 'number';
  const hasFullStepper = isWizard && !!stepLabels;
  const dialogSpacing = tenantAdminVisuals
    ? compact
      ? {
          header: 'px-4 pt-4 pb-1',
          body: 'px-4 py-2',
          footer: 'px-4 pt-2 pb-4',
        }
      : {
          header: 'bg-background border-b px-4 py-3',
          body: 'px-4 py-4',
          footer: 'bg-muted/20 border-t px-4 py-3',
        }
    : compact
      ? {
          header: 'px-5 pt-5 pb-1',
          body: 'px-5 py-2',
          footer: 'px-5 pt-2 pb-5',
        }
      : {
          header: 'bg-background border-b px-6 py-4',
          body: 'px-6 py-6',
          footer: 'bg-muted/20 border-t px-6 py-3',
        };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size={size}
        padding="none"
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden"
        onEscapeKeyDown={(e) => {
          if (preventOutsideClose) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (preventOutsideClose) e.preventDefault();
        }}
      >
        <DialogHeader
          className={cn(
            'shrink-0 flex-row items-start justify-between gap-4',
            dialogSpacing.header,
          )}
        >
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
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {(category || badge) && (
                  <div className="flex items-center gap-2 mb-0.5">
                    {category && (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground text-[11px] font-medium"
                      >
                        {category}
                      </Badge>
                    )}
                    {badge &&
                      (typeof badge === 'string' ? (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20 text-[11px]"
                        >
                          {badge}
                        </Badge>
                      ) : (
                        badge
                      ))}
                  </div>
                )}
                <DialogTitle
                  className={cn(
                    'text-foreground flex items-center gap-2 text-base font-semibold',
                    (category || badge) && 'mt-0.5',
                  )}
                >
                  {Icon && <Icon className="text-primary size-5 shrink-0" />}
                  <span>{title}</span>
                </DialogTitle>
                {description && (
                  <DialogDescription className="text-muted-foreground text-xs">
                    {description}
                  </DialogDescription>
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
                className={cn(
                  'shrink-0',
                  compact ? 'bg-transparent' : 'bg-secondary',
                )}
                onClick={requestClose}
              >
                <XIcon />
                <span className="sr-only">Close</span>
              </Button>
            </>
          )}
        </DialogHeader>

        <div
          className={cn('min-h-0 flex-1 overflow-y-auto', dialogSpacing.body)}
        >
          {children}
        </div>

        {footer && (
          <DialogFooter className={cn('shrink-0', dialogSpacing.footer)}>
            {typeof footer === 'function' ? footer(requestClose) : footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
