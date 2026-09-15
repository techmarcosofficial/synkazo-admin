import { describe, expect, it } from 'vitest';

import { recordMatchesExcludeConditions } from './excludeConditions';

describe('recordMatchesExcludeConditions', () => {
  it('evaluates nested fields with the selected condition logic', () => {
    const record = { customer: { status: ' Active ' }, total: 120 };
    const conditions = [
      {
        field: 'customer.status',
        operator: 'equals' as const,
        value: 'active',
        normalization: { trim: true, lowercase: true },
      },
      { field: 'total', operator: 'gte' as const, value: 100 },
    ];

    expect(recordMatchesExcludeConditions(record, conditions, 'AND')).toBe(
      true,
    );
    expect(
      recordMatchesExcludeConditions(
        record,
        [...conditions, { field: 'total', operator: 'lt', value: 50 }],
        'OR',
      ),
    ).toBe(true);
  });

  it('matches the server empty-value behavior for negative operators', () => {
    expect(
      recordMatchesExcludeConditions(
        {},
        [{ field: 'email', operator: 'not_contains', value: '@example.com' }],
        'AND',
      ),
    ).toBe(true);
  });

  it('does not mark a record as skipped when there are no conditions', () => {
    expect(
      recordMatchesExcludeConditions({ status: 'active' }, [], 'AND'),
    ).toBe(false);
  });
});
