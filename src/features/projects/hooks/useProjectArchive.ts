import { useCallback, useEffect, useState } from 'react';

import { projectsApi, type ProjectArchiveImpact } from '@/api/projects';

function errorMessage(error: unknown, fallback: string) {
  const candidate = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return candidate.response?.data?.message ?? candidate.message ?? fallback;
}

export function useProjectArchive(projectId: string) {
  const [impact, setImpact] = useState<ProjectArchiveImpact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshImpact = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setImpact(await projectsApi.getArchiveImpact(projectId));
    } catch (impactError) {
      setImpact(null);
      setError(
        errorMessage(impactError, 'Could not load the project archive impact.'),
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refreshImpact();
  }, [refreshImpact]);

  return {
    impact,
    loading,
    error,
    refreshImpact,
    archiveProject: (confirmation: string) =>
      projectsApi.deleteProject(projectId, confirmation),
    archiveErrorMessage: (archiveError: unknown) =>
      errorMessage(archiveError, 'Could not archive this project.'),
  };
}
