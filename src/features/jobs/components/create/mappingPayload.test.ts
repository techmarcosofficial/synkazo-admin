import { describe, expect, it } from 'vitest';

import { toFieldMappingPayload } from './mappingPayload';

describe('toFieldMappingPayload', () => {
  it('flattens one source into separate destination pairs without losing pair settings', () => {
    const payload = toFieldMappingPayload(
      [
        {
          sourceField: 'email',
          destField: ['email', 'backup_email'],
          matchDestKey: 'email',
          destOnEmpty: { email: 'skip_record', backup_email: 'default' },
          destDefaults: { backup_email: 'unknown@example.test' },
          destUpdatePolicy: { email: 'always', backup_email: 'create_only' },
          destRules: { email: [{ type: 'trim' }] },
        },
      ],
      'two_way',
    );

    expect(payload).toHaveLength(2);
    expect(payload[0]).toMatchObject({
      sourceField: 'email',
      destField: 'email',
      isMatchField: true,
      onEmpty: 'skip_record',
      direction: 'bidirectional',
      transformConfig: { rules: [{ type: 'trim' }] },
    });
    expect(payload[1]).toMatchObject({
      sourceField: 'email',
      destField: 'backup_email',
      isMatchField: false,
      onEmpty: 'default',
      defaultValue: 'unknown@example.test',
      updatePolicy: 'create_only',
      direction: 'bidirectional',
    });
  });

  it('preserves a saved fill-if-empty rule when saving edited mappings', () => {
    const [mapping] = toFieldMappingPayload([{
      sourceField: 'phone',
      destField: 'phone',
      originalUpdatePolicy: 'fill_if_empty',
      destConflictScope: { phone: 'record' },
    }], 'one_way');

    expect(mapping).toMatchObject({
      sourceField: 'phone',
      destField: 'phone',
      updatePolicy: 'fill_if_empty',
      conflictScope: 'record',
    });
  });
});
