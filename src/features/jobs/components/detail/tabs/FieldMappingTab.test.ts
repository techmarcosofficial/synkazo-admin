import { describe, expect, it } from 'vitest';

import { mergeDefaultConfiguration } from './FieldMappingTab';

import type { ConsolidatedMapping } from '@/features/jobs/hooks';

const mapping = (
  sourceField: string,
  destField: string,
  extra: Partial<ConsolidatedMapping> = {},
) =>
  ({
    sourceField,
    destField,
    ...extra,
  }) as ConsolidatedMapping;

describe('mergeDefaultConfiguration', () => {
  it('keeps mapping-tab changes while restoring the saved default configuration', () => {
    const structure = [
      mapping('email', 'email', {
        matchDestKey: 'email',
        destOnEmpty: { email: 'skip_record' },
      }),
    ];
    const saved = [
      mapping('email', 'email', {
        destOnEmpty: { email: 'default' },
        destDefaults: { email: 'unknown@example.com' },
      }),
    ];

    expect(mergeDefaultConfiguration(structure, saved)).toEqual([
      mapping('email', 'email', {
        matchDestKey: 'email',
        destOnEmpty: { email: 'default' },
        destDefaults: { email: 'unknown@example.com' },
      }),
    ]);
  });

  it('keeps saved mapping structure while applying defaults and constant rows', () => {
    const savedStructure = [
      mapping('name', 'dealname', {
        matchDestKey: 'dealname',
        destRules: { dealname: [{ type: 'trim' }] },
      }),
    ];
    const defaultDraft = [
      mapping('name', 'dealname', {
        destOnEmpty: { dealname: 'default' },
        destDefaults: { dealname: 'Untitled deal' },
      }),
      mapping('', 'pipeline', {
        destOnEmpty: { pipeline: 'default' },
        destDefaults: { pipeline: 'default' },
      }),
    ];

    expect(mergeDefaultConfiguration(savedStructure, defaultDraft)).toEqual([
      mapping('name', 'dealname', {
        matchDestKey: 'dealname',
        destRules: { dealname: [{ type: 'trim' }] },
        destOnEmpty: { dealname: 'default' },
        destDefaults: { dealname: 'Untitled deal' },
      }),
      mapping('', 'pipeline', {
        destOnEmpty: { pipeline: 'default' },
        destDefaults: { pipeline: 'default' },
      }),
    ]);
  });
});
