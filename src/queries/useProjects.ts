import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { projectsApi } from '@/api/projects';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import type { Project } from '@/types';

export function useProjectsQuery(options?: { enabled?: boolean }) {
  const { hasPermission } = useSynkazoAuth();
  const canViewProjects = hasPermission('project.view');
  return useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: projectsApi.listProjects,
    enabled: (options?.enabled ?? true) && canViewProjects,
    select: (projects) => (canViewProjects ? projects : []),
  });
}

export function useProjectQuery(id: string) {
  const { hasPermission } = useSynkazoAuth();
  const canViewProjects = hasPermission('project.view');
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => projectsApi.getProject(id),
    enabled: !!id && canViewProjects,
    select: (project) => (canViewProjects ? project : undefined),
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
