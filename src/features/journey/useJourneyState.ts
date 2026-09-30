import { useMemo } from 'react';

import {
  computeJourneyProgressSteps,
  hasBothConnections,
  isOrganizationGraduated,
  resolveActiveDraft,
  resolveNextAction,
  type ActiveDraftResolution,
} from './journeySelectors';
import type {
  JourneyProgressStep,
  NextActionResolution,
  UserJourneyStateId,
} from './types';

import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { useConnectionsQuery } from '@/queries/useConnections';
import { useJobsQuery } from '@/queries/useJobs';
import { useProjectsQuery } from '@/queries/useProjects';
import type { Connection, Job, Project, SyncRun, UserRole } from '@/types';

export interface UseJourneyStateOptions {
  projects?: Project[];
  connections?: Connection[];
  jobs?: Job[];
  runs?: SyncRun[];
  targetProjectId?: string;
  targetJobId?: string;
}

export interface UseJourneyStateResult {
  isLoading: boolean;
  isGraduated: boolean;
  hasBothConnections: boolean;
  currentState: UserJourneyStateId;
  nextAction: NextActionResolution;
  progressSteps: JourneyProgressStep[];
  targetProject: Project | null;
  targetJob: Job | null;
  activeDraft: ActiveDraftResolution | null;
}

export function useJourneyState(
  options: UseJourneyStateOptions = {},
): UseJourneyStateResult {
  const { currentUser, hasRole } = useSynkazoAuth();

  // If callers pass existing query data, use that. Otherwise, load from query hooks.
  const projectsQuery = useProjectsQuery();
  const connectionsQuery = useConnectionsQuery();
  const jobsQuery = useJobsQuery();

  const projects = options.projects ?? projectsQuery.data ?? [];
  const connections = options.connections ?? connectionsQuery.data ?? [];
  const jobs = options.jobs ?? jobsQuery.data ?? [];
  const runs = options.runs ?? [];

  const isLoading =
    (!options.projects && projectsQuery.isLoading) ||
    (!options.connections && connectionsQuery.isLoading) ||
    (!options.jobs && jobsQuery.isLoading);

  const userRole: UserRole = hasRole('org_admin')
    ? 'org_admin'
    : hasRole('super_admin')
      ? 'super_admin'
      : 'editor';

  const evaluationContext = useMemo(
    () => ({
      hasOrganisation: Boolean(currentUser?.organisationId),
      projects,
      connections,
      jobs,
      runs,
      userRole,
      targetProjectId: options.targetProjectId,
      targetJobId: options.targetJobId,
    }),
    [
      currentUser?.organisationId,
      projects,
      connections,
      jobs,
      runs,
      userRole,
      options.targetProjectId,
      options.targetJobId,
    ],
  );

  const nextAction = useMemo(
    () => resolveNextAction(evaluationContext),
    [evaluationContext],
  );

  const isGraduated = useMemo(
    () => isOrganizationGraduated(jobs, runs),
    [jobs, runs],
  );

  const progressSteps = useMemo(
    () => computeJourneyProgressSteps(evaluationContext),
    [evaluationContext],
  );

  const targetProject = useMemo(() => {
    if (options.targetProjectId) {
      return (
        projects.find((p) => p.id === options.targetProjectId) ??
        projects[0] ??
        null
      );
    }
    return projects[0] ?? null;
  }, [options.targetProjectId, projects]);

  const targetJob = useMemo(() => {
    if (!targetProject) return null;
    const projectJobs = jobs.filter((j) => j.projectId === targetProject.id);
    if (options.targetJobId) {
      return (
        projectJobs.find((j) => j.id === options.targetJobId) ??
        projectJobs[0] ??
        null
      );
    }
    return projectJobs[0] ?? null;
  }, [options.targetJobId, targetProject, jobs]);

  const bothConnectionsReady = useMemo(() => {
    if (!targetProject) return false;
    const projectConns = connections.filter(
      (c) => c.projectId === targetProject.id,
    );
    return hasBothConnections(projectConns);
  }, [targetProject, connections]);

  const activeDraft = useMemo(
    () => resolveActiveDraft(projects, options.targetProjectId, userRole),
    [projects, options.targetProjectId, userRole],
  );

  return {
    isLoading,
    isGraduated,
    hasBothConnections: bothConnectionsReady,
    currentState: nextAction.state,
    nextAction,
    progressSteps,
    targetProject,
    targetJob,
    activeDraft,
  };
}
