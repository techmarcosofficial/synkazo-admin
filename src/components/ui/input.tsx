import * as React from 'react';

import {
  formControlSizes,
  formControlSurface,
  type FormControlSize,
} from '@/components/ui/form-control-styles';
import { cn } from '@/lib/utils';

function Input({
  className,
  type,
  uiSize = 'default',
  ...props
}: React.ComponentProps<'input'> & { uiSize?: FormControlSize }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        formControlSurface,
        formControlSizes[uiSize],
        'file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive dark:aria-invalid:ring-destructive/40 w-full min-w-0 py-1 text-base file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
