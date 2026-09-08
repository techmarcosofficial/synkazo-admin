import { createContext, useContext, type ReactNode } from 'react';

import type {
  ConnectionExt,
  JobExt,
  ProjectActivityLog,
  ProjectExt,
} from '@/features/projects/hooks';
import type { ProjectDetailTabId } from '@/features/projects/lib/projectDetailTabs';
import type { ProjectEnvironment } from '@/types';

export interface ProjectDetailContextValue {
  projectId: string;
  project: ProjectExt;
  jobs: JobExt[];
  connections: ConnectionExt[];
  logs: ProjectActivityLog[];
  hasBothConnections: boolean;
  hasJobs: boolean;
  patchProject: (patch: Partial<ProjectExt>) => void;
  setConnectionsCache: (conns: ConnectionExt[]) => void;
  refetch: () => void;
  handleTabChange: (
    id: ProjectDetailTabId,
    options?: { replace?: boolean },
  ) => void;

  // Sync-job creation is triggered from the Sync Jobs tab and the Connections
  // tab's ready state, so the open state + combined navigation action live here.
  showCreateJob: boolean;
  setShowCreateJob: (open: boolean) => void;
  onCreateSyncRule: () => void;

  // Sandbox/Production activation — surfaced in the header and read by the
  // Connections tab (to pass through to ConnectionsManager).
  projectActiveEnv: ProjectEnvironment | null;
  envActivating: boolean;
  envDiffLoading: boolean;
  envFullyConnected: (env: string) => boolean;
  envHasAnyConnected: (env: string) => boolean;
  onActivateEnv: (env: ProjectEnvironment) => void;
  connReloadKey: number;
}

const ProjectDetailContext = createContext<ProjectDetailContextValue | null>(
  null,
);

// Shares the composite ProjectDetail query + page-level orchestration state
// across the tab tree so each tab component takes only its own genuinely
// local props instead of a long prop chain from ProjectDetailPage.
export function ProjectDetailProvider({
  value,
  children,
}: {
  value: ProjectDetailContextValue;
  children: ReactNode;
}) {
  return (
    <ProjectDetailContext.Provider value={value}>
      {children}
    </ProjectDetailContext.Provider>
  );
}

export function useProjectDetailContext(): ProjectDetailContextValue {
  const ctx = useContext(ProjectDetailContext);
  if (!ctx)
    throw new Error(
      'useProjectDetailContext must be used within ProjectDetailProvider',
    );
  return ctx;
}
