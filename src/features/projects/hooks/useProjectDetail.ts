import { useQuery, useQueryClient } from '@tanstack/react-query';

import { associationsApi, type AssociationRule } from '@/api/associations';
import { connectionsApi } from '@/api/connections';
import { jobsApi } from '@/api/jobs';
import { projectsApi } from '@/api/projects';
import { syncLogsApi } from '@/api/syncLogs';
import type { Connection, Job, Project, ProjectEnvironment } from '@/types';

export interface ProjectExt extends Project {
  activeEnvironment?: ProjectEnvironment;
  environmentActivatedAt?: string | null;
  lastSyncedAt?: string | null;
  description?: string;
  totalRecordsSynced?: number;
  totalErrorCount?: number;
}

export interface JobExt extends Job {
  syncDirection?: string;
  recordsSynced?: number;
  errorCount?: number;
  scheduleTimes?: string[];
  scheduleDays?: number[];
  scheduleMode?: string;
}

export type ConnectionExt = Connection;

export interface ProjectActivityLogMetadata {
  triggeredBy?: string;
  status?: 'success' | 'partial' | 'failed' | 'cancelled';
  jobName?: string;
  projectName?: string;
  sourceObject?: string;
  destObject?: string;
  sourcePlatformId?: string;
  destPlatformId?: string;
}

export interface ProjectActivityLog {
  id: string;
  level: string;
  message: string;
  createdAt?: string;
  jobId?: string | null;
  jobRunId?: string | null;
  recordsProcessed?: number;
  durationMs?: number | null;
  metadata?: ProjectActivityLogMetadata | null;
}

export interface ProjectDetailData {
  project: ProjectExt;
  jobs: JobExt[];
  connections: ConnectionExt[];
  logs: ProjectActivityLog[];
  associationRules: AssociationRule[];
}

export function projectDetailQueryKey(projectId: string) {
  return ['projects', 'detail-bundle', projectId] as const;
}

// One composite query for the whole ProjectDetail page — project, jobs,
// connections, logs, and association rules are all loaded and refreshed
// together (matching the original page's single loadData() bootstrap), so
// they're modeled as one cached unit rather than five independent queries.
//
// projectId may be null/undefined for consumers that are always mounted
// (e.g. the global SetupWizardDialog) but only have a project to load once
// a user opens it — `enabled` keeps the query dormant until then.
export function useProjectDetailQuery(projectId: string | null | undefined) {
  return useQuery({
    queryKey: projectDetailQueryKey(projectId ?? ''),
    queryFn: async (): Promise<ProjectDetailData> => {
      const id = projectId!;
      const [proj, allJobs, allConns, logsRes, rules] = await Promise.all([
        projectsApi.getProject(id),
        jobsApi.listJobs(id),
        connectionsApi.listProjectConnections(id),
        syncLogsApi.listProjectSyncLogs(id, { limit: 50 }),
        associationsApi.listRules(id).catch(() => []),
      ]);
      const rawLogs = ((logsRes as { data?: unknown[] }).data ||
        logsRes) as ProjectActivityLog[];
      return {
        project: proj as ProjectExt,
        jobs: (allJobs as JobExt[]).sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        ),
        connections: allConns as ConnectionExt[],
        logs: rawLogs.sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        ),
        associationRules: rules,
      };
    },
    enabled: !!projectId,
  });
}

// Optimistic cache patches for the handful of mutation sites on this page
// that used to call setProject()/setConnections() directly — keeps the UI
// responsive without waiting on the next refetch/SSE event.
export function useProjectDetailCacheHelpers(projectId: string) {
  const queryClient = useQueryClient();
  const key = projectDetailQueryKey(projectId);
  return {
    patchProject: (patch: Partial<ProjectExt>) =>
      queryClient.setQueryData<ProjectDetailData>(key, (old) =>
        old ? { ...old, project: { ...old.project, ...patch } } : old,
      ),
    setConnections: (conns: ConnectionExt[]) =>
      queryClient.setQueryData<ProjectDetailData>(key, (old) =>
        old ? { ...old, connections: conns } : old,
      ),
  };
}
