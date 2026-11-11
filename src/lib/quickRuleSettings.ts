import type { Rule } from '@/lib/ruleEngine';

// The three most common cleanups as one-click settings. Each one is stored
// as an ordinary rule, so it also shows (and can be edited) in the rule list.

export type TextCase = 'keep' | 'uppercase' | 'lowercase' | 'capitalize';

export interface QuickSettings {
  trim: boolean;
  textCase: TextCase;
  /** Empty string = no limit. */
  maxLength: string;
}

const CASE_TYPES: Exclude<TextCase, 'keep'>[] = [
  'uppercase',
  'lowercase',
  'capitalize',
];

const NON_TEXT_TYPES = new Set([
  'number',
  'integer',
  'int',
  'decimal',
  'float',
  'double',
  'currency',
  'percent',
  'date',
  'datetime',
  'date-time',
  'timestamp',
  'boolean',
  'bool',
  'checkbox',
]);

/** Quick cleanups only make sense for text; unknown types count as text. */
export function isTextLikeField(type?: string): boolean {
  return !NON_TEXT_TYPES.has((type ?? 'string').toLowerCase());
}

export function readQuickSettings(rules: Rule[]): QuickSettings {
  const caseRule = rules.find((rule) =>
    (CASE_TYPES as string[]).includes(rule.type),
  );
  const limit = rules.find((rule) => rule.type === 'char_limit');
  return {
    trim: rules.some((rule) => rule.type === 'trim'),
    textCase: (caseRule?.type as TextCase | undefined) ?? 'keep',
    maxLength: limit?.value != null ? String(limit.value) : '',
  };
}

/** Replace the first rule matching `isTarget` in place, or append; null removes every match. */
function upsert(
  rules: Rule[],
  isTarget: (rule: Rule) => boolean,
  next: Rule | null,
): Rule[] {
  const index = rules.findIndex(isTarget);
  const rest = rules.filter((rule, i) => i === index || !isTarget(rule));
  if (!next) return rest.filter((rule) => !isTarget(rule));
  if (index === -1) return [...rules, next];
  const at = rest.findIndex(isTarget);
  return rest.map((rule, i) =>
    i === at ? { ...rule, ...next, enabled: rule.enabled ?? true } : rule,
  );
}

export function applyQuickSetting<K extends keyof QuickSettings>(
  rules: Rule[],
  key: K,
  value: QuickSettings[K],
): Rule[] {
  if (key === 'trim') {
    return upsert(
      rules,
      (rule) => rule.type === 'trim',
      value ? { type: 'trim', enabled: true } : null,
    );
  }
  if (key === 'textCase') {
    const textCase = value as TextCase;
    return upsert(
      rules,
      (rule) => (CASE_TYPES as string[]).includes(rule.type),
      textCase === 'keep' ? null : { type: textCase, enabled: true },
    );
  }
  const limit = String(value).trim();
  return upsert(
    rules,
    (rule) => rule.type === 'char_limit',
    limit ? { type: 'char_limit', enabled: true, value: limit } : null,
  );
}
