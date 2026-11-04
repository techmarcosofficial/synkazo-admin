// Mirrors synkazo-api src/sync/transform-inversion.util.ts: a two-way mapping
// whose transform can't be undone is synced forward only, so the UI must not
// offer "Both Ways" for it. Keep the two lists in step.

type Rule = { type?: string; enabled?: boolean };

const ONE_WAY_TYPES = new Set([
  'concat',
  'combine',
  'static',
  'json_stringify',
]);

const REVERSIBLE_RULES = new Set([
  // inverted
  'value_map',
  'value_mapping',
  'math_add',
  'math_subtract',
  'math_multiply',
  'math_divide',
  'prefix',
  'suffix',
  // dropped on the way back (shape only)
  'trim',
  'uppercase',
  'lowercase',
  'capitalize',
  'skip_if_empty',
  'skip_if_equals',
  'skip_if_contains',
  'default_if_empty',
  'string_to_number',
  'number_to_string',
  'string_to_boolean',
  'boolean_to_string',
  'number_to_boolean',
  'boolean_to_number',
  // validation
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

export function isReversibleTransform(
  transformType: string | null | undefined,
  transformConfig: unknown,
): boolean {
  if (transformType && ONE_WAY_TYPES.has(transformType)) return false;
  const rules = (transformConfig as { rules?: unknown } | null)?.rules;
  if (!Array.isArray(rules)) return true;
  return (rules as Rule[]).every(
    (rule) => rule.enabled === false || REVERSIBLE_RULES.has(rule.type ?? ''),
  );
}

export const ONE_WAY_TRANSFORM_HINT =
  "This field's transform can't be reversed, so it syncs forward only.";
