// Shared "which required fields still need attention" logic — used by
// FieldMappingCanvas, CreateJobForm, FieldMappingTab and RequiredFieldDefaults,
// so there's a single source of truth for what counts as "satisfied" rather
// than several implementations that could drift apart.

export interface RequiredFieldLike {
  key: string;
  label?: string;
  required?: boolean;
  readOnly?: boolean;
  type?: string;
  options?: { value: string; label: string }[];
}

export function computeUnmappedRequired<T extends RequiredFieldLike>(
  fields: T[],
  mappedKeys: Set<string>,
  skipped: Set<string> = new Set(),
): T[] {
  return fields.filter(
    (f) =>
      f.required &&
      !f.readOnly &&
      !mappedKeys.has(f.key) &&
      !skipped.has(f.key),
  );
}

export type OnEmptyPolicy = 'none' | 'default' | 'skip_record';

// A minimal, duck-typed view of a mapping row — deliberately not importing
// FieldMappingCanvas's or features/jobs/types.ts's MappingRow, so this stays a
// leaf module either side can depend on without a cycle.
export interface MappingRowLike {
  sourceField: string;
  destField: string | string[];
  destOnEmpty?: Record<string, OnEmptyPolicy>;
  destDefaults?: Record<string, string>;
  /** Reverse-leg counterpart of destOnEmpty/destDefaults — the policy for when a
   *  bidirectional row writes back into the source platform, which the source side
   *  required independently of whatever the destination side requires. */
  destReverseOnEmpty?: Record<string, OnEmptyPolicy>;
  destReverseDefaults?: Record<string, string>;
}

export interface RequiredFieldPairRef {
  sourceField: string;
  destKey: string;
}

export interface RequiredFieldItem {
  side: 'source' | 'dest';
  field: RequiredFieldLike;
  /** Every (source, dest) pair currently carrying this field's empty-value policy.
   *  A source-required field fanned out to several destinations gets one entry per
   *  destination — mirrors how the sync executor and CreateJobForm's required-field
   *  gate already treat fan-out independently, rather than picking one arbitrarily. */
  pairs: RequiredFieldPairRef[];
  /** 'none' whenever there's no pair yet, OR any existing pair still lacks a policy —
   *  i.e. "fully resolved" is the only case this isn't 'none'. */
  currentOnEmpty: OnEmptyPolicy;
  currentDefaultValue: string;
}

function rowDests(m: MappingRowLike): string[] {
  return Array.isArray(m.destField) ? m.destField : [m.destField];
}

/**
 * Builds the item for exactly one field on one side — the pairs currently
 * carrying its policy, and whether that policy is fully set. Exported on its
 * own (not just via getRequiredFieldItems) so a field that isn't required can
 * still be inspected the same way, e.g. RequiredFieldDefaults' "add another
 * default value" affordance for a field the user picks manually.
 */
export function buildRequiredFieldItem(
  field: RequiredFieldLike,
  side: 'source' | 'dest',
  mappings: MappingRowLike[],
): RequiredFieldItem {
  const pairs: RequiredFieldPairRef[] =
    side === 'dest'
      ? mappings
          .filter((m) => rowDests(m).includes(field.key))
          .map((m) => ({ sourceField: m.sourceField, destKey: field.key }))
      : (() => {
          const row = mappings.find((m) => m.sourceField === field.key);
          return row
            ? rowDests(row).map((dk) => ({
                sourceField: field.key,
                destKey: dk,
              }))
            : [];
        })();

  // A dest-side item's policy lives in destOnEmpty/destDefaults (the forward-leg,
  // "destination platform requires it" slot); a source-side item's lives in the
  // separate destReverseOnEmpty/destReverseDefaults slot (the reverse-leg,
  // "source platform requires it on write-back" slot) — see MappingRowLike.
  const policyOf = (p: RequiredFieldPairRef): OnEmptyPolicy => {
    const row = mappings.find((m) => m.sourceField === p.sourceField);
    return (
      (side === 'source'
        ? row?.destReverseOnEmpty?.[p.destKey]
        : row?.destOnEmpty?.[p.destKey]) ?? 'none'
    );
  };
  const allResolved =
    pairs.length > 0 && pairs.every((p) => policyOf(p) !== 'none');
  const sample = pairs[0];
  const sampleRow = sample
    ? mappings.find((m) => m.sourceField === sample.sourceField)
    : undefined;
  const defaultsOf =
    side === 'source'
      ? sampleRow?.destReverseDefaults
      : sampleRow?.destDefaults;

  return {
    side,
    field,
    pairs,
    currentOnEmpty: allResolved && sample ? policyOf(sample) : 'none',
    currentDefaultValue:
      allResolved && sample ? (defaultsOf?.[sample.destKey] ?? '') : '',
  };
}

/**
 * Every required field (source and/or destination, per `opts`), with whatever
 * pairs currently carry its empty-value policy and whether that policy is
 * fully set. This is the single source of truth for "which required fields
 * still need a default or skip decision" — used both to render the
 * required-fields panel and to gate saving/continuing.
 */
export function getRequiredFieldItems(
  sourceFields: RequiredFieldLike[],
  destFields: RequiredFieldLike[],
  mappings: MappingRowLike[],
  opts: { includeSource: boolean; includeDest: boolean },
): RequiredFieldItem[] {
  const items: RequiredFieldItem[] = [];
  if (opts.includeDest) {
    for (const f of destFields.filter((f) => f.required && !f.readOnly)) {
      items.push(buildRequiredFieldItem(f, 'dest', mappings));
    }
  }
  if (opts.includeSource) {
    for (const f of sourceFields.filter((f) => f.required && !f.readOnly)) {
      items.push(buildRequiredFieldItem(f, 'source', mappings));
    }
  }
  return items;
}

export function countResolvedRequired(items: RequiredFieldItem[]): {
  resolved: number;
  total: number;
} {
  return {
    resolved: items.filter((i) => i.currentOnEmpty !== 'none').length,
    total: items.length,
  };
}
