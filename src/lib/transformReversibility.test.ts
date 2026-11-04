import { describe, expect, it } from 'vitest';

import { isReversibleTransform } from './transformReversibility';

describe('isReversibleTransform', () => {
  it('treats direct and invertible transforms as reversible', () => {
    expect(isReversibleTransform('direct', null)).toBe(true);
    expect(isReversibleTransform('value_map', { '1': 'Active' })).toBe(true);
    expect(isReversibleTransform('date_format', { format: 'YYYY' })).toBe(true);
    expect(
      isReversibleTransform('direct', {
        rules: [
          { type: 'trim' },
          { type: 'math_multiply' },
          { type: 'is_email' },
        ],
      }),
    ).toBe(true);
  });

  it('treats combining and lossy transforms as one-way', () => {
    expect(isReversibleTransform('concat', { fields: ['a'] })).toBe(false);
    expect(isReversibleTransform('combine', {})).toBe(false);
    expect(
      isReversibleTransform('direct', { rules: [{ type: 'regex_replace' }] }),
    ).toBe(false);
  });

  it('ignores disabled rules', () => {
    expect(
      isReversibleTransform('direct', {
        rules: [{ type: 'slug', enabled: false }],
      }),
    ).toBe(true);
  });
});
