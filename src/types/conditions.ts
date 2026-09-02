/** Platform-agnostic condition types for record-level filtering (Job.excludeConditions).
 *  Deliberately not imported from src/api/associations.ts — that module's types are scoped
 *  to association rules, and this is a separate use case that happens to share the same
 *  shape (both are evaluated by the same backend evaluateConditions() engine). */

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'is_empty'
  | 'is_not_empty'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte';

export interface ConditionNormalization {
  trim?: boolean;
  lowercase?: boolean;
  removeWhitespace?: boolean;
}

export interface ExcludeCondition {
  field: string;
  operator: ConditionOperator;
  value?: string | number | boolean | string[] | null;
  normalization?: ConditionNormalization;
}
