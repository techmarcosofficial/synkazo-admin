import { useMemo } from 'react';

import { selectOnboardingState, type OnboardingState } from './onboardingState';

import type { Connection, Job, Project } from '@/types';

export function useOnboardingState(
  projects: Project[] | undefined,
  jobs: Job[] | undefined,
  connections: Connection[] | undefined,
): OnboardingState {
  return useMemo(
    () =>
      selectOnboardingState({
        projects: projects ?? [],
        jobs: jobs ?? [],
        connections: connections ?? [],
      }),
    [connections, jobs, projects],
  );
}
