import { useState } from 'react';
import { toast } from 'sonner';

import HeadingPair from '@/components/shared/HeadingPair';
import type { TrashEntityType, TrashItem } from '@/api/trashTypes';
import { PermanentDeleteTrashDialog } from '@/components/trash/PermanentDeleteTrashDialog';
import { TrashTable } from '@/components/trash/TrashTable';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import {
  usePermanentDeleteTrashMutation,
  useRestoreTrashMutation,
  useSuperAdminTrashQuery,
} from '@/queries/useSuperAdminTrash';

type TypeFilter = 'all' | TrashEntityType;

export default function TrashPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TrashItem | null>(null);

  const query = useSuperAdminTrashQuery({
    type: typeFilter === 'all' ? undefined : typeFilter,
    search: search || undefined,
  });
  const restore = useRestoreTrashMutation();
  const permanentDelete = usePermanentDeleteTrashMutation();
  const { confirm } = useConfirmDialog();

  const items = query.data?.data ?? [];

  const handleRestore = (item: TrashItem) => {
    confirm({
      variant: 'warning',
      title: `Restore ${item.name}?`,
      description:
        item.type === 'organisation'
          ? 'The organisation and everything deleted with it will be restored. Jobs come back paused.'
          : 'This item and everything deleted with it will be restored.',
      confirmLabel: 'Restore',
      onConfirm: async () => {
        await restore.mutateAsync({ type: item.type, id: item.id });
        toast.success(`${item.name} restored`);
      },
    });
  };

  const handlePermanentDelete = async (reason: string) => {
    if (!deleteTarget) return;
    await permanentDelete.mutateAsync({
      type: deleteTarget.type,
      id: deleteTarget.id,
      reason: reason || undefined,
    });
    toast.success(`${deleteTarget.name} permanently deleted`);
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <HeadingPair
        level="h1"
        visualLevel="page"
        title="Trash"
        subtitle="Deleted organisations, projects, and jobs across every tenant. Restore them, or permanently delete them. Nothing is removed automatically — items stay here until you delete them."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as TypeFilter)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="organisation">Organisations</SelectItem>
            <SelectItem value="project">Projects</SelectItem>
            <SelectItem value="job">Jobs</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="max-w-xs"
        />
      </div>

      <TrashTable
        items={items}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        onRestore={handleRestore}
        onPermanentDelete={setDeleteTarget}
        busyId={
          restore.isPending
            ? restore.variables?.id
            : permanentDelete.isPending
              ? permanentDelete.variables?.id
              : null
        }
      />

      <PermanentDeleteTrashDialog
        item={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handlePermanentDelete}
        isDeleting={permanentDelete.isPending}
      />
    </div>
  );
}
