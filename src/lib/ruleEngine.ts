import {
  isValidationRule as isSharedValidationRule,
  passesRuleValidation as sharedPassesValidation,
  runTransformPipeline,
} from './transformRules.shared';

export interface RuleCategory {
  id: string;
  label: string;
  icon: string;
}

export interface RuleDefinition {
  type: string;
  category: string;
  label: string;
  description: string;
  params?: string[];
  /** Saved rules still load and show, but it isn't offered in the library. */
  legacy?: boolean;
}

/** A configured rule instance in a pipeline */
export interface Rule {
  type: string;
  enabled?: boolean;
  // Parameterized fields — different rule types use different subsets of these
  find?: string;
  replacement?: string;
  value?: string;
  pattern?: string;
  delimiter?: string;
  index?: string | number;
  format?: string;
  tz?: string;
  days?: string | number;
  currency?: string;
  decimals?: string | number;
  action?: string;
  /** value_map / value_mapping: source value → destination value lookup table. */
  map?: Record<string, string>;
  /** value_map: used when a source value isn't in `map`. Blank = pass through. */
  fallback?: string;
  /** value_mapping: used when the normalized input isn't in `map`, or is empty. */
  defaultValue?: string;
  /** value_mapping: applied to both the input and the map's keys before lookup. */
  normalization?: {
    trim?: boolean;
    lowercase?: boolean;
    replaceUnderscoreAndHyphenWithSpace?: boolean;
  };
  [key: string]: unknown;
}

export { isValidationRule } from './transformRules.shared';

export function previewSourceValue(
  input: string,
  sourceType?: string,
): unknown {
  const type = sourceType?.toLowerCase();
  if (!input.trim() && type && type !== 'string' && type !== 'enum')
    return null;
  if (['number', 'integer', 'float', 'decimal'].includes(type ?? ''))
    return Number(input);
  if (['boolean', 'bool', 'checkbox'].includes(type ?? '')) {
    if (/^true$/i.test(input.trim())) return true;
    if (/^false$/i.test(input.trim())) return false;
  }
  if (['date', 'datetime', 'date_time'].includes(type ?? '')) {
    const date = new Date(input);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return input;
}

export function passesRuleValidation(value: unknown, rule: Rule): boolean {
  return sharedPassesValidation(value, rule);
}

export const RULE_CATEGORIES: RuleCategory[] = [
  { id: 'text', label: 'Text / String', icon: '✏️' },
  { id: 'length', label: 'Length Controls', icon: '📏' },
  { id: 'validation', label: 'Validation', icon: '✅' },
  { id: 'conditional', label: 'Conditional', icon: '🔀' },
  { id: 'number', label: 'Number Ops', icon: '🔢' },
  { id: 'date', label: 'Date Ops', icon: '📅' },
  { id: 'split', label: 'Split / Merge', icon: '✂️' },
  { id: 'conversion', label: 'Type Conversion', icon: '🔄' },
];

export const RULE_DEFINITIONS: RuleDefinition[] = [
  // Text
  {
    type: 'trim',
    category: 'text',
    label: 'Trim Spaces',
    description: 'Remove leading and trailing whitespace',
  },
  {
    type: 'remove_spaces',
    category: 'text',
    label: 'Remove All Spaces',
    description: 'Strip all whitespace from value',
  },
  {
    type: 'uppercase',
    category: 'text',
    label: 'Uppercase',
    description: 'Convert value to UPPERCASE',
  },
  {
    type: 'lowercase',
    category: 'text',
    label: 'Lowercase',
    description: 'Convert value to lowercase',
  },
  {
    type: 'capitalize',
    category: 'text',
    label: 'Capitalize Words',
    description: 'Capitalize Each Word',
  },
  {
    type: 'replace',
    category: 'text',
    label: 'Replace Text',
    description: 'Replace occurrences of a string',
    params: ['find', 'replacement'],
  },
  {
    type: 'remove_text',
    category: 'text',
    label: 'Remove Text',
    description: 'Remove all occurrences of a string',
    params: ['find'],
  },
  {
    type: 'prefix',
    category: 'text',
    label: 'Add Prefix',
    description: 'Prepend text to value',
    params: ['value'],
  },
  {
    type: 'suffix',
    category: 'text',
    label: 'Add Suffix',
    description: 'Append text to value',
    params: ['value'],
  },
  {
    type: 'regex_replace',
    category: 'text',
    label: 'Regex Replace',
    description: 'Replace using regex pattern',
    params: ['pattern', 'replacement'],
  },
  {
    type: 'remove_special',
    category: 'text',
    label: 'Remove Special Chars',
    description: 'Strip non-alphanumeric characters',
  },
  {
    type: 'remove_numbers',
    category: 'text',
    label: 'Remove Numbers',
    description: 'Remove all digit characters',
  },
  {
    type: 'remove_alpha',
    category: 'text',
    label: 'Remove Alphabets',
    description: 'Remove all letter characters',
  },
  {
    type: 'slug',
    category: 'text',
    label: 'Generate Slug',
    description: 'Convert to URL-friendly slug',
  },
  {
    type: 'extract_numbers',
    category: 'text',
    label: 'Extract Numbers Only',
    description: 'Keep only numeric characters',
  },
  {
    type: 'extract_text',
    category: 'text',
    label: 'Extract Text Only',
    description: 'Keep only letter characters',
  },
  // Length
  {
    type: 'char_limit',
    category: 'length',
    label: 'Character Limit',
    description: 'Cut the value after N characters',
    params: ['value'],
  },
  {
    type: 'word_limit',
    category: 'length',
    label: 'Word Limit',
    description: 'Cut the value after N words',
    params: ['value'],
  },
  {
    type: 'min_length',
    category: 'length',
    label: 'Minimum Length',
    description: 'Skip this field if it’s shorter than N characters',
    params: ['value'],
  },
  {
    type: 'max_length',
    category: 'length',
    label: 'Maximum Length',
    description: 'Skip this field if it’s longer than N characters',
    params: ['value'],
  },
  // Validation
  {
    type: 'is_string',
    category: 'validation',
    label: 'Is String',
    description: 'Send only if it’s text; otherwise skip this field',
  },
  {
    type: 'is_number',
    category: 'validation',
    label: 'Is Number',
    description: 'Send only if it’s a number; otherwise skip this field',
  },
  {
    type: 'is_email',
    category: 'validation',
    label: 'Is Email',
    description: 'Send only if it’s a valid email; otherwise skip this field',
  },
  {
    type: 'is_phone',
    category: 'validation',
    label: 'Is Phone',
    description: 'Send only if it’s a valid phone; otherwise skip this field',
  },
  {
    type: 'is_currency',
    category: 'validation',
    label: 'Is Price/Currency',
    description: 'Send only if it’s a money amount; otherwise skip this field',
  },
  {
    type: 'is_boolean',
    category: 'validation',
    label: 'Is Boolean',
    description: 'Send only if it’s true/false; otherwise skip this field',
  },
  {
    type: 'is_date',
    category: 'validation',
    label: 'Is Date',
    description: 'Send only if it’s a valid date; otherwise skip this field',
  },
  {
    type: 'is_empty',
    category: 'validation',
    label: 'Is Empty',
    description: 'Send only if it’s empty; otherwise skip this field',
  },
  {
    type: 'is_not_empty',
    category: 'validation',
    label: 'Is Not Empty',
    description: 'Send only if it has a value; otherwise skip this field',
  },
  // Conditional / Skip
  {
    type: 'if_condition',
    category: 'conditional',
    label: 'If → Then',
    description:
      'Check the value (equals, contains, is empty…) and set a value or skip',
    params: ['operator', 'thenAction'],
  },
  {
    type: 'skip_if_equals',
    category: 'conditional',
    label: 'Skip If Equals',
    description: 'Don’t sync the record when the value equals this',
    params: ['value'],
  },
  {
    type: 'skip_if_contains',
    category: 'conditional',
    label: 'Skip If Contains',
    description: 'Don’t sync the record when the value contains this',
    params: ['find'],
  },
  {
    type: 'replace_if_contains',
    category: 'conditional',
    label: 'Replace If Contains',
    description: 'Replace the whole value when it contains this',
    params: ['find', 'replacement'],
  },
  {
    type: 'if_starts_with',
    legacy: true,
    category: 'conditional',
    label: 'If Starts With',
    description: 'Apply if value starts with text',
    params: ['value', 'action'],
  },
  {
    type: 'if_ends_with',
    legacy: true,
    category: 'conditional',
    label: 'If Ends With',
    description: 'Apply if value ends with text',
    params: ['value', 'action'],
  },
  {
    type: 'if_matches_regex',
    legacy: true,
    category: 'conditional',
    label: 'If Matches Regex',
    description: 'Apply if value matches pattern',
    params: ['pattern', 'action'],
  },
  // Number
  {
    type: 'round',
    category: 'number',
    label: 'Round Number',
    description: 'Round to decimal places',
    params: ['decimals'],
  },
  {
    type: 'decimal_format',
    category: 'number',
    label: 'Decimal Format',
    description: 'Show a number with a fixed number of decimals',
    params: ['decimals'],
  },
  {
    type: 'currency_format',
    category: 'number',
    label: 'Currency Format',
    description: 'Format a number as money, like $1,234.50',
    params: ['currency'],
  },
  {
    type: 'abs',
    category: 'number',
    label: 'Absolute Value',
    description: 'Convert negative to positive',
  },
  {
    type: 'math_add',
    category: 'number',
    label: 'Add',
    description: 'Add a number to value',
    params: ['value'],
  },
  {
    type: 'math_subtract',
    category: 'number',
    label: 'Subtract',
    description: 'Subtract a number from value',
    params: ['value'],
  },
  {
    type: 'math_multiply',
    category: 'number',
    label: 'Multiply',
    description: 'Multiply value by number',
    params: ['value'],
  },
  {
    type: 'math_divide',
    category: 'number',
    label: 'Divide',
    description: 'Divide value by number',
    params: ['value'],
  },
  // Date
  {
    type: 'date_format',
    category: 'date',
    label: 'Date Format',
    description: 'Rewrite a date in another format',
    params: ['format'],
  },
  {
    type: 'timezone',
    category: 'date',
    label: 'Timezone Convert',
    description: 'Convert a date-time into another timezone',
    params: ['tz'],
  },
  {
    type: 'date_add',
    category: 'date',
    label: 'Add Days',
    description: 'Move a date forward by N days',
    params: ['days'],
  },
  {
    type: 'date_subtract',
    category: 'date',
    label: 'Subtract Days',
    description: 'Move a date back by N days',
    params: ['days'],
  },
  {
    type: 'timestamp_convert',
    category: 'date',
    label: 'Convert Timestamp',
    description: 'Convert Unix timestamp to date',
  },
  // Split
  {
    type: 'split_by_space',
    category: 'split',
    label: 'Pick a Word',
    description: 'Keep the Nth word (0 = first)',
    params: ['index'],
  },
  {
    type: 'split_by_delimiter',
    category: 'split',
    label: 'Split by Delimiter',
    description: 'Split on a character and keep the Nth part (0 = first)',
    params: ['delimiter', 'index'],
  },
  {
    type: 'first_value',
    category: 'split',
    label: 'First Word',
    description: 'Keep only the first word',
  },
  {
    type: 'last_value',
    category: 'split',
    label: 'Last Word',
    description: 'Keep only the last word',
  },
  // Type Conversion
  {
    type: 'string_to_number',
    category: 'conversion',
    label: 'String → Number',
    description: 'Parse string as a number (NaN → 0)',
  },
  {
    type: 'number_to_string',
    category: 'conversion',
    label: 'Number → String',
    description: 'Convert number to its string representation',
  },
  {
    type: 'string_to_boolean',
    category: 'conversion',
    label: 'String → Boolean',
    description: '"true"/"1"/"yes" → true, others → false',
  },
  {
    type: 'boolean_to_string',
    category: 'conversion',
    label: 'Boolean → String',
    description: 'Convert boolean to "true" or "false"',
  },
  {
    type: 'string_to_date',
    category: 'conversion',
    label: 'String → Date',
    description: 'Parse string and output ISO date (YYYY-MM-DD)',
  },
  {
    type: 'date_to_string',
    category: 'conversion',
    label: 'Date → String',
    description: 'Format date value as ISO date string',
  },
  {
    type: 'number_to_boolean',
    category: 'conversion',
    label: 'Number → Boolean',
    description: '0 → false, any other number → true',
  },
  {
    type: 'boolean_to_number',
    category: 'conversion',
    label: 'Boolean → Number',
    description: 'true → 1, false → 0',
  },
  {
    type: 'value_map',
    category: 'conversion',
    label: 'Map Values',
    description: 'Match each source value to an allowed destination value',
    params: ['map'],
  },
  {
    type: 'value_mapping',
    category: 'conversion',
    label: 'Map Values (Normalized)',
    description:
      'Match source values to destination values with optional trim/case/underscore normalization and a default fallback',
    params: ['map', 'defaultValue'],
  },
];

/**
 * The conversion rule that repairs a type mismatch outright, or null when the
 * pair needs a human (an enum destination — see classifyTypePair). Used to
 * attach a fix at the moment a mapping is created, rather than letting the
 * destination API reject the value on the first sync.
 */
export function suggestCastRule(
  sourceType?: string,
  destType?: string,
): Rule | null {
  const from = (sourceType || 'string').toLowerCase();
  const to = (destType || 'string').toLowerCase();
  const family = (t: string): string => {
    if (['number', 'integer', 'float', 'decimal'].includes(t)) return 'number';
    if (['boolean', 'bool', 'checkbox'].includes(t)) return 'boolean';
    if (['date', 'datetime', 'date_time'].includes(t)) return 'date';
    return 'string';
  };
  const key = `${family(from)}→${family(to)}`;
  const CASTS: Record<string, string> = {
    'string→number': 'string_to_number',
    'string→boolean': 'string_to_boolean',
    'string→date': 'string_to_date',
    'number→string': 'number_to_string',
    'number→boolean': 'number_to_boolean',
    'boolean→string': 'boolean_to_string',
    'boolean→number': 'boolean_to_number',
    'date→string': 'date_to_string',
  };
  return CASTS[key] ? { type: CASTS[key] } : null;
}

/**
 * Runs a pipeline to a string, for previews. The rules themselves live in
 * transformRules.shared.ts, the same file the API's sync uses. A failed
 * check returns `__SKIPPED__:validation:<type>`; a skip rule
 * `__SKIPPED__:<field|record>:<reason>`.
 */
export function executeRulePipeline(value: string, rules: Rule[] = []): string {
  const result = runTransformPipeline(value, rules);
  if (result.skip) {
    const step = result.steps.find((s) => s.skip);
    if (step && isSharedValidationRule(step.type)) {
      return `__SKIPPED__:validation:${step.type}`;
    }
    return `__SKIPPED__:${result.skip.skip}:${result.skip.reason}`;
  }
  return String(result.value ?? '');
}
