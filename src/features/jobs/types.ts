// features/jobs/types.ts — types specific to the Create Job wizard.
// (Job Detail's composite-query types live in hooks/useJobDetail.ts, mirroring
// how features/projects/hooks/useProjectDetail.ts owns ProjectExt/JobExt.)

export interface MappingRow {
  sourceField: string;
  destField: string | string[];
  sourceType?: string;
  destType?: string;
  transformType?: string;
  rules?: unknown[];
  /** Which of this row's (possibly several) destinations is the match/lookup field, if any. */
  matchDestKey?: string | null;
  dismissed?: boolean;
  destRules?: Record<string, unknown[]>;
  /** Empty-value policy per destination — see MappingRow in FieldMappingCanvas. */
  destOnEmpty?: Record<string, 'none' | 'default' | 'skip_record'>;
  destDefaults?: Record<string, string>;
  /** Reverse-leg counterpart of destOnEmpty/destDefaults — see MappingRow in
   *  FieldMappingCanvas. */
  destReverseOnEmpty?: Record<string, 'none' | 'default' | 'skip_record'>;
  destReverseDefaults?: Record<string, string>;
  [k: string]: unknown;
}

export interface PipelineItem {
  id: string;
  label: string;
  stages?: Array<{ id: string; label: string; displayOrder?: number }>;
}

export interface PipelineStatusResponse {
  required?: boolean;
  provisioned?: boolean;
  pipelines?: PipelineItem[];
  stages?: Array<{ id: string; label: string; displayOrder?: number }>;
}

export interface JobConfig {
  sourcePlatform: string;
  sourceObject: string;
  destPlatform: string;
  destObject: string;
  name: string;
  syncDirection: string;
  sourceOfTruth: string;
  deleteHandling: string;
  hubspotWebhookEnabled: boolean;
  syncTrigger: string;
  idMappingSourceField: string;
  idMappingDestField: string;
}

export interface SchedInterval {
  amount: number;
  unit: string;
}

export const KNOWN_PIPELINE_OBJECTS = new Set([
  'deals',
  'tickets',
  'projects',
  '0-970',
]);
