import type { SyncProgressEvent } from '@/types/sync';

/** Keep cumulative totals monotonic across SSE reconnects while allowing each new batch to start at zero. */
export function mergeSyncProgress(
  previous: SyncProgressEvent | null,
  incoming: SyncProgressEvent,
): SyncProgressEvent {
  if (!previous || previous.runId !== incoming.runId) return incoming;

  const count = (key: keyof SyncProgressEvent) =>
    Math.max(Number(previous[key]) || 0, Number(incoming[key]) || 0);
  const newest = (incoming.page ?? 0) >= (previous.page ?? 0);
  const oldBatch = previous.currentBatch ?? 0;
  const newBatch = incoming.currentBatch ?? 0;
  const batchIsNewer = newBatch > oldBatch;
  const batchIsOlder =
    newBatch < oldBatch || (incoming.page ?? 0) < (previous.page ?? 0);

  return {
    ...previous,
    ...incoming,
    page: count('page'),
    recordsProcessed: count('recordsProcessed'),
    recordsAttempted: count('recordsAttempted'),
    createdCount: count('createdCount'),
    updatedCount: count('updatedCount'),
    skippedCount: count('skippedCount'),
    failedCount: count('failedCount'),
    totalRecords: newest
      ? (incoming.totalRecords ?? previous.totalRecords)
      : previous.totalRecords,
    totalBatches: newest
      ? (incoming.totalBatches ?? previous.totalBatches)
      : previous.totalBatches,
    currentBatch: batchIsOlder
      ? previous.currentBatch
      : (incoming.currentBatch ?? previous.currentBatch),
    batchProcessed: batchIsOlder
      ? previous.batchProcessed
      : batchIsNewer
        ? incoming.batchProcessed
        : Math.max(previous.batchProcessed ?? 0, incoming.batchProcessed ?? 0),
    batchTotal: batchIsOlder
      ? previous.batchTotal
      : (incoming.batchTotal ?? previous.batchTotal),
  };
}
