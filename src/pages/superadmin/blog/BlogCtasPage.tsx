import { Loader2, MousePointerClick, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { showToast } from '@/lib/toast';
import {
  useCreateCtaMutation,
  useCtasQuery,
  useDeleteCtaMutation,
  useUpdateCtaMutation,
  useUploadBlogImageMutation,
} from '@/queries/useBlog';
import type { Cta } from '@/types';

type FormState = {
  title: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  imageUrl: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  title: '',
  description: '',
  buttonText: '',
  buttonUrl: '',
  imageUrl: '',
  isActive: true,
};

function CtaDialog({
  cta,
  open,
  onOpenChange,
}: {
  cta: Cta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const createMutation = useCreateCtaMutation();
  const updateMutation = useUpdateCtaMutation();
  const uploadMutation = useUploadBlogImageMutation();
  const isPending =
    createMutation.isPending || updateMutation.isPending || uploadMutation.isPending;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setForm(
        cta
          ? {
              title: cta.title,
              description: cta.description ?? '',
              buttonText: cta.buttonText,
              buttonUrl: cta.buttonUrl,
              imageUrl: cta.imageUrl ?? '',
              isActive: cta.isActive,
            }
          : emptyForm,
      );
    }
    onOpenChange(next);
  };

  const handleUpload = (file: File | undefined) => {
    if (!file) return;
    uploadMutation.mutate(file, {
      onSuccess: ({ url }) => setForm((f) => ({ ...f, imageUrl: url })),
      onError: (err) => showToast.error(getUserFriendlyError(err as never)),
    });
  };

  const isValid = form.title.trim() && form.buttonText.trim() && form.buttonUrl.trim();

  const submit = () => {
    if (!isValid) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      buttonText: form.buttonText.trim(),
      buttonUrl: form.buttonUrl.trim(),
      imageUrl: form.imageUrl || undefined,
      isActive: form.isActive,
    };
    const onSuccess = () => {
      showToast.success(cta ? 'CTA updated' : 'CTA created');
      onOpenChange(false);
    };
    const onError = (err: unknown) =>
      showToast.error(getUserFriendlyError(err as never));

    if (cta) {
      updateMutation.mutate({ id: cta.id, data: payload }, { onSuccess, onError });
    } else {
      createMutation.mutate(payload, { onSuccess, onError });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{cta ? 'Edit CTA' : 'New CTA'}</DialogTitle>
          <DialogDescription>
            Reusable call-to-action block — insert it anywhere inside a post's
            content from the editor.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cta-title">Title</Label>
            <Input
              id="cta-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="See it on your own data"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cta-desc">Description</Label>
            <Textarea
              id="cta-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cta-button-text">Button text</Label>
              <Input
                id="cta-button-text"
                value={form.buttonText}
                onChange={(e) => setForm((f) => ({ ...f, buttonText: e.target.value }))}
                placeholder="Request a demo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta-button-url">Button URL</Label>
              <Input
                id="cta-button-url"
                value={form.buttonUrl}
                onChange={(e) => setForm((f) => ({ ...f, buttonUrl: e.target.value }))}
                placeholder="/support"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Image (optional)</Label>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => handleUpload(e.target.files?.[0])}
              disabled={uploadMutation.isPending}
            />
            {form.imageUrl && (
              <img
                src={form.imageUrl}
                alt=""
                className="mt-2 h-20 w-32 rounded-lg border object-cover"
              />
            )}
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="cta-active">Active</Label>
            <Switch
              id="cta-active"
              checked={form.isActive}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!isValid || isPending} onClick={submit}>
            {isPending && <Loader2 className="animate-spin" />}
            {cta ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BlogCtasPage() {
  const ctasQuery = useCtasQuery();
  const deleteMutation = useDeleteCtaMutation();
  const { confirm } = useConfirmDialog();
  const [dialogCta, setDialogCta] = useState<Cta | null | undefined>(undefined);

  const ctas = ctasQuery.data ?? [];

  const handleDelete = (cta: Cta) => {
    confirm({
      variant: 'danger',
      title: `Delete "${cta.title}"?`,
      description:
        'Blocked if this CTA is still placed inside a post — remove it from the post first, or deactivate it instead.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(cta.id);
          showToast.success('CTA deleted');
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
        title="Blog CTAs"
        description="Reusable call-to-action blocks admins can place anywhere inside a post."
        backTo={{ label: 'Blog', to: '/super-admin/blog' }}
        actions={
          <Button onClick={() => setDialogCta(null)}>
            <Plus /> New CTA
          </Button>
        }
      />

      {ctasQuery.isLoading ? (
        <SkeletonList count={4} />
      ) : ctasQuery.isError ? (
        <ErrorState onRetry={() => ctasQuery.refetch()} />
      ) : ctas.length === 0 ? (
        <EmptyState
          icon={MousePointerClick}
          title="No CTAs yet"
          description="Create a CTA block to place inside blog content."
          action={{ label: 'New CTA', icon: Plus, onClick: () => setDialogCta(null) }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ctas.map((cta) => (
            <Card key={cta.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{cta.title}</span>
                {!cta.isActive && <Badge variant="secondary">Inactive</Badge>}
              </div>
              {cta.description && (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                  {cta.description}
                </p>
              )}
              <p className="text-muted-foreground mt-2 text-xs">
                {cta.buttonText} → {cta.buttonUrl}
              </p>
              <div className="mt-4 flex justify-end gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setDialogCta(cta)}>
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(cta)}
                >
                  <Trash2 />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CtaDialog
        cta={dialogCta ?? null}
        open={dialogCta !== undefined}
        onOpenChange={(open) => !open && setDialogCta(undefined)}
      />
    </div>
  );
}
