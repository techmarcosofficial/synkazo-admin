import { describe, expect, it } from 'vitest';

import type { Rule } from '@/lib/ruleEngine';

import { buildRuleSuggestions } from './ruleSuggestions';

describe('buildRuleSuggestions', () => {
  it('recommends the existing cast rule for a repairable type mismatch', () => {
    expect(
      buildRuleSuggestions({
        sourceField: { key: 'amount', type: 'string' },
        destField: { key: 'amount', type: 'number' },
      }),
    ).toEqual([
      expect.objectContaining({
        id: 'cast:string_to_number',
        rule: { type: 'string_to_number', enabled: true },
        confidence: 'recommended',
      }),
    ]);
  });

  it('does not recommend a cast that is already in the pipeline', () => {
    expect(
      buildRuleSuggestions({
        sourceField: { key: 'amount', type: 'string' },
        destField: { key: 'amount', type: 'number' },
        currentRules: [{ type: 'string_to_number', enabled: true }],
      }),
    ).toEqual([]);
  });

  it('seeds an enum value map only when the sample has an unambiguous match', () => {
    expect(
      buildRuleSuggestions({
        sourceField: { key: 'status', type: 'string' },
        destField: {
          key: 'status',
          type: 'enumeration',
          options: [
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
          ],
        },
        sampleValue: 'Open',
      }),
    ).toEqual([
      expect.objectContaining({
        id: 'value-map',
        rule: {
          type: 'value_map',
          enabled: true,
          map: { Open: 'open' },
        },
        requiresConfiguration: false,
      }),
    ]);
  });

  it('keeps an unmatched enum sample visible for the user to configure', () => {
    const [suggestion] = buildRuleSuggestions({
      sourceField: { key: 'status', type: 'string' },
      destField: {
        key: 'status',
        type: 'picklist',
        options: [{ value: 'open', label: 'Open' }],
      },
      sampleValue: 'Waiting',
    });

    expect(suggestion.rule).toEqual({
      type: 'value_map',
      enabled: true,
      map: { Waiting: '' },
    });
    expect(suggestion.requiresConfiguration).toBe(true);
  });

  it('treats either value-map implementation as equivalent', () => {
    expect(
      buildRuleSuggestions({
        sourceField: { key: 'status', type: 'string' },
        destField: { key: 'status', type: 'enum' },
        currentRules: [{ type: 'value_mapping', map: { open: 'open' } }],
      }),
    ).toEqual([]);
  });

  it('recommends trimming when the observed sample contains outer spaces', () => {
    expect(
      buildRuleSuggestions({
        sourceField: { key: 'name', type: 'string' },
        destField: { key: 'name', type: 'text' },
        sampleValue: '  Jane  ',
      }),
    ).toEqual([
      expect.objectContaining({
        id: 'trim',
        rule: { type: 'trim', enabled: true },
        confidence: 'recommended',
      }),
    ]);
  });

  it('orders cleanup before conversion when both are supported by the sample', () => {
    expect(
      buildRuleSuggestions({
        sourceField: { key: 'amount', type: 'string' },
        destField: { key: 'amount', type: 'number' },
        sampleValue: ' 42 ',
      }).map((suggestion) => suggestion.rule.type),
    ).toEqual(['trim', 'string_to_number']);
  });

  it('does not pair trimming with an exact enum value map', () => {
    expect(
      buildRuleSuggestions({
        sourceField: { key: 'status', type: 'string' },
        destField: {
          key: 'status',
          type: 'enum',
          options: [{ value: 'open', label: 'Open' }],
        },
        sampleValue: ' Open ',
      }).map((suggestion) => suggestion.rule.type),
    ).toEqual(['value_map']);
  });

  it('offers trim as a starting point for compatible text fields', () => {
    expect(
      buildRuleSuggestions({
        sourceField: { key: 'email', type: 'email' },
        destField: { key: 'email', type: 'string' },
      }),
    ).toEqual([
      expect.objectContaining({
        id: 'trim',
        confidence: 'starting_point',
      }),
    ]);
  });

  it('does not invent a destructive suggestion for compatible non-text fields', () => {
    expect(
      buildRuleSuggestions({
        sourceField: { key: 'createdAt', type: 'datetime' },
        destField: { key: 'createdAt', type: 'date' },
      }),
    ).toEqual([]);
  });

  it('does not mutate current rules or field metadata', () => {
    const currentRules: Rule[] = [{ type: 'uppercase', enabled: true }];
    const sourceField = { key: 'amount', type: 'string' };
    const destField = { key: 'amount', type: 'number' };

    buildRuleSuggestions({ sourceField, destField, currentRules });

    expect(currentRules).toEqual([{ type: 'uppercase', enabled: true }]);
    expect(sourceField).toEqual({ key: 'amount', type: 'string' });
    expect(destField).toEqual({ key: 'amount', type: 'number' });
  });
});
