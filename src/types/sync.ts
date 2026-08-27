export type SyncRunStatus =
  | 'success'
  | 'error'
  | 'running'
  | 'pending'
  | 'cancelled'
  | 'paused'
  | 'partial'
  // Real backend `sync_run_logs.status` values (SyncRunStatus enum in
  // backend/src/sync/entities/sync-run-log.entity.ts) — kept alongside the
  // legacy values above rather than replacing them, since other call sites
  // already compare against those.
  | 'completed'
  | 'failed';

export interface SyncRun {
  id: string;
  jobId: string;
  status: SyncRunStatus;
  recordsProcessed?: number;
  recordsFailed?: number;
  recordsCreated?: number;
  recordsUpdated?: number;
  recordsSkipped?: number;
  totalFetched?: number;
  startedAt?: string;
  finishedAt?: string | null;
  durationMs?: number;
  checkpointPage?: number;
  errorMessage?: string | null;
  /** API-returned count fields (backend entity names) */
  createdCount?: number;
  updatedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  /**
   * Which way this particular run moved data. A two-way job's forward and
   * reverse legs share one job row but swap source and destination, so these
   * are per-run, not per-job — they are the only thing that distinguishes a
   * ServiceTitan→HubSpot pass from the HubSpot→ServiceTitan one in the history.
   */
  sourceObject?: string;
  destObject?: string;
  sourcePlatform?: string;
  destPlatform?: string;
}

export interface SyncLogRecord {
  id: string;
  action: 'created' | 'updated' | 'skipped' | 'failed';
  sourceRecordId: string;
  destRecordId?: string | null;
  skipReason?: string | null;
  skipReasonDetail?: string | null;
  failReason?: string | null;
  failReasonDetail?: string | null;
  pageNumber?: number;
}

/** Estimate returned before starting a sync run */
export interface SyncEstimate {
  /** True when the source API can return an exact total-record count */
  countAvailable: boolean;
  totalRecords: number | null;
  pages: number | null;
  pageSize: number;
  estimatedSeconds: number | null;
  ratePerSec: number;
  basis: 'history' | 'default' | 'unknown';
  /** Legacy fields kept for back-compat */
  estimatedRecords?: number;
  estimatedPages?: number;
  estimatedDurationSeconds?: number;
}
