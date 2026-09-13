import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAlertDismissStore } from '@/stores/useAlertDismissStore';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface PageContextAlertProps {
  variant: AlertVariant;
  title: string;
  description?: ReactNode;
  /** null renders no icon; omit to use the variant default. */
  icon?: ComponentType<{ className?: string }> | null;
  actions?: ReactNode;
  dismissible?: boolean;
  dismissKey?: string;
  onDismiss?: () => void;
  className?: string;
  surface?: 'outer' | 'inner';
}

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  info: 'bg-info/10 [&>svg]:text-info',
  success: 'bg-success/10 [&>svg]:text-success',
  warning: 'bg-warning/10 [&>svg]:text-warning',
  error: 'bg-destructive/10 [&>svg]:text-destructive',
};

const VARIANT_ICON: Record<
  AlertVariant,
  ComponentType<{ className?: string }>
> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

// Assertive variants interrupt, informational variants are announced politely.
const VARIANT_ROLE: Record<AlertVariant, 'alert' | 'status'> = {
  info: 'status',
  success: 'status',
  warning: 'alert',
  error: 'alert',
};

export default function PageContextAlert({
  variant,
  title,
  description,
  icon,
  actions,
  dismissible = variant !== 'error',
  dismissKey,
  onDismiss,
  className,
  surface = 'outer',
}: PageContextAlertProps) {
  const Icon = icon === null ? null : (icon ?? VARIANT_ICON[variant]);
  const role = VARIANT_ROLE[variant];
  // Errors always represent unusable page state and cannot be dismissed.
  // Other variants still require an explicit, condition-aware opt-in from
  // their selector/caller; actionable warnings must not opt in.
  const resolvedDismissKey =
    dismissKey ?? `page-context-alert:${variant}:${title}`;
  const dismissed = useAlertDismissStore(
    (state) => state.dismissed[resolvedDismissKey],
  );
  const dismiss = useAlertDismissStore((state) => state.dismiss);
  const canDismiss = dismissible && variant !== 'error';

  if (canDismiss && dismissed) return null;

  return (
    <Alert
      surface={surface}
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      className={cn(
        'rounded-3xl border-0 px-3 py-2.5',
        canDismiss && 'pr-12',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {/* Dismiss button */}
      {canDismiss && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            dismiss(resolvedDismissKey);
            onDismiss?.();
          }}
          aria-label="Dismiss alert"
          className="text-muted-foreground hover:text-foreground absolute top-2 right-2 h-7 w-7"
        >
          <X className="size-4" />
        </Button>
      )}

      {/* Icon */}
      {Icon && <Icon className="size-4" />}

      {/* Content */}
      <div className="min-w-0">
        <AlertTitle className="text-xs leading-4 font-semibold">
          {title}
        </AlertTitle>

        {description && (
          <AlertDescription className="mt-0.5 text-xs leading-4">
            {description}
          </AlertDescription>
        )}

        {/* Optional actions */}
        {actions && (
          <AlertAction
            className={cn(
              // Override the default absolute positioning from shadcn
              'static mt-2 flex items-center gap-2 p-0',
            )}
          >
            {actions}
          </AlertAction>
        )}
      </div>
    </Alert>
  );
}
