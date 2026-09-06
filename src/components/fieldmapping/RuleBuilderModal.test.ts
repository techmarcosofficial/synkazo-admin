import { describe, expect, it } from 'vitest';

import type { Rule } from '@/lib/ruleEngine';

import { buildRulePreviewSteps } from './RuleBuilderModal';

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
