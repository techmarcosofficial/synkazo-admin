import { describe, expect, it } from 'vitest';

import {
  combineMappingName,
  previewCombinedFields,
  type CombineConfig,
} from './combineFields';

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

describe('combineMappingName', () => {
  const config: CombineConfig = {
    type: 'combine',
    separator: 'space',
    components: [
      { type: 'field', value: 'id' },
      { type: 'field', value: 'name' },
    ],
  };
  const fields = [
    { key: 'id', label: 'Id' },
    { key: 'name', label: 'Name' },
  ];

  it('preserves a custom name independently of the destination', () => {
    expect(
      combineMappingName({ ...config, name: ' Customer reference ' }, fields),
    ).toBe('Customer reference');
  });

  it('generates distinguishable names for repeated source configurations', () => {
    const first = combineMappingName(config, fields);
    const second = combineMappingName(config, fields, [first]);
    const third = combineMappingName(config, fields, [first, second]);
    expect([first, second, third]).toEqual([
      'Id + Name',
      'Id + Name 2',
      'Id + Name 3',
    ]);
  });

  it('keeps a generated name distinct from an existing custom name', () => {
    expect(combineMappingName(config, fields, ['Id + Name'])).toBe(
      'Id + Name 2',
    );
  });

  it('names legacy configs without a name and empty source configurations', () => {
    expect(combineMappingName(config, fields)).toBe('Id + Name');
    const empty = { ...config, components: [] };
    expect(combineMappingName(empty, fields)).toBe('Combined field 1');
    expect(combineMappingName(empty, fields, ['Combined field 1'])).toBe(
      'Combined field 2',
    );
  });
});
