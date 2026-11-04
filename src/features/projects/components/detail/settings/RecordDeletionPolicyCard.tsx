import { AlertCircle, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  useProjectGeneralSettings,
  type ProjectExt,
} from '@/features/projects/hooks';
import { ActionTooltip } from '@/features/journey';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

export const RECORD_DELETION_CONFIRM_TEXT = 'I UNDERSTAND';

function EnableDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (confirmText: string) => Promise<void>;
}) {
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = confirmation === RECORD_DELETION_CONFIRM_TEXT;

  const close = () => {
    setConfirmation('');
    setError(null);
    onOpenChange(false);
  };

  const confirm = async () => {
    if (!confirmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(confirmation);
      close();
    } catch {
      setError('The setting could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        if (!next) close();
        else onOpenChange(next);
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-3">
            <span className="bg-destructive/10 flex size-10 items-center justify-center rounded-xl">
              <Trash2 className="size-5" />
            </span>
            Allow record deletion and deactivation?
          </DialogTitle>
        </DialogHeader>

        <Alert variant="destructive">
          <ShieldAlert />
          <AlertTitle>Records can be removed on the other platform</AlertTitle>
          <AlertDescription>
            Two-way jobs set to archive or delete will then delete, archive or
            deactivate the matching record on the other platform when a record
            is deleted. Values that deactivate a record (such as marking a
            ServiceTitan customer inactive) will also be written. Each job still
            has to opt in separately.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="record-deletion-confirmation">
            Type{' '}
            <span className="font-mono font-semibold">
              {RECORD_DELETION_CONFIRM_TEXT}
            </span>{' '}
            to confirm
          </Label>
          <Input
            id="record-deletion-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            disabled={saving}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={!confirmed || saving}
          >
            {saving && <RefreshCw className="animate-spin" />}
            {saving ? 'Saving…' : 'Allow deletion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Project-level two-way safety switch. Off by default; while off, no job can
// delete or deactivate records on either platform, whatever its own setting.
export default function RecordDeletionPolicyCard({
  project,
  onUpdated,
  className,
}: {
  project: ProjectExt;
  onUpdated: (updated: ProjectExt) => void;
  className?: string;
}) {
  const { hasPermission } = useSynkazoAuth();
  const canEditProject = hasPermission('project.edit');
  const { setRecordDeletionPolicy } = useProjectGeneralSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const allowed = project.allowRecordDeletionAndDeactivation === true;

  const save = async (allow: boolean, confirmText?: string) => {
    const updated = await setRecordDeletionPolicy(
      project.id,
      allow,
      confirmText,
    );
    onUpdated(updated);
    showToast.success(
      allow
        ? 'Record deletion and deactivation allowed.'
        : 'Record deletion and deactivation turned off.',
    );
  };

  const turnOff = async () => {
    setSaving(true);
    try {
      await save(false);
    } catch {
      showToast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={cn('gap-0 border py-0', className)}>
      <EnableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={(confirmText) => save(true, confirmText)}
      />
      <CardHeader className="gap-1 px-4 py-3">
        <CardTitle>Record deletion and deactivation</CardTitle>
        <CardDescription>
          Off by default. While off, deletes are never propagated and no sync
          deactivates a record. Deletion events are logged as skipped by policy.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="bg-card flex items-start justify-between gap-4 rounded-3xl border p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Allow deletion and deactivation
            </p>
            <p className="text-muted-foreground text-xs">
              {allowed
                ? 'On. Two-way jobs that opt in may delete, archive or deactivate records.'
                : 'Off. Jobs in this project cannot delete or deactivate records.'}
            </p>
          </div>
          <ActionTooltip
            tooltip={
              !canEditProject
                ? "You don't have permission to change project settings."
                : undefined
            }
            disabled={!canEditProject}
          >
            <Switch
              checked={allowed}
              disabled={!canEditProject || saving}
              onCheckedChange={(next) =>
                next ? setDialogOpen(true) : void turnOff()
              }
              aria-label="Allow record deletion and deactivation"
            />
          </ActionTooltip>
        </div>
      </CardContent>
    </Card>
  );
}
