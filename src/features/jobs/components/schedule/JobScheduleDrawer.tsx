import { useState } from 'react';

import { JobScheduleForm, type JobScheduleFormState } from './JobScheduleForm';

import FormDrawer from '@/components/form/FormDrawer';

interface JobScheduleDrawerProps {
  projectId: string;
  jobId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function JobScheduleDrawer({
  projectId,
  jobId,
  open,
  onClose,
  onSaved,
}: JobScheduleDrawerProps) {
  const [isDirty, setIsDirty] = useState(false);

  return (
    <FormDrawer
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Configure Schedule"
      description="Choose how often this job should run"
      size="default"
      isDirty={isDirty}
    >
      <JobScheduleForm
        projectId={projectId}
        jobId={jobId}
        onSaved={onSaved}
        onStateChange={(state: JobScheduleFormState) =>
          setIsDirty(state.isDirty)
        }
      />
    </FormDrawer>
  );
}
