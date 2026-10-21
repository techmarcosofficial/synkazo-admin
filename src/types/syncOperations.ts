export interface MonitorProgress {
  observedAt: string;
  source: 'live' | 'checkpoint' | 'unavailable';
  attempted: number | null;
  created: number | null;
  updated: number | null;
  skipped: number | null;
  failed: number | null;
  total: number | null;
  completedBatches: number | null;
  currentBatch: number | null;
  batchProcessed: number | null;
  batchTotal: number | null;
  totalBatches: number | null;
  ratePerSec: number | null;
}
export interface MonitorRun {
  id: string;
  syncRunLogId: string | null;
  bullJobId: string | null;
  organisationId: string;
  organisationName: string;
  projectId: string;
  projectName: string;
  jobId: string;
  jobName: string;
  trigger: string;
  mode: string | null;
  status: string;
  source: string | null;
  destination: string | null;
  startedAt: string;
  finishedAt: string | null;
  processId: string | null;
  executionObserved: boolean;
  progress: MonitorProgress;
}
export interface MonitorRunPage {
  generatedAt: string;
  data: MonitorRun[];
  nextCursor: string | null;
}
export interface MonitorProcess {
  id: string;
  role: 'queue_worker' | 'api';
  sampledAt: string;
  uptimeSeconds: number;
  rssMb: number;
  heapUsedMb: number;
  cpuCorePercent: number;
  memoryLimitMb: number | null;
  executions: { id: string; mode: string; origin: string }[];
  truncated: boolean;
}
export interface MonitorSnapshot extends MonitorRunPage {
  queue: {
    observedAt: string;
    data: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      workerOnline: boolean;
    };
  } | null;
  processes: MonitorProcess[];
  errors: Partial<Record<'runs' | 'queue' | 'processes', string>>;
}
export type MonitorRunStatus =
  | 'running'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'cancelled'
  | 'limit_reached'
  | 'time_limit_reached';
export interface MonitorFilters {
  status?: MonitorRunStatus;
  organisationId?: string;
  trigger?: string;
  integration?: string;
  sort?: 'oldest' | 'newest';
  cursor?: string;
}
