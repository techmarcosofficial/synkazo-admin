import { describe, expect, it } from 'vitest';

import type { Rule } from '@/lib/ruleEngine';

import {
  buildRulePreviewSteps,
  cloneRules,
  reorderRules,
} from './RuleBuilderModal';

describe('buildRulePreviewSteps', () => {
  it('shows the output after each rule in pipeline order', () => {
    const rules: Rule[] = [
      { type: 'trim', enabled: true },
      { type: 'prefix', value: 'JOB-', enabled: true },
    ];

    expect(buildRulePreviewSteps('  10482  ', rules)).toEqual([
      {
        index: 0,
        label: 'Trim Spaces',
        output: '10482',
        enabled: true,
      },
      {
        index: 1,
        label: 'Add Prefix',
        output: 'JOB-10482',
        enabled: true,
      },
    ]);
  });

  it('keeps the current value when a rule is disabled', () => {
    const rules: Rule[] = [
      { type: 'uppercase', enabled: false },
      { type: 'suffix', value: '-done', enabled: true },
    ];

    expect(buildRulePreviewSteps('Job', rules)).toEqual([
      {
        index: 0,
        label: 'Uppercase',
        output: 'Job',
        enabled: false,
      },
      {
        index: 1,
        label: 'Add Suffix',
        output: 'Job-done',
        enabled: true,
      },
    ]);
  });
});

describe('reorderRules', () => {
  it('moves a dragged rule to its dropped pipeline position', () => {
    const rules: Rule[] = [
      { type: 'trim', enabled: true },
      { type: 'uppercase', enabled: true },
      { type: 'suffix', value: '-done', enabled: true },
    ];

    expect(reorderRules(rules, 2, 0).map((rule) => rule.type)).toEqual([
      'suffix',
      'trim',
      'uppercase',
    ]);
    expect(rules.map((rule) => rule.type)).toEqual([
      'trim',
      'uppercase',
      'suffix',
    ]);
  });

  it('returns the same rule list when the drop does not change position', () => {
    const rules: Rule[] = [
      { type: 'trim', enabled: true },
      { type: 'uppercase', enabled: true },
    ];

    expect(reorderRules(rules, 1, 1)).toBe(rules);
  });
});

describe('cloneRules', () => {
  it('keeps drawer edits isolated from the rules supplied by the mapping', () => {
    const initialRules: Rule[] = [
      {
        type: 'value_mapping',
        enabled: true,
        map: { pending: 'Open' },
        normalization: { trim: true },
      },
    ];

    const draft = cloneRules(initialRules);
    draft[0].map!.pending = 'In progress';
    draft[0].normalization!.lowercase = true;

    expect(initialRules).toEqual([
      {
        type: 'value_mapping',
        enabled: true,
        map: { pending: 'Open' },
        normalization: { trim: true },
      },
    ]);
  });
});
