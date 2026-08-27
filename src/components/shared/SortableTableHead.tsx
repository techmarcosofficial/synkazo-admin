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
    <TableHead className={className}>
      <button
        type="button"
        onClick={onClick}
        className={cn('flex items-center gap-1 font-semibold')}
      >
        {children}
        {active ? (
          direction === 'asc' ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}
