import { Trash2 } from 'lucide-react';

import { ActionTooltip } from '@/features/journey';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useSynkazoAuth } from '@/lib/synkazoAuth';

export default function JobDangerZoneCard({
  onDelete,
}: {
  onDelete: () => Promise<void>;
}) {
  const { confirm } = useConfirmDialog();
  const { hasRole } = useSynkazoAuth();
  const canManage = hasRole('org_admin');

  return (
    <section
      aria-labelledby="job-danger-zone-title"
      className="border-destructive/20 bg-destructive/[0.02] rounded-3xl border p-4"
    >
      <h3 id="job-danger-zone-title" className="text-destructive font-semibold">
        Danger Zone
      </h3>
      <p className="text-muted-foreground mb-3 text-xs">
        These actions are irreversible.
      </p>

      <div className="pt-3">
        <p className="text-sm font-medium">Delete Job</p>
        <p className="text-muted-foreground mb-3 text-xs">
          Permanently deletes this job and all its logs.
        </p>
        <ActionTooltip
          tooltip={
            !canManage
              ? 'Organization Admin role required to delete a sync job.'
              : undefined
          }
        >
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            disabled={!canManage}
            onClick={() =>
              canManage &&
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
        </ActionTooltip>
      </div>
    </section>
  );
}
