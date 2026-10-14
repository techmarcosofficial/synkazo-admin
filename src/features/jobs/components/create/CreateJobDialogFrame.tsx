import type { ReactNode } from 'react';

import FormDialog from '@/components/form/FormDialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface CreateJobDialogFrameProps {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  onSubmit: () => void;
  isSaving: boolean;
  isDirty: boolean;
  submitLabel: string;
  currentStep?: number;
  totalSteps?: number;
  stepLabels?: string[];
  children: ReactNode;
}

/** The same popup shell for tenant and selected-organisation job creation. */
export default function CreateJobDialogFrame({
  open,
  onClose,
  onBack,
  onSubmit,
  isSaving,
  isDirty,
  submitLabel,
  currentStep,
  totalSteps,
  stepLabels,
  children,
}: CreateJobDialogFrameProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Create New Sync Job"
      description="Choose what to sync and how records should move."
      size="md"
      isDirty={isDirty}
      currentStep={currentStep}
      totalSteps={totalSteps}
      stepLabels={stepLabels}
      footer={(requestClose) => (
        <>
          <Button
            variant="outline"
            onClick={onBack ?? requestClose}
            disabled={isSaving}
          >
            {onBack ? 'Back' : 'Cancel'}
          </Button>
          <Button onClick={onSubmit} disabled={isSaving}>
            {isSaving && <Spinner />}
            {isSaving ? 'Saving…' : submitLabel}
          </Button>
        </>
      )}
    >
      {children}
    </FormDialog>
  );
}
