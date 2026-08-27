import { useEffect, useRef, useState } from 'react';

import {
  CreateJobForm,
  type CreateJobFormHandle,
  type CreateJobFormState,
} from './CreateJobForm';

import FormDialog from '@/components/form/FormDialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const DEFAULT_STATE: CreateJobFormState = {
  canGoBack: false,
  isLastStep: false,
  saving: false,
  isDirty: false,
  stepIndex: 0,
  totalSteps: 1,
  stepLabels: [],
};

interface CreateJobDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onCreated?: (jobId: string) => void;
}

export default function CreateJobDialog({
  projectId,
  open,
  onClose,
  onCreated,
}: CreateJobDialogProps) {
  const formRef = useRef<CreateJobFormHandle>(null);
  const [state, setState] = useState<CreateJobFormState>(DEFAULT_STATE);

  // Reset local UI state whenever a fresh dialog session starts.
  useEffect(() => {
    if (open) setState(DEFAULT_STATE);
  }, [open]);

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Create New Sync Job"
      description="Connect two applications and configure field synchronization."
      size="xl"
      isDirty={state.isDirty}
      currentStep={
        state.stepLabels.length > 0 ? state.stepIndex + 1 : undefined
      }
      totalSteps={state.stepLabels.length > 0 ? state.totalSteps : undefined}
      stepLabels={state.stepLabels.length > 0 ? state.stepLabels : undefined}
      footer={(requestClose) => (
        <>
          <Button
            variant="outline"
            onClick={() =>
              state.canGoBack ? formRef.current?.back() : requestClose()
            }
            disabled={state.saving}
          >
            {state.canGoBack ? 'Back' : 'Cancel'}
          </Button>
          <Button
            onClick={() =>
              void (state.isLastStep
                ? formRef.current?.save()
                : formRef.current?.next())
            }
            disabled={state.saving}
          >
            {state.saving && <Spinner />}
            {state.saving
              ? 'Saving…'
              : state.isLastStep
                ? 'Create Job'
                : 'Next'}
          </Button>
        </>
      )}
    >
      <CreateJobForm
        ref={formRef}
        projectId={projectId}
        onCreated={onCreated}
        onStateChange={setState}
      />
    </FormDialog>
  );
}
