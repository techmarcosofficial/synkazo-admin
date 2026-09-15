import { describe, expect, it } from 'vitest';

import {
  filterMigrationItems,
  migrationCounts,
  migrationGroups,
  selectedKindCounts,
} from './migrationModel';

import type { MigrationDiff } from '@/api/migration';

const diff: MigrationDiff = {
  from: 'sandbox',
  to: 'production',
  ready: true,
  sandboxConnected: true,
  productionConnected: true,
  customObjects: [
    {
      identityKey: 'object:a',
      kind: 'custom_object',
      displayName: 'A',
      status: 'missing',
    },
  ],
  properties: [
    {
      identityKey: 'property:b',
      kind: 'property',
      displayName: 'B',
      status: 'in_sync',
    },
  ],
  associations: [
    {
      identityKey: 'association:c',
      kind: 'association',
      displayName: 'C',
      status: 'conflict',
    },
  ],
};

describe('migrationModel', () => {
  it('counts each comparison state and selected item kind', () => {
    const groups = migrationGroups(diff);
    const selected = new Set(['object:a']);
    expect(migrationCounts(groups, selected)).toEqual({
      all: 3,
      missing: 1,
      conflict: 1,
      selected: 1,
      in_sync: 1,
    });
    expect(selectedKindCounts(groups, selected)).toEqual({
      customObjects: 1,
      properties: 0,
      associations: 0,
    });
  });

  it('filters conflicts and staged selections independently', () => {
    const items = migrationGroups(diff).flatMap((group) => group.items);
    expect(filterMigrationItems(items, 'conflict', new Set())).toHaveLength(1);
    expect(
      filterMigrationItems(items, 'selected', new Set(['object:a']))[0]
        .identityKey,
    ).toBe('object:a');
  });
});
