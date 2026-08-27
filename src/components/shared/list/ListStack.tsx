import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Container for expandable/collapsible lists (e.g. Sync History, Association Rules).
 * Each child renders as an independent card with spacing between items.
 */
export default function ListStack({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('space-y-3', className)}>{children}</div>;
}
