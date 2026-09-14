import { describe, expect, it } from 'vitest';

import {
  getWorkspaceDirtyState,
  mergeDefaultConfiguration,
} from './FieldMappingTab';

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

describe('getWorkspaceDirtyState', () => {
  it('keeps each workspace save bar isolated while retaining the global warning', () => {
    const dirtyStates = {
      mappingDirty: false,
      defaultsDirty: true,
      conditionsDirty: false,
    };

    expect(getWorkspaceDirtyState('field-mapping', dirtyStates)).toEqual({
      anyDirty: true,
      activeDirty: false,
    });
    expect(getWorkspaceDirtyState('default-mapping', dirtyStates)).toEqual({
      anyDirty: true,
      activeDirty: true,
    });
    expect(getWorkspaceDirtyState('skip-record', dirtyStates)).toEqual({
      anyDirty: true,
      activeDirty: false,
    });
  });

  it('uses the Skip Records draft independently of mapping and defaults', () => {
    expect(
      getWorkspaceDirtyState('skip-record', {
        mappingDirty: true,
        defaultsDirty: true,
        conditionsDirty: false,
      }),
    ).toEqual({ anyDirty: true, activeDirty: false });

    expect(
      getWorkspaceDirtyState('skip-record', {
        mappingDirty: false,
        defaultsDirty: false,
        conditionsDirty: true,
      }),
    ).toEqual({ anyDirty: true, activeDirty: true });
  });
});
