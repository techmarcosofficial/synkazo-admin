import { describe, expect, it } from 'vitest';

import {
  applyQuickSetting,
  isTextLikeField,
  readQuickSettings,
} from './quickRuleSettings';

import type { Rule } from '@/lib/ruleEngine';

describe('quickRuleSettings', () => {
  it('reads settings from existing rules', () => {
    const rules: Rule[] = [
      { type: 'trim', enabled: true },
      { type: 'lowercase', enabled: true },
      { type: 'char_limit', enabled: true, value: '80' },
    ];
    expect(readQuickSettings(rules)).toEqual({
      trim: true,
      textCase: 'lowercase',
      maxLength: '80',
    });
    expect(readQuickSettings([])).toEqual({
      trim: false,
      textCase: 'keep',
      maxLength: '',
    });
  });

  it('adds and removes the trim rule', () => {
    const added = applyQuickSetting([], 'trim', true);
    expect(added).toEqual([{ type: 'trim', enabled: true }]);
    expect(applyQuickSetting(added, 'trim', false)).toEqual([]);
  });

  it('swaps the case rule in place, keeping its position', () => {
    const rules: Rule[] = [
      { type: 'uppercase', enabled: true },
      { type: 'prefix', enabled: true, value: 'x' },
    ];
    expect(applyQuickSetting(rules, 'textCase', 'capitalize')).toEqual([
      { type: 'capitalize', enabled: true },
      { type: 'prefix', enabled: true, value: 'x' },
    ]);
    expect(applyQuickSetting(rules, 'textCase', 'keep')).toEqual([
      { type: 'prefix', enabled: true, value: 'x' },
    ]);
  });

  it('keeps a disabled rule disabled when its value changes', () => {
    const rules: Rule[] = [{ type: 'char_limit', enabled: false, value: '5' }];
    expect(applyQuickSetting(rules, 'maxLength', '10')).toEqual([
      { type: 'char_limit', enabled: false, value: '10' },
    ]);
  });

  it('sets, updates and clears the max length', () => {
    const set = applyQuickSetting([], 'maxLength', '255');
    expect(set).toEqual([{ type: 'char_limit', enabled: true, value: '255' }]);
    expect(applyQuickSetting(set, 'maxLength', '')).toEqual([]);
  });

  it('collapses duplicate case rules into one', () => {
    const rules: Rule[] = [
      { type: 'uppercase', enabled: true },
      { type: 'lowercase', enabled: true },
    ];
    expect(applyQuickSetting(rules, 'textCase', 'capitalize')).toEqual([
      { type: 'capitalize', enabled: true },
    ]);
  });

  it('treats unknown types as text', () => {
    expect(isTextLikeField('string')).toBe(true);
    expect(isTextLikeField(undefined)).toBe(true);
    expect(isTextLikeField('Number')).toBe(false);
    expect(isTextLikeField('date')).toBe(false);
  });
});
