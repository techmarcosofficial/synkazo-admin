import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type ConnectionsViewMode = 'board' | 'list';

interface ViewToggleProps {
  view: ConnectionsViewMode;
  onChange: (view: ConnectionsViewMode) => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-2 px-1">
      {/* <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">View</span> */}
      <ToggleGroup
        type="single"
        value={view}
        onValueChange={(v) => v && onChange(v as ConnectionsViewMode)}
        variant="outline"
      >
        <ToggleGroupItem value="board">Board</ToggleGroupItem>
        <ToggleGroupItem value="list">List</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
