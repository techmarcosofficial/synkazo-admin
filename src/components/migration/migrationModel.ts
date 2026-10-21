import { Tag, type LucideIcon } from 'lucide-react';

import type { MigrationDiff, MigrationDiffItem } from '@/api/migration';

export type MigrationFilter =
  'all' | 'missing' | 'conflict' | 'selected' | 'in_sync';

export interface MigrationGroup {
  key: string;
  title: string;
  icon: LucideIcon;
  items: MigrationDiffItem[];
}

export const migrationGroups = (
  diff: MigrationDiff | null,
): MigrationGroup[] => [
  {
    key: 'properties',
    title: 'Standard-object custom fields',
    icon: Tag,
    items: diff?.properties ?? [],
  },
];

export function filterMigrationItems(
  items: MigrationDiffItem[],
  filter: MigrationFilter,
  selected: Set<string>,
) {
  switch (filter) {
    case 'missing':
      return items.filter((item) => item.status === 'missing');
    case 'conflict':
      return items.filter((item) => item.status === 'conflict');
    case 'selected':
      return items.filter((item) => selected.has(item.identityKey));
    case 'in_sync':
      return items.filter((item) => item.status === 'in_sync');
    default:
      return items;
  }
}

export function migrationCounts(
  groups: MigrationGroup[],
  selected: Set<string>,
): Record<MigrationFilter, number> {
  const items = groups.flatMap((group) => group.items);
  return {
    all: items.length,
    missing: items.filter((item) => item.status === 'missing').length,
    conflict: items.filter((item) => item.status === 'conflict').length,
    selected: selected.size,
    in_sync: items.filter((item) => item.status === 'in_sync').length,
  };
}

export function selectedKindCounts(
  groups: MigrationGroup[],
  selected: Set<string>,
) {
  const selectedItems = groups
    .flatMap((group) => group.items)
    .filter((item) => selected.has(item.identityKey));
  return {
    properties: selectedItems.filter((item) => item.kind === 'property').length,
  };
}
