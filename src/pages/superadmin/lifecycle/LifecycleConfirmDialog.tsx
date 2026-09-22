import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Textarea } from '@/components/ui/textarea';

// Reusable operator-confirmation dialog. Matches the lifecycle doc's
// confirmation table: an operator has to type the organisation name AND
// provide a reason to complete any high-risk transition. Rendered as a
// single component instead of six near-duplicate ones so future changes
// to the copy or the required min-length live in one place.

export type LifecycleTone = 'warning' | 'danger';

interface LifecycleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  bodyWarning?: string;
  actionLabel: string;
  tone: LifecycleTone;
  organisationName: string;
  requiresNameConfirm: boolean;
  minReasonLength: number;
  reasonPlaceholder?: string;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (values: { reason: string }) => void;
}

export default function LifecycleConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  bodyWarning,
  actionLabel,
  tone,
  organisationName,
  requiresNameConfirm,
  minReasonLength,
  reasonPlaceholder,
  isSubmitting,
  errorMessage,
  onSubmit,
}: LifecycleConfirmDialogProps) {
  const [nameInput, setNameInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');

  useEffect(() => {
    if (!open) {
      setNameInput('');
      setReasonInput('');
    }
  }, [open]);

  const nameMatches =
    !requiresNameConfirm ||
    nameInput.trim().toLowerCase() === organisationName.trim().toLowerCase();
  const reasonLongEnough = reasonInput.trim().length >= minReasonLength;
  const canSubmit = nameMatches && reasonLongEnough && !isSubmitting;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({ reason: reasonInput.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tone === 'danger' ? (
              <ShieldAlert className="size-5 text-red-600" aria-hidden />
            ) : (
              <AlertTriangle className="size-5 text-amber-600" aria-hidden />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {bodyWarning ? (
          <Alert
            variant={tone === 'danger' ? 'destructive' : 'default'}
            className="my-2"
          >
            <AlertDescription>{bodyWarning}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-4">
          {requiresNameConfirm ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lifecycle-name-confirm">
                Type <span className="font-mono">{organisationName}</span> to
                confirm
              </Label>
              <Input
                id="lifecycle-name-confirm"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={nameInput.length > 0 && !nameMatches}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lifecycle-reason">
              Reason
              <span className="text-muted-foreground ml-1 text-xs">
                (min {minReasonLength} characters)
              </span>
            </Label>
            <Textarea
              id="lifecycle-reason"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder={reasonPlaceholder}
              rows={3}
              aria-invalid={reasonInput.length > 0 && !reasonLongEnough}
            />
            <div className="text-muted-foreground text-xs">
              {reasonInput.trim().length}/{minReasonLength} characters
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
            variant={tone === 'danger' ? 'destructive' : 'default'}
            onClick={submit}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Working…' : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
