import { Trash2 } from 'lucide-react';
import type { ComponentType } from 'react';

import { projectsApi } from '@/api/projects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProjectExt } from '@/features/projects/hooks';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { showToast } from '@/lib/toast';

interface DangerActionRowProps {
  label: string;
  description?: string;
  triggerLabel: string;
  triggerIcon?: ComponentType<{ className?: string }>;
  confirmTitle: string;
  confirmDescription: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

function DangerActionRow({
  label,
  description,
  triggerLabel,
  triggerIcon: Icon,
  confirmTitle,
  confirmDescription,
  confirmLabel,
  onConfirm,
}: DangerActionRowProps) {
  const { confirm } = useConfirmDialog();
  return (
    <div className="border-b py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {description && (
            <p className="text-muted-foreground mt-2 text-xs">{description}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            confirm({
              variant: 'danger',
              title: confirmTitle,
              description: confirmDescription,
              confirmLabel,
              onConfirm,
            })
          }
          className="text-destructive hover:bg-destructive/10 shrink-0"
        >
          {Icon && <Icon />}
          {triggerLabel}
        </Button>
      </div>
    </div>
  );
}

export default function DangerZoneCard({
  project,
  onDeleted,
}: {
  project: ProjectExt;
  onDeleted: () => void;
}) {
  const handleDelete = async () => {
    try {
      await projectsApi.deleteProject(project.id);
      showToast.success('Project deleted.');
      onDeleted();
    } catch {
      showToast.error('Something went wrong. Please try again.');
      throw new Error('Failed to delete project');
    }
  };

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-muted-foreground mb-2 text-xs">
          These actions are irreversible. Proceed with caution.
        </p>

        <DangerActionRow
          label="Delete Project"
          description="Permanently deletes this project, all its jobs, connections, and logs."
          triggerLabel="Delete Project"
          triggerIcon={Trash2}
          confirmTitle="Delete this project?"
          confirmDescription="This permanently deletes the project, all its jobs, connections, and logs. This cannot be undone."
          confirmLabel="Yes, delete project"
          onConfirm={handleDelete}
        />
      </CardContent>
    </Card>
  );
}
