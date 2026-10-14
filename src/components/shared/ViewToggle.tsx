import { LayoutGrid, List } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ManagementViewMode } from '@/hooks/useViewMode';

interface ViewToggleProps {
  value: ManagementViewMode;
  onChange: (mode: ManagementViewMode) => void;
  prominent?: boolean;
  iconOnly?: boolean;
}

export default function ViewToggle({
  value,
  onChange,
  prominent = false,
  iconOnly = false,
}: ViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue === 'table' || nextValue === 'card') onChange(nextValue);
      }}
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="Display view"
    >
      <ToggleGroupItem
        value="table"
        aria-label="List view"
        className={
          prominent
            ? 'data-[state=on]:bg-foreground data-[state=on]:text-background'
            : undefined
        }
      >
        <List />
        <span className={iconOnly ? 'hidden' : undefined}>List</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="card"
        aria-label="Card view"
        className={
          prominent
            ? 'data-[state=on]:bg-foreground data-[state=on]:text-background'
            : undefined
        }
      >
        <LayoutGrid />
        <span className={iconOnly ? 'hidden' : undefined}>Cards</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
