import type { Connection, Job, Project } from '@/types';

export type OnboardingStage =
  'create_project' | 'connect_platforms' | 'create_first_job' | 'complete';

export type ConnectionState = 'missing' | 'verification_required';

export interface OnboardingState {
  stage: OnboardingStage;
  targetProjectId?: string;
  connectionState?: ConnectionState;
}

interface SetupProject extends Project {
  jobCount?: number;
}

function hasBothConnections(connections: Connection[]): boolean {
  return (['production', 'sandbox'] as const).some((environment) => {
    const inEnvironment = connections.filter(
      (connection) => (connection.environment ?? 'production') === environment,
    );
    return (
      inEnvironment.some(
        (connection) =>
          connection.connectionType === 'source' &&
          connection.status === 'connected',
      ) &&
      inEnvironment.some(
        (connection) =>
          connection.connectionType === 'destination' &&
          connection.status === 'connected',
      )
    );
  });
}

function sortProjects(projects: SetupProject[]): SetupProject[] {
  return [...projects].sort((a, b) => {
    const dateDiff =
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime();
    return dateDiff || a.id.localeCompare(b.id);
  });
}

/**
 * Selects organisation onboarding once, while leaving later project setup to
 * the project itself. This deliberately never lets a newly-created incomplete
 * project hide an already usable organisation dashboard.
 */
export function selectOnboardingState({
  projects,
  jobs,
  connections,
}: {
  projects: SetupProject[];
  jobs: Job[];
  connections: Connection[];
}): OnboardingState {
  const orderedProjects = sortProjects(projects);
  if (orderedProjects.length === 0) return { stage: 'create_project' };

  const setup = orderedProjects.map((project) => {
    const projectConnections = connections.filter(
      (connection) => connection.projectId === project.id,
    );
    const ready = hasBothConnections(projectConnections);
    const jobCount = jobs.filter((job) => job.projectId === project.id).length;
    return { project, projectConnections, ready, jobCount };
  });

  const usableProject = setup.find((item) => item.ready && item.jobCount > 0);
  if (usableProject) return { stage: 'complete' };

  const readyProject = setup.find((item) => item.ready);
  if (readyProject) {
    return {
      stage: 'create_first_job',
      targetProjectId: readyProject.project.id,
    };
  }

  const target = setup.find((item) => !item.ready);
  if (!target) return { stage: 'complete' };
  return {
    stage: 'connect_platforms',
    targetProjectId: target.project.id,
    connectionState:
      target.projectConnections.length > 0
        ? 'verification_required'
        : 'missing',
  };
}
