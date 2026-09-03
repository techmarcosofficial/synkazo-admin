import { Loader2, Pencil, Plus, Tag as TagIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';

import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import EmptyState from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { showToast } from '@/lib/toast';
import { getUserFriendlyError } from '@/lib/errorMessages';
import {
  useCreateTagMutation,
  useDeleteTagMutation,
  useTagsQuery,
  useUpdateTagMutation,
} from '@/queries/useBlog';
import type { Tag } from '@/types';

function TagDialog({
  tag,
  open,
  onOpenChange,
}: {
  tag: Tag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(tag?.name ?? '');
  const createMutation = useCreateTagMutation();
  const updateMutation = useUpdateTagMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleOpenChange = (next: boolean) => {
    if (next) setName(tag?.name ?? '');
    onOpenChange(next);
  };

  const submit = () => {
    if (!name.trim()) return;
    const onSuccess = () => {
      showToast.success(tag ? 'Tag updated' : 'Tag created');
      onOpenChange(false);
    };
    const onError = (err: unknown) =>
      showToast.error(getUserFriendlyError(err as never));

    if (tag) {
      updateMutation.mutate({ id: tag.id, name: name.trim() }, { onSuccess, onError });
    } else {
      createMutation.mutate(name.trim(), { onSuccess, onError });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tag ? 'Edit tag' : 'New tag'}</DialogTitle>
          <DialogDescription>
            Tags are shared across blog posts — a slug is generated from the name
            automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="tag-name">Name</Label>
          <Input
            id="tag-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Integrations"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || isPending} onClick={submit}>
            {isPending && <Loader2 className="animate-spin" />}
            {tag ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BlogTagsPage() {
  const tagsQuery = useTagsQuery();
  const deleteMutation = useDeleteTagMutation();
  const { confirm } = useConfirmDialog();
  const [dialogTag, setDialogTag] = useState<Tag | null | undefined>(undefined);

  const tags = tagsQuery.data ?? [];

  const handleDelete = (tag: Tag) => {
    confirm({
      variant: 'danger',
      title: `Delete "${tag.name}"?`,
      description: 'This removes the tag from every post it is assigned to. This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(tag.id);
          showToast.success('Tag deleted');
        } catch (err) {
          showToast.error(getUserFriendlyError(err as never));
          throw err;
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog Tags"
        description="Manage the tag catalogue used across blog posts."
        backTo={{ label: 'Blog', to: '/super-admin/blog' }}
        actions={
          <Button onClick={() => setDialogTag(null)}>
            <Plus /> New Tag
          </Button>
        }
      />

      {tagsQuery.isLoading ? (
        <SkeletonList count={5} />
      ) : tagsQuery.isError ? (
        <ErrorState onRetry={() => tagsQuery.refetch()} />
      ) : tags.length === 0 ? (
        <EmptyState
          icon={TagIcon}
          title="No tags yet"
          description="Create your first tag to start organizing blog posts."
          action={{ label: 'New Tag', icon: Plus, onClick: () => setDialogTag(null) }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell className="font-medium">{tag.name}</TableCell>
                <TableCell className="text-muted-foreground">{tag.slug}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => setDialogTag(tag)}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(tag)}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <TagDialog
        tag={dialogTag ?? null}
        open={dialogTag !== undefined}
        onOpenChange={(open) => !open && setDialogTag(undefined)}
      />
    </div>
  );
}
