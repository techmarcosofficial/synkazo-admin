import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';

import { TableHead } from '@/components/ui/table';
import type { SortDirection } from '@/hooks/useSort';
import { cn } from '@/lib/utils';

interface SortableTableHeadProps {
  children: ReactNode;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  className?: string;
}

export default function SortableTableHead({
  children,
  active,
  direction,
  onClick,
  className,
}: SortableTableHeadProps) {
  return (
    <TableHead
      className={className}
      aria-sort={
        active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
      }
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'hover:text-foreground focus-visible:ring-ring flex cursor-pointer items-center gap-1 rounded-sm text-left font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none',
        )}
      >
        {children}
        {active ? (
          direction === 'asc' ? (
            <ArrowUp className="size-3.5" aria-hidden />
          ) : (
            <ArrowDown className="size-3.5" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />
        )}
      </button>
    </TableHead>
  );
}
