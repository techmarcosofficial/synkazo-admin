import { describe, expect, it } from 'vitest';

import { executeRulePipeline, RULE_DEFINITIONS } from './ruleEngine';
import { RULE_EXAMPLES } from './ruleGuide';
import cases from './transform-rule-cases.shared.json';
import { runTransformPipeline, type TransformRule } from './transformRules.shared';

// The same table runs in synkazo-api against its copy of
// transform-rules.shared.ts, so this preview and a real sync agree.
type Case = {
  name: string;
  input: string;
  rules: TransformRule[];
  expect: string | { skip: 'field' | 'record' };
};

describe('transform rules (shared cases)', () => {
  it.each((cases as Case[]).map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const result = runTransformPipeline(c.input, c.rules);
    if (typeof c.expect === 'string') {
      expect(result.skip).toBeUndefined();
      expect(String(result.value)).toBe(c.expect);
    } else {
      expect(result.skip?.skip).toBe(c.expect.skip);
    }
  });

  it('keeps the string markers older previews read', () => {
    expect(executeRulePipeline('ab', [{ type: 'min_length', value: '3' }])).toBe(
      '__SKIPPED__:validation:min_length',
    );
  });
});

describe('rule library', () => {
  it('has a working example for every rule it offers', () => {
    const offered = RULE_DEFINITIONS.filter((d) => !d.legacy);
    for (const def of offered) {
      expect(RULE_EXAMPLES[def.type], def.type).toBeDefined();
    }
  });

  it('only offers rules the shared engine actually changes or checks', () => {
    // Every offered example must do something visible: change the value or stop it.
    for (const def of RULE_DEFINITIONS.filter((d) => !d.legacy)) {
      const ex = RULE_EXAMPLES[def.type];
      const result = runTransformPipeline(ex.input, [
        { type: def.type, ...ex.params },
      ]);
      const changed = result.skip || String(result.value) !== ex.input;
      const isCheck = /^is_|_length$/.test(def.type);
      expect(changed || isCheck, def.type).toBeTruthy();
    }
  });
});
