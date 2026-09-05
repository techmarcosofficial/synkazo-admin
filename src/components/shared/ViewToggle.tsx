import { LayoutGrid, List } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ManagementViewMode } from '@/hooks/useViewMode';

interface ViewToggleProps {
  value: ManagementViewMode;
  onChange: (mode: ManagementViewMode) => void;
}

export default function ViewToggle({ value, onChange }: ViewToggleProps) {
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
      <ToggleGroupItem value="table" aria-label="List view">
        <List />
        <span>List</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="card" aria-label="Card view">
        <LayoutGrid />
        <span>Cards</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
