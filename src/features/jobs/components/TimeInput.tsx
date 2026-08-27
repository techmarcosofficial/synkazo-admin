import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Shared by the Job Detail Schedule tab and the Create Job wizard's Schedule
// step — both edit the same daily_time/day_specific time-of-day list.
export default function TimeInput({
  value,
  onChange,
  onRemove,
  canRemove,
}: {
  value: string;
  onChange: (v: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-32 font-mono"
      />
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
}
