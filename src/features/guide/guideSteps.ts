// The six steps of first-run setup, shared by the hint cards and the stepper
// on the project and sync-job pages so both show the same sequence.

export type GuideStepId =
  | 'project'
  | 'connect'
  | 'job'
  | 'map'
  | 'test'
  | 'schedule';

export const GUIDE_STEPS: ReadonlyArray<{
  id: GuideStepId;
  title: string;
  /** Short form for the stepper on narrow screens. */
  short: string;
}> = [
  { id: 'project', title: 'Create project', short: 'Project' },
  { id: 'connect', title: 'Connect platforms', short: 'Connect' },
  { id: 'job', title: 'Create sync job', short: 'Sync job' },
  { id: 'map', title: 'Map fields', short: 'Map' },
  { id: 'test', title: 'Run a test sync', short: 'Test' },
  { id: 'schedule', title: 'Set a schedule', short: 'Schedule' },
];

export const GUIDE_STEP_COUNT = GUIDE_STEPS.length;

export function guideStepNumber(id: GuideStepId) {
  return GUIDE_STEPS.findIndex((s) => s.id === id) + 1;
}

export interface GuideProgressFlags {
  connected: boolean;
  jobCreated: boolean;
  mapped: boolean;
  tested: boolean;
  scheduled: boolean;
}

export interface GuideProgress {
  done: Record<GuideStepId, boolean>;
  /** First unfinished step, or null when everything is done. */
  current: GuideStepId | null;
  doneCount: number;
}

/**
 * Steps complete strictly in order: a later flag can't count while an earlier
 * step is open (a broken connection re-opens "Connect" even after a test ran).
 */
export function computeGuideProgress(flags: GuideProgressFlags): GuideProgress {
  const raw: Record<GuideStepId, boolean> = {
    project: true,
    connect: flags.connected,
    job: flags.jobCreated,
    map: flags.mapped,
    test: flags.tested,
    schedule: flags.scheduled,
  };
  const done = { ...raw };
  let current: GuideStepId | null = null;
  for (const step of GUIDE_STEPS) {
    if (current) done[step.id] = false;
    else if (!raw[step.id]) current = step.id;
  }
  const doneCount = GUIDE_STEPS.filter((s) => done[s.id]).length;
  return { done, current, doneCount };
}
