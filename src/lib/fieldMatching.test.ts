import { describe, expect, it } from 'vitest';

import { matchFields } from './fieldMatching';

describe('field matching score limits', () => {
  it('never returns a score above 100%', () => {
    const matches = matchFields(
      [{ key: 'customer_id', label: 'Customer ID', type: 'string' }],
      [{ key: 'customer_id', label: 'Customer ID', type: 'string', required: true }],
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].score).toBeLessThanOrEqual(100);
  });
});
