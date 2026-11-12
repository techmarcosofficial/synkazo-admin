// How each transform rule is explained in the field settings panel: a real
// example (run through the actual engine, so it can't lie) and, for every
// input, a realistic placeholder, a one-line hint, and fixed choices where
// the answer comes from a short list.

import type { Rule } from './ruleEngine';

export interface ParamOption {
  value: string;
  label: string;
}

export interface ParamGuide {
  placeholder?: string;
  hint?: string;
  /** Fixed choices. With `allowCustom`, a "Custom…" entry reveals a text box. */
  options?: ParamOption[];
  allowCustom?: boolean;
  numeric?: boolean;
  /** Not required to save (e.g. an empty replacement removes the match). */
  optional?: boolean;
}

const DECIMALS: ParamOption[] = ['0', '1', '2', '3', '4'].map((d) => ({
  value: d,
  label: d === '0' ? '0 (whole number)' : `${d} decimal${d === '1' ? '' : 's'}`,
}));

export const CURRENCIES: ParamOption[] = [
  { value: 'USD', label: 'USD · $1,234.50' },
  { value: 'EUR', label: 'EUR · €1,234.50' },
  { value: 'GBP', label: 'GBP · £1,234.50' },
  { value: 'CAD', label: 'CAD · CA$1,234.50' },
  { value: 'AUD', label: 'AUD · A$1,234.50' },
  { value: 'INR', label: 'INR · ₹1,234.50' },
  { value: 'JPY', label: 'JPY · ¥1,235' },
];

export const DATE_FORMATS: ParamOption[] = [
  { value: 'YYYY-MM-DD', label: '2024-03-15' },
  { value: 'MM/DD/YYYY', label: '03/15/2024' },
  { value: 'DD/MM/YYYY', label: '15/03/2024' },
  { value: 'MMM D, YYYY', label: 'Mar 15, 2024' },
  { value: 'MMMM D, YYYY', label: 'March 15, 2024' },
  { value: 'dddd, MMM D', label: 'Friday, Mar 15' },
  { value: 'YYYY-MM-DD HH:mm', label: '2024-03-15 14:05' },
  { value: 'MM/DD/YYYY h:mm A', label: '03/15/2024 2:05 PM' },
];

export const TIMEZONES: ParamOption[] = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
].map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') }));

const DEFAULT_PARAMS: Record<string, ParamGuide> = {
  find: { placeholder: 'Inc.', hint: 'Exact text to look for (case-sensitive).' },
  replacement: { placeholder: 'Incorporated', hint: 'What goes in its place.' },
  value: { placeholder: 'Unknown' },
  pattern: {
    placeholder: '\\D',
    hint: 'A regular expression. \\D means "any non-digit".',
  },
  format: {
    options: DATE_FORMATS,
    allowCustom: true,
    hint: 'Codes: YYYY year, MM month, DD day, HH:mm time, A AM/PM.',
  },
  tz: { options: TIMEZONES, hint: 'Dates without a timezone are read as UTC.' },
  days: { placeholder: '7', numeric: true },
  decimals: { options: DECIMALS },
  currency: { options: CURRENCIES },
  delimiter: { placeholder: ',', hint: 'The character between the parts.' },
  index: {
    placeholder: '0',
    numeric: true,
    hint: 'Which part to keep: 0 = first, 1 = second…',
  },
};

const RULE_PARAMS: Record<string, Record<string, ParamGuide>> = {
  replace: {},
  remove_text: { find: { placeholder: '-', hint: 'Every occurrence is removed.' } },
  prefix: { value: { placeholder: 'CUST-', hint: 'Added before the value.' } },
  suffix: { value: { placeholder: ' LLC', hint: 'Added after the value.' } },
  regex_replace: {
    replacement: {
      placeholder: '(leave empty to remove)',
      optional: true,
      hint: 'Leave empty to delete what matches.',
    },
  },
  char_limit: { value: { placeholder: '100', numeric: true, hint: 'Characters to keep.' } },
  word_limit: { value: { placeholder: '10', numeric: true, hint: 'Words to keep.' } },
  min_length: { value: { placeholder: '3', numeric: true, hint: 'Shorter values skip this field.' } },
  max_length: { value: { placeholder: '255', numeric: true, hint: 'Longer values skip this field.' } },
  skip_if_equals: { value: { placeholder: 'test', hint: 'Exact match, case-sensitive.' } },
  skip_if_contains: { find: { placeholder: '@test.com' } },
  replace_if_contains: {
    find: { placeholder: 'N/A' },
    replacement: { placeholder: 'Unknown', hint: 'Replaces the whole value.' },
  },
  default_if_empty: { value: { placeholder: 'Unknown' } },
  math_add: { value: { placeholder: '10', numeric: true } },
  math_subtract: { value: { placeholder: '10', numeric: true } },
  math_multiply: { value: { placeholder: '1.5', numeric: true } },
  math_divide: { value: { placeholder: '100', numeric: true, hint: 'E.g. 100 turns cents into dollars.' } },
  date_add: { days: { placeholder: '7', numeric: true } },
  date_subtract: { days: { placeholder: '30', numeric: true } },
  split_by_space: { index: { placeholder: '1', numeric: true, hint: '0 = first word, 1 = second…' } },
  split_by_delimiter: { index: { placeholder: '1' } },
};

export function paramGuide(ruleType: string, param: string): ParamGuide {
  return { ...DEFAULT_PARAMS[param], ...RULE_PARAMS[ruleType]?.[param] };
}

/** A sample input and settings that show what the rule does. */
export const RULE_EXAMPLES: Record<string, { input: string; params?: Partial<Rule> }> = {
  trim: { input: '  Acme Inc  ' },
  remove_spaces: { input: '555 123 4567' },
  uppercase: { input: 'acme inc' },
  lowercase: { input: 'Jane@Acme.COM' },
  capitalize: { input: 'jane smith' },
  replace: { input: 'Acme Inc.', params: { find: 'Inc.', replacement: 'Incorporated' } },
  remove_text: { input: '555-123-4567', params: { find: '-' } },
  prefix: { input: '1042', params: { value: 'CUST-' } },
  suffix: { input: 'Acme', params: { value: ' LLC' } },
  regex_replace: { input: '(555) 123-4567', params: { pattern: '\\D', replacement: '' } },
  remove_special: { input: 'Acme & Co.!' },
  remove_numbers: { input: 'Suite 42B' },
  remove_alpha: { input: 'Unit 42B' },
  slug: { input: 'Hello World 2024!' },
  extract_numbers: { input: 'Order #A-1042' },
  extract_text: { input: 'Order #1042' },
  char_limit: { input: 'Synkazo Integrations', params: { value: '7' } },
  word_limit: { input: 'one two three four', params: { value: '2' } },
  min_length: { input: 'ab', params: { value: '3' } },
  max_length: { input: 'ABCDEFG', params: { value: '5' } },
  is_string: { input: 'Acme' },
  is_number: { input: '42.5' },
  is_email: { input: 'not-an-email' },
  is_phone: { input: '(555) 123-4567' },
  is_currency: { input: '$1,234.50' },
  is_boolean: { input: 'maybe' },
  is_date: { input: '2024-03-15' },
  is_empty: { input: 'Acme' },
  is_not_empty: { input: '' },
  if_condition: {
    input: 'Yes',
    params: {
      operator: 'equals',
      value: 'Yes',
      thenAction: 'set',
      thenValue: 'true',
      elseAction: 'set',
      elseValue: 'false',
    },
  },
  skip_if_equals: { input: 'test', params: { value: 'test' } },
  skip_if_contains: { input: 'qa@test.com', params: { find: '@test.com' } },
  replace_if_contains: { input: 'N/A - pending', params: { find: 'N/A', replacement: 'Unknown' } },
  round: { input: '3.14159', params: { decimals: '2' } },
  decimal_format: { input: '3.5', params: { decimals: '2' } },
  currency_format: { input: '1234.5', params: { currency: 'USD' } },
  abs: { input: '-42.5' },
  math_add: { input: '90', params: { value: '10' } },
  math_subtract: { input: '100', params: { value: '15' } },
  math_multiply: { input: '20', params: { value: '1.5' } },
  math_divide: { input: '12550', params: { value: '100' } },
  date_format: { input: '2024-03-15', params: { format: 'MMM D, YYYY' } },
  timezone: { input: '2024-03-15T15:00:00Z', params: { tz: 'America/New_York' } },
  date_add: { input: '2024-03-15', params: { days: '7' } },
  date_subtract: { input: '2024-03-15', params: { days: '30' } },
  timestamp_convert: { input: '1710460800' },
  split_by_space: { input: 'Jane Q Public', params: { index: '1' } },
  split_by_delimiter: { input: 'red, green, blue', params: { delimiter: ',', index: '1' } },
  first_value: { input: 'Jane Q Public' },
  last_value: { input: 'Jane Q Public' },
  string_to_number: { input: '42.50' },
  number_to_string: { input: '007' },
  string_to_boolean: { input: 'Yes' },
  boolean_to_string: { input: '1' },
  string_to_date: { input: 'March 15, 2024' },
  date_to_string: { input: '2024-03-15T10:30:00Z' },
  number_to_boolean: { input: '0' },
  boolean_to_number: { input: 'true' },
  value_map: { input: 'paid', params: { map: { paid: 'Closed Won' }, fallback: 'Open' } },
  value_mapping: {
    input: ' balance_due ',
    params: {
      map: { 'Balance Due': 'Open' },
      normalization: { trim: true, lowercase: true, replaceUnderscoreAndHyphenWithSpace: true },
    },
  },
};

/**
 * A believable test value for a field, from its type and name, used until a
 * real value from the source loads (or when there isn't one).
 */
export function sampleValueFor(field?: { type?: string; label?: string; key?: string }): string {
  const name = `${field?.label ?? ''} ${field?.key ?? ''}`.toLowerCase();
  const type = (field?.type ?? '').toLowerCase();
  if (name.includes('email')) return '  Jane.Smith@Example.COM ';
  if (name.includes('phone') || name.includes('mobile')) return '(555) 123-4567';
  if (['number', 'integer', 'float', 'decimal', 'currency'].includes(type)) return '1234.5';
  if (['date', 'datetime', 'date_time'].includes(type) || name.includes('date'))
    return '2024-03-15T14:05:00Z';
  if (['boolean', 'bool', 'checkbox'].includes(type)) return 'Yes';
  if (name.includes('name')) return '  jane smith  ';
  return '  Acme Inc.  ';
}
