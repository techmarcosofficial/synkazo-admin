import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import SetupFooter, { type FooterAction } from './SetupFooter';
import { StepConnectPlatforms, SETUP_STEP_LABELS } from './steps';

import { projectsApi } from '@/api/projects';
import WizardStepHeader from '@/components/form/WizardStepHeader';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CreateJobForm,
  type CreateJobFormHandle,
  type CreateJobFormState,
} from '@/features/jobs/components/create';
import {
  JobScheduleForm,
  type JobScheduleFormHandle,
  type JobScheduleFormState,
} from '@/features/jobs/components/schedule';
import { useProjectSetupState } from '@/features/projects/hooks';
import { hasBothConnections } from '@/features/projects/lib/projectSetupState';
import { useSetupWizardStore } from '@/features/projects/store';
import { useDialogCloseGuard } from '@/hooks/useDialogCloseGuard';
import { queryKeys } from '@/queries/queryKeys';

type SubView = 'rule' | 'schedule';

const DEFAULT_JOB_STATE: CreateJobFormState = {
  canGoBack: false,
  isLastStep: false,
  saving: false,
  isDirty: false,
  stepIndex: 0,
  totalSteps: 1,
  stepLabels: [],
};
const DEFAULT_SCHEDULE_STATE: JobScheduleFormState = {
  saving: false,
  isDirty: false,
};

// The single, reusable setup wizard — triggered from the Projects grid, the
// ProjectDetail banner, and right after project creation via
// useSetupWizardStore.open(projectId). Mounted once in AppLayout.
//
// Steps 3 ("Create Sync Job") and 4 ("Configure Schedule") render
// CreateJobForm/JobScheduleForm directly in embedded mode — no drawers pop
// open mid-wizard. Both forms drive their internal validation/API calls;
// this dialog only drives navigation (Back/Next/Finish Setup) via refs.
export default function SetupWizardDialog() {
  const isOpen = useSetupWizardStore((s) => s.isOpen);
  const projectId = useSetupWizardStore((s) => s.projectId);
  const close = useSetupWizardStore((s) => s.close);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { state, project, connections, primaryJob, loading, refetch } =
    useProjectSetupState(projectId);

  const jobFormRef = useRef<CreateJobFormHandle>(null);
  const scheduleFormRef = useRef<JobScheduleFormHandle>(null);
  const [jobState, setJobState] =
    useState<CreateJobFormState>(DEFAULT_JOB_STATE);
  const [scheduleState, setScheduleState] = useState<JobScheduleFormState>(
    DEFAULT_SCHEDULE_STATE,
  );
  const [justCreatedJobId, setJustCreatedJobId] = useState<string | null>(null);
  const [subView, setSubView] = useState<SubView>('rule');

  // Reset wizard-local state whenever a fresh wizard session starts for a project.
  useEffect(() => {
    if (!isOpen) return;
    setJustCreatedJobId(null);
    setJobState(DEFAULT_JOB_STATE);
    setScheduleState(DEFAULT_SCHEDULE_STATE);
    setSubView('rule');
  }, [isOpen, projectId]);

  // If the Sync Job already existed (returning session), land on Step 4.
  useEffect(() => {
    if (primaryJob) setSubView('schedule');
  }, [primaryJob]);

  // A project can only ever reach "Live" from here (one-way ratchet) — once
  // it does, the wizard has nothing left to show, so close automatically.
  useEffect(() => {
    if (isOpen && state === 'Live') close();
  }, [isOpen, state, close]);

  const stepIndex =
    state === 'Draft' || state === 'NeedsConnections'
      ? 1
      : subView === 'rule'
        ? 2
        : 3;
  const bothConnected = hasBothConnections(connections);
  const jobId = primaryJob?.id ?? justCreatedJobId ?? null;
  // CreateJobForm stays mounted (just hidden) once it creates the rule this
  // session, so Back can return to it without losing progress. A rule that
  // already existed before this wizard session opened has no in-memory form
  // to return to, so it isn't mounted at all.
  const showRuleForm =
    state === 'CreatingSyncRule' && (!primaryJob || !!justCreatedJobId);

  const wizardIsDirty =
    state === 'CreatingSyncRule' &&
    (subView === 'rule' ? jobState.isDirty : scheduleState.isDirty);

  const { requestClose } = useDialogCloseGuard({
    isDirty: wizardIsDirty,
    onClose: close,
  });

  const handleScheduleSaved = async () => {
    if (!projectId) return;
    const id = projectId;
    try {
      await projectsApi.completeSetup(id);
    } catch {
      toast.error(
        'Schedule saved, but completing setup failed. Please try again.',
      );
      return;
    } finally {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    }
    // Setup is done — drop the user straight into the project dashboard
    // (Management Mode) rather than leaving them wherever the wizard was
    // opened from (e.g. the Projects grid).
    close();
    const target = `/projects/${id}`;
    if (location.pathname !== target) navigate(target);
  };

  let left: FooterAction;
  let right: FooterAction | undefined;

  if (state === 'Draft' || state === 'NeedsConnections') {
    left = { label: 'Cancel', onClick: requestClose };
    right = {
      label: 'Continue',
      onClick: () => refetch(),
      disabled: !bothConnected,
    };
  } else if (subView === 'rule') {
    left = jobState.canGoBack
      ? {
          label: 'Back',
          onClick: () => jobFormRef.current?.back(),
          disabled: jobState.saving,
        }
      : { label: 'Cancel', onClick: requestClose };
    right = {
      label: jobState.isLastStep ? 'Create Job' : 'Next',
      onClick: () => void jobFormRef.current?.next(),
      loading: jobState.saving,
    };
  } else {
    left = justCreatedJobId
      ? {
          label: 'Back',
          onClick: () => setSubView('rule'),
          disabled: scheduleState.saving,
        }
      : { label: 'Cancel', onClick: requestClose };
    right = {
      label: 'Finish Setup',
      onClick: () => void scheduleFormRef.current?.save(),
      loading: scheduleState.saving,
    };
  }

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && requestClose()}>
      <DialogContent
        size="xl"
        showCloseButton={false}
        className="flex h-[85vh] flex-col gap-0 overflow-hidden p-0"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {loading || !project ? (
          <>
            <DialogTitle className="sr-only">Project Setup</DialogTitle>
            <div className="flex-1 space-y-4 p-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-40 w-full" />
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b px-6 py-4">
              <WizardStepHeader
                title="Project Setup"
                description="Connect your platforms and configure your first sync."
                currentStep={stepIndex}
                totalSteps={SETUP_STEP_LABELS.length}
                steps={[...SETUP_STEP_LABELS]}
                onClose={requestClose}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {(state === 'Draft' || state === 'NeedsConnections') && (
                <StepConnectPlatforms
                  projectId={projectId!}
                  project={project}
                  connections={connections}
                  onConnectionsChange={() => refetch()}
                />
              )}

              {showRuleForm && (
                <div className={subView === 'rule' ? '' : 'hidden'}>
                  <CreateJobForm
                    ref={jobFormRef}
                    projectId={projectId!}
                    embedded
                    onStateChange={setJobState}
                    onCreated={(id) => {
                      setJustCreatedJobId(id);
                      setSubView('schedule');
                      refetch();
                    }}
                  />
                </div>
              )}

              {state === 'CreatingSyncRule' &&
                jobId &&
                subView === 'schedule' && (
                  <JobScheduleForm
                    ref={scheduleFormRef}
                    projectId={projectId!}
                    jobId={jobId}
                    embedded
                    onStateChange={setScheduleState}
                    onSaved={handleScheduleSaved}
                  />
                )}
            </div>
            <SetupFooter left={left} right={right} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
