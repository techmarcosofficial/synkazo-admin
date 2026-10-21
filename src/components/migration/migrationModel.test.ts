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
  it('shows only eligible standard-object fields in the transfer selection', () => {
    const groups = migrationGroups(diff);
    const selected = new Set(['property:b']);
    expect(migrationCounts(groups, selected)).toEqual({
      all: 1,
      missing: 0,
      conflict: 0,
      selected: 1,
      in_sync: 1,
    });
    expect(selectedKindCounts(groups, selected)).toEqual({
      properties: 1,
    });
  });

  it('does not expose custom schemas or associations in the transfer list', () => {
    const items = migrationGroups(diff).flatMap((group) => group.items);
    expect(filterMigrationItems(items, 'conflict', new Set())).toHaveLength(0);
    expect(
      filterMigrationItems(items, 'selected', new Set(['property:b']))[0]
        .identityKey,
    ).toBe('property:b');
  });
});
