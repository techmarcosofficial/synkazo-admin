import { toast } from 'sonner';

import type { TrashItem } from '@/api/trashTypes';
import { TrashTable } from '@/components/trash/TrashTable';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import {
  useRestoreTrashItemMutation,
  useTrashQuery,
} from '@/queries/useTrash';

// Org-scoped recycle bin: projects & jobs deleted within this organisation.
// Restore only — permanent deletion is reserved for the platform operator.
export default function TrashPage() {
  const query = useTrashQuery();
  const restore = useRestoreTrashItemMutation();
  const { confirm } = useConfirmDialog();

  const items = query.data?.data ?? [];

  const handleRestore = (item: TrashItem) => {
    confirm({
      variant: 'warning',
      title: `Restore ${item.name}?`,
      description:
        item.type === 'project'
          ? 'The project and the jobs deleted with it will be restored. Jobs come back paused.'
          : 'This job will be restored. It comes back paused.',
      confirmLabel: 'Restore',
      onConfirm: async () => {
        await restore.mutateAsync({ type: item.type, id: item.id });
        toast.success(`${item.name} restored`);
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Trash</h1>
        <p className="text-sm text-muted-foreground">
          Projects and jobs you’ve deleted. Restore anything you still need —
          items left here are permanently removed 90 days after deletion.
        </p>
      </header>

      <TrashTable
        items={items}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        onRestore={handleRestore}
        busyId={restore.isPending ? restore.variables?.id : null}
      />
    </div>
  );
}
