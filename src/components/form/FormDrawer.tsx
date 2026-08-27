import { XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
  children: React.ReactNode;
  // Function form receives requestClose, the same close handler used by the
  // header X button — wire footer Cancel buttons to it (instead of an onClose
  // prop) so Cancel closes consistently with the rest of the drawer.
  footer?: React.ReactNode | ((requestClose: () => void) => React.ReactNode);
  size?: 'default' | 'wide';
  widthClassName?: string;
  contentClassName?: string;
  // Blocks closing via outside-click/Esc — only X/Cancel can close. Defaults
  // to true since FormDrawer is used for forms.
  preventOutsideClose?: boolean;
  // When true, closing via X/Cancel shows a "Discard changes?" confirmation
  // instead of closing immediately. Reserved for multi-step/large forms.
  isDirty?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<FormDrawerProps['size']>, string> = {
  default:
    'md:data-[side=right]:w-[70vw] md:data-[side=right]:max-w-none lg:data-[side=right]:w-1/2 lg:data-[side=right]:min-w-175 lg:data-[side=right]:max-w-225',
  wide: 'md:data-[side=right]:w-[85vw] md:data-[side=right]:max-w-none lg:data-[side=right]:w-350 lg:data-[side=right]:max-w-350',
};

export default function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'default',
  widthClassName,
  contentClassName,
  preventOutsideClose = true,
  isDirty = false,
}: FormDrawerProps) {
  const { requestClose } = useDialogCloseGuard({
    isDirty,
    onClose: () => onOpenChange(false),
  });

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
        <SheetHeader className="shrink-0 flex-row items-start justify-between gap-4 border-b">
          <div className="flex flex-col gap-1.5">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="bg-secondary"
            onClick={requestClose}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
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
