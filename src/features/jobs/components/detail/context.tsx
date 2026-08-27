import { createContext, useContext, type ReactNode } from 'react';

import type {
  ConsolidatedMapping,
  ExtJob,
  ExtSyncRun,
  ScheduleTogglePayload,
} from '@/features/jobs/hooks';
import type { JobDetailTabId } from '@/features/jobs/lib/jobDetailTabs';
import type { Project } from '@/types';

export interface JobDetailContextValue {
  projectId: string;
  jobId: string;
  job: ExtJob;
  project: Project | null;
  runLogs: ExtSyncRun[];
  jobFieldMappings: ConsolidatedMapping[];
  hasConnection: boolean;
  pipelineRequired: boolean;
  pipelineConfigured: boolean;
  patchJob: (patch: Partial<ExtJob>) => void;
  refetch: () => void;
  handleTabChange: (
    id: JobDetailTabId,
    options?: { replace?: boolean },
  ) => void;

  // Run/schedule state — see useJobRunState.
  activeRunLog: Partial<ExtSyncRun> | null;
  liveProgress: {
    totalRecords?: number;
    recordsProcessed?: number;
    etaSeconds?: number;
    ratePerSec?: number;
  } | null;
  upgradeDialog: { open: boolean; message: string };
  setUpgradeDialog: (value: { open: boolean; message: string }) => void;
  isSyncing: boolean;
  running: boolean;
  fullResyncing: boolean;
  stopping: boolean;
  toggling: boolean;
  scheduleToggling: boolean;
  cancellingQueue: boolean;
  retryingQueue: boolean;
  beginTracking: () => Promise<void>;
  handleRunNow: () => Promise<void>;
  handleSyncAll: (
    onStarted?: () => void,
    range?: { startDate?: string; endDate?: string },
  ) => Promise<void>;
  handleScheduleToggle: (payload?: ScheduleTogglePayload) => Promise<void>;
  handleStop: () => Promise<void>;
  handleCancelQueue: () => Promise<void>;
  handleRetryQueue: () => Promise<void>;
  handleToggle: () => Promise<void>;
}

const JobDetailContext = createContext<JobDetailContextValue | null>(null);

// Shares the composite JobDetail query + run-state orchestration across the
// tab tree so each tab takes only its own genuinely local state, matching
// features/projects/components/detail/context.tsx.
export function JobDetailProvider({
  value,
  children,
}: {
  value: JobDetailContextValue;
  children: ReactNode;
}) {
  return (
    <JobDetailContext.Provider value={value}>
      {children}
    </JobDetailContext.Provider>
  );
}

export function useJobDetailContext(): JobDetailContextValue {
  const ctx = useContext(JobDetailContext);
  if (!ctx)
    throw new Error(
      'useJobDetailContext must be used within JobDetailProvider',
    );
  return ctx;
}
