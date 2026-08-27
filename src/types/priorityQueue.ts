import type { Job } from './job';
import type { SchedulerMode } from './project';

export type ProjectQueueStatus = 'idle' | 'running' | 'paused';

export type QueueExecutionStatus =
  | 'running'
  | 'completed'
  | 'time_limit_reached'
  | 'failed'
  | 'interrupted'
  | 'plan_limit_reached'
  | 'cancelled';

export interface ProjectQueue {
  id: string;
  projectId: string;
  status: ProjectQueueStatus;
  pauseReason?: string | null;
  startCronExpression?: string | null;
  timezone?: string | null;
  nextStartAt?: string | null;
  currentPosition: number;
  currentQueueJobId?: string | null;
  currentExecutionId?: string | null;
  lastHeartbeatAt?: string | null;
  lastExecutionAt?: string | null;
}

export interface QueueJob {
  id: string;
  queueId: string;
  jobId: string;
  job?: Job;
  position: number;
  enabled: boolean;
  executionWindowSec: number;
  overrideSyncConfig?: Record<string, unknown> | null;
  consecutiveFailures: number;
  blocked: boolean;
  blockedReason?: string | null;
  lastExecutionStatus?: QueueExecutionStatus | null;
  lastErrorMessage?: string | null;
}

export interface QueueExecution {
  id: string;
  queueId: string;
  projectId: string;
  queueJobId: string;
  jobId: string;
  job?: Job;
  jobRunId?: string | null;
  status: QueueExecutionStatus;
  executionWindowSec: number;
  startedAt: string;
  windowEndsAt: string;
  finishedAt?: string | null;
  checkpointSnapshot?: Record<string, unknown> | null;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errorMessage?: string | null;
}

export interface PriorityQueueConfig {
  schedulerMode: SchedulerMode;
  queue: ProjectQueue | null;
  queueJobs: QueueJob[];
  currentExecution: QueueExecution | null;
  currentQueueJob: QueueJob | null;
  nextQueueJob: QueueJob | null;
}
