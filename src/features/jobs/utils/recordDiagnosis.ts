import {
  ExternalLink,
  RotateCcw,
  SkipForward,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import { PLATFORMS } from '@/components/platform/platform';
import type { TargetDrawerSection } from '@/components/fieldmapping/FieldSettingsDrawer';
import type { SyncLogRecord } from '@/types';

export interface RecordContext {
  sourceObject?: string;
  destObject?: string;
  sourcePlatform?: string;
  destPlatform?: string;
}

export type DiagnosisCategory =
  | 'missing_required_field'
  | 'validation_error'
  | 'duplicate_conflict'
  | 'auth_error'
  | 'rate_limit'
  | 'skip_rule'
  | 'transient'
  | 'other';

export interface RecordFixAction {
  label: string;
  hint: string;
  iconName: 'wrench' | 'skip' | 'link' | 'rotate';
  destination: 'mapping' | 'connections' | 'retry';
  deepLink?: {
    tab: 'field-mapping';
    field?: string;
    action?: TargetDrawerSection;
  };
}

export interface RecordDiagnosis {
  category: DiagnosisCategory;
  offendingField: string | null;
  summary: string;
  humanExplanation: string;
  actions: RecordFixAction[];
  rawDetail: string | null;
  rawApiResponse: string | null;
}

export const DIAGNOSIS_ICONS: Record<RecordFixAction['iconName'], LucideIcon> =
  {
    wrench: Wrench,
    skip: SkipForward,
    link: ExternalLink,
    rotate: RotateCcw,
  };

function enumLabel(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function getPlatformDisplayName(platformId?: string): string {
  if (!platformId) return 'Destination';
  const lower = platformId.toLowerCase();
  return PLATFORMS[lower]?.name ?? enumLabel(platformId);
}

/**
 * Extracts the offending field name dynamically from API responses and failure logs
 * across HubSpot, Salesforce, ServiceTitan, Zoho, Dataforma, etc.
 */
export function extractOffendingField(rec: SyncLogRecord): {
  field: string | null;
  isMissing: boolean;
} {
  // 1. Inspect destResponse if it is a JSON object or string
  let respObj: Record<string, unknown> | null = null;
  if (rec.destResponse) {
    if (typeof rec.destResponse === 'object') {
      respObj = rec.destResponse as Record<string, unknown>;
    } else if (typeof rec.destResponse === 'string') {
      try {
        respObj = JSON.parse(rec.destResponse);
      } catch {
        // Not a JSON object string
      }
    }
  }

  if (respObj) {
    // Salesforce: fields array e.g. fields: ["LastName"]
    if (
      Array.isArray(respObj.fields) &&
      typeof respObj.fields[0] === 'string'
    ) {
      return { field: respObj.fields[0], isMissing: true };
    }

    // ServiceTitan: errors dict e.g. { "jobTypeId": ["The jobTypeId field is required."] }
    if (
      respObj.errors &&
      typeof respObj.errors === 'object' &&
      !Array.isArray(respObj.errors)
    ) {
      const keys = Object.keys(respObj.errors);
      if (keys.length > 0 && keys[0]) {
        const msg = String(
          (respObj.errors as Record<string, unknown>)[keys[0]] || '',
        );
        const isMissing = msg.toLowerCase().includes('required');
        return { field: keys[0], isMissing };
      }
    }

    // HubSpot errors array: [{ message: "...", context: { propertyName: ["dealname"] } }]
    if (Array.isArray(respObj.errors) && respObj.errors.length > 0) {
      const firstErr = respObj.errors[0] as Record<string, unknown>;
      if (firstErr?.context && typeof firstErr.context === 'object') {
        const ctx = firstErr.context as Record<string, unknown>;
        const prop = ctx.propertyName || ctx.property || ctx.field;
        if (Array.isArray(prop) && typeof prop[0] === 'string') {
          const isMissing = String(firstErr.message || '')
            .toLowerCase()
            .includes('required');
          return { field: prop[0], isMissing };
        }
        if (typeof prop === 'string') {
          const isMissing = String(firstErr.message || '')
            .toLowerCase()
            .includes('required');
          return { field: prop, isMissing };
        }
      }
      if (typeof firstErr?.message === 'string') {
        const fieldMatch = firstErr.message.match(
          /property ['"]?([a-zA-Z0-9_.-]+)['"]?/i,
        );
        if (fieldMatch?.[1]) {
          const isMissing = firstErr.message.toLowerCase().includes('required');
          return { field: fieldMatch[1], isMissing };
        }
      }
    }

    // Zoho details.api_name
    if (respObj.details && typeof respObj.details === 'object') {
      const details = respObj.details as Record<string, unknown>;
      if (typeof details.api_name === 'string') {
        return { field: details.api_name, isMissing: true };
      }
    }
  }

  // 2. Scan text from failReasonDetail, skipReasonDetail, and string destResponse
  const combinedText = [
    rec.failReasonDetail,
    rec.skipReasonDetail,
    typeof rec.destResponse === 'string' ? rec.destResponse : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (!combinedText) {
    return { field: null, isMissing: false };
  }

  // Missing required patterns
  const missingPatterns = [
    /missing required (?:field|property):?\s*\[?['"]?([a-zA-Z0-9_.-]+)['"]?\]?/i,
    /REQUIRED_FIELDS?_MISSING:?\s*\[?['"]?([a-zA-Z0-9_.-]+)['"]?\]?/i,
    /(?:field|property) ['"]?([a-zA-Z0-9_.-]+)['"]? is required/i,
    /requires (?:the |a )?['"]?([a-zA-Z0-9_.-]+)['"]? (?:field|property)/i,
    /The ([a-zA-Z0-9_.-]+) field is required/i,
    /mandatory (?:field|property) ['"]?([a-zA-Z0-9_.-]+)['"]?/i,
    /requires (?:a|the) ['"]?([a-zA-Z0-9_.-]+)['"]?/i,
  ];

  for (const pat of missingPatterns) {
    const match = combinedText.match(pat);
    if (match?.[1]) {
      return { field: match[1], isMissing: true };
    }
  }

  // Invalid / transform / validation patterns
  const validationPatterns = [
    /property ['"]([a-zA-Z0-9_.-]+)['"] (?:does not exist|invalid|not valid|could not)/i,
    /(?:for|on) (?:property|field) ['"]([a-zA-Z0-9_.-]+)['"]/i,
    /(?:property|field) ['"]([a-zA-Z0-9_.-]+)['"]/i,
    /Provided ([a-zA-Z0-9_.-]+):/i,
    /values were not valid for ['"]([a-zA-Z0-9_.-]+)['"]/i,
    /invalid (?:email|phone|date|number|value) for ['"]?([a-zA-Z0-9_.-]+)['"]?/i,
    /validation failed for ([a-zA-Z0-9_.-]+)/i,
  ];

  for (const pat of validationPatterns) {
    const match = combinedText.match(pat);
    if (match?.[1]) {
      return { field: match[1], isMissing: false };
    }
  }

  return { field: null, isMissing: false };
}

/**
 * Analyzes a sync log record and produces a human-friendly diagnosis
 * with dynamic 1-click recovery actions and precision deep links.
 */
export function analyzeRecordDiagnosis(
  rec: SyncLogRecord,
  context?: RecordContext,
): RecordDiagnosis {
  const destName = getPlatformDisplayName(context?.destPlatform);
  const { field: offendingField, isMissing } = extractOffendingField(rec);

  const rawDetail = rec.skipReasonDetail || rec.failReasonDetail || null;
  let rawApiResponse: string | null = null;
  if (rec.destResponse) {
    if (typeof rec.destResponse === 'string') {
      try {
        rawApiResponse = JSON.stringify(JSON.parse(rec.destResponse), null, 2);
      } catch {
        rawApiResponse = rec.destResponse;
      }
    } else if (typeof rec.destResponse === 'object') {
      rawApiResponse = JSON.stringify(rec.destResponse, null, 2);
    }
  }

  const combinedText = [
    rec.failReason,
    rec.skipReason,
    rawDetail,
    typeof rec.destResponse === 'string' ? rec.destResponse : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Classify issue category
  let category: DiagnosisCategory = 'other';
  if (
    isMissing ||
    rec.failReason === 'missing_required_field' ||
    rec.skipReason === 'missing_required_field' ||
    combinedText.includes('missing') ||
    combinedText.includes('required')
  ) {
    category = 'missing_required_field';
  } else if (
    combinedText.includes('auth') ||
    combinedText.includes('unauthorized') ||
    combinedText.includes('401') ||
    combinedText.includes('403') ||
    combinedText.includes('scope') ||
    combinedText.includes('token') ||
    rec.failReason === 'auth_error'
  ) {
    category = 'auth_error';
  } else if (
    combinedText.includes('rate limit') ||
    combinedText.includes('429') ||
    rec.failReason === 'rate_limited'
  ) {
    category = 'rate_limit';
  } else if (
    combinedText.includes('duplicate') ||
    combinedText.includes('conflict') ||
    rec.failReason === 'no_id_match' ||
    rec.skipReason === 'duplicate' ||
    rec.skipReason === 'record_level_conflict'
  ) {
    category = 'duplicate_conflict';
  } else if (
    rec.skipReason === 'filter_excluded' ||
    rec.skipReason === 'destination_condition' ||
    rec.skipReason === 'manually_excluded' ||
    combinedText.includes('skip rule')
  ) {
    category = 'skip_rule';
  } else if (
    rec.failReason === 'validation_error' ||
    rec.failReason === 'transform_error' ||
    combinedText.includes('validation') ||
    combinedText.includes('invalid') ||
    combinedText.includes('format') ||
    combinedText.includes('type')
  ) {
    category = 'validation_error';
  } else if (
    combinedText.includes('timeout') ||
    combinedText.includes('500') ||
    combinedText.includes('502') ||
    combinedText.includes('503') ||
    combinedText.includes('network') ||
    rec.failReason === 'network_error'
  ) {
    category = 'transient';
  }

  // Human Explanation & Action Generation
  const actions: RecordFixAction[] = [];
  let summary = 'Processing issue';
  let humanExplanation = 'This record could not be processed as expected.';

  switch (category) {
    case 'missing_required_field': {
      summary = offendingField
        ? `Missing required field: ${offendingField}`
        : 'Missing required field';
      humanExplanation = offendingField
        ? `${destName} requires "${offendingField}" to create or update this record, but no value was provided by the source.`
        : `${destName} requires a mandatory field that was not provided in this record.`;

      actions.push({
        label: offendingField
          ? `Default fallback value ("${offendingField}")`
          : 'Default fallback value',
        hint: 'Configure a default value when the source field is empty',
        iconName: 'wrench',
        destination: 'mapping',
        deepLink: {
          tab: 'field-mapping',
          field: offendingField || undefined,
          action: 'fallbacks',
        },
      });

      actions.push({
        label: offendingField
          ? `Skip rule suggestion ("${offendingField}")`
          : 'Skip rule suggestion',
        hint: 'Exclude records missing this field from syncing to destination',
        iconName: 'skip',
        destination: 'mapping',
        deepLink: {
          tab: 'field-mapping',
          field: offendingField || undefined,
          action: 'skips',
        },
      });
      break;
    }

    case 'validation_error': {
      summary = offendingField
        ? `Invalid value for "${offendingField}"`
        : 'Invalid field value';
      humanExplanation = offendingField
        ? `The value provided for "${offendingField}" does not match ${destName}'s expected format or allowed values.`
        : `One of the mapped field values was rejected by ${destName}'s data validation rules.`;

      actions.push({
        label: offendingField
          ? `Rule suggestion (Transform "${offendingField}")`
          : 'Rule suggestion (Transform)',
        hint: 'Clean, format, or convert values before sending to destination',
        iconName: 'wrench',
        destination: 'mapping',
        deepLink: {
          tab: 'field-mapping',
          field: offendingField || undefined,
          action: 'transforms',
        },
      });

      actions.push({
        label: offendingField
          ? `Default mapping suggestion ("${offendingField}")`
          : 'Default mapping suggestion',
        hint: 'Provide a safe fallback when value cannot be validated',
        iconName: 'wrench',
        destination: 'mapping',
        deepLink: {
          tab: 'field-mapping',
          field: offendingField || undefined,
          action: 'fallbacks',
        },
      });
      break;
    }

    case 'duplicate_conflict': {
      summary = 'Duplicate record or identifier conflict';
      humanExplanation = `Multiple source records matched the same ${destName} identifier, or a unique property collided.`;

      actions.push({
        label: 'Review Match Identifier',
        hint: 'Verify unique identifier mappings to avoid record collisions',
        iconName: 'wrench',
        destination: 'mapping',
        deepLink: {
          tab: 'field-mapping',
          field: offendingField || undefined,
          action: 'identity',
        },
      });

      actions.push({
        label: 'Add duplicate skip rule',
        hint: 'Ignore subsequent duplicates automatically during sync',
        iconName: 'skip',
        destination: 'mapping',
        deepLink: {
          tab: 'field-mapping',
          field: offendingField || undefined,
          action: 'skips',
        },
      });
      break;
    }

    case 'auth_error': {
      summary = 'Connection or permission error';
      humanExplanation = `Access to ${destName} was denied due to expired credentials or missing API scopes.`;

      actions.push({
        label: `Reconnect in Connections`,
        hint: `Update credentials or re-authorize API scopes for ${destName}`,
        iconName: 'link',
        destination: 'connections',
      });
      break;
    }

    case 'rate_limit': {
      summary = 'Platform rate limit reached';
      humanExplanation = `${destName} temporarily limited requests. The sync engine will automatically back off and retry.`;

      actions.push({
        label: 'Retry record now',
        hint: 'Retries sending this record now',
        iconName: 'rotate',
        destination: 'retry',
      });
      break;
    }

    case 'skip_rule': {
      summary = 'Matched a skip rule';
      humanExplanation =
        'This record was intentionally excluded by your configured filter conditions.';

      actions.push({
        label: 'Review Skip Rules',
        hint: 'Inspect or adjust exclusion rules in Field Mapping',
        iconName: 'skip',
        destination: 'mapping',
        deepLink: {
          tab: 'field-mapping',
          field: offendingField || undefined,
          action: 'skips',
        },
      });
      break;
    }

    case 'transient': {
      summary = 'Temporary network or server timeout';
      humanExplanation = `${destName}'s server did not respond in time. This is typically temporary.`;

      actions.push({
        label: 'Retry record now',
        hint: 'Retry processing this record',
        iconName: 'rotate',
        destination: 'retry',
      });
      break;
    }

    default: {
      summary =
        rec.action === 'failed' ? 'Record processing failed' : 'Record skipped';
      humanExplanation = rawDetail
        ? rawDetail.split(/\r?\n/)[0].slice(0, 140)
        : `This record was ${rec.action} during sync processing.`;

      if (rec.action === 'failed') {
        actions.push({
          label: 'Adjust Field Mapping',
          hint: 'Inspect field mappings and default values',
          iconName: 'wrench',
          destination: 'mapping',
          deepLink: {
            tab: 'field-mapping',
            field: offendingField || undefined,
            action: 'fallbacks',
          },
        });
      } else {
        actions.push({
          label: 'Review Skip Rules',
          hint: 'Inspect configured skip conditions',
          iconName: 'skip',
          destination: 'mapping',
          deepLink: {
            tab: 'field-mapping',
            field: offendingField || undefined,
            action: 'skips',
          },
        });
      }
      break;
    }
  }

  return {
    category,
    offendingField,
    summary,
    humanExplanation,
    actions,
    rawDetail,
    rawApiResponse,
  };
}
