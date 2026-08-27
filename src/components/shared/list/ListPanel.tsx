import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Shared container for static/non-expandable lists (e.g. Jobs, Live Activity).
 * Rows go directly inside as <ListRow> — no spacing between them, dividers instead.
 */
export default function ListPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn('gap-0 overflow-hidden py-0', className)}>
      {children}
    </Card>
  );
}
