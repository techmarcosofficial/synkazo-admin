import {
  areTypesCompatible,
  classifyTypePair,
  matchValueToOption,
} from '@/lib/fieldMatching';
import { RULE_DEFINITIONS, suggestCastRule, type Rule } from '@/lib/ruleEngine';

export interface RuleSuggestionField {
  key: string;
  label?: string;
  type?: string;
  options?: { value: string; label: string }[];
}

export interface RuleSuggestion {
  id: string;
  rule: Rule;
  label: string;
  reason: string;
  confidence: 'recommended' | 'starting_point';
  requiresConfiguration?: boolean;
}

interface BuildRuleSuggestionsInput {
  sourceField?: RuleSuggestionField;
  destField?: RuleSuggestionField;
  sampleValue?: string;
  currentRules?: Rule[];
}

function ruleLabel(type: string): string {
  return (
    RULE_DEFINITIONS.find((definition) => definition.type === type)?.label ||
    type
  );
}

function displayType(type?: string): string {
  return (type || 'text').replace(/_/g, ' ');
}

function hasEquivalentRule(rules: Rule[], type: string): boolean {
  if (type === 'value_map' || type === 'value_mapping') {
    return rules.some(
      (rule) => rule.type === 'value_map' || rule.type === 'value_mapping',
    );
  }
  return rules.some((rule) => rule.type === type);
}

/**
 * Produces conservative, explainable rule suggestions. Suggestions are drafts:
 * callers decide whether to add them, and this function never mutates its input.
 */
export function buildRuleSuggestions({
  sourceField,
  destField,
  sampleValue,
  currentRules = [],
}: BuildRuleSuggestionsInput): RuleSuggestion[] {
  if (!sourceField || !destField) return [];

  const sourceType = sourceField.type || 'string';
  const destType = destField.type || 'string';
  const suggestions: RuleSuggestion[] = [];
  const typeIssue = classifyTypePair(sourceType, destType);

  if (typeIssue === 'cast') {
    const castRule = suggestCastRule(sourceType, destType);
    if (castRule && !hasEquivalentRule(currentRules, castRule.type)) {
      suggestions.push({
        id: `cast:${castRule.type}`,
        rule: { ...castRule, enabled: true },
        label: ruleLabel(castRule.type),
        reason: `Destination expects ${displayType(destType)}; source is ${displayType(sourceType)}.`,
        confidence: 'recommended',
      });
    }
  }

  if (
    typeIssue === 'value_map' &&
    !hasEquivalentRule(currentRules, 'value_map')
  ) {
    const observedValue = sampleValue?.trim() ? sampleValue : undefined;
    const matchedOption =
      observedValue && destField.options?.length
        ? matchValueToOption(observedValue, destField.options)
        : null;
    const map = observedValue ? { [observedValue]: matchedOption ?? '' } : {};

    suggestions.push({
      id: 'value-map',
      rule: { type: 'value_map', enabled: true, map },
      label: ruleLabel('value_map'),
      reason: matchedOption
        ? 'The sample value matches an allowed destination option.'
        : 'Destination accepts a fixed list of values; map source values before syncing.',
      confidence: 'recommended',
      requiresConfiguration: !matchedOption,
    });
  }

  const sampleNeedsTrim =
    typeof sampleValue === 'string' &&
    sampleValue.length > 0 &&
    sampleValue !== sampleValue.trim();
  const textToText =
    areTypesCompatible(sourceType, 'string') &&
    areTypesCompatible(destType, 'string');

  if (
    !hasEquivalentRule(currentRules, 'trim') &&
    typeIssue !== 'value_map' &&
    (sampleNeedsTrim || (suggestions.length === 0 && textToText))
  ) {
    suggestions.push({
      id: 'trim',
      rule: { type: 'trim', enabled: true },
      label: ruleLabel('trim'),
      reason: sampleNeedsTrim
        ? 'The sample value contains leading or trailing spaces.'
        : 'A useful starting point for keeping text values clean before syncing.',
      confidence: sampleNeedsTrim ? 'recommended' : 'starting_point',
    });
  }

  return suggestions
    .sort((left, right) => {
      if (!sampleNeedsTrim) return 0;
      if (left.rule.type === 'trim') return -1;
      if (right.rule.type === 'trim') return 1;
      return 0;
    })
    .slice(0, 2);
}
