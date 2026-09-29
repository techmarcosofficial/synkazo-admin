import { useMemo, useState } from 'react';
import { AlertTriangle, Flag, Loader2, Plus } from 'lucide-react';

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
  useSuperAdminFeatureFlagsQuery,
  useUpsertSuperAdminFeatureFlagMutation,
} from '@/queries/useSuperAdmin';

import type { PlatformFeatureFlag } from '@/types';

// GAP-023 — global feature flags UI. Toggle-first: the primary action
// on each row is enabling/disabling; description + audit metadata are
// secondary. Creating a new flag or editing description happens through
// a dialog so we can capture the mandatory reason.

const KEY_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

interface UpsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: PlatformFeatureFlag | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (payload: {
    key: string;
    enabled: boolean;
    description: string;
    reason: string;
  }) => void;
}

function FeatureFlagDialog({
  open,
  onOpenChange,
  existing,
  isSubmitting,
  errorMessage,
  onSubmit,
}: UpsertDialogProps) {
  const editing = existing !== null;
  const [key, setKey] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');

  // Reset on open so the dialog matches the current row's state.
  useMemo(() => {
    if (open) {
      setKey(existing?.key ?? '');
      setEnabled(existing?.enabled ?? false);
      setDescription(existing?.description ?? '');
      setReason('');
    }
  }, [open, existing]);

  const keyValid = editing ? true : KEY_PATTERN.test(key) && key.length <= 128;
  const reasonValid = reason.trim().length >= 10;
  const canSubmit = keyValid && reasonValid && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Edit flag: ${existing?.key}` : 'New feature flag'}
          </DialogTitle>
          <DialogDescription>
            Feature flags are global on/off toggles independent of plan
            entitlements. Every change is audited with the operator's
            reason.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {editing ? null : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ff-key">Key</Label>
              <Input
                id="ff-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="new_billing_flow"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={key.length > 0 && !keyValid}
              />
              <div className="text-muted-foreground text-xs">
                Lowercase letters, digits, and `.`/`_`/`-` only. ≤ 128 chars.
              </div>
            </div>
          )}

          <div className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div>
              <Label className="font-medium">Enabled</Label>
              <div className="text-muted-foreground text-xs">
                {enabled
                  ? 'This flag will be reported as enabled to backend callers.'
                  : 'This flag will be reported as disabled to backend callers.'}
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              aria-label="Toggle feature flag"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ff-description">
              Description
              <span className="text-muted-foreground ml-1 text-xs">
                (optional)
              </span>
            </Label>
            <Textarea
              id="ff-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="What does this flag gate?"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ff-reason">
              Reason
              <span className="text-muted-foreground ml-1 text-xs">
                (audit — min 10 characters)
              </span>
            </Label>
            <Textarea
              id="ff-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Why is this flag being changed?"
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
                key: (existing?.key ?? key).trim(),
                enabled,
                description,
                reason: reason.trim(),
              });
            }}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Saving…' : editing ? 'Save changes' : 'Create flag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FeatureFlagsCard() {
  const query = useSuperAdminFeatureFlagsQuery();
  const upsertMutation = useUpsertSuperAdminFeatureFlagMutation();
  const [editing, setEditing] = useState<PlatformFeatureFlag | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const flags = query.data ?? [];

  const openNew = () => {
    setEditing(null);
    setDialogError(null);
    setDialogOpen(true);
  };
  const openEdit = (flag: PlatformFeatureFlag) => {
    setEditing(flag);
    setDialogError(null);
    setDialogOpen(true);
  };

  const submit = async (payload: {
    key: string;
    enabled: boolean;
    description: string;
    reason: string;
  }) => {
    setDialogError(null);
    try {
      await upsertMutation.mutateAsync({
        key: payload.key,
        dto: {
          enabled: payload.enabled,
          description: payload.description || undefined,
          reason: payload.reason,
        },
      });
      showToast.success(
        `Flag ${payload.key} ${payload.enabled ? 'enabled' : 'disabled'}.`,
      );
      setDialogOpen(false);
    } catch (err) {
      setDialogError(extractErrorMessage(err));
    }
  };

  return (
    <div className="bg-card rounded-lg border">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Flag className="size-4" aria-hidden />
          <h2 className="text-sm font-semibold">Feature flags</h2>
        </div>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="size-4" aria-hidden />
          New flag
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
            <AlertTitle>Could not load feature flags</AlertTitle>
            <AlertDescription>
              {extractErrorMessage(query.error)}
            </AlertDescription>
          </Alert>
        ) : flags.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            No feature flags yet. Create one to start toggling behaviour
            without a deploy.
          </div>
        ) : (
          <ul className="divide-y">
            {flags.map((flag) => (
              <li
                key={flag.id}
                className="flex items-start justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-primary font-mono text-sm hover:underline"
                      onClick={() => openEdit(flag)}
                    >
                      {flag.key}
                    </button>
                    {flag.enabled ? (
                      <Badge className="bg-emerald-100 text-emerald-900">
                        On
                      </Badge>
                    ) : (
                      <Badge variant="outline">Off</Badge>
                    )}
                  </div>
                  {flag.description ? (
                    <div className="text-muted-foreground mt-1 text-xs">
                      {flag.description}
                    </div>
                  ) : null}
                  {flag.updatedByUserEmail ? (
                    <div className="text-muted-foreground mt-1 text-[10px]">
                      last changed by {flag.updatedByUserEmail}
                    </div>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(flag)}
                  disabled={upsertMutation.isPending}
                >
                  {upsertMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    'Edit'
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <FeatureFlagDialog
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
