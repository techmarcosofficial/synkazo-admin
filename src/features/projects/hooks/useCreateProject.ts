import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { projectsApi } from '@/api/projects';
import type { Project } from '@/types/project';

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Project>) => projectsApi.createProject(data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.all,
      });
    },
  });
}
