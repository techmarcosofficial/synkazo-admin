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

export type QueueScheduleMode =
  'interval' | 'daily_time' | 'day_specific' | 'one_time';

export type QueueJobBaselineMode =
  | 'from_now'
  | 'last_1_hour'
  | 'last_6_hours'
  | 'last_24_hours'
  | 'last_7_days'
  | 'last_30_days'
  | 'custom';

export type QueueCycleStatus =
  | 'running'
  | 'awaiting_associations'
  | 'running_associations'
  | 'running_company_owner_sync'
  | 'completed'
  | 'partially_completed'
  | 'failed'
  | 'cancelled';

export type StageOutcomeStatus =
  | 'not_started'
  | 'waiting'
  | 'running'
  | 'completed'
  | 'partially_completed'
  | 'failed'
  | 'skipped';

export interface AssociationItemResult {
  objectName: string;
  status: 'completed' | 'partially_completed' | 'failed';
  rulesRun: number;
  rulesFailed: number;
  error?: string;
}

export interface ProjectQueue {
  id: string;
  projectId: string;
  status: ProjectQueueStatus;
  pauseReason?: string | null;
  startCronExpression?: string | null;
  timezone?: string | null;
  scheduleMode?: QueueScheduleMode | null;
  scheduleTimes?: string[] | null;
  intervalMinutes?: number | null;
  scheduleDays?: number[] | null;
  oneTimeAt?: string | null;
  oneTimeCompletedAt?: string | null;
  associationQueueEnabled: boolean;
  associationDelayMinutes: number;
  companyOwnerSyncEnabled: boolean;
  nextStartAt?: string | null;
  activeCycleId?: string | null;
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
  baselineMode?: QueueJobBaselineMode | null;
  customBaselineAt?: string | null;
  baselineTimezone?: string | null;
  consecutiveFailures: number;
  staleIterationCount?: number;
  blocked: boolean;
  blockedReason?: string | null;
  lastExecutionStatus?: QueueExecutionStatus | null;
  lastErrorMessage?: string | null;
}

export interface QueueExecution {
  id: string;
  queueId: string;
  cycleId?: string | null;
  iterationNumber?: number;
  projectId: string;
  queueJobId: string;
  jobId: string;
  job?: Job;
  jobRunId?: string | null;
  status: QueueExecutionStatus;
  executionWindowSec: number;
  startedAt: string;
  windowEndsAt: string;
  incrementalSinceOverride?: string | null;
  finishedAt?: string | null;
  checkpointSnapshot?: Record<string, unknown> | null;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errorMessage?: string | null;
}

export interface QueueCycle {
  id: string;
  queueId: string;
  projectId: string;
  status: QueueCycleStatus;
  cycleStartAt: string;
  currentIteration: number;
  currentQueueJobId?: string | null;
  currentExecutionId?: string | null;
  jobsCompletedAt?: string | null;
  associationsStatus: StageOutcomeStatus;
  associationsDelayUntil?: string | null;
  associationsStartedAt?: string | null;
  associationsCompletedAt?: string | null;
  associationsItemResults?: AssociationItemResult[] | null;
  companyOwnerSyncStatus: StageOutcomeStatus;
  companyOwnerSyncStartedAt?: string | null;
  companyOwnerSyncCompletedAt?: string | null;
  companyOwnerSyncRetryCount: number;
  companyOwnerSyncErrorMessage?: string | null;
  completedAt?: string | null;
}

export interface AssociationQueueItem {
  id: string;
  queueId: string;
  objectName: string;
  position: number;
  enabled: boolean;
}

export interface PriorityQueueConfig {
  schedulerMode: SchedulerMode;
  queue: ProjectQueue | null;
  queueJobs: QueueJob[];
  associationQueueItems: AssociationQueueItem[];
  activeCycle: QueueCycle | null;
  currentExecution: QueueExecution | null;
  currentQueueJob: QueueJob | null;
  nextQueueJob: QueueJob | null;
  displayStatus: string;
}
