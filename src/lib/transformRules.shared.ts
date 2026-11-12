// ─────────────────────────────────────────────────────────────────────────────
// SHARED FILE: field transform rules.
//
// This exact file lives in two repos:
//   synkazo-api/src/sync/transform-rules.shared.ts    (what a sync applies)
//   synkazo-admin/src/lib/transformRules.shared.ts     (the live preview)
// Keep them byte-for-byte identical. Both repos run the same table of cases
// (transform-rule-cases.shared.json) against their copy, so a change made in
// only one place fails a test.
//
// No imports on purpose: it must compile unchanged in both projects.
// ─────────────────────────────────────────────────────────────────────────────

/** A configured rule instance in a field's pipeline. */
export interface TransformRule {
  type: string;
  enabled?: boolean;
  [key: string]: unknown;
}

/** A rule that stops the value: the field isn't written, or the record isn't synced. */
export interface SkipSignal {
  skip: 'field' | 'record';
  reason: string;
}

export type RuleResult = string | SkipSignal;

export function isSkip(result: unknown): result is SkipSignal {
  return (
    typeof result === 'object' &&
    result !== null &&
    'skip' in result &&
    ((result as SkipSignal).skip === 'field' ||
      (result as SkipSignal).skip === 'record')
  );
}

// ── Validation rules: pass the value through, or skip the field ─────────────

const VALIDATION_RULES = new Set([
  'min_length',
  'max_length',
  'is_string',
  'is_number',
  'is_email',
  'is_phone',
  'is_currency',
  'is_boolean',
  'is_date',
  'is_empty',
  'is_not_empty',
]);

export function isValidationRule(type: string): boolean {
  return VALIDATION_RULES.has(type);
}

export function passesRuleValidation(
  value: unknown,
  rule: TransformRule,
): boolean {
  const v = String(value ?? '');
  switch (rule.type) {
    case 'min_length':
      return v.length >= Number(rule.value);
    case 'max_length':
      return v.length <= Number(rule.value);
    case 'is_string':
      return typeof value === 'string';
    case 'is_number':
      return v.trim() !== '' && Number.isFinite(Number(v));
    case 'is_email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    case 'is_phone':
      return /^\+?[\d\s().-]+$/.test(v) && v.replace(/\D/g, '').length >= 7;
    case 'is_currency':
      return /^[+-]?(?:[$€£₹]\s*)?\d+(?:,\d{3})*(?:\.\d{1,2})?$/.test(v.trim());
    case 'is_boolean':
      return typeof value === 'boolean' || /^(true|false|1|0)$/i.test(v.trim());
    case 'is_date':
      return v.trim() !== '' && !Number.isNaN(Date.parse(v));
    case 'is_empty':
      return v.trim() === '';
    case 'is_not_empty':
      return v.trim() !== '';
    default:
      return true;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const str = (x: unknown) => (x === null || x === undefined ? '' : String(x));

/** A finite number from a value, or null. Blank is not a number. */
function toNum(x: unknown): number | null {
  const s = str(x).trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** A whole number param, or `fallback` when blank/invalid. */
function toInt(x: unknown, fallback: number): number {
  const n = parseInt(str(x), 10);
  return Number.isFinite(n) ? n : fallback;
}

// ── Dates (no library; identical in Node and the browser) ───────────────────

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_NO_ZONE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/**
 * Parses a date the same way everywhere. Values without a timezone are read
 * as UTC wall-clock time, so a server in UTC and a browser in India agree.
 */
function parseDate(raw: string): { date: Date; dateOnly: boolean } | null {
  const s = raw.trim();
  if (s === '') return null;
  if (DATE_ONLY.test(s)) {
    const d = new Date(`${s}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : { date: d, dateOnly: true };
  }
  if (/^\d{9,13}$/.test(s)) {
    const n = Number(s);
    return { date: new Date(n < 1e11 ? n * 1000 : n), dateOnly: false };
  }
  if (ISO_NO_ZONE.test(s)) {
    const d = new Date(`${s.replace(' ', 'T')}Z`);
    return Number.isNaN(d.getTime()) ? null : { date: d, dateOnly: false };
  }
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  // A string with its own zone ("…Z", "+05:30", "GMT") is an exact instant.
  if (/(Z|[+-]\d{2}:?\d{2}|GMT|UTC)\s*$/i.test(s)) {
    return { date: parsed, dateOnly: false };
  }
  // Otherwise ("03/15/2024", "Mar 15 2024 10:30") JS read it as local time:
  // keep the wall-clock reading and treat it as UTC.
  const utc = new Date(
    Date.UTC(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
      parsed.getHours(),
      parsed.getMinutes(),
      parsed.getSeconds(),
    ),
  );
  const hasTime = /\d{1,2}:\d{2}/.test(s);
  return { date: utc, dateOnly: !hasTime };
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function zoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'long',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '';
  const wall = Date.UTC(
    Number(get('year')),
    Number(get('month')) - 1,
    Number(get('day')),
    Number(get('hour')),
    Number(get('minute')),
    Number(get('second')),
  );
  const offsetMinutes = Math.round((wall - date.getTime()) / 60000);
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: get('weekday'),
    offsetMinutes,
  };
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const pad = (n: number, len = 2) => String(Math.abs(n)).padStart(len, '0');

function formatOffset(minutes: number) {
  const sign = minutes < 0 ? '-' : '+';
  return `${sign}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
}

/**
 * Formats with day.js-style tokens: YYYY YY MMMM MMM MM M DD D dddd ddd
 * HH H hh h mm ss A a Z. Text in [brackets] is kept as-is.
 */
export function formatDateTokens(
  date: Date,
  format: string,
  timeZone = 'UTC',
): string {
  const p = zoneParts(date, timeZone);
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return format.replace(
    /\[([^\]]*)]|YYYY|YY|MMMM|MMM|MM|M|dddd|ddd|DD|D|HH|H|hh|h|mm|ss|A|a|Z/g,
    (token, literal: string | undefined) => {
      if (literal !== undefined) return literal;
      switch (token) {
        case 'YYYY':
          return String(p.year);
        case 'YY':
          return pad(p.year % 100);
        case 'MMMM':
          return MONTHS[p.month - 1];
        case 'MMM':
          return MONTHS[p.month - 1].slice(0, 3);
        case 'MM':
          return pad(p.month);
        case 'M':
          return String(p.month);
        case 'dddd':
          return p.weekday;
        case 'ddd':
          return p.weekday.slice(0, 3);
        case 'DD':
          return pad(p.day);
        case 'D':
          return String(p.day);
        case 'HH':
          return pad(p.hour);
        case 'H':
          return String(p.hour);
        case 'hh':
          return pad(h12);
        case 'h':
          return String(h12);
        case 'mm':
          return pad(p.minute);
        case 'ss':
          return pad(p.second);
        case 'A':
          return p.hour < 12 ? 'AM' : 'PM';
        case 'a':
          return p.hour < 12 ? 'am' : 'pm';
        case 'Z':
          return formatOffset(p.offsetMinutes);
        default:
          return token;
      }
    },
  );
}

// ── Conditions (If → then) ──────────────────────────────────────────────────

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'matches'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte';

/** Operators that compare against a value (the rest don't need one). */
export const VALUE_OPERATORS: ReadonlySet<string> = new Set([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'matches',
  'gt',
  'gte',
  'lt',
  'lte',
]);

/**
 * Same meaning as the job filters' condition engine: "not …" is true for an
 * empty value, every other comparison is false for one.
 */
export function evaluateValueCondition(
  raw: string,
  operator: string,
  compareTo: unknown,
  ignoreCase = false,
): boolean {
  const empty = raw.trim() === '';
  if (operator === 'is_empty') return empty;
  if (operator === 'is_not_empty') return !empty;
  if (operator === 'not_equals' || operator === 'not_contains') {
    if (empty) return true;
  } else if (empty) {
    return false;
  }
  if (operator === 'matches') {
    try {
      return new RegExp(str(compareTo), ignoreCase ? 'i' : '').test(raw);
    } catch {
      return false;
    }
  }
  if (
    operator === 'gt' ||
    operator === 'gte' ||
    operator === 'lt' ||
    operator === 'lte'
  ) {
    const left = toNum(raw);
    const right = toNum(compareTo);
    if (left === null || right === null) return false;
    if (operator === 'gt') return left > right;
    if (operator === 'gte') return left >= right;
    if (operator === 'lt') return left < right;
    return left <= right;
  }
  const norm = (s: string) => (ignoreCase ? s.trim().toLowerCase() : s.trim());
  const left = norm(raw);
  const right = norm(str(compareTo));
  switch (operator) {
    case 'equals':
      return left === right;
    case 'not_equals':
      return left !== right;
    case 'contains':
      return left.includes(right);
    case 'not_contains':
      return !left.includes(right);
    case 'starts_with':
      return left.startsWith(right);
    case 'ends_with':
      return left.endsWith(right);
    default:
      return false;
  }
}

const OPERATOR_TEXT: Record<string, string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
  matches: 'matches',
  gt: 'is greater than',
  gte: 'is at least',
  lt: 'is less than',
  lte: 'is at most',
};

export function describeCondition(rule: TransformRule): string {
  const op = str(rule.operator);
  const text = OPERATOR_TEXT[op] ?? op;
  return VALUE_OPERATORS.has(op) ? `${text} "${str(rule.value)}"` : text;
}

function applyAction(
  action: unknown,
  value: unknown,
  current: string,
  reason: string,
): RuleResult {
  switch (action) {
    case 'set':
      return str(value);
    case 'skip_field':
      return { skip: 'field', reason };
    case 'skip_record':
      return { skip: 'record', reason };
    default:
      return current;
  }
}

// ── The rules ────────────────────────────────────────────────────────────────

/**
 * Applies one non-validation rule. Unknown types pass the value through, so a
 * rule saved by a newer version never breaks an older sync.
 */
export function applyTransformRule(input: unknown, rule: TransformRule): RuleResult {
  const v = str(input);
  switch (rule.type) {
    // Conditions
    case 'if_condition': {
      const matched = evaluateValueCondition(
        v,
        str(rule.operator),
        rule.value,
        rule.ignoreCase === true,
      );
      const reason = `Value ${describeCondition(rule)}`;
      return matched
        ? applyAction(rule.thenAction, rule.thenValue, v, reason)
        : applyAction(rule.elseAction, rule.elseValue, v, reason);
    }
    case 'skip_if_empty':
      return v.trim() === '' ? { skip: 'record', reason: 'Field value is empty' } : v;
    case 'skip_if_equals':
      return v === str(rule.value)
        ? { skip: 'record', reason: `Value equals "${str(rule.value)}"` }
        : v;
    case 'skip_if_contains':
      return v.includes(str(rule.find))
        ? { skip: 'record', reason: `Value contains "${str(rule.find)}"` }
        : v;
    case 'replace_if_contains':
      return v.includes(str(rule.find)) ? str(rule.replacement) : v;
    case 'default_if_empty':
      return v.trim() === '' ? str(rule.value) : v;
    // Older condition rules never had a working action; they pass through.
    case 'if_starts_with':
    case 'if_ends_with':
    case 'if_matches_regex':
      return v;

    // Text
    case 'trim':
      return v.trim();
    case 'remove_spaces':
      return v.replace(/\s+/g, '');
    case 'uppercase':
      return v.toUpperCase();
    case 'lowercase':
      return v.toLowerCase();
    case 'capitalize':
      return v.replace(/\b\w/g, (c) => c.toUpperCase());
    case 'replace':
      return str(rule.find) === ''
        ? v
        : v.split(str(rule.find)).join(str(rule.replacement));
    case 'remove_text':
      return str(rule.find) === '' ? v : v.split(str(rule.find)).join('');
    case 'prefix':
      return str(rule.value) + v;
    case 'suffix':
      return v + str(rule.value);
    case 'regex_replace': {
      try {
        return v.replace(new RegExp(str(rule.pattern), 'g'), str(rule.replacement));
      } catch {
        return v;
      }
    }
    case 'remove_special':
      return v.replace(/[^a-zA-Z0-9\s]/g, '');
    case 'remove_numbers':
      return v.replace(/[0-9]/g, '');
    case 'remove_alpha':
      return v.replace(/[a-zA-Z]/g, '');
    case 'slug':
      return v
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    case 'extract_numbers':
      return v.replace(/[^0-9]/g, '');
    case 'extract_text':
      return v.replace(/[^a-zA-Z]/g, '');

    // Length
    case 'char_limit': {
      const n = toInt(rule.value, -1);
      return n >= 0 ? v.slice(0, n) : v;
    }
    case 'word_limit': {
      const n = toInt(rule.value, -1);
      return n >= 0 ? v.split(/\s+/).slice(0, n).join(' ') : v;
    }

    // Numbers: text that isn't a number passes through unchanged.
    case 'abs': {
      const n = toNum(v);
      return n === null ? v : String(Math.abs(n));
    }
    case 'math_add':
    case 'math_subtract':
    case 'math_multiply':
    case 'math_divide': {
      const n = toNum(v);
      const by = toNum(rule.value);
      if (n === null || by === null) return v;
      if (rule.type === 'math_add') return String(n + by);
      if (rule.type === 'math_subtract') return String(n - by);
      if (rule.type === 'math_multiply') return String(n * by);
      return by === 0 ? v : String(n / by);
    }
    case 'round': {
      const n = toNum(v);
      if (n === null) return v;
      const d = Math.max(0, Math.min(10, toInt(rule.decimals, 0)));
      return String(Number(n.toFixed(d)));
    }
    case 'decimal_format': {
      const n = toNum(v);
      if (n === null) return v;
      return n.toFixed(Math.max(0, Math.min(10, toInt(rule.decimals, 2))));
    }
    case 'currency_format': {
      const n = toNum(v);
      if (n === null) return v;
      try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: str(rule.currency).trim().toUpperCase() || 'USD',
        }).format(n);
      } catch {
        return v;
      }
    }

    // Dates
    case 'date_format': {
      const parsed = parseDate(v);
      const format = str(rule.format).trim();
      return parsed && format ? formatDateTokens(parsed.date, format) : v;
    }
    case 'timezone': {
      const parsed = parseDate(v);
      const tz = str(rule.tz).trim();
      if (!parsed || !tz || !isValidTimeZone(tz)) return v;
      return formatDateTokens(parsed.date, 'YYYY-MM-DD[T]HH:mm:ssZ', tz);
    }
    case 'date_add':
    case 'date_subtract': {
      const parsed = parseDate(v);
      const days = toNum(rule.days);
      if (!parsed || days === null) return v;
      const sign = rule.type === 'date_add' ? 1 : -1;
      const next = new Date(parsed.date.getTime() + sign * days * 86400000);
      return parsed.dateOnly
        ? next.toISOString().slice(0, 10)
        : next.toISOString();
    }
    case 'timestamp_convert': {
      const n = toNum(v);
      if (n === null || n === 0) return v;
      return new Date(n < 1e11 ? n * 1000 : n).toISOString().slice(0, 10);
    }

    // Split
    case 'split_by_space': {
      const parts = v.trim().split(/\s+/);
      return parts[toInt(rule.index, 0)] ?? v;
    }
    case 'split_by_delimiter': {
      const parts = v.split(str(rule.delimiter) || ',');
      return parts[toInt(rule.index, 0)]?.trim() ?? v;
    }
    case 'first_value':
      return v.trim().split(/\s+/)[0] ?? v;
    case 'last_value': {
      const parts = v.trim().split(/\s+/);
      return parts[parts.length - 1] ?? v;
    }

    // Type conversion
    case 'string_to_number': {
      const n = parseFloat(v);
      return String(Number.isNaN(n) ? 0 : n);
    }
    case 'number_to_string': {
      const n = toNum(v);
      return n === null ? v : String(n);
    }
    case 'string_to_boolean':
      return String(['true', '1', 'yes', 'on'].includes(v.toLowerCase().trim()));
    case 'boolean_to_string':
      return v === 'true' || v === '1' ? 'true' : 'false';
    case 'string_to_date':
    case 'date_to_string': {
      const parsed = parseDate(v);
      return parsed ? parsed.date.toISOString().slice(0, 10) : v;
    }
    case 'number_to_boolean': {
      const n = toNum(v);
      return n === null ? v : String(n !== 0);
    }
    case 'boolean_to_number':
      return v === 'true' || v === '1' ? '1' : '0';

    // Lookups
    case 'value_map': {
      const map = (rule.map ?? {}) as Record<string, string>;
      if (map[v] !== undefined) return map[v];
      return rule.fallback != null && rule.fallback !== '' ? str(rule.fallback) : v;
    }
    case 'value_mapping': {
      const norm = (rule.normalization ?? {}) as {
        trim?: boolean;
        lowercase?: boolean;
        replaceUnderscoreAndHyphenWithSpace?: boolean;
      };
      const normalize = (s: string): string => {
        let out = s;
        if (norm.replaceUnderscoreAndHyphenWithSpace) out = out.replace(/[_-]+/g, ' ');
        if (norm.trim) out = out.trim();
        if (norm.lowercase) out = out.toLowerCase();
        return out;
      };
      const fallback = () => (rule.defaultValue != null ? str(rule.defaultValue) : v);
      const key = normalize(v);
      if (key === '') return fallback();
      const map = (rule.map ?? {}) as Record<string, string>;
      const normalizedMap = new Map(
        Object.entries(map).map(([k, val]) => [normalize(k), val]),
      );
      return normalizedMap.has(key) ? normalizedMap.get(key)! : fallback();
    }
    default:
      return v;
  }
}

// ── The pipeline ─────────────────────────────────────────────────────────────

export interface PipelineStep {
  index: number;
  type: string;
  enabled: boolean;
  input: string;
  output: string;
  /** This step stopped the value. */
  skip?: SkipSignal;
  /** An earlier step stopped the value, so this one never ran. */
  notReached?: boolean;
}

export interface PipelineResult {
  /** The final value, or the raw input when nothing changed it. */
  value: unknown;
  skip?: SkipSignal;
  steps: PipelineStep[];
}

/**
 * Runs rules top to bottom. A failed validation skips the field; a skip
 * rule or If → then can skip the field or the whole record. Once something
 * skips, the rest don't run.
 */
export function runTransformPipeline(
  input: unknown,
  rules: TransformRule[] = [],
): PipelineResult {
  let current: unknown = input;
  let stopped: SkipSignal | undefined;
  const steps: PipelineStep[] = [];

  rules.forEach((rule, index) => {
    const enabled = rule.enabled !== false;
    const before = str(current);
    if (stopped || !enabled) {
      steps.push({
        index,
        type: rule.type,
        enabled,
        input: before,
        output: before,
        notReached: Boolean(stopped) && enabled,
      });
      return;
    }
    if (isValidationRule(rule.type)) {
      if (!passesRuleValidation(current, rule)) {
        stopped = { skip: 'field', reason: `Failed check: ${rule.type}` };
        steps.push({ index, type: rule.type, enabled, input: before, output: before, skip: stopped });
      } else {
        steps.push({ index, type: rule.type, enabled, input: before, output: before });
      }
      return;
    }
    const result = applyTransformRule(current, rule);
    if (isSkip(result)) {
      stopped = result;
      steps.push({ index, type: rule.type, enabled, input: before, output: before, skip: result });
      return;
    }
    current = result;
    steps.push({ index, type: rule.type, enabled, input: before, output: result });
  });

  return { value: current, skip: stopped, steps };
}
