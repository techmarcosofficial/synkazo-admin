import { describe, expect, it } from 'vitest';

import { consolidateMappings } from './useJobDetail';

import type { FieldMapping } from '@/types';

const combined = (
  sourceField: string,
  destField: string,
  name?: string,
): FieldMapping => ({
  sourceField,
  destField,
  transformType: 'combine',
  transformConfig: {
    type: 'combine',
    ...(name ? { name } : {}),
    separator: 'space',
    components: [
      { type: 'field', value: 'first' },
      { type: 'field', value: 'last' },
    ],
  },
});

describe('combined mappings after reload', () => {
  it('keeps multiple independent mappings, their names, and legacy unnamed data', () => {
    const first = combined('__combine__:one', 'full_name', 'Full name');
    const second = combined('__combine__:two', 'display_name', 'Display name');
    const legacy = combined('__combine__:old', 'legacy_name');
    const result = consolidateMappings([first, second, legacy]);
    expect(result).toHaveLength(3);
    expect(result.map((mapping) => mapping.sourceField)).toEqual([
      first.sourceField,
      second.sourceField,
      legacy.sourceField,
    ]);
    expect(result.map((mapping) => mapping.transformConfig)).toEqual([
      first.transformConfig,
      second.transformConfig,
      legacy.transformConfig,
    ]);
  });
});
