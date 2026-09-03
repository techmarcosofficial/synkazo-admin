import { Loader2, Pencil, Plus, Trash2, UserCircle } from 'lucide-react';
import { useState } from 'react';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  useCreateSignatureMutation,
  useDeleteSignatureMutation,
  useSignaturesQuery,
  useUpdateSignatureMutation,
  useUploadBlogImageMutation,
} from '@/queries/useBlog';
import type { Signature } from '@/types';

type FormState = {
  name: string;
  designation: string;
  bio: string;
  profileImageUrl: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: '',
  designation: '',
  bio: '',
  profileImageUrl: '',
  isActive: true,
};

function SignatureDialog({
  signature,
  open,
  onOpenChange,
}: {
  signature: Signature | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const createMutation = useCreateSignatureMutation();
  const updateMutation = useUpdateSignatureMutation();
  const uploadMutation = useUploadBlogImageMutation();
  const isPending =
    createMutation.isPending || updateMutation.isPending || uploadMutation.isPending;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setForm(
        signature
          ? {
              name: signature.name,
              designation: signature.designation ?? '',
              bio: signature.bio ?? '',
              profileImageUrl: signature.profileImageUrl ?? '',
              isActive: signature.isActive,
            }
          : emptyForm,
      );
    }
    onOpenChange(next);
  };

  const handleUpload = (file: File | undefined) => {
    if (!file) return;
    uploadMutation.mutate(file, {
      onSuccess: ({ url }) => setForm((f) => ({ ...f, profileImageUrl: url })),
      onError: (err) => showToast.error(getUserFriendlyError(err as never)),
    });
  };

  const submit = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      designation: form.designation.trim() || undefined,
      bio: form.bio.trim() || undefined,
      profileImageUrl: form.profileImageUrl || undefined,
      isActive: form.isActive,
    };
    const onSuccess = () => {
      showToast.success(signature ? 'Signature updated' : 'Signature created');
      onOpenChange(false);
    };
    const onError = (err: unknown) =>
      showToast.error(getUserFriendlyError(err as never));

    if (signature) {
      updateMutation.mutate({ id: signature.id, data: payload }, { onSuccess, onError });
    } else {
      createMutation.mutate(payload, { onSuccess, onError });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{signature ? 'Edit signature' : 'New signature'}</DialogTitle>
          <DialogDescription>
            Reusable author byline. Editing this updates every post that references
            it, including already-published ones.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={form.profileImageUrl || undefined} />
              <AvatarFallback>
                <UserCircle className="size-8" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => handleUpload(e.target.files?.[0])}
                disabled={uploadMutation.isPending}
              />
              <p className="text-muted-foreground text-xs">
                {uploadMutation.isPending ? 'Uploading…' : 'JPEG, PNG, WEBP, or GIF'}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sig-name">Name</Label>
            <Input
              id="sig-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Jordan Reyes"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sig-title">Designation</Label>
            <Input
              id="sig-title"
              value={form.designation}
              onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
              placeholder="Head of Integrations"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sig-bio">Bio</Label>
            <Textarea
              id="sig-bio"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sig-active">Active</Label>
            <Switch
              id="sig-active"
              checked={form.isActive}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!form.name.trim() || isPending} onClick={submit}>
            {isPending && <Loader2 className="animate-spin" />}
            {signature ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BlogSignaturesPage() {
  const signaturesQuery = useSignaturesQuery();
  const deleteMutation = useDeleteSignatureMutation();
  const { confirm } = useConfirmDialog();
  const [dialogSignature, setDialogSignature] = useState<Signature | null | undefined>(
    undefined,
  );

  const signatures = signaturesQuery.data ?? [];

  const handleDelete = (signature: Signature) => {
    confirm({
      variant: 'danger',
      title: `Delete "${signature.name}"?`,
      description:
        'Posts referencing this signature will simply show no author byline. This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(signature.id);
          showToast.success('Signature deleted');
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
        title="Blog Signatures"
        description="Reusable author bylines — editing one updates every post that uses it."
        backTo={{ label: 'Blog', to: '/super-admin/blog' }}
        actions={
          <Button onClick={() => setDialogSignature(null)}>
            <Plus /> New Signature
          </Button>
        }
      />

      {signaturesQuery.isLoading ? (
        <SkeletonList count={4} />
      ) : signaturesQuery.isError ? (
        <ErrorState onRetry={() => signaturesQuery.refetch()} />
      ) : signatures.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title="No signatures yet"
          description="Create a signature so posts can credit an author."
          action={{
            label: 'New Signature',
            icon: Plus,
            onClick: () => setDialogSignature(null),
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {signatures.map((signature) => (
            <Card key={signature.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="size-12">
                  <AvatarImage src={signature.profileImageUrl ?? undefined} />
                  <AvatarFallback>
                    <UserCircle className="size-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{signature.name}</span>
                    {!signature.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  {signature.designation && (
                    <p className="text-muted-foreground truncate text-sm">
                      {signature.designation}
                    </p>
                  )}
                </div>
              </div>
              {signature.bio && (
                <p className="text-muted-foreground mt-3 line-clamp-2 text-sm">
                  {signature.bio}
                </p>
              )}
              <div className="mt-4 flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDialogSignature(signature)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(signature)}
                >
                  <Trash2 />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SignatureDialog
        signature={dialogSignature ?? null}
        open={dialogSignature !== undefined}
        onOpenChange={(open) => !open && setDialogSignature(undefined)}
      />
    </div>
  );
}
