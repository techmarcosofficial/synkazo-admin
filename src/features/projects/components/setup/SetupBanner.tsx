import { X, Zap } from 'lucide-react';

import SetupProgress from './SetupProgress';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type {
  ConnectionExt,
  JobExt,
  ProjectExt,
} from '@/features/projects/hooks';
import {
  deriveProjectSetupState,
  type ProjectSetupState,
} from '@/features/projects/lib/projectSetupState';
import { useAlertDismissStore } from '@/stores/useAlertDismissStore';

interface SetupBannerProps {
  project: ProjectExt;
  connections: ConnectionExt[];
  jobs: JobExt[];
  onOpenSetup: () => void;
}

// There are two user-facing setup steps (a project always exists by the time
// this banner can show, so "create the project" isn't one of them). "Draft"
// and "NeedsConnections" both land on step 1 — Draft hasn't connected
// anything yet, NeedsConnections has started but not both platforms. "Live"
// never reaches this component (see below).
const TOTAL_STEPS = 2;

interface StepContent {
  stepNumber: number;
  percent: number;
  title: string;
  description: string;
  buttonLabel: string;
}

const STEP_CONTENT: Record<
  Exclude<ProjectSetupState, 'Live' | 'AttentionRequired'>,
  StepContent
> = {
  Draft: {
    stepNumber: 1,
    percent: 0,
    title: 'Connect your platforms',
    description:
      'Go to the Connections tab and add both a source and a destination (HubSpot) connection to unlock Jobs.',
    buttonLabel: 'Continue Setup',
  },
  NeedsConnections: {
    stepNumber: 1,
    percent: 25,
    title: 'Connect your platforms',
    description:
      'Go to the Connections tab and add both a source and a destination (HubSpot) connection to unlock Jobs.',
    buttonLabel: 'Continue Setup',
  },
  CreatingSyncRule: {
    stepNumber: 2,
    percent: 50,
    title: 'Create your first Sync Job',
    description:
      'Connections are ready — create a sync job to define what data should sync between your platforms.',
    buttonLabel: 'Complete Setup',
  },
};

function dismissIdFor(projectId: string, state: ProjectSetupState) {
  return `setup-banner:${projectId}:${state}`;
}

export default function SetupBanner({
  project,
  connections,
  jobs,
  onOpenSetup,
}: SetupBannerProps) {
  const state = deriveProjectSetupState({ project, connections, jobs });
  const dismissId = dismissIdFor(project.id, state);
  const dismissedMap = useAlertDismissStore((s) => s.dismissed);
  const dismiss = useAlertDismissStore((s) => s.dismiss);

  // Dismissal is session-only (in-memory store, no localStorage) and keyed by
  // state — a banner dismissed at "NeedsConnections" reappears once progress
  // (or regression) moves the project into a different state.
  if (
    state === 'Live' ||
    state === 'AttentionRequired' ||
    dismissedMap[dismissId]
  )
    return null;

  const step = STEP_CONTENT[state];

  return (
    <Card className="relative">
      <CardContent>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={() => dismiss(dismissId)}
          aria-label="Dismiss setup"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-4 pr-5">
          <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-full">
            <Zap className="text-primary size-4" />
          </div>

          <div className="min-w-48 flex-1">
            <p className="text-sm font-semibold">Project Setup</p>
            <p className="text-primary mt-1 text-xs font-medium">
              Step {step.stepNumber} of {TOTAL_STEPS} • {step.title}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {step.description}
            </p>
            <div className="mt-2 max-w-2xl">
              <SetupProgress label="" percent={step.percent} />
            </div>
          </div>

          <Button onClick={onOpenSetup}>{step.buttonLabel}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
