import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DEFAULT_CONFIRM_WORD,
  isConfirmWordMatched,
  TypeToConfirmField,
} from '@/components/shared/TypeToConfirmField';
import {
  useDeleteOrganisationMutation,
  useOrganisationDeleteImpactQuery,
} from '@/queries/useSuperAdminTrash';

interface DeleteOrganisationDialogProps {
  organisationId: string;
  organisationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

// Deletes an organisation: it and all its projects & jobs move to Trash
// (recoverable for 90 days). Typing DELETE is required to confirm; the reason
// is optional (global rule — a reason never blocks a confirmation).
export function DeleteOrganisationDialog({
  organisationId,
  organisationName,
  open,
  onOpenChange,
  onDeleted,
}: DeleteOrganisationDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');

  const impactQuery = useOrganisationDeleteImpactQuery(organisationId, open);
  const deleteOrg = useDeleteOrganisationMutation(organisationId);

  useEffect(() => {
    if (open) {
      setConfirmText('');
      setReason('');
    }
  }, [open]);

  const impact = impactQuery.data;
  const confirmed = isConfirmWordMatched(confirmText);

  const handleDelete = async () => {
    // The UI gate is typing DELETE; the server still requires the exact org
    // name, which we send programmatically. Reason is optional.
    await deleteOrg.mutateAsync({
      confirmName: organisationName,
      reason: reason.trim() || undefined,
    });
    toast.success(`${organisationName} deleted and moved to trash`);
    onOpenChange(false);
    onDeleted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {organisationName}</DialogTitle>
          <DialogDescription>
            The organisation and all of its data are moved to Trash and can be
            restored for 90 days, after which they are permanently removed.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTitle>This will trash the whole organisation</AlertTitle>
          <AlertDescription>
            {impactQuery.isLoading ? (
              'Calculating impact…'
            ) : impact ? (
              <span>
                {impact.projects} project{impact.projects === 1 ? '' : 's'} and{' '}
                {impact.jobs} job{impact.jobs === 1 ? '' : 's'} will be moved to
                trash. All syncing stops immediately.
              </span>
            ) : (
              'All projects and jobs will be moved to trash and syncing stops.'
            )}
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-org-confirm">
              Type <span className="font-semibold">{DEFAULT_CONFIRM_WORD}</span>{' '}
              to confirm
            </Label>
            <TypeToConfirmField
              id="delete-org-confirm"
              value={confirmText}
              onChange={setConfirmText}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-org-reason">Reason (optional)</Label>
            <Textarea
              id="delete-org-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this organisation being deleted?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteOrg.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!confirmed || deleteOrg.isPending}
            onClick={handleDelete}
          >
            {deleteOrg.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Delete organisation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
