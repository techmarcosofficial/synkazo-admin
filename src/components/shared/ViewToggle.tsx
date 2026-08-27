import { LayoutGrid, Table as TableIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ManagementViewMode } from '@/hooks/useViewMode';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  value: ManagementViewMode;
  onChange: (mode: ManagementViewMode) => void;
}

export default function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="bg-muted flex rounded-3xl p-1">
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        aria-label="Table view"
        aria-pressed={value === 'table'}
        onClick={() => onChange('table')}
        className={cn(
          'h-7 rounded-2xl p-0',
          value === 'table' ? 'bg-primary text-white' : 'bg-muted',
        )}
      >
        <TableIcon />
      </Button>
      <Button
        type="button"
        variant={'secondary'}
        size="icon-sm"
        aria-label="Card view"
        aria-pressed={value === 'card'}
        onClick={() => onChange('card')}
        className={cn(
          'h-7 rounded-2xl p-0',
          value === 'card' ? 'bg-primary text-white' : 'bg-muted',
        )}
      >
        <LayoutGrid />
      </Button>
    </div>
  );
}
