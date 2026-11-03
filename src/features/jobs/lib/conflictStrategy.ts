// The two-way "Primary System" choice is one of the project's platforms (that
// platform wins conflicts) or MOST_RECENT (whichever side changed last wins).
// The API stores these as conflictResolutionStrategy + sourceOfTruth.
export const MOST_RECENT = 'most_recent';

export function conflictStrategyPayload(choice: string): {
  conflictResolutionStrategy:
    'source_of_truth_wins' | 'most_recently_modified_wins';
  sourceOfTruth?: string;
} {
  return choice === MOST_RECENT
    ? { conflictResolutionStrategy: 'most_recently_modified_wins' }
    : {
        conflictResolutionStrategy: 'source_of_truth_wins',
        sourceOfTruth: choice,
      };
}

export function conflictStrategyChoice(
  job: {
    conflictResolutionStrategy?: string | null;
    sourceOfTruth?: string | null;
  },
  fallbackPlatformId: string,
): string {
  return job.conflictResolutionStrategy === 'most_recently_modified_wins'
    ? MOST_RECENT
    : (job.sourceOfTruth ?? fallbackPlatformId);
}
