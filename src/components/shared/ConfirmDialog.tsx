import {
  AlertTriangle,
  CircleAlert,
  CircleCheck,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  isConfirmWordMatched,
  TypeToConfirmField,
} from '@/components/shared/TypeToConfirmField';
import { Spinner } from '@/components/ui/spinner';
import {
  useConfirmDialogStore,
  type ConfirmDialogVariant,
} from '@/stores/useConfirmDialogStore';

const VARIANT_META: Record<
  ConfirmDialogVariant,
  {
    icon: LucideIcon;
    iconClassName: string;
    mediaClassName: string;
  }
> = {
  danger: {
    icon: CircleAlert,
    iconClassName: 'text-destructive',
    mediaClassName: 'bg-destructive/10 text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    iconClassName: 'text-warning',
    mediaClassName: 'bg-warning/10 text-warning',
  },
  success: {
    icon: CircleCheck,
    iconClassName: 'text-success',
    mediaClassName: 'bg-success/10 text-success',
  },
  info: {
    icon: Info,
    iconClassName: 'text-info',
    mediaClassName: 'bg-info/10 text-info',
  },
};

// Single global confirmation dialog instance — mounted once at the app
// root. Trigger it via the useConfirmDialog() hook, never render another
// AlertDialog for a plain "are you sure" style confirmation.
export default function ConfirmDialog() {
  const {
    open,
    variant,
    title,
    description,
    body,
    confirmLabel,
    cancelLabel,
    requireType,
    isConfirming,
    close,
    handleConfirm,
  } = useConfirmDialogStore();

  const meta = VARIANT_META[variant];
  const Icon = meta.icon;

  // Local state for the "type DELETE to confirm" gate. Reset whenever the
  // dialog opens or the required word changes.
  const [typed, setTyped] = useState('');
  useEffect(() => {
    setTyped('');
  }, [open, requireType]);

  const typeConfirmed = !requireType || isConfirmWordMatched(typed, requireType);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => !next && !isConfirming && close()}
    >
      <AlertDialogContent aria-busy={isConfirming || undefined}>
        <AlertDialogHeader>
          <AlertDialogMedia className={meta.mediaClassName}>
            <Icon className={meta.iconClassName} />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {body && <div className="min-w-0">{body}</div>}

        {requireType && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-dialog-type">
              Type <span className="font-semibold">{requireType}</span> to
              confirm
            </Label>
            <TypeToConfirmField
              id="confirm-dialog-type"
              word={requireType}
              value={typed}
              onChange={setTyped}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            variant="outline"
            size="sm"
            className="w-full"
            disabled={isConfirming}
            onClick={close}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="default"
            size="sm"
            disabled={isConfirming || !typeConfirmed}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
          >
            {isConfirming && <Spinner />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
