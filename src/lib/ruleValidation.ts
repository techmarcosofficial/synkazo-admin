import type { Rule } from './ruleEngine';

export const REQUIRED_RULE_PARAMS: Record<string, string[]> = {
  replace: ['find', 'replacement'],
  remove_text: ['find'],
  prefix: ['value'],
  suffix: ['value'],
  regex_replace: ['pattern', 'replacement'],
  char_limit: ['value'],
  word_limit: ['value'],
  min_length: ['value'],
  max_length: ['value'],
  skip_if_equals: ['value'],
  skip_if_contains: ['find'],
  default_if_empty: ['value'],
  replace_if_contains: ['find', 'replacement'],
  if_starts_with: ['value', 'action'],
  if_ends_with: ['value', 'action'],
  if_matches_regex: ['pattern', 'action'],
  round: ['decimals'],
  decimal_format: ['decimals'],
  currency_format: ['currency'],
  math_add: ['value'],
  math_subtract: ['value'],
  math_multiply: ['value'],
  math_divide: ['value'],
  date_format: ['format'],
  timezone: ['tz'],
  date_add: ['days'],
  date_subtract: ['days'],
  split_by_space: ['index'],
  split_by_delimiter: ['delimiter', 'index'],
  value_map: ['fallback', 'map'],
  value_mapping: ['map'],
};

export function validateRule(rule: Rule): string[] {
  if (rule.enabled === false) return [];
  return (REQUIRED_RULE_PARAMS[rule.type] ?? []).filter((param) => {
    if (param === 'map') {
      const entries = Object.entries(rule.map ?? {});
      return (
        entries.length === 0 ||
        entries.some(
          ([source, destination]) =>
            source.trim() === '' ||
            typeof destination !== 'string' ||
            (rule.type === 'value_mapping' && destination.trim() === ''),
        )
      );
    }
    const value = String(rule[param] ?? '');
    if (value.trim() === '') return true;
    if (
      (rule.type === 'min_length' || rule.type === 'max_length') &&
      param === 'value'
    ) {
      const threshold = Number(value);
      return !Number.isInteger(threshold) || threshold < 0;
    }
    return false;
  });
}

export function validateRules(rules: Rule[]): Record<number, string[]> {
  const errors: Record<number, string[]> = {};
  rules.forEach((rule, index) => {
    const ruleErrors = validateRule(rule);
    if (ruleErrors.length > 0) errors[index] = ruleErrors;
  });
  return errors;
}
