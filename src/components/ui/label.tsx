import * as React from 'react';
import { Label as LabelPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

function Label({
  className,
  children,
  required,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & {
  /** Appends a red asterisk — the standard marker for a required field. */
  required?: boolean;
}) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        // Cancels most of the flex `gap-2` between this and the label text, so the
        // asterisk sits tight against it (~2px) instead of a full 8px flex gap.
        <span className="text-destructive -ml-1.5" aria-hidden="true">
          *
        </span>
      )}
    </LabelPrimitive.Root>
  );
}

export { Label };
