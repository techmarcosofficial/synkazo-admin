import type { ExcludeCondition } from '@/types/conditions';

function getByPath(record: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value === null || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[key];
  }, record);
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function normalize(value: unknown, condition: ExcludeCondition): string {
  let normalized = value === null || value === undefined ? '' : String(value);
  if (condition.normalization?.trim) normalized = normalized.trim();
  if (condition.normalization?.removeWhitespace) {
    normalized = normalized.replace(/\s+/g, '');
  }
  if (condition.normalization?.lowercase) {
    normalized = normalized.toLowerCase();
  }
  return normalized;
}

function matchesCondition(
  record: Record<string, unknown>,
  condition: ExcludeCondition,
): boolean {
  const raw = getByPath(record, condition.field);
  const empty = isEmpty(raw);

  if (condition.operator === 'is_empty') return empty;
  if (condition.operator === 'is_not_empty') return !empty;

  if (
    [
      'equals',
      'contains',
      'starts_with',
      'ends_with',
      'in',
      'gt',
      'gte',
      'lt',
      'lte',
    ].includes(condition.operator) &&
    empty
  ) {
    return false;
  }
  if (
    ['not_equals', 'not_contains', 'not_in'].includes(condition.operator) &&
    empty
  ) {
    return true;
  }

  if (['gt', 'gte', 'lt', 'lte'].includes(condition.operator)) {
    const left = Number(raw);
    const right = Number(condition.value);
    if (Number.isNaN(left) || Number.isNaN(right)) return false;
    if (condition.operator === 'gt') return left > right;
    if (condition.operator === 'gte') return left >= right;
    if (condition.operator === 'lt') return left < right;
    return left <= right;
  }

  const left = normalize(raw, condition);
  if (condition.operator === 'in' || condition.operator === 'not_in') {
    const rawValues = Array.isArray(condition.value)
      ? condition.value
      : String(condition.value ?? '').split(',');
    const contains = rawValues.some(
      (value) => normalize(value, condition) === left,
    );
    return condition.operator === 'in' ? contains : !contains;
  }

  const right = normalize(condition.value, condition);
  if (condition.operator === 'equals') return left === right;
  if (condition.operator === 'not_equals') return left !== right;
  if (condition.operator === 'contains') return left.includes(right);
  if (condition.operator === 'not_contains') return !left.includes(right);
  if (condition.operator === 'starts_with') return left.startsWith(right);
  if (condition.operator === 'ends_with') return left.endsWith(right);
  return false;
}

/** Mirrors the server-side skip predicate for a read-only local sample preview. */
export function recordMatchesExcludeConditions(
  record: Record<string, unknown>,
  conditions: ExcludeCondition[],
  logic: 'AND' | 'OR',
): boolean {
  if (conditions.length === 0) return false;
  return logic === 'OR'
    ? conditions.some((condition) => matchesCondition(record, condition))
    : conditions.every((condition) => matchesCondition(record, condition));
}
