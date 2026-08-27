import { useQuery } from '@tanstack/react-query';

import { jobsApi } from '@/api/jobs';
import { syncLogsApi } from '@/api/syncLogs';
import {
  useProjectDetailQuery,
  type ConnectionExt,
  type JobExt,
  type ProjectExt,
} from '@/features/projects/hooks';
import {
  deriveProjectSetupState,
  type ProjectSetupState,
} from '@/features/projects/lib/projectSetupState';
import type { FieldMapping, SyncRun } from '@/types';

export interface ProjectSetupStateData {
  state: ProjectSetupState;
  project: ProjectExt | null;
  connections: ConnectionExt[];
  jobs: JobExt[];
  primaryJob: JobExt | null;
  fieldMappings: FieldMapping[] | undefined;
  latestTestRun: SyncRun | null | undefined;
  loading: boolean;
  refetch: () => void;
}

// The primary job during setup — the oldest (first-created) job, since jobs[]
// is sorted newest-first by useProjectDetailQuery. Steps 3/4 of the wizard
// only ever create one job, so this is unambiguous in practice.
function getPrimaryJob(jobs: JobExt[]): JobExt | null {
  return jobs.length > 0 ? jobs[jobs.length - 1] : null;
}

export function useProjectSetupState(
  projectId: string | null | undefined,
): ProjectSetupStateData {
  const detailQuery = useProjectDetailQuery(projectId);
  const jobs = detailQuery.data?.jobs ?? [];
  const primaryJob = getPrimaryJob(jobs);

  const fieldMappingsQuery = useQuery({
    queryKey: ['projects', projectId, 'jobs', primaryJob?.id, 'field-mappings'],
    queryFn: (): Promise<FieldMapping[]> =>
      jobsApi.listFieldMappings(projectId!, primaryJob!.id),
    enabled: !!projectId && !!primaryJob?.id,
  });

  const testRunQuery = useQuery({
    queryKey: ['projects', projectId, 'jobs', primaryJob?.id, 'latest-run-log'],
    queryFn: async (): Promise<SyncRun | null> => {
      const res = await syncLogsApi.listRunLogs(projectId!, primaryJob!.id, {
        limit: 1,
      });
      return res.data?.[0] ?? null;
    },
    enabled: !!projectId && !!primaryJob?.id,
  });

  const project = detailQuery.data?.project ?? null;
  const connections = detailQuery.data?.connections ?? [];
  const loading =
    detailQuery.isLoading ||
    (!!primaryJob?.id &&
      (fieldMappingsQuery.isLoading || testRunQuery.isLoading));

  // primaryJobFieldMappings/latestTestRun aren't part of SetupStateInput today —
  // deriveProjectSetupState only reads project/connections/jobs. Exposed below
  // as separate hook fields for step components that want them directly.
  const state: ProjectSetupState = project
    ? deriveProjectSetupState({ project, connections, jobs })
    : 'Draft';

  return {
    state,
    project,
    connections,
    jobs,
    primaryJob,
    fieldMappings: fieldMappingsQuery.data,
    latestTestRun: testRunQuery.data,
    loading,
    refetch: () => {
      detailQuery.refetch();
      fieldMappingsQuery.refetch();
      testRunQuery.refetch();
    },
  };
}
