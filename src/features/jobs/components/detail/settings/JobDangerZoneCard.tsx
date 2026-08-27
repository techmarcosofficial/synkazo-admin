import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

export default function JobDangerZoneCard({
  onDelete,
}: {
  onDelete: () => Promise<void>;
}) {
  const { confirm } = useConfirmDialog();

  return (
    <Card className="border-destructive/20">
      <CardContent>
        <h3 className="text-destructive font-semibold">Danger Zone</h3>
        <p className="text-muted-foreground mb-3 text-xs">
          These actions are irreversible.
        </p>

        <div className="pt-3">
          <p className="text-sm font-medium">Delete Job</p>
          <p className="text-muted-foreground mb-3 text-xs">
            Permanently deletes this job and all its logs.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() =>
              confirm({
                variant: 'danger',
                title: 'Delete this job?',
                description:
                  'This permanently deletes the job and all its logs. This cannot be undone.',
                confirmLabel: 'Yes, delete',
                onConfirm: onDelete,
              })
            }
          >
            <Trash2 /> Delete Job
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
