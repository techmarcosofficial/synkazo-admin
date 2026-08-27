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
  /** value_map: source value → destination value lookup table. */
  map?: Record<string, string>;
  /** value_map: used when a source value isn't in `map`. Blank = pass through. */
  fallback?: string;
  [key: string]: unknown;
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
    description: 'Truncate to max characters',
    params: ['value'],
  },
  {
    type: 'word_limit',
    category: 'length',
    label: 'Word Limit',
    description: 'Truncate to max words',
    params: ['value'],
  },
  {
    type: 'min_length',
    category: 'length',
    label: 'Minimum Length',
    description: 'Validate minimum character count',
    params: ['value'],
  },
  {
    type: 'max_length',
    category: 'length',
    label: 'Maximum Length',
    description: 'Validate maximum character count',
    params: ['value'],
  },
  // Validation
  {
    type: 'is_string',
    category: 'validation',
    label: 'Is String',
    description: 'Assert value is a string',
  },
  {
    type: 'is_number',
    category: 'validation',
    label: 'Is Number',
    description: 'Assert value is numeric',
  },
  {
    type: 'is_email',
    category: 'validation',
    label: 'Is Email',
    description: 'Assert value is a valid email',
  },
  {
    type: 'is_phone',
    category: 'validation',
    label: 'Is Phone',
    description: 'Assert value is a valid phone number',
  },
  {
    type: 'is_currency',
    category: 'validation',
    label: 'Is Price/Currency',
    description: 'Assert value is a currency amount',
  },
  {
    type: 'is_boolean',
    category: 'validation',
    label: 'Is Boolean',
    description: 'Assert value is true/false',
  },
  {
    type: 'is_date',
    category: 'validation',
    label: 'Is Date',
    description: 'Assert value is a valid date',
  },
  {
    type: 'is_empty',
    category: 'validation',
    label: 'Is Empty',
    description: 'Assert value is empty',
  },
  {
    type: 'is_not_empty',
    category: 'validation',
    label: 'Is Not Empty',
    description: 'Assert value is not empty',
  },
  // Conditional
  {
    type: 'default_if_empty',
    category: 'conditional',
    label: 'Default If Empty',
    description: 'Set a default if value is empty',
    params: ['value'],
  },
  {
    type: 'replace_if_contains',
    category: 'conditional',
    label: 'Replace If Contains',
    description: 'Replace value if it contains X',
    params: ['find', 'replacement'],
  },
  {
    type: 'if_starts_with',
    category: 'conditional',
    label: 'If Starts With',
    description: 'Apply if value starts with text',
    params: ['value', 'action'],
  },
  {
    type: 'if_ends_with',
    category: 'conditional',
    label: 'If Ends With',
    description: 'Apply if value ends with text',
    params: ['value', 'action'],
  },
  {
    type: 'if_matches_regex',
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
    description: 'Format to N decimal places',
    params: ['decimals'],
  },
  {
    type: 'currency_format',
    category: 'number',
    label: 'Currency Format',
    description: 'Format as currency string',
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
    description: 'Convert date to format',
    params: ['format'],
  },
  {
    type: 'timezone',
    category: 'date',
    label: 'Timezone Convert',
    description: 'Convert to target timezone',
    params: ['tz'],
  },
  {
    type: 'date_add',
    category: 'date',
    label: 'Add Days',
    description: 'Add N days to date',
    params: ['days'],
  },
  {
    type: 'date_subtract',
    category: 'date',
    label: 'Subtract Days',
    description: 'Subtract N days from date',
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
    label: 'Split by Space',
    description: 'Split value by whitespace',
    params: ['index'],
  },
  {
    type: 'split_by_delimiter',
    category: 'split',
    label: 'Split by Delimiter',
    description: 'Split by custom delimiter',
    params: ['delimiter', 'index'],
  },
  {
    type: 'first_value',
    category: 'split',
    label: 'First Value',
    description: 'Take the first part of a split',
  },
  {
    type: 'last_value',
    category: 'split',
    label: 'Last Value',
    description: 'Take the last part of a split',
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

function applyRule(value: string, rule: Rule): string {
  const v = String(value ?? '');
  switch (rule.type) {
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
      return v.split(rule.find ?? '').join(rule.replacement ?? '');
    case 'remove_text':
      return v.split(rule.find ?? '').join('');
    case 'prefix':
      return (rule.value ?? '') + v;
    case 'suffix':
      return v + (rule.value ?? '');
    case 'regex_replace': {
      try {
        return v.replace(
          new RegExp(rule.pattern ?? '', 'g'),
          rule.replacement ?? '',
        );
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
    case 'char_limit':
      return v.slice(0, parseInt(String(rule.value)) || 30);
    case 'word_limit':
      return v
        .split(/\s+/)
        .slice(0, parseInt(String(rule.value)) || 15)
        .join(' ');
    case 'default_if_empty':
      return v.trim() === '' ? (rule.value ?? '') : v;
    case 'replace_if_contains':
      return v.includes(rule.find ?? '') ? (rule.replacement ?? '') : v;
    case 'split_by_space': {
      const parts = v.split(/\s+/);
      const idx = parseInt(String(rule.index ?? 0));
      return parts[idx] ?? v;
    }
    case 'split_by_delimiter': {
      const parts = v.split(rule.delimiter ?? ',');
      const idx = parseInt(String(rule.index ?? 0));
      return parts[idx]?.trim() ?? v;
    }
    case 'first_value':
      return v.split(/\s+/)[0] ?? v;
    case 'last_value': {
      const p = v.split(/\s+/);
      return p[p.length - 1] ?? v;
    }
    case 'abs':
      return String(Math.abs(parseFloat(v)) || v);
    case 'math_add':
      return String(
        (parseFloat(v) || 0) + (parseFloat(String(rule.value)) || 0),
      );
    case 'math_subtract':
      return String(
        (parseFloat(v) || 0) - (parseFloat(String(rule.value)) || 0),
      );
    case 'math_multiply':
      return String(
        (parseFloat(v) || 0) * (parseFloat(String(rule.value)) || 1),
      );
    case 'math_divide': {
      const divisor = parseFloat(String(rule.value));
      return divisor ? String((parseFloat(v) || 0) / divisor) : v;
    }
    case 'round':
      return String(
        parseFloat(parseFloat(v).toFixed(parseInt(String(rule.decimals)) || 0)),
      );
    case 'timestamp_convert': {
      const n = parseInt(v);
      return n
        ? new Date(n < 1e10 ? n * 1000 : n).toISOString().split('T')[0]
        : v;
    }
    case 'string_to_number': {
      const n = parseFloat(v);
      return String(isNaN(n) ? 0 : n);
    }
    case 'number_to_string':
      return String(parseFloat(v) || 0);
    case 'string_to_boolean':
      return String(
        ['true', '1', 'yes', 'on'].includes(v.toLowerCase().trim()),
      );
    case 'boolean_to_string':
      return v === 'true' || v === '1' ? 'true' : 'false';
    case 'string_to_date': {
      try {
        const d = new Date(v);
        return isNaN(d.getTime()) ? v : d.toISOString().split('T')[0];
      } catch {
        return v;
      }
    }
    case 'date_to_string': {
      try {
        const d = new Date(v);
        return isNaN(d.getTime()) ? v : d.toISOString().split('T')[0];
      } catch {
        return v;
      }
    }
    case 'number_to_boolean':
      return String(parseFloat(v) !== 0);
    case 'boolean_to_number':
      return v === 'true' || v === '1' ? '1' : '0';
    case 'value_map': {
      const map = (rule.map ?? {}) as Record<string, string>;
      if (map[v] !== undefined) return map[v];
      return rule.fallback != null && rule.fallback !== ''
        ? String(rule.fallback)
        : v;
    }
    default:
      return v;
  }
}

export function executeRulePipeline(value: string, rules: Rule[] = []): string {
  return rules
    .filter((r) => r.enabled !== false)
    .reduce((v, rule) => applyRule(v, rule), value);
}
