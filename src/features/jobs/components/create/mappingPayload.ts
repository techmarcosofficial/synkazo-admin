import type { MappingRow } from '@/features/jobs/types';
import { isReversibleTransform } from '@/lib/transformReversibility';
import type { FieldMapping } from '@/types';

// The canvas groups destinations by source; the API accepts one pair per row.
export function toFieldMappingPayload(
  mappings: MappingRow[],
  syncDirection: string,
): FieldMapping[] {
  return mappings.flatMap((mapping) => {
    const destinations = Array.isArray(mapping.destField)
      ? mapping.destField
      : [mapping.destField];
    return destinations.map((destField) => {
      const transformConfig =
        mapping.transformType === 'combine'
          ? (mapping.transformConfig ?? null)
          : mapping.destRules?.[destField]
            ? { rules: mapping.destRules[destField] }
            : (mapping.transformConfig ?? null);
      // A transform that can't be undone only ever syncs forward — store it
      // that way instead of a "Both Ways" the reverse leg would ignore.
      const twoWayDefault = isReversibleTransform(
        mapping.transformType,
        transformConfig,
      )
        ? 'bidirectional'
        : 'forward_only';
      return {
      sourceField: mapping.sourceField,
      destField,
      transformType: mapping.transformType ?? 'direct',
      transformConfig,
      isMatchField: mapping.matchDestKey === destField,
      isRequired: mapping.isRequired === true,
      matchPriority:
        mapping.matchDestKey === destField
          ? (mapping.matchOrder ?? null)
          : null,
      updatePolicy: mapping.destUpdatePolicy?.[destField] ??
        (mapping.originalUpdatePolicy === 'fill_if_empty' ? 'fill_if_empty' : 'always'),
      conflictScope: mapping.destConflictScope?.[destField] ?? 'field',
      onEmpty: mapping.destOnEmpty?.[destField] ?? 'none',
      defaultValue: mapping.destDefaults?.[destField] ?? null,
      reverseOnEmpty: mapping.destReverseOnEmpty?.[destField] ?? 'none',
      reverseDefaultValue: mapping.destReverseDefaults?.[destField] ?? null,
      direction:
        syncDirection === 'two_way'
          ? mapping.direction === 'bidirectional' ||
            mapping.direction === undefined
            ? twoWayDefault
            : mapping.direction
          : mapping.direction,
      };
    }) as unknown as FieldMapping[];
  });
}
