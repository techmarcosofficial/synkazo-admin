export type JobStatus =
  'active' | 'paused' | 'error' | 'idle' | 'running' | 'draft';

export interface Job {
  id: string;
  projectId: string;
  name: string;
  sourceObject: string;
  destObject: string;
  status: JobStatus;
  schedule?: string;
  syncEnabled?: boolean;
  isEnabled?: boolean;
  isSchedulePaused?: boolean;
  isRunning?: boolean;
  lastSyncedAt?: string | null;
  nextRunAt?: string | null;
  checkpointPage?: number;
  checkpointSince?: string | null;
  /** Page a Sync All (full resync) had reached when it was interrupted — null once it
   *  completes normally. Lets the next Sync All resume instead of restarting at page 1. */
  syncAllPage?: number | null;
  /** Requested [start, end] bounds of the current/last date-ranged Sync All (one-way jobs
   *  only). Null for a plain unbounded Sync All. */
  syncAllRangeStart?: string | null;
  syncAllRangeEnd?: string | null;
  /** Timestamp of the last record actually processed within the current/last ranged
   *  Sync All — real data progress, not the wall-clock time the run was stopped. */
  syncAllProgressDate?: string | null;
  priority?: number;
  cronExpression?: string | null;
  intervalMinutes?: number | null;
  timezone?: string | null;
  dependsOnJobId?: string | null;
  maxRetries?: number;
  retryBackoffBaseSec?: number;
  createdAt?: string;
  updatedAt?: string;
  syncDirection?: string;
  sourceOfTruth?: string | null;
  conflictResolutionStrategy?: string;
  deleteHandling?: string;
  hubspotWebhookEnabled?: boolean;
  syncTrigger?: string;
  idMappingSourceField?: string | null;
  idMappingDestField?: string | null;
  scheduleMode?: string | null;
  scheduleTimes?: string[] | null;
  scheduleDays?: number[] | null;
  scheduleState?: string;
  destPipelineId?: string | null;
  statusMapping?: Record<string, string> | null;
  recordsSynced?: number;
  errorCount?: number;
}

export interface DataCheckupResult {
  sourceObject: string;
  destObject: string;
  sourcePlatform: string;
  destPlatform: string;
  matchFields: { sourceField: string; destField: string }[];
  matched: number;
  differing: number;
  sourceOnly: number;
  destOnly: number;
  sourceSampled: number;
  destSampled: number;
  capped: boolean;
  cap: number;
  checkedAt: string;
}

export interface RuleMatchScoreResult {
  matchCount: number;
  totalCount: number;
  percentage: number | null;
  capped: boolean;
  unavailable?: boolean;
  reason?: string;
}

// Super-admin per-source override for the two-way sync polling interval (item 5).
export interface TwoWaySyncInterval {
  platformId: string;
  label: string;
  intervalMinutes: number;
  isDefault: boolean;
}

export type FieldMappingDirection =
  'forward_only' | 'reverse_only' | 'bidirectional';

/** What the sync does when a mapping's value comes out empty. */
export type OnEmptyPolicy = 'none' | 'default' | 'skip_record';

/** What happens to an already-mapped field on an update (not a create). */
export type UpdatePolicy = 'always' | 'create_only' | 'fill_if_empty';

export interface FieldMapping {
  id?: string;
  jobId?: string;
  /** Empty marks a constant mapping with no counterpart on that side — the
   *  default value is written instead. */
  sourceField: string;
  destField: string;
  isMatchField?: boolean;
  /** Priority tier when more than one field is flagged isMatchField (lower
   *  tried first, e.g. email=1 falling back to customer_number=2). Leave
   *  unset to AND all match fields together instead (default behaviour). */
  matchPriority?: number | null;
  /** What happens to this field on an update: always write it, never touch
   *  it again after creation, or only fill it in if the destination's
   *  current value is empty (logging a conflict otherwise). */
  updatePolicy?: UpdatePolicy;
  transform?: string | null;
  enabled?: boolean;
  order?: number;
  /** Which leg(s) of a two-way job this mapping applies to. Ignored for one-way jobs. */
  direction?: FieldMappingDirection;
  onEmpty?: OnEmptyPolicy;
  defaultValue?: string | null;
  /** Reverse-leg counterpart of onEmpty/defaultValue — only consulted for
   *  BIDIRECTIONAL mappings when the sync writes back into the source platform. */
  reverseOnEmpty?: OnEmptyPolicy;
  reverseDefaultValue?: string | null;
}

export interface SyncConflict {
  id: string;
  projectId: string;
  jobId: string;
  fieldName: string;
  sourceValue: string | null;
  destValue: string | null;
  resolutionStrategy: string;
  resolvedValue: string | null;
  resolvedBy: 'system' | 'user';
  status: 'auto_resolved' | 'pending_review' | 'resolved_manually';
  createdAt: string;
  resolvedAt: string | null;
}

export interface PipelineStatus {
  required: boolean;
  configured: boolean;
  objectType: string;
  configuredVia: 'job_config' | 'field_mapping' | null;
  pipelines: Array<{
    id: string;
    label: string;
    stages: Array<{ id: string; label: string; displayOrder: number }>;
  }>;
  activePipelineId?: string;
  error?: string;
  scopeError?: string;
}

export interface SchedulerRecentRun {
  id: string;
  status: string;
  startedAt: string;
  finishedAt?: string | null;
  triggeredBy?: string;
  recordsProcessed?: number;
  errorCount?: number;
}

export interface SchedulerJob extends Job {
  isRunning?: boolean;
  recentRuns?: SchedulerRecentRun[];
}
