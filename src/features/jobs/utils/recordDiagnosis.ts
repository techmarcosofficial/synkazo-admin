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

export interface SkipRuleDetail {
  property: string;
  destProperty?: string;
  rule: string;
  expectedValue?: string;
  recordValue?: string;
}

export interface RecordDiagnosis {
  category: DiagnosisCategory;
  offendingField: string | null;
  summary: string;
  humanExplanation: string;
  actions: RecordFixAction[];
  rawDetail: string | null;
  rawApiResponse: string | null;
  skipRules?: SkipRuleDetail[];
  skipLogic?: 'Match All' | 'Match Any';
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
 * Parses structured skip condition rule and property breakdown from detailed backend strings.
 */
export function parseSkipRuleDetails(detail: string | null | undefined): {
  rules: SkipRuleDetail[];
  logic?: 'Match All' | 'Match Any';
  summaryRule: string | null;
} {
  if (!detail) return { rules: [], summaryRule: null };

  const logicMatch = detail.match(
    /logic=(Match All|Match Any|AND|OR|ALL|ANY)\b/i,
  );
  const rawLogic = logicMatch?.[1]?.toUpperCase();
  const logic: 'Match All' | 'Match Any' | undefined =
    rawLogic === 'AND' || rawLogic === 'ALL' || rawLogic === 'MATCH ALL'
      ? 'Match All'
      : rawLogic === 'OR' || rawLogic === 'ANY' || rawLogic === 'MATCH ANY'
        ? 'Match Any'
        : undefined;

  const colonIdx = detail.indexOf(':');
  const conditionsText =
    colonIdx !== -1 &&
    /skip (?:rule|conditions matched)/i.test(detail.slice(0, colonIdx))
      ? detail.slice(colonIdx + 1).trim()
      : detail.trim();

  const chunks = conditionsText
    .split(/;\s*(?=[a-zA-Z_0-9])/)
    .map((c) => c.trim())
    .filter(Boolean);

  const rules: SkipRuleDetail[] = [];

  for (const chunk of chunks) {
    // 1. Destination pattern: sourceField → destinationField operator (source: "...", destination: "...")
    const destMatch = chunk.match(
      /^([a-zA-Z0-9_.-]+)\s*→\s*([a-zA-Z0-9_.-]+)\s+([^()]+?)(?:\s*\((?:source:\s*"([^"]*)",\s*destination:\s*"([^"]*)")?\))?$/,
    );
    if (destMatch) {
      const [, srcField, dstField, op, srcVal, dstVal] = destMatch;
      rules.push({
        property: `${srcField} → ${dstField}`,
        destProperty: dstField,
        rule: `${srcField} → ${dstField} ${op.trim()}`,
        expectedValue: dstVal !== undefined ? `dest: ${dstVal}` : undefined,
        recordValue: srcVal !== undefined ? `source: ${srcVal}` : undefined,
      });
      continue;
    }

    // 2. Source pattern: property operator "targetValue" (record property: "recordValue")
    const srcMatch = chunk.match(
      /^([a-zA-Z0-9_.-]+)\s+([^"()]+?)(?:\s+"([^"]*)")?(?:\s*\(record\s+[^:]+:\s*"([^"]*)"\))?$/,
    );
    if (srcMatch) {
      const [, prop, op, targetVal, recVal] = srcMatch;
      const cleanOp = op.trim();
      const ruleDesc =
        targetVal !== undefined
          ? `${prop} ${cleanOp} "${targetVal}"`
          : `${prop} ${cleanOp}`;
      rules.push({
        property: prop,
        rule: ruleDesc,
        expectedValue: targetVal !== undefined ? targetVal : undefined,
        recordValue: recVal !== undefined ? recVal : undefined,
      });
      continue;
    }

    // 3. Fallback: capture first token as property and full chunk as rule
    const simpleMatch = chunk.match(/^([a-zA-Z0-9_.-]+)\s+(.+)$/);
    if (simpleMatch) {
      rules.push({
        property: simpleMatch[1],
        rule: chunk,
      });
    }
  }

  const summaryRule = rules.length > 0 ? rules[0].rule : null;
  return { rules, logic, summaryRule };
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
    // Direct field on object (e.g. from compactErrorResponse)
    const directField =
      respObj.field ??
      respObj.propertyName ??
      respObj.fieldName ??
      respObj.property;
    if (
      typeof directField === 'string' &&
      directField !== 'field' &&
      directField !== 'property' &&
      /^[a-zA-Z_][a-zA-Z0-9_.-]{0,79}$/.test(directField)
    ) {
      const isMissing = Boolean(
        respObj.message &&
          String(respObj.message).toLowerCase().includes('required'),
      );
      return { field: directField, isMissing };
    }

    // Top-level context (e.g. HubSpot context: { propertyName: ['pipeline_id'] })
    if (respObj.context && typeof respObj.context === 'object') {
      const ctx = respObj.context as Record<string, unknown>;
      const prop = ctx.propertyName || ctx.property || ctx.field;
      const candidate = Array.isArray(prop) ? prop[0] : prop;
      if (
        typeof candidate === 'string' &&
        candidate !== 'field' &&
        candidate !== 'property' &&
        /^[a-zA-Z_][a-zA-Z0-9_.-]{0,79}$/.test(candidate)
      ) {
        const isMissing = Boolean(
          respObj.message &&
            String(respObj.message).toLowerCase().includes('required'),
        );
        return { field: candidate, isMissing };
      }
    }

    // Salesforce: fields array e.g. fields: ["LastName"]
    if (
      Array.isArray(respObj.fields) &&
      typeof respObj.fields[0] === 'string' &&
      respObj.fields[0] !== 'field' &&
      respObj.fields[0] !== 'property'
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

    // HubSpot / generic errors array: [{ message: "...", context: { propertyName: ["dealname"] } }]
    if (Array.isArray(respObj.errors) && respObj.errors.length > 0) {
      for (const err of respObj.errors) {
        if (!err || typeof err !== 'object') continue;
        const errObj = err as Record<string, unknown>;
        if (errObj.context && typeof errObj.context === 'object') {
          const ctx = errObj.context as Record<string, unknown>;
          const prop = ctx.propertyName || ctx.property || ctx.field;
          const candidate = Array.isArray(prop) ? prop[0] : prop;
          if (
            typeof candidate === 'string' &&
            candidate !== 'field' &&
            candidate !== 'property' &&
            /^[a-zA-Z_][a-zA-Z0-9_.-]{0,79}$/.test(candidate)
          ) {
            const isMissing = String(errObj.message || '')
              .toLowerCase()
              .includes('required');
            return { field: candidate, isMissing };
          }
        }
        const directErrField =
          errObj.propertyName || errObj.fieldName || errObj.field;
        if (
          typeof directErrField === 'string' &&
          directErrField !== 'field' &&
          directErrField !== 'property' &&
          /^[a-zA-Z_][a-zA-Z0-9_.-]{0,79}$/.test(directErrField)
        ) {
          const isMissing = String(errObj.message || '')
            .toLowerCase()
            .includes('required');
          return { field: directErrField, isMissing };
        }
        if (typeof errObj.message === 'string') {
          const fieldMatch =
            errObj.message.match(/(?:property|field) ['"]?([a-zA-Z0-9_.-]+)['"]?/i) ||
            errObj.message.match(/values were not valid for \[?['"]?([a-zA-Z0-9_.-]+)\]?['"]?/i) ||
            errObj.message.match(/^([a-zA-Z_][a-zA-Z0-9_.-]*):\s+/i);
          if (
            fieldMatch?.[1] &&
            fieldMatch[1] !== 'field' &&
            fieldMatch[1] !== 'property'
          ) {
            const isMissing = errObj.message.toLowerCase().includes('required');
            return { field: fieldMatch[1], isMissing };
          }
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
    if (match?.[1] && match[1] !== 'field' && match[1] !== 'property') {
      return { field: match[1], isMissing: true };
    }
  }

  // Invalid / transform / validation patterns
  const validationPatterns = [
    /offending (?:field|property):?\s*['"]?([a-zA-Z0-9_.-]+)['"]?/i,
    /^([a-zA-Z_][a-zA-Z0-9_.-]*):\s+/i,
    /validation failed for (?:field |property )?['"]?([a-zA-Z0-9_.-]+)['"]?/i,
    /values were not valid for (?:field |property )?\[?['"]?([a-zA-Z0-9_.-]+)\]?['"]?/i,
    /property ['"]([a-zA-Z0-9_.-]+)['"] (?:does not exist|invalid|not valid|could not)/i,
    /(?:for|on) (?:property|field) ['"]([a-zA-Z0-9_.-]+)['"]/i,
    /invalid (?:email|phone|date|number|value) for (?:field |property )?['"]?([a-zA-Z0-9_.-]+)['"]?/i,
    /not a valid option for (?:field |property )?['"]?([a-zA-Z0-9_.-]+)['"]?/i,
    /Provided (?:value was not valid for )?['"]?([a-zA-Z0-9_.-]+)['"]?/i,
    /(?:property|field) ['"]([a-zA-Z0-9_.-]+)['"]/i,
  ];

  for (const pat of validationPatterns) {
    const match = combinedText.match(pat);
    if (match?.[1] && match[1] !== 'field' && match[1] !== 'property') {
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
  let skipRules: SkipRuleDetail[] | undefined;
  let skipLogic: 'Match All' | 'Match Any' | undefined;
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
        ? `The value provided for "${offendingField}" was rejected by ${destName}'s data validation rules.`
        : rawDetail && !rawDetail.toLowerCase().includes('validation failed')
          ? `Destination validation rejected this record: ${rawDetail}`
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
      const skipInfo = parseSkipRuleDetails(rawDetail);
      skipRules = skipInfo.rules.length > 0 ? skipInfo.rules : undefined;
      skipLogic = skipInfo.logic;

      if (skipInfo.rules.length > 0) {
        const first = skipInfo.rules[0];
        summary = `Skip rule: ${first.rule}`;
        if (first.recordValue && first.recordValue !== 'empty') {
          humanExplanation = `This record was intentionally excluded by filter rule: ${first.rule} (record ${first.property}: "${first.recordValue}").`;
        } else {
          humanExplanation = `This record was intentionally excluded because it matched configured skip condition: ${first.rule}.`;
        }
      } else {
        const matchSource = rawDetail?.match(
          /Source skip conditions matched [^:]*:\s*(.+)/i,
        );
        const matchDest = rawDetail?.match(
          /Destination skip conditions matched [^:]*:\s*(.+)/i,
        );
        const extractedCondition =
          matchSource?.[1]?.split(';')[0]?.trim() ||
          matchDest?.[1]?.split(';')[0]?.trim() ||
          null;

        if (extractedCondition) {
          summary = matchDest
            ? `Destination skip rule: ${extractedCondition}`
            : `Skip rule: ${extractedCondition}`;
          humanExplanation = `This record was intentionally excluded because it matched configured skip condition: ${extractedCondition}.`;
        } else {
          summary = 'Matched a skip rule';
          humanExplanation =
            'This record was intentionally excluded by your configured filter conditions.';
        }
      }

      // Suggested actions should be shown for failed/error records only.
      // Skipped records are intentional non-write outcomes and must not show suggested actions.
      actions.length = 0;
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
    skipRules,
    skipLogic,
  };
}
