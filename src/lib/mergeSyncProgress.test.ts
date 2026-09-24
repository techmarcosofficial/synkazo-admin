import { describe, expect, it } from 'vitest';

import { mergeSyncProgress } from './mergeSyncProgress';

describe('mergeSyncProgress', () => {
  it('resets batch progress for each new batch and ignores stale events', () => {
    const first = mergeSyncProgress(null, {
      runId: 'run-1',
      page: 0,
      currentBatch: 1,
      batchProcessed: 0,
      batchTotal: 10,
      recordsAttempted: 0,
    });
    const partial = mergeSyncProgress(first, {
      runId: 'run-1',
      page: 0,
      currentBatch: 1,
      batchProcessed: 5,
      batchTotal: 10,
      recordsAttempted: 5,
    });
    const complete = mergeSyncProgress(partial, {
      runId: 'run-1',
      page: 1,
      currentBatch: 1,
      batchProcessed: 10,
      batchTotal: 10,
      recordsAttempted: 10,
    });
    const next = mergeSyncProgress(complete, {
      runId: 'run-1',
      page: 1,
      currentBatch: 2,
      batchProcessed: 0,
      batchTotal: 10,
      recordsAttempted: 10,
    });
    expect(next).toMatchObject({
      currentBatch: 2,
      batchProcessed: 0,
      page: 1,
      recordsAttempted: 10,
    });
    expect(
      mergeSyncProgress(next, {
        runId: 'run-1',
        page: 1,
        currentBatch: 1,
        batchProcessed: 10,
        recordsAttempted: 9,
      }),
    ).toMatchObject({
      currentBatch: 2,
      batchProcessed: 0,
      recordsAttempted: 10,
    });
  });
});
