import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { GuideStepId } from './guideSteps';

/**
 * First-run guide: walks a brand-new organisation through exactly one project
 * and one sync job, from "create project" to "schedule it". Once that first
 * project is scheduled (or the user skips), the guide never returns.
 */
export type GuideStatus = 'idle' | 'active' | 'done';

import type { GuidePlacement, HighlightMode } from './guideDom';

export type { GuidePlacement };

export interface GuideExtra {
  target: string;
  /**
   * quiet: faint static outline for a secondary option.
   * blink: forces a hidden-until-hover control visible and fades it in and
   * out, so the user can see every place they could click.
   */
  mode?: HighlightMode | 'quiet' | 'blink';
  /** Light every match, not just the first visible one. */
  all?: boolean;
}

export interface GuideSpot {
  /** Stable id; changing it re-scrolls the target into view and re-opens a collapsed hint. */
  id: string;
  /** CSS selectors tried in order; the first visible match gets the ring. Omit for a centred card. */
  target?: string | string[];
  /** Override how the main target lights up (default: picked from the element). */
  targetMode?: HighlightMode;
  /** More things to light up alongside the main target. */
  extras?: GuideExtra[];
  title: string;
  body: string;
  /** Which of the six setup steps this hint belongs to; shown as "Step n of 6". */
  step?: GuideStepId;
  /** Preferred side of the target for the hint card; flips when there's no room. */
  placement?: GuidePlacement;
  /** Show the hint card even when the target isn't on screen (e.g. collapsed mobile sidebar). */
  floatWhenMissing?: boolean;
  /** Primary button on a target-less card (used by the completion card). */
  action?: { label: string; onClick: () => void };
}

interface RegisteredSpot extends GuideSpot {
  key: number;
}

interface GuideState {
  userId: string | null;
  status: GuideStatus;
  /** The one project and job the guide follows. */
  projectId: string | null;
  jobId: string | null;

  /** Session-only: hides the layer while another walkthrough (billing tour) owns the screen. */
  paused: boolean;
  /** Session-only: hint cards the user collapsed with "Got it". The ring stays. */
  collapsed: Record<string, true>;
  /** Session-only: spots mounted by the pages, latest on top. */
  spots: RegisteredSpot[];
  /** Session-only: the unfinished step, as last computed by a guided page. */
  currentStep: GuideStepId | null;

  bindUser: (userId: string) => void;
  start: () => void;
  finish: () => void;
  setProject: (projectId: string | null) => void;
  setJob: (jobId: string | null) => void;
  setPaused: (paused: boolean) => void;
  collapse: (spotId: string) => void;
  pushSpot: (spot: RegisteredSpot) => void;
  removeSpot: (key: number) => void;
  setCurrentStep: (step: GuideStepId | null) => void;
}

export const useGuideStore = create<GuideState>()(
  persist(
    (set) => ({
      userId: null,
      status: 'idle',
      projectId: null,
      jobId: null,
      paused: false,
      collapsed: {},
      spots: [],
      currentStep: null,

      bindUser: (userId) =>
        set((s) =>
          s.userId === userId
            ? s
            : { userId, status: 'idle', projectId: null, jobId: null },
        ),
      start: () => set({ status: 'active', collapsed: {} }),
      finish: () => set({ status: 'done', spots: [] }),
      setProject: (projectId) => set({ projectId, jobId: null }),
      setJob: (jobId) => set({ jobId }),
      setPaused: (paused) => set({ paused }),
      collapse: (spotId) =>
        set((s) => ({ collapsed: { ...s.collapsed, [spotId]: true } })),
      pushSpot: (spot) =>
        set((s) => ({
          spots: [...s.spots.filter((x) => x.key !== spot.key), spot],
        })),
      removeSpot: (key) =>
        set((s) => ({ spots: s.spots.filter((x) => x.key !== key) })),
      setCurrentStep: (currentStep) => set({ currentStep }),
    }),
    {
      name: 'synkazo:first-run-guide',
      partialize: ({ userId, status, projectId, jobId }) => ({
        userId,
        status,
        projectId,
        jobId,
      }),
    },
  ),
);

/** True when the guide is running and following this project. */
export function useIsGuidedProject(projectId: string | null | undefined) {
  return useGuideStore(
    (s) => s.status === 'active' && !!projectId && s.projectId === projectId,
  );
}

/** True when the guide is running and following this job. */
export function useIsGuidedJob(jobId: string | null | undefined) {
  return useGuideStore(
    (s) => s.status === 'active' && !!jobId && s.jobId === jobId,
  );
}

/** True when the guide follows this project and its next step is `step`. */
export function useIsGuideStep(
  projectId: string | null | undefined,
  step: GuideStepId,
) {
  return useGuideStore(
    (s) =>
      s.status === 'active' &&
      !!projectId &&
      s.projectId === projectId &&
      s.currentStep === step,
  );
}

/** True while the guided project still has no job (the create-job dialog is the next stop). */
export function useIsCreatingGuidedJob(projectId?: string | null) {
  return useGuideStore(
    (s) =>
      s.status === 'active' &&
      !!s.projectId &&
      !s.jobId &&
      (projectId == null || s.projectId === projectId),
  );
}
