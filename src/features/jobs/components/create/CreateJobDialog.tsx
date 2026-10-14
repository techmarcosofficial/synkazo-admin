import { useEffect, useRef, useState } from 'react';

import {
  CreateJobForm,
  type CreateJobFormHandle,
  type CreateJobFormState,
} from './CreateJobForm';
import CreateJobDialogFrame from './CreateJobDialogFrame';


const DEFAULT_STATE: CreateJobFormState = {
  canGoBack: false,
  isLastStep: true,
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
    <CreateJobDialogFrame
      open={open}
      onClose={onClose}
      isDirty={state.isDirty}
      isSaving={state.saving}
      onBack={state.canGoBack ? () => formRef.current?.back() : undefined}
      onSubmit={() =>
        void (state.isLastStep
          ? formRef.current?.save()
          : formRef.current?.next())
      }
      submitLabel={state.isLastStep ? 'Create Sync Job' : 'Next'}
      currentStep={
        state.stepLabels.length > 1 ? state.stepIndex + 1 : undefined
      }
      totalSteps={state.stepLabels.length > 1 ? state.totalSteps : undefined}
      stepLabels={state.stepLabels.length > 1 ? state.stepLabels : undefined}
    >
      <CreateJobForm
        ref={formRef}
        projectId={projectId}
        onCreated={onCreated}
        onStateChange={setState}
        detailsOnly
      />
    </CreateJobDialogFrame>
  );
}
