// What the tab-row setup indicator needs: where the user is in setup, and the
// one thing to do next. Project and flow pages each build one of these.

export type SetupGuideStepStatus = 'complete' | 'current' | 'upcoming';

export interface SetupGuideStep {
  title: string;
  description: string;
  status: SetupGuideStepStatus;
  /** Listed for guidance only; doesn't count toward progress. */
  optional?: boolean;
}

export interface SetupGuideNext {
  title: string;
  instruction: string;
  /** Verb + object, e.g. "Open Connections". */
  actionLabel: string;
  onGo: () => void;
  /** Highlights the matching action on the flow list while hovered. */
  guidesFlowAction?: boolean;
}

export interface SetupGuide {
  /** e.g. "Project setup". */
  label: string;
  steps: SetupGuideStep[];
  next: SetupGuideNext;
  secondaryAction?: { label: string; onClick: () => void };
}

export function setupGuideProgress(steps: SetupGuideStep[]) {
  const required = steps.filter((step) => !step.optional);
  const done = required.filter((step) => step.status === 'complete').length;
  return { done, total: required.length };
}
