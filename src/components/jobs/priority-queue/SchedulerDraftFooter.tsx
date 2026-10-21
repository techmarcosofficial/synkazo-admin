import { Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export default function SchedulerDraftFooter({
  dirty,
  saving,
  valid = true,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  valid?: boolean;
  onSave: () => void;
}) {
  if (!dirty) return null;
  return (
    <div className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t shadow-lg backdrop-blur md:left-(--sidebar-width) md:group-data-[collapsible=icon]:left-(--sidebar-width-icon)">
      <div className="container mx-auto flex max-w-full flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <div>
          <p className="text-sm font-semibold">Unsaved scheduler changes</p>
          <p className="text-muted-foreground text-xs">
            Save to apply the schedule and queue edits.
          </p>
        </div>
        <Button disabled={saving || !valid} onClick={onSave}>
          {saving ? <Spinner /> : <Save />} Save changes
        </Button>
      </div>
    </div>
  );
}
