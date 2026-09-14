import { projectsApi } from '@/api/projects';
import type { ProjectExt } from '@/features/projects/hooks/useProjectDetail';

export function useProjectGeneralSettings() {
  return {
    updateProjectInfo: (
      projectId: string,
      values: Pick<ProjectExt, 'name' | 'description'>,
    ) => projectsApi.updateProject(projectId, values) as Promise<ProjectExt>,
  };
}
