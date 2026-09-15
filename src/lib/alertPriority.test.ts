import { describe, expect, it } from 'vitest';

import { pickHighestPriority } from './alertPriority';

describe('pickHighestPriority', () => {
  const candidates = [
    { id: 'success', variant: 'success' as const },
    { id: 'info', variant: 'info' as const },
    { id: 'warning', variant: 'warning' as const },
    { id: 'error', variant: 'error' as const },
  ];

  it('returns only the highest-priority actionable condition', () => {
    expect(pickHighestPriority(candidates)?.id).toBe('error');
  });

  it('reveals the next relevant condition when a higher one resolves', () => {
    const withoutError = candidates.filter(({ id }) => id !== 'error');

    expect(pickHighestPriority(withoutError)?.id).toBe('warning');
  });

  it('returns no notice when there are no active conditions', () => {
    expect(pickHighestPriority([])).toBeUndefined();
  });
});
