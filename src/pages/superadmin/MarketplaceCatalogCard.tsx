import { useMemo, useState } from 'react';
import { AlertTriangle, Eye, EyeOff, Plus, Store } from 'lucide-react';

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

function CatalogEntryDialog({
  open,
  onOpenChange,
  existing,
  isSubmitting,
  errorMessage,
  onSubmit,
}: UpsertDialogProps) {
  const editing = existing !== null;
  const [slug, setSlug] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [visible, setVisible] = useState(true);
  const [sortOrder, setSortOrder] = useState('100');
  const [reason, setReason] = useState('');

  useMemo(() => {
    if (open) {
      setSlug(existing?.slug ?? '');
      setDisplayName(existing?.displayName ?? '');
      setShortDescription(existing?.shortDescription ?? '');
      setVisible(existing?.visible ?? true);
      setSortOrder(String(existing?.sortOrder ?? 100));
      setReason('');
    }
  }, [open, existing]);

  const slugValid = editing ? true : SLUG_PATTERN.test(slug) && slug.length <= 64;
  const sortOrderNumber = Number(sortOrder);
  const sortOrderValid =
    Number.isInteger(sortOrderNumber) &&
    sortOrderNumber >= 0 &&
    sortOrderNumber <= 10_000;
  const reasonValid = reason.trim().length >= 10;
  const canSubmit =
    slugValid && sortOrderValid && reasonValid && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? `Edit connector: ${existing?.slug}`
              : 'New catalog overlay'}
          </DialogTitle>
          <DialogDescription>
            Presentation-only overlay for a marketplace connector.
            Implementation is owned in code; this only changes how it
            appears in the customer marketplace.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {editing ? null : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mc-slug">Slug</Label>
              <Input
                id="mc-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="hubspot"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={slug.length > 0 && !slugValid}
              />
              <div className="text-muted-foreground text-xs">
                Must match the connector id in code. Lowercase alphanumeric +
                `-`. ≤ 64 chars.
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mc-name">
              Display name
              <span className="text-muted-foreground ml-1 text-xs">
                (optional — overrides code default)
              </span>
            </Label>
            <Input
              id="mc-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mc-desc">
              Short description
              <span className="text-muted-foreground ml-1 text-xs">
                (optional — one-line marketing tagline)
              </span>
            </Label>
            <Textarea
              id="mc-desc"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div>
                <Label className="font-medium">Visible</Label>
                <div className="text-muted-foreground text-xs">
                  {visible
                    ? 'Rendered on the customer marketplace.'
                    : 'Hidden from the customer marketplace.'}
                </div>
              </div>
              <Switch
                checked={visible}
                onCheckedChange={setVisible}
                aria-label="Toggle visibility"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mc-sort">Sort order</Label>
              <Input
                id="mc-sort"
                type="number"
                min={0}
                max={10_000}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                aria-invalid={sortOrder.length > 0 && !sortOrderValid}
              />
              <div className="text-muted-foreground text-xs">
                Lower = earlier. Default 100.
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mc-reason">
              Reason
              <span className="text-muted-foreground ml-1 text-xs">
                (audit — min 10 characters)
              </span>
            </Label>
            <Textarea
              id="mc-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              aria-invalid={reason.length > 0 && !reasonValid}
            />
            <div className="text-muted-foreground text-xs">
              {reason.trim().length}/10 characters
            </div>
          </div>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!canSubmit) return;
              onSubmit({
                slug: (existing?.slug ?? slug).trim(),
                displayName,
                shortDescription,
                visible,
                sortOrder: sortOrderNumber,
                reason: reason.trim(),
              });
            }}
            disabled={!canSubmit}
          >
            {isSubmitting
              ? 'Saving…'
              : editing
                ? 'Save changes'
                : 'Create overlay'}
          </Button>
        </DialogFooter>
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
