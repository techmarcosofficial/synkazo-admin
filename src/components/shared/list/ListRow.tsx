import { Slot } from 'radix-ui';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * A single compact row inside a <ListPanel>. Separated from siblings by a
 * bottom border (none on the last row) instead of card spacing.
 * Pass `asChild` to render the row itself as a Link when the whole row is clickable.
 */
const ListRow = forwardRef<
  ElementRef<'div'>,
  ComponentPropsWithoutRef<'div'> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot.Root : 'div';
  return (
    <Comp
      ref={ref}
      className={cn(
        'hover:bg-muted/50 flex items-center gap-3 border-b px-5 py-3 transition-colors last:border-b-0',
        className,
      )}
      {...props}
    />
  );
});
ListRow.displayName = 'ListRow';

export default ListRow;
