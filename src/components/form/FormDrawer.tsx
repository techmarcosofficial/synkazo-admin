import { XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { useDialogCloseGuard } from '@/hooks/useDialogCloseGuard';
import { cn } from '@/lib/utils';

interface FormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  headerContent?: React.ReactNode;
  headerBottom?: React.ReactNode;
  children: React.ReactNode;
  // Function form receives requestClose, the same close handler used by the
  // header X button — wire footer Cancel buttons to it (instead of an onClose
  // prop) so Cancel closes consistently with the rest of the drawer.
  footer?: React.ReactNode | ((requestClose: () => void) => React.ReactNode);
  size?: 'compact' | 'default' | 'wide';
  widthClassName?: string;
  contentClassName?: string;
  // Blocks closing via outside-click/Esc — only X/Cancel can close. Defaults
  // to true since FormDrawer is used for forms.
  preventOutsideClose?: boolean;
  // When true, closing via X/Cancel shows a "Discard changes?" confirmation
  // instead of closing immediately. Reserved for multi-step/large forms.
  isDirty?: boolean;
  currentStep?: number;
  totalSteps?: number;
  stepLabels?: string[];
}

const SIZE_CLASSES: Record<NonNullable<FormDrawerProps['size']>, string> = {
  compact:
    'sm:data-[side=right]:w-[420px] sm:data-[side=right]:max-w-[420px] md:data-[side=right]:w-[430px] md:data-[side=right]:max-w-[430px] lg:data-[side=right]:w-[440px] lg:data-[side=right]:max-w-[440px]',
  default:
    'md:data-[side=right]:w-[70vw] md:data-[side=right]:max-w-none lg:data-[side=right]:w-1/2 lg:data-[side=right]:min-w-175 lg:data-[side=right]:max-w-225',
  wide: 'md:data-[side=right]:w-[85vw] md:data-[side=right]:max-w-none lg:data-[side=right]:w-350 lg:data-[side=right]:max-w-350',
};

export default function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  headerContent,
  headerBottom,
  children,
  footer,
  size = 'default',
  widthClassName,
  contentClassName,
  preventOutsideClose = true,
  isDirty = false,
  currentStep,
  totalSteps,
  stepLabels,
}: FormDrawerProps) {
  const { requestClose } = useDialogCloseGuard({
    isDirty,
    onClose: () => onOpenChange(false),
  });
  const isWizard =
    typeof currentStep === 'number' && typeof totalSteps === 'number';
  const currentStepLabel = isWizard ? stepLabels?.[currentStep - 1] : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          'flex w-full flex-col gap-0 p-0 sm:max-w-full',
          'data-[side=right]:w-full',
          SIZE_CLASSES[size],
          widthClassName,
        )}
        onEscapeKeyDown={(e) => {
          if (preventOutsideClose) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (preventOutsideClose) e.preventDefault();
        }}
      >
        <SheetHeader className="shrink-0 flex-col gap-0 border-b p-0">
          <div className="flex flex-row items-start justify-between gap-4 p-4 pb-3">
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              <SheetTitle className={headerContent ? 'sr-only' : undefined}>
                {title}
              </SheetTitle>
              {headerContent ? (
                headerContent
              ) : (
                <>
                  {description && (
                    <SheetDescription>{description}</SheetDescription>
                  )}
                  {isWizard && (
                    <p className="text-muted-foreground text-xs">
                      Step {currentStep} of {totalSteps}
                      {currentStepLabel ? ` · ${currentStepLabel}` : ''}
                    </p>
                  )}
                  {isWizard && (
                    <Progress
                      value={(currentStep! / totalSteps!) * 100}
                      className="mt-1 h-1"
                    />
                  )}
                </>
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
          </div>
          {headerBottom && (
            <div className="px-4">
              {headerBottom}
            </div>
          )}
        </SheetHeader>

        <div
          className={cn('flex-1 overflow-y-auto px-6 py-5', contentClassName)}
        >
          {children}
        </div>

        {footer && (
          <SheetFooter className="bg-muted/40 shrink-0 flex-row items-center justify-end gap-2 border-t p-4">
            {typeof footer === 'function' ? footer(requestClose) : footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
