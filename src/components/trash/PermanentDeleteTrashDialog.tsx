import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import type { TrashItem } from '@/api/trashTypes';
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

interface PermanentDeleteTrashDialogProps {
  item: TrashItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  isDeleting: boolean;
}

// Irreversible hard-delete. Requires typing DELETE so it can never be triggered
// by a stray click, plus a reason for the audit trail.
export function PermanentDeleteTrashDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: PermanentDeleteTrashDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setConfirmText('');
      setReason('');
    }
  }, [open, item?.id]);

  const confirmed = isConfirmWordMatched(confirmText);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permanently delete {item?.name}</DialogTitle>
          <DialogDescription>
            This cannot be undone. The {item?.type} and everything beneath it
            will be erased from the database immediately — it will not wait for
            the 90-day auto-purge.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trash-permanent-confirm">
              Type <span className="font-semibold">{DEFAULT_CONFIRM_WORD}</span>{' '}
              to confirm
            </Label>
            <TypeToConfirmField
              id="trash-permanent-confirm"
              value={confirmText}
              onChange={setConfirmText}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trash-permanent-reason">Reason (optional)</Label>
            <Textarea
              id="trash-permanent-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being permanently deleted?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!confirmed || isDeleting}
            onClick={() => onConfirm(reason.trim())}
          >
            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
            Permanently delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
