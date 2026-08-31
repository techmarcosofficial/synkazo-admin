import { describe, expect, it } from 'vitest';

import { executeRulePipeline, RULE_DEFINITIONS, type Rule } from '@/lib/ruleEngine';

describe('ruleEngine — value_map (existing rule, unaffected)', () => {
  it('maps an exact match and falls back otherwise', () => {
    const rules: Rule[] = [
      { type: 'value_map', map: { paid: 'closed' }, fallback: 'open' },
    ];
    expect(executeRulePipeline('paid', rules)).toBe('closed');
    expect(executeRulePipeline('unknown', rules)).toBe('open');
  });
});

describe('ruleEngine — value_mapping (normalized)', () => {
  const paymentStatusRule: Rule = {
    type: 'value_mapping',
    map: {
      'balance due': 'open',
      canceled: 'voided',
      'charges waived': 'voided',
      'on hold': 'draft',
      'paid in full': 'paid',
      defaulted: 'open',
    },
    defaultValue: 'open',
    normalization: {
      trim: true,
      lowercase: true,
      replaceUnderscoreAndHyphenWithSpace: true,
    },
  };

  it('is registered in RULE_DEFINITIONS under conversion', () => {
    const def = RULE_DEFINITIONS.find((r) => r.type === 'value_mapping');
    expect(def).toBeDefined();
    expect(def?.category).toBe('conversion');
    expect(def?.params).toEqual(['map', 'defaultValue']);
  });

  it('matches an exact value', () => {
    expect(executeRulePipeline('canceled', [paymentStatusRule])).toBe(
      'voided',
    );
  });

  it('resolves "Balance Due", " balance_due ", and "BALANCE-DUE" identically', () => {
    expect(executeRulePipeline('Balance Due', [paymentStatusRule])).toBe(
      'open',
    );
    expect(executeRulePipeline(' balance_due ', [paymentStatusRule])).toBe(
      'open',
    );
    expect(executeRulePipeline('BALANCE-DUE', [paymentStatusRule])).toBe(
      'open',
    );
  });

  it('applies combined normalization', () => {
    expect(executeRulePipeline(' paid-in_full ', [paymentStatusRule])).toBe(
      'paid',
    );
  });

  it('maps multiple source values to the same destination', () => {
    expect(executeRulePipeline('canceled', [paymentStatusRule])).toBe(
      'voided',
    );
    expect(executeRulePipeline('charges waived', [paymentStatusRule])).toBe(
      'voided',
    );
  });

  it('falls back to defaultValue for unknown, null, undefined, empty, and whitespace-only input', () => {
    expect(executeRulePipeline('surprise', [paymentStatusRule])).toBe('open');
    expect(
      executeRulePipeline(null as unknown as string, [paymentStatusRule]),
    ).toBe('open');
    expect(
      executeRulePipeline(undefined as unknown as string, [paymentStatusRule]),
    ).toBe('open');
    expect(executeRulePipeline('', [paymentStatusRule])).toBe('open');
    expect(executeRulePipeline('   ', [paymentStatusRule])).toBe('open');
  });
});
