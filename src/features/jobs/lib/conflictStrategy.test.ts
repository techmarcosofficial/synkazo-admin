import { describe, expect, it } from 'vitest';

import {
  conflictStrategyChoice,
  conflictStrategyPayload,
  MOST_RECENT,
} from './conflictStrategy';

describe('conflictStrategyPayload', () => {
  it('sends a platform choice as source-of-truth-wins', () => {
    expect(conflictStrategyPayload('servicetitan')).toEqual({
      conflictResolutionStrategy: 'source_of_truth_wins',
      sourceOfTruth: 'servicetitan',
    });
  });

  it('sends "most recent" without a source of truth', () => {
    expect(conflictStrategyPayload(MOST_RECENT)).toEqual({
      conflictResolutionStrategy: 'most_recently_modified_wins',
    });
  });
});

describe('conflictStrategyChoice', () => {
  it('reads a saved job back into the radio value', () => {
    expect(
      conflictStrategyChoice(
        { conflictResolutionStrategy: 'most_recently_modified_wins' },
        'servicetitan',
      ),
    ).toBe(MOST_RECENT);
    expect(
      conflictStrategyChoice(
        {
          conflictResolutionStrategy: 'source_of_truth_wins',
          sourceOfTruth: 'hubspot',
        },
        'servicetitan',
      ),
    ).toBe('hubspot');
    expect(conflictStrategyChoice({}, 'servicetitan')).toBe('servicetitan');
  });
});
