import { useQuery, useQueryClient } from '@tanstack/react-query';

import { connectionsApi } from '@/api/connections';
import { jobsApi } from '@/api/jobs';
import { projectsApi } from '@/api/projects';
import { syncLogsApi } from '@/api/syncLogs';
import type {
  FieldMapping,
  Job,
  OnEmptyPolicy,
  Project,
  SyncRun,
  UpdatePolicy,
} from '@/types';

export type ScheduleState =
  | 'active'
  | 'paused'
  | 'retry_pending'
  | 'paused_limit_reached'
  | 'resume_pending';

export type InitialSyncPeriod = 'now' | '24h' | '7d' | '30d' | 'custom';

export interface ScheduleTogglePayload {
  initialSyncPeriod?: InitialSyncPeriod;
  customSince?: string;
  resumeMode?: 'sync_missed' | 'start_now';
}

export interface ExtJob extends Job {
  scheduleMode?: string;
  scheduleTimes?: string[];
  scheduleDays?: number[];
  scheduleState?: ScheduleState;
  syncDirection?: string;
  syncTrigger?: string;
  recordsSynced?: number;
  errorCount?: number;
  destPipelineId?: string | null;
  statusMapping?: Record<string, string> | null;
  idMappingSourceField?: string | null;
  idMappingDestField?: string | null;
  isRunning?: boolean;
}

export interface ExtSyncRun extends Omit<SyncRun, 'status'> {
  status: SyncRun['status'] | 'queued';
  createdCount?: number;
  updatedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  totalFetched?: number;
  bullmqJobId?: string | null;
  triggeredBy?: string;
  startedAt?: string;
  durationMs?: number;
}

export interface ConsolidatedMapping extends Omit<FieldMapping, 'destField'> {
  destField: string | string[];
  destRules?: Record<string, unknown>;
  /** Empty-value policy per destination, for the same fan-out reason as destRules. */
  destOnEmpty?: Record<string, OnEmptyPolicy>;
  destDefaults?: Record<string, string>;
  /** Reverse-leg counterpart of destOnEmpty/destDefaults — see MappingRow in
   *  FieldMappingCanvas. */
  destReverseOnEmpty?: Record<string, OnEmptyPolicy>;
  destReverseDefaults?: Record<string, string>;
  /** What happens to this destination's value on an update (not a create), keyed
   *  per destination for the same fan-out reason as destOnEmpty. */
  destUpdatePolicy?: Record<string, UpdatePolicy>;
  /** Only meaningful for destinations whose destUpdatePolicy entry is 'fill_if_empty' —
   *  see conflictScope on FieldMapping. */
  destConflictScope?: Record<string, 'field' | 'record'>;
  transformConfig?: unknown;
  isRequired?: boolean;
  /** Set by the canvas when the user waves off a type mismatch. Not persisted. */
  dismissed?: boolean;
  /** Which of this row's (possibly several) destinations is the match/lookup field, if any —
   *  per-destination because is_match_field is stored per (source, dest) pair in the DB, and a
   *  fanned-out source must be able to mark exactly one destination as the match field, not all
   *  of them. Superseds the inherited `isMatchField`, which collapses to just the first DB row's
   *  value once consolidated and must not be read after this. */
  matchDestKey?: string | null;
  /** Priority tier for matchDestKey when more than one source row is a match
   *  field (lower tried first — OR mode). Null/unset on every match field
   *  means AND mode (all must agree) instead — see FieldMappingCanvas. */
  matchOrder?: number | null;
}

export function consolidateMappings(
  rows: FieldMapping[] | undefined | null,
): ConsolidatedMapping[] {
  const map = new Map<string, ConsolidatedMapping>();
  (rows || []).forEach((row: FieldMapping) => {
    const rowWithTransform = row as FieldMapping & {
      transformConfig?: { rules?: unknown };
    };
    const matchDestKey = row.isMatchField ? row.destField : undefined;
    const matchOrder = row.isMatchField ? (row.matchPriority ?? null) : null;
    const onEmpty = row.onEmpty && row.onEmpty !== 'none' ? row.onEmpty : null;
    const reverseOnEmpty =
      row.reverseOnEmpty && row.reverseOnEmpty !== 'none'
        ? row.reverseOnEmpty
        : null;
    const updatePolicy =
      row.updatePolicy && row.updatePolicy !== 'always'
        ? row.updatePolicy
        : null;
    const conflictScope =
      row.conflictScope && row.conflictScope !== 'field'
        ? row.conflictScope
        : null;
    if (map.has(row.sourceField)) {
      const existing = map.get(row.sourceField)!;
      existing.destField = Array.isArray(existing.destField)
        ? [...existing.destField, row.destField]
        : [existing.destField, row.destField];
      if (rowWithTransform.transformConfig?.rules) {
        existing.destRules = existing.destRules ?? {};
        existing.destRules[row.destField] =
          rowWithTransform.transformConfig.rules;
      }
      if (onEmpty) {
        existing.destOnEmpty = existing.destOnEmpty ?? {};
        existing.destOnEmpty[row.destField] = onEmpty;
        existing.destDefaults = existing.destDefaults ?? {};
        existing.destDefaults[row.destField] = row.defaultValue ?? '';
      }
      if (reverseOnEmpty) {
        existing.destReverseOnEmpty = existing.destReverseOnEmpty ?? {};
        existing.destReverseOnEmpty[row.destField] = reverseOnEmpty;
        existing.destReverseDefaults = existing.destReverseDefaults ?? {};
        existing.destReverseDefaults[row.destField] =
          row.reverseDefaultValue ?? '';
      }
      if (matchDestKey) {
        existing.matchDestKey = matchDestKey;
        existing.matchOrder = matchOrder;
      }
      if (updatePolicy) {
        existing.destUpdatePolicy = existing.destUpdatePolicy ?? {};
        existing.destUpdatePolicy[row.destField] = updatePolicy;
      }
      if (conflictScope) {
        existing.destConflictScope = existing.destConflictScope ?? {};
        existing.destConflictScope[row.destField] = conflictScope;
      }
    } else {
      map.set(row.sourceField, {
        ...row,
        matchDestKey,
        matchOrder,
        destRules: rowWithTransform.transformConfig?.rules
          ? { [row.destField]: rowWithTransform.transformConfig.rules }
          : {},
        destOnEmpty: onEmpty ? { [row.destField]: onEmpty } : {},
        destDefaults: onEmpty
          ? { [row.destField]: row.defaultValue ?? '' }
          : {},
        destReverseOnEmpty: reverseOnEmpty
          ? { [row.destField]: reverseOnEmpty }
          : {},
        destReverseDefaults: reverseOnEmpty
          ? { [row.destField]: row.reverseDefaultValue ?? '' }
          : {},
        destUpdatePolicy: updatePolicy ? { [row.destField]: updatePolicy } : {},
        destConflictScope: conflictScope
          ? { [row.destField]: conflictScope }
          : {},
      });
    }
  });
  return Array.from(map.values());
}

const KNOWN_PIPELINE_OBJECTS = new Set([
  'deals',
  'tickets',
  'projects',
  '0-970',
]);

export interface JobDetailData {
  job: ExtJob;
  project: Project | null;
  runLogs: ExtSyncRun[];
  jobFieldMappings: ConsolidatedMapping[];
  hasConnection: boolean;
  pipelineRequired: boolean;
  pipelineConfigured: boolean;
}

export function jobDetailQueryKey(projectId: string, jobId: string) {
  return ['jobs', 'detail-bundle', projectId, jobId] as const;
}

// One composite query for the JobDetail page's initial load — job, recent
// run logs, field mappings, connection presence, and pipeline requirement
// are all fetched together (matching the original page's loadData()) so
// they refresh as one unit.
export function useJobDetailQuery(projectId: string, jobId: string) {
  return useQuery({
    queryKey: jobDetailQueryKey(projectId, jobId),
    queryFn: async (): Promise<JobDetailData> => {
      const [
        foundJob,
        runLogsRes,
        mappingsRes,
        connectionsRes,
        foundProject,
        ps,
      ] = await Promise.all([
        jobsApi.getJob(projectId, jobId),
        syncLogsApi.listRunLogs(projectId, jobId, { limit: 20 }),
        jobsApi
          .listFieldMappings(projectId, jobId)
          .then(consolidateMappings)
          .catch(() => []),
        connectionsApi.listProjectConnections(projectId).catch(() => []),
        projectsApi.getProject(projectId).catch(() => null),
        jobsApi.getPipelineStatus(projectId, jobId).catch(() => null),
      ]);
      const extJob = foundJob as ExtJob;
      const psAny = ps as Record<string, unknown> | null;
      const pipeReq =
        psAny?.['required'] === true ||
        KNOWN_PIPELINE_OBJECTS.has(extJob?.destObject ?? '');
      return {
        job: extJob,
        project: foundProject,
        runLogs: (runLogsRes as { data?: ExtSyncRun[] }).data || [],
        jobFieldMappings: (mappingsRes as ConsolidatedMapping[]) || [],
        hasConnection: (connectionsRes || []).length > 0,
        pipelineRequired: pipeReq || !!extJob?.destPipelineId,
        pipelineConfigured: !pipeReq || psAny?.['configured'] === true,
      };
    },
    enabled: !!projectId && !!jobId,
  });
}

export function useJobDetailCacheHelpers(projectId: string, jobId: string) {
  const queryClient = useQueryClient();
  const key = jobDetailQueryKey(projectId, jobId);
  return {
    patchJob: (patch: Partial<ExtJob>) =>
      queryClient.setQueryData<JobDetailData>(key, (old) =>
        old ? { ...old, job: { ...old.job, ...patch } } : old,
      ),
    setRunLogs: (runLogs: ExtSyncRun[]) =>
      queryClient.setQueryData<JobDetailData>(key, (old) =>
        old ? { ...old, runLogs } : old,
      ),
  };
}
