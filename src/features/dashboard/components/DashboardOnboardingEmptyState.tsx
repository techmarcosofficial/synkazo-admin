import { ArrowRight, Check, FolderPlus, Link2, Workflow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ConnectionState, OnboardingState } from '@/features/onboarding';
import { useCreateProjectStore } from '@/features/projects/store';
import { cn } from '@/lib/utils';

interface DashboardOnboardingEmptyStateProps {
  state: OnboardingState;
  canManage: boolean;
}

const JOURNEY_STEPS = [
  {
    title: 'Create Project',
    description: 'Set up a project and give it a clear name.',
    icon: FolderPlus,
  },
  {
    title: 'Connect Platforms',
    description: 'Link your source and destination platforms.',
    icon: Link2,
  },
  {
    title: 'Create First Sync Job',
    description: 'Choose what data should move between them.',
    icon: Workflow,
  },
] as const;

function getCurrentStep(state: OnboardingState): number {
  if (state.stage === 'connect_platforms') return 1;
  if (state.stage === 'create_first_job') return 2;
  return 0;
}

function getCurrentContent(state: OnboardingState) {
  if (state.stage === 'create_project') {
    return {
      title: 'Create your first project',
      description:
        'Complete your setup journey to start moving and syncing data across your platforms.',
      helper: 'You can add more projects later.',
    };
  }

  if (state.stage === 'create_first_job') {
    return {
      title: 'Create your first sync job',
      description:
        'Your platforms are connected. Create a sync job to choose what data should move between them.',
      helper: 'You can review every setting before anything runs.',
    };
  }

  const connectionState: ConnectionState = state.connectionState ?? 'missing';
  return connectionState === 'missing'
    ? {
        title: 'Connect your platforms',
        description:
          'Your project is ready. Connect the source and destination platforms before creating a sync job.',
        helper: 'Both connections need to be ready before you continue.',
      }
    : {
        title: 'Finish connection setup',
        description:
          'A connection still needs attention. Verify both platforms so Synkazo can move your data safely.',
        helper: 'Return here after both connections show as connected.',
      };
}

export default function DashboardOnboardingEmptyState({
  state,
  canManage,
}: DashboardOnboardingEmptyStateProps) {
  const navigate = useNavigate();
  const openCreateProjectDialog = useCreateProjectStore((store) => store.open);
  const currentStep = getCurrentStep(state);
  const content = getCurrentContent(state);
  const CurrentIcon = JOURNEY_STEPS[currentStep].icon;

  const handleContinue = () => {
    if (!canManage) return;
    if (state.stage === 'create_project') {
      openCreateProjectDialog();
      return;
    }

    if (!state.targetProjectId) {
      navigate('/projects');
      return;
    }

    navigate(
      state.stage === 'create_first_job'
        ? `/projects/${state.targetProjectId}?tab=sync-rules`
        : `/projects/${state.targetProjectId}/connections`,
    );
  };

  return (
    <section
      aria-labelledby="setup-journey-title"
      className="mx-auto w-full max-w-5xl py-1"
    >
      <Card className="border-border/70 overflow-hidden rounded-4xl py-0 shadow-sm">
        <CardContent className="grid p-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="flex min-h-[20rem] flex-col justify-center px-6 py-6 sm:px-7 lg:px-8 lg:py-7">
            <div className="bg-primary/10 text-primary mb-5 flex size-12 items-center justify-center rounded-xl">
              <CurrentIcon className="size-6" aria-hidden="true" />
            </div>

            <div className="max-w-2xl">
              <h2
                id="setup-journey-title"
                className="text-xl font-bold tracking-tight"
              >
                {content.title}
              </h2>
              <p className="text-muted-foreground mt-1.5 max-w-xl text-xs leading-5 sm:text-sm">
                {content.description}
              </p>
            </div>

            <ol
              className="mt-5 grid grid-cols-3 gap-2"
              aria-label="Setup journey progress"
            >
              {JOURNEY_STEPS.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                return (
                  <li
                    key={step.title}
                    className="relative flex min-w-0 flex-col items-start text-left"
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {index < JOURNEY_STEPS.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute top-4 left-10 h-0 w-[calc(100%-2.5rem)] border-t-2',
                          currentStep > index
                            ? 'border-primary/55 border-solid'
                            : 'border-border border-dashed',
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        'bg-card relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold',
                        isCompleted &&
                          'border-primary bg-primary text-primary-foreground',
                        isCurrent &&
                          'border-primary text-primary ring-primary/15 ring-2',
                        !isCompleted &&
                          !isCurrent &&
                          'border-border text-muted-foreground',
                      )}
                    >
                      {isCompleted ? (
                        <Check className="size-3.5" aria-hidden="true" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span
                      className={cn(
                        'mt-2 pr-2 text-xs leading-4',
                        isCurrent
                          ? 'text-foreground font-semibold'
                          : 'text-muted-foreground font-medium',
                      )}
                    >
                      {step.title}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-5">
              <Button onClick={handleContinue} disabled={!canManage}>
                Continue setup
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
              <p className="text-muted-foreground mt-2 text-xs leading-5">
                {canManage
                  ? content.helper
                  : 'Ask an organisation admin to continue this setup.'}
              </p>
            </div>
          </div>

          <div className="bg-muted/15 border-t px-5 py-5 sm:px-6 lg:flex lg:flex-col lg:justify-center lg:border-t-0 lg:border-l lg:py-6">
            <ol aria-label="Setup journey steps">
              {JOURNEY_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                const description =
                  isCurrent &&
                  state.stage === 'connect_platforms' &&
                  state.connectionState === 'verification_required'
                    ? 'Verify the source and destination connections.'
                    : step.description;

                return (
                  <li
                    key={step.title}
                    className="relative flex items-start gap-3 pb-4 last:pb-0"
                  >
                    {index < JOURNEY_STEPS.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute top-8 bottom-0 left-[0.9375rem] border-l-2',
                          currentStep > index
                            ? 'border-primary/55 border-solid'
                            : 'border-border border-dashed',
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        'bg-card relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border',
                        isCompleted &&
                          'border-primary bg-primary text-primary-foreground',
                        isCurrent &&
                          'border-primary text-primary ring-primary/10 ring-2',
                        !isCompleted &&
                          !isCurrent &&
                          'border-border text-muted-foreground',
                      )}
                    >
                      {isCompleted ? (
                        <Check className="size-3.5" aria-hidden="true" />
                      ) : (
                        <StepIcon className="size-4" aria-hidden="true" />
                      )}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 rounded-xl px-3 py-1.5',
                        isCurrent && 'bg-primary/[0.05]',
                      )}
                    >
                      <span
                        className={cn(
                          'block text-sm leading-5 font-semibold',
                          !isCurrent && !isCompleted && 'text-muted-foreground',
                        )}
                      >
                        {index + 1}. {step.title}
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
                        {description}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
