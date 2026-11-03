import { describe, expect, it } from 'vitest';

import { syncFromError, syncFromPayload } from './syncFromCutoff';

describe('syncFromError', () => {
  it('ignores one-way jobs', () => {
    expect(
      syncFromError({
        syncDirection: 'one_way',
        syncFromMode: '',
        syncFromDate: '',
      }),
    ).toBeNull();
  });

  it('requires an explicit choice on two-way jobs', () => {
    expect(
      syncFromError({
        syncDirection: 'two_way',
        syncFromMode: '',
        syncFromDate: '',
      }),
    ).toMatch(/choose where two-way sync starts/i);
  });

  it('requires a past date in date mode', () => {
    expect(
      syncFromError({
        syncDirection: 'two_way',
        syncFromMode: 'date',
        syncFromDate: '',
      }),
    ).toMatch(/choose the date/i);
    expect(
      syncFromError({
        syncDirection: 'two_way',
        syncFromMode: 'date',
        syncFromDate: '2999-01-01T00:00',
      }),
    ).toMatch(/cannot be in the future/i);
    expect(
      syncFromError({
        syncDirection: 'two_way',
        syncFromMode: 'date',
        syncFromDate: '2026-01-01T09:30',
      }),
    ).toBeNull();
  });
});

describe('syncFromPayload', () => {
  it('sends future_only without a date', () => {
    expect(
      syncFromPayload({ syncFromMode: 'future_only', syncFromDate: '' }),
    ).toEqual({ syncFromMode: 'future_only' });
  });

  it('sends a chosen date as ISO', () => {
    const local = '2026-01-01T09:30';
    expect(
      syncFromPayload({ syncFromMode: 'date', syncFromDate: local }),
    ).toEqual({
      syncFromMode: 'date',
      syncFromDate: new Date(local).toISOString(),
    });
  });

  it('sends nothing until a mode is chosen', () => {
    expect(syncFromPayload({ syncFromMode: '', syncFromDate: '' })).toEqual({});
  });
});
