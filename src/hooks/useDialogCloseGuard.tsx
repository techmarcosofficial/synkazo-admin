import { useEffect, useRef } from 'react';

import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore';

interface UseDialogCloseGuardOptions {
  isDirty: boolean;
  onClose: () => void;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
}

const DEFAULT_DESCRIPTION = (
  <>
    You have unsaved changes.
    <br />
    If you leave now, your changes will be lost.
  </>
);

// Shared close-guard for dialogs/drawers that want a "Discard changes?"
// confirmation before closing while dirty (multi-step wizards, large forms).
// Always routes through useConfirmDialog() — never render a bespoke
// AlertDialog for this, per the convention in ConfirmDialog.tsx.
export function useDialogCloseGuard({
  isDirty,
  onClose,
  title = 'Discard changes?',
  description = DEFAULT_DESCRIPTION,
  confirmLabel = 'Discard',
  cancelLabel = 'Continue Editing',
}: UseDialogCloseGuardOptions) {
  const { confirm } = useConfirmDialog();
  const confirmDialogOpen = useConfirmDialogStore((s) => s.open);

  // Guards against the confirmation being triggered again while it's still
  // showing. Radix's stacked Dialog/AlertDialog can fire a spurious
  // onOpenChange(false)-equivalent re-entry on the underlying dialog when the
  // AlertDialog closes (e.g. after "Continue Editing") — without this guard,
  // that spurious re-entry can loop the confirmation open again.
  const awaitingConfirmationRef = useRef(false);
  const prevConfirmDialogOpenRef = useRef(confirmDialogOpen);

  useEffect(() => {
    const wasOpen = prevConfirmDialogOpenRef.current;
    prevConfirmDialogOpenRef.current = confirmDialogOpen;
    if (!wasOpen || confirmDialogOpen || !awaitingConfirmationRef.current)
      return;
    // The confirmation just closed (Discard, Continue Editing, Escape, or an
    // outside click) — release the guard on the next tick so any spurious
    // re-fire from the same interaction is swallowed first.
    const timer = setTimeout(() => {
      awaitingConfirmationRef.current = false;
    }, 0);
    return () => clearTimeout(timer);
  }, [confirmDialogOpen]);

  const requestClose = () => {
    if (awaitingConfirmationRef.current) return;
    if (!isDirty) {
      onClose();
      return;
    }
    awaitingConfirmationRef.current = true;
    confirm({
      variant: 'warning',
      title,
      description,
      confirmLabel,
      cancelLabel,
      onConfirm: onClose,
    });
  };

  return { requestClose };
}
