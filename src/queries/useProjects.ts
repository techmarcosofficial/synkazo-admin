import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { projectsApi } from '@/api/projects';
import { jobsApi } from '@/api/jobs';
import type { Project } from '@/types';

export function useProjectsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: projectsApi.listProjects,
    enabled: options?.enabled ?? true,
  });
}

export function useProjectQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => projectsApi.getProject(id),
    enabled: !!id,
  });
}

export function useProjectEnvironmentsQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.projects.environments(id),
    queryFn: () => projectsApi.getEnvironments(id),
    enabled: !!id,
  });
}

export function useLegacyJobsQuery(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'legacyJobs'],
    queryFn: () => jobsApi.listLegacyJobs(projectId),
    enabled: !!projectId,
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Project>) => projectsApi.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      projectsApi.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmation }: { id: string; confirmation: string }) =>
      projectsApi.deleteProject(id, confirmation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}
