import { describe, expect, it } from 'vitest';

import { previewCombinedFields } from './combineFields';

describe('previewCombinedFields', () => {
  it('uses the configured separator and preserves zero/false values', () => {
    expect(
      previewCombinedFields(
        {
          type: 'combine',
          separator: 'slash',
          components: [
            { type: 'field', value: 'count' },
            { type: 'field', value: 'active' },
          ],
        },
        { count: 0, active: false },
      ),
    ).toBe('0/false');
  });

  it('suppresses punctuation whose adjacent field is missing', () => {
    expect(
      previewCombinedFields(
        {
          type: 'combine',
          separator: 'space',
          components: [
            { type: 'field', value: 'city' },
            { type: 'text', value: ', ' },
            { type: 'field', value: 'state' },
          ],
        },
        { city: 'Pune', state: '' },
      ),
    ).toBe('Pune');
  });

  it('returns null when every field is missing', () => {
    expect(
      previewCombinedFields(
        {
          type: 'combine',
          separator: 'space',
          components: [
            { type: 'field', value: 'first' },
            { type: 'field', value: 'last' },
          ],
        },
        {},
      ),
    ).toBeNull();
  });
});
