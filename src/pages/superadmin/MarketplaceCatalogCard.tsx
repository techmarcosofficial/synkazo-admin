import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Eye, EyeOff, Plus, Store } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/lib/toast';
import {
  useSuperAdminMarketplaceQuery,
  useUpsertSuperAdminMarketplaceEntryMutation,
} from '@/queries/useSuperAdmin';

import type { MarketplaceCatalogEntry } from '@/types';

// GAP-023 — SA-editable presentation controls for the customer-facing
// marketplace. Only presentation: visibility, sort order, display name,
// short description. Connector implementation stays code-owned; slug
// mirrors the connector id.

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

interface UpsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: MarketplaceCatalogEntry | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (payload: {
    slug: string;
    displayName: string;
    shortDescription: string;
    visible: boolean;
    sortOrder: number;
    reason: string;
  }) => void;
}

export const createMarketplaceCatalogSchema = (isEditing: boolean) =>
  z.object({
    slug: isEditing
      ? z.string()
      : z
          .string()
          .trim()
          .min(1, 'Slug is required')
          .max(64, 'Slug must not exceed 64 characters')
          .regex(
            SLUG_PATTERN,
            'Slug must contain only lowercase letters, digits, and hyphens',
          ),
    displayName: z
      .string()
      .max(255, 'Display name must not exceed 255 characters')
      .optional(),
    shortDescription: z
      .string()
      .max(500, 'Short description must not exceed 500 characters')
      .optional(),
    visible: z.boolean(),
    sortOrder: z
      .number({ message: 'Sort order must be an integer between 0 and 10000' })
      .int('Sort order must be an integer')
      .min(0, 'Sort order must be at least 0')
      .max(10_000, 'Sort order must not exceed 10000'),
    reason: z
      .string()
      .trim()
      .min(10, 'Audit reason must be at least 10 characters'),
  });

export type CatalogEntryFormValues = {
  slug: string;
  displayName?: string;
  shortDescription?: string;
  visible: boolean;
  sortOrder: number;
  reason: string;
};

export function CatalogEntryDialog({
  open,
  onOpenChange,
  existing,
  isSubmitting,
  errorMessage,
  onSubmit,
}: UpsertDialogProps) {
  const editing = existing !== null;
  const schema = useMemo(
    () => createMarketplaceCatalogSchema(editing),
    [editing],
  );

  const form = useForm<CatalogEntryFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      slug: existing?.slug ?? '',
      displayName: existing?.displayName ?? '',
      shortDescription: existing?.shortDescription ?? '',
      visible: existing?.visible ?? true,
      sortOrder: existing?.sortOrder ?? 100,
      reason: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        slug: existing?.slug ?? '',
        displayName: existing?.displayName ?? '',
        shortDescription: existing?.shortDescription ?? '',
        visible: existing?.visible ?? true,
        sortOrder: existing?.sortOrder ?? 100,
        reason: '',
      });
    }
  }, [open, existing, form]);

  useEffect(() => {
    if (errorMessage) {
      if (/slug|connector/i.test(errorMessage) && !editing) {
        form.setError('slug', { type: 'server', message: errorMessage });
      } else if (/reason/i.test(errorMessage)) {
        form.setError('reason', { type: 'server', message: errorMessage });
      }
    }
  }, [errorMessage, editing, form]);

  const handleFormSubmit = form.handleSubmit((values) => {
    onSubmit({
      slug: (existing?.slug ?? values.slug ?? '').trim().toLowerCase(),
      displayName: values.displayName ?? '',
      shortDescription: values.shortDescription ?? '',
      visible: values.visible,
      sortOrder: values.sortOrder,
      reason: values.reason.trim(),
    });
  });

  const reasonValue = form.watch('reason') ?? '';
  const visibleValue = form.watch('visible');

  const isFieldServerError =
    Boolean(errorMessage) &&
    ((!editing && /slug|connector/i.test(errorMessage ?? '')) ||
      /reason/i.test(errorMessage ?? ''));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `Edit connector: ${existing?.slug}`
                : 'New catalog overlay'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update marketplace connector overlay.'
                : 'Configure marketplace connector overlay.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {editing ? null : (
              <Field>
                <FieldLabel htmlFor="mc-slug">
                  Slug <span className="text-destructive ml-0.5">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="mc-slug"
                    placeholder="hubspot"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={isSubmitting}
                    aria-invalid={!!form.formState.errors.slug}
                    {...form.register('slug')}
                  />
                </FieldContent>
                <FieldError>{form.formState.errors.slug?.message}</FieldError>
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="mc-name">
                Display name
                <span className="text-muted-foreground ml-1 text-xs">
                  (optional)
                </span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="mc-name"
                  maxLength={255}
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.displayName}
                  {...form.register('displayName')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.displayName?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="mc-desc">
                Short description
                <span className="text-muted-foreground ml-1 text-xs">
                  (optional)
                </span>
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="mc-desc"
                  rows={2}
                  maxLength={500}
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.shortDescription}
                  {...form.register('shortDescription')}
                />
              </FieldContent>
              <FieldError>
                {form.formState.errors.shortDescription?.message}
              </FieldError>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <Label htmlFor="mc-visible" className="font-medium cursor-pointer">
                  Visible
                </Label>
                <Switch
                  id="mc-visible"
                  checked={visibleValue}
                  onCheckedChange={(val) =>
                    form.setValue('visible', val, { shouldValidate: true })
                  }
                  disabled={isSubmitting}
                  aria-label="Toggle visibility"
                />
              </div>

              <Field>
                <FieldLabel htmlFor="mc-sort">Sort order</FieldLabel>
                <FieldContent>
                  <Input
                    id="mc-sort"
                    type="number"
                    min={0}
                    max={10_000}
                    disabled={isSubmitting}
                    aria-invalid={!!form.formState.errors.sortOrder}
                    {...form.register('sortOrder', { valueAsNumber: true })}
                  />
                </FieldContent>
                <FieldError>{form.formState.errors.sortOrder?.message}</FieldError>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="mc-reason">
                Reason <span className="text-destructive ml-0.5">*</span>
                <span className="text-muted-foreground ml-1 text-xs">
                  (audit — min 10 characters)
                </span>
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="mc-reason"
                  rows={2}
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.reason}
                  {...form.register('reason')}
                />
              </FieldContent>
              <div className="text-muted-foreground text-xs">
                {reasonValue.trim().length}/10 characters
              </div>
              <FieldError>{form.formState.errors.reason?.message}</FieldError>
            </Field>

            {errorMessage && !isFieldServerError ? (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving…'
                : editing
                  ? 'Save changes'
                  : 'Create entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MarketplaceCatalogCard() {
  const query = useSuperAdminMarketplaceQuery();
  const upsertMutation = useUpsertSuperAdminMarketplaceEntryMutation();
  const [editing, setEditing] = useState<MarketplaceCatalogEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const entries = query.data ?? [];

  const openNew = () => {
    setEditing(null);
    setDialogError(null);
    setDialogOpen(true);
  };
  const openEdit = (entry: MarketplaceCatalogEntry) => {
    setEditing(entry);
    setDialogError(null);
    setDialogOpen(true);
  };

  const submit = async (payload: {
    slug: string;
    displayName: string;
    shortDescription: string;
    visible: boolean;
    sortOrder: number;
    reason: string;
  }) => {
    setDialogError(null);
    try {
      await upsertMutation.mutateAsync({
        slug: payload.slug,
        dto: {
          displayName: payload.displayName || undefined,
          shortDescription: payload.shortDescription || undefined,
          visible: payload.visible,
          sortOrder: payload.sortOrder,
          reason: payload.reason,
        },
      });
      showToast.success(`Catalog overlay saved for ${payload.slug}.`);
      setDialogOpen(false);
    } catch (err) {
      setDialogError(extractErrorMessage(err));
    }
  };

  return (
    <div className="bg-card rounded-lg border">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Store className="size-4" aria-hidden />
          <h2 className="text-sm font-semibold">Marketplace catalog</h2>
        </div>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="size-4" aria-hidden />
          New overlay
        </Button>
      </div>

      <div className="p-4">
        {query.isLoading ? (
          <div className="flex items-center justify-center p-6">
            <Spinner className="size-5" />
          </div>
        ) : query.isError ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Could not load marketplace catalog</AlertTitle>
            <AlertDescription>
              {extractErrorMessage(query.error)}
            </AlertDescription>
          </Alert>
        ) : entries.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            No catalog overlays yet. Connectors render with their code
            defaults until an overlay is created.
          </div>
        ) : (
          <ul className="divide-y">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-primary font-mono text-sm hover:underline"
                      onClick={() => openEdit(entry)}
                    >
                      {entry.slug}
                    </button>
                    {entry.visible ? (
                      <Badge className="bg-emerald-100 text-emerald-900">
                        <Eye className="size-3" /> Visible
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <EyeOff className="size-3" /> Hidden
                      </Badge>
                    )}
                    <Badge variant="outline" className="font-mono">
                      sort {entry.sortOrder}
                    </Badge>
                  </div>
                  {entry.displayName ? (
                    <div className="mt-1 text-sm font-medium">
                      {entry.displayName}
                    </div>
                  ) : null}
                  {entry.shortDescription ? (
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      {entry.shortDescription}
                    </div>
                  ) : null}
                  {entry.updatedByUserEmail ? (
                    <div className="text-muted-foreground mt-1 text-[10px]">
                      last changed by {entry.updatedByUserEmail}
                    </div>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(entry)}
                >
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CatalogEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existing={editing}
        isSubmitting={upsertMutation.isPending}
        errorMessage={dialogError}
        onSubmit={submit}
      />
    </div>
  );
}
