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

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface PageContextAlertProps {
  variant: AlertVariant;
  title: string;
  description?: ReactNode;
  /** null renders no icon; omit to use the variant default. */
  icon?: ComponentType<{ className?: string }> | null;
  actions?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  info: '[&>svg]:text-info',
  success: '[&>svg]:text-success',
  warning: '[&>svg]:text-warning',
  error: '[&>svg]:text-destructive',
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
  dismissible = false,
  onDismiss,
  className,
}: PageContextAlertProps) {
  const Icon = icon === null ? null : (icon ?? VARIANT_ICON[variant]);
  const role = VARIANT_ROLE[variant];

  return (
    <Alert
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      className={cn(
        'rounded-2xl border-none',
        dismissible && 'pr-12',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {/* Dismiss button */}
      {dismissible && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
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
        <AlertTitle className="text-sm leading-5 font-medium">
          {title}
        </AlertTitle>

        {description && (
          <AlertDescription className="mt-1 text-xs leading-5">
            {description}
          </AlertDescription>
        )}

        {/* Optional actions */}
        {actions && (
          <AlertAction
            className={cn(
              // Override the default absolute positioning from shadcn
              'static mt-3 flex items-center gap-2 p-0',
            )}
          >
            {actions}
          </AlertAction>
        )}
      </div>
    </Alert>
  );
}
